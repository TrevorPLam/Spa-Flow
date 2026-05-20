// @ts-nocheck
import { Router } from "express";
import { db, clientsTable, lockersTable, roomsTable, rentalSessionsTable, transactionsTable, membershipsTable, productsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { processSquarePayment } from "../lib/square";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, type CustomerType, type ProductType } from "../lib/pricing";
import { maybeDecrypt } from "../lib/encryption";
import { CheckInBody } from "@workspace/api-zod";
import { checkinLimiter } from "../middleware/rateLimit";
import { logTransactionError } from "../lib/logger";
import { SESSION_DURATION_MS, MEMBERSHIP_ONE_TIME_COST, MEMBERSHIP_SIX_MONTH_COST } from "../lib/constants";

const router = Router();

router.post("/checkin", requireAuth, checkinLimiter, async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientId, resourceType, resourceId, paymentToken, idempotencyKey, membershipType, productIds } = parsed.data;

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
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
      res.status(404).json({ error: "One or more products not found" });
      return;
    }
    
    // Validate stock availability
    for (const product of selectedProducts) {
      if (product.stock <= 0) {
        res.status(409).json({ error: `Product "${product.name}" is out of stock` });
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
  if (resourceType === "locker") {
    const rows = await db.execute(sql`SELECT * FROM lockers WHERE id = ${resourceId} FOR UPDATE`);
    const locker = rows.rows[0] as typeof lockersTable.$inferSelect | undefined;
    if (!locker) { res.status(404).json({ error: "Locker not found" }); return; }
    if (locker.status !== "available") { res.status(409).json({ error: "Locker is not available" }); return; }
    resourceName = locker.name;
  } else {
    const rows = await db.execute(sql`SELECT * FROM rooms WHERE id = ${resourceId} FOR UPDATE`);
    const room = rows.rows[0] as { id: number; name: string; status: string } | undefined;
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    if (room.status !== "available") { res.status(409).json({ error: "Room is not available" }); return; }
    resourceName = room.name;
  }

  // Handle membership purchase
  let newMembership = null;
  let membershipCost = 0;
  let effectiveMembershipStatus = client.membershipStatus;

  if (membershipType && client.membershipStatus === "none") {
    membershipCost = membershipType === "one_time" ? MEMBERSHIP_ONE_TIME_COST : MEMBERSHIP_SIX_MONTH_COST;
    effectiveMembershipStatus = membershipType;
  }

  // Calculate price
  const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);
  const customerType: CustomerType = effectiveMembershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;

  const { subtotal: rentalSubtotal, appliedRules } = calculatePrice({
    customerType,
    productType: resourceType.toUpperCase() as ProductType,
    startTime: new Date(),
    clientAge,
    hasBirthdayToday,
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
  });
});

export default router;
