import { Router } from "express";
import { db, clientsTable, lockersTable, roomsTable, rentalSessionsTable, transactionsTable, membershipsTable, productsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { processSquarePayment } from "../lib/square";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, isEligibleFor1824Special, type CustomerType, type ProductType, type RoomQualityTier } from "../lib/pricing";
import { maybeDecrypt } from "../lib/encryption";
import { CheckInBody } from "@workspace/api-zod";
import { checkinLimiter } from "../middleware/rateLimit";
import { logTransactionError } from "../lib/logger";
import { SESSION_DURATION_MS, MEMBERSHIP_ONE_TIME_COST, MEMBERSHIP_SIX_MONTH_COST } from "../lib/constants";
import { sendValidationError, sendNotFoundError, sendConflictError } from "../lib/response-formatters";

const router = Router();

router.post("/checkin", requireAuth, checkinLimiter, async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { clientId, resourceType, resourceId, paymentToken, idempotencyKey, membershipType: requestedMembershipType, productIds, roomTier, selectedPrice } = parsed.data;
  let membershipType = requestedMembershipType;

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) {
    sendNotFoundError(res, "Client not found");
    return;
  }

  // Process products if provided
  let selectedProducts: typeof productsTable.$inferSelect[] = [];
  let productTotal = 0;
  
  if (productIds && productIds.length > 0) {
    // Fetch selected products with stock validation
    // Rationale: Using PostgreSQL ANY() operator for efficient array comparison in WHERE clause
    // This is more performant than multiple OR conditions and is safely parameterized by Drizzle's sql template
    selectedProducts = await db.select().from(productsTable).where(sql`id = ANY(${productIds})`);
    
    // Validate all products exist
    if (selectedProducts.length !== productIds.length) {
      sendNotFoundError(res, "One or more products not found");
      return;
    }
    
    // Validate stock availability
    for (const product of selectedProducts) {
      if (product.stock <= 0) {
        sendConflictError(res, `Product "${product.name}" is out of stock`);
        return;
      }
    }
    
    // Calculate product total
    productTotal = selectedProducts.reduce((sum, p) => sum + parseFloat(p.price), 0);
  }

  // Check resource availability with SELECT FOR UPDATE to prevent race conditions
  // Rationale: FOR UPDATE is a PostgreSQL-specific feature for row-level locking that prevents race conditions
  // This raw SQL is necessary because Drizzle ORM does not support SELECT FOR UPDATE syntax
  let resourceName = "";
  let actualRoomTier: RoomQualityTier | null = null;
  if (resourceType === "locker") {
    const rows = await db.execute(sql`SELECT id, name, status, client_id, session_id, start_time, expires_at FROM lockers WHERE id = ${resourceId} FOR UPDATE`);
    // Type guard: safely extract locker from SQL result with null check
    const locker = rows.rows[0] ? rows.rows[0] as typeof lockersTable.$inferSelect : undefined;
    if (!locker) { sendNotFoundError(res, "Locker not found"); return; }
    if (locker.status !== "available") { sendConflictError(res, "Locker is not available"); return; }
    resourceName = locker.name;
  } else {
    const rows = await db.execute(sql`SELECT id, name, status, client_id, session_id, start_time, expires_at, quality_tier FROM rooms WHERE id = ${resourceId} FOR UPDATE`);
    // Type guard: safely extract room from SQL result with null check
    const room = rows.rows[0] ? rows.rows[0] as { id: number; name: string; status: string; quality_tier: string } : undefined;
    if (!room) { sendNotFoundError(res, "Room not found"); return; }
    if (room.status !== "available") { sendConflictError(res, "Room is not available"); return; }
    resourceName = room.name;
    actualRoomTier = room.quality_tier as RoomQualityTier;
    
    // Validate roomTier matches actual room tier if provided
    if (roomTier && roomTier !== actualRoomTier) {
      sendValidationError(res, `Room tier mismatch: requested ${roomTier}, room is ${actualRoomTier}`);
      return;
    }
  }

  // Handle membership purchase
  let newMembership = null;
  let membershipCost = 0;
  let effectiveMembershipStatus = client.membershipStatus;
  let membershipBundled = false;

  // Auto-bundle one-time membership for 18-24 non-members renting lockers (1824 special)
  if (!membershipType && client.membershipStatus === "none" && resourceType === "locker") {
    const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);
    const clientAge = dob ? calculateAge(dob) : 25;
    const initialCustomerType: CustomerType = effectiveMembershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
    
    if (isEligibleFor1824Special(clientAge, initialCustomerType, "LOCKER")) {
      membershipType = "one_time";
      membershipBundled = true;
    }
  }

  if (membershipType && client.membershipStatus === "none") {
    membershipCost = membershipType === "one_time" ? MEMBERSHIP_ONE_TIME_COST : MEMBERSHIP_SIX_MONTH_COST;
    effectiveMembershipStatus = membershipType;
  }

  // Calculate price
  const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);
  const customerType: CustomerType = effectiveMembershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;

  const { subtotal: rentalSubtotal } = calculatePrice({
    customerType,
    productType: resourceType.toUpperCase() as ProductType,
    startTime: new Date(),
    clientAge,
    hasBirthdayToday,
    roomTier: actualRoomTier ?? undefined,
    selectedPrice: selectedPrice ?? undefined,
  });

  const totalSubtotal = rentalSubtotal + membershipCost + productTotal;
  const { tax, total } = computeTotal(totalSubtotal);

  // Process single payment for everything
  const paymentDescription = `Check-in: ${resourceType} ${resourceName}${membershipType ? " + membership" : ""}${selectedProducts.length > 0 ? ` + ${selectedProducts.length} product(s)` : ""}`;
  const result = await processSquarePayment(
    paymentToken,
    Math.round(total * 100),
    idempotencyKey,
    paymentDescription
  );

  const startTime = new Date();
  const expiresAt = new Date(startTime.getTime() + SESSION_DURATION_MS);

  // Wrap all database operations in a transaction for atomicity
  const [session, txn, membership] = await db.transaction(async (tx) => {
    // Create rental session
    const [session] = await tx.insert(rentalSessionsTable).values({
      clientId: client.id,
      resourceType: resourceType as "locker" | "room",
      resourceId,
      resourceName,
      status: "active",
      startTime,
      expiresAt,
      amountPaid: String(rentalSubtotal),
    }).returning();

    // Update resource status
    if (resourceType === "locker") {
      await tx.update(lockersTable).set({ status: "occupied", clientId: client.id, sessionId: session.id, startTime, expiresAt }).where(eq(lockersTable.id, resourceId));
    } else {
      await tx.update(roomsTable).set({ status: "occupied", clientId: client.id, sessionId: session.id, startTime, expiresAt }).where(eq(roomsTable.id, resourceId));
    }

    // Create membership if purchased
    let newMembership = null;
    if (membershipType && client.membershipStatus === "none") {
      let expiresAtMembership: Date | null = null;
      if (membershipType === "six_month") {
        expiresAtMembership = new Date();
        expiresAtMembership.setMonth(expiresAtMembership.getMonth() + 6);
      }
      const [membership] = await tx.insert(membershipsTable).values({
        clientId: client.id,
        type: membershipType as "one_time" | "six_month",
        purchasedAt: new Date(),
        expiresAt: expiresAtMembership,
      }).returning();

      await tx.update(clientsTable).set({
        membershipStatus: membershipType as "one_time" | "six_month",
        membershipExpiresAt: expiresAtMembership,
      }).where(eq(clientsTable.id, client.id));

      newMembership = membership;
    }

    // Record transaction for rental
    const [txn] = await tx.insert(transactionsTable).values({
      clientId: client.id,
      amount: String(totalSubtotal),
      tax: String(tax),
      total: String(total),
      type: resourceType === "locker" ? "locker_rental" : "room_rental",
      squarePaymentId: result.paymentId,
      description: `Check-in ${resourceName}${membershipType ? " + " + membershipType + " membership" : ""}${selectedProducts.length > 0 ? ` + ${selectedProducts.length} product(s)` : ""}`,
      sessionId: session.id,
    }).returning();

    // Create separate transaction record for membership purchase when bundled
    if (membershipBundled && membershipCost > 0) {
      await tx.insert(transactionsTable).values({
        clientId: client.id,
        amount: String(membershipCost),
        tax: "0",
        total: String(membershipCost),
        type: "membership",
        squarePaymentId: result.paymentId,
        description: `One-time membership (1824 Special)`,
        sessionId: session.id,
      });
    }

    // Create individual transaction records for each product and decrement stock
    for (const product of selectedProducts) {
      // Create product transaction
      await tx.insert(transactionsTable).values({
        clientId: client.id,
        amount: String(product.price),
        tax: "0",
        total: String(product.price),
        type: "product",
        squarePaymentId: result.paymentId,
        description: `Product: ${product.name}`,
        sessionId: session.id,
      });

      // Decrement product stock atomically
      // Rationale: Using raw SQL for atomic decrement prevents race conditions on stock updates
      // This pattern ensures the decrement happens in a single database operation
      await tx.update(productsTable)
        .set({ stock: sql`${productsTable.stock} - 1` })
        .where(and(
          eq(productsTable.id, product.id),
          sql`${productsTable.stock} > 0`
        ));
    }

    return [session, txn, newMembership];
  }).catch((error) => {
    logTransactionError("check-in", error, { clientId, resourceType, resourceId });
    throw error;
  });

  if (membership && 'type' in membership && 'purchasedAt' in membership) {
    newMembership = {
      id: membership.id,
      clientId: membership.clientId,
      type: membership.type as "one_time" | "six_month",
      purchasedAt: membership.purchasedAt,
      expiresAt: membership.expiresAt,
    };
  }

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "CHECK_IN",
    resourceType,
    resourceId,
    description: `Checked in client ${client.name} to ${resourceType} ${resourceName}`,
  });

  // Type guards to narrow union types from transaction
  if (!session || !('resourceType' in session) || !txn || !('amount' in txn)) {
    res.status(500).json({ error: "Failed to complete check-in" });
    return;
  }

  res.json({
    session: {
      id: session.id,
      clientId: session.clientId,
      clientName: client.name,
      resourceType: session.resourceType as "locker" | "room",
      resourceId: session.resourceId,
      resourceName: session.resourceName,
      status: session.status as "active" | "completed" | "expired",
      startTime: session.startTime,
      expiresAt: session.expiresAt,
      endTime: null,
      amountPaid: rentalSubtotal,
    },
    transaction: {
      id: txn.id,
      clientId: txn.clientId,
      clientName: client.name,
      amount: parseFloat(txn.amount),
      tax: parseFloat(txn.tax),
      total: parseFloat(txn.total),
      type: txn.type,
      squarePaymentId: txn.squarePaymentId,
      description: txn.description,
      createdAt: txn.createdAt,
    },
    membership: newMembership,
    membershipBundled,
  });
});

export default router;
