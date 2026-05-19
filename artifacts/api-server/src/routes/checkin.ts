import { Router } from "express";
import { db, clientsTable, lockersTable, roomsTable, rentalSessionsTable, transactionsTable, membershipsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { processSquarePayment } from "../lib/square";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, type CustomerType, type ProductType } from "../lib/pricing";
import { maybeDecrypt } from "../lib/encryption";
import { CheckInBody } from "@workspace/api-zod";

const router = Router();

router.post("/checkin", requireAuth, async (req, res): Promise<void> => {
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

  // Check resource availability
  let resourceName = "";
  if (resourceType === "locker") {
    const [locker] = await db.select().from(lockersTable).where(eq(lockersTable.id, resourceId));
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
    membershipCost = membershipType === "one_time" ? 13 : 42;
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

  const totalSubtotal = rentalSubtotal + membershipCost;
  const { tax, total } = computeTotal(totalSubtotal);

  // Process single payment for everything
  const result = await processSquarePayment(
    paymentToken,
    Math.round(total * 100),
    idempotencyKey,
    `Check-in: ${resourceType} ${resourceName}${membershipType ? " + membership" : ""}`
  );

  const startTime = new Date();
  const expiresAt = new Date(startTime.getTime() + 6 * 60 * 60 * 1000);

  // Create rental session
  const [session] = await db.insert(rentalSessionsTable).values({
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
    await db.update(lockersTable).set({ status: "occupied", clientId: client.id, sessionId: session.id, startTime, expiresAt }).where(eq(lockersTable.id, resourceId));
  } else {
    await db.update(roomsTable).set({ status: "occupied", clientId: client.id, sessionId: session.id, startTime, expiresAt }).where(eq(roomsTable.id, resourceId));
  }

  // Create membership if purchased
  if (membershipType && client.membershipStatus === "none") {
    let expiresAtMembership: Date | null = null;
    if (membershipType === "six_month") {
      expiresAtMembership = new Date();
      expiresAtMembership.setMonth(expiresAtMembership.getMonth() + 6);
    }
    const [membership] = await db.insert(membershipsTable).values({
      clientId: client.id,
      type: membershipType as "one_time" | "six_month",
      purchasedAt: new Date(),
      expiresAt: expiresAtMembership,
    }).returning();

    await db.update(clientsTable).set({
      membershipStatus: membershipType as "one_time" | "six_month",
      membershipExpiresAt: expiresAtMembership,
    }).where(eq(clientsTable.id, client.id));

    newMembership = {
      id: membership.id,
      clientId: membership.clientId,
      type: membership.type,
      purchasedAt: membership.purchasedAt,
      expiresAt: membership.expiresAt,
    };
  }

  // Record transaction
  const [txn] = await db.insert(transactionsTable).values({
    clientId: client.id,
    amount: String(totalSubtotal),
    tax: String(tax),
    total: String(total),
    type: resourceType === "locker" ? "locker_rental" : "room_rental",
    squarePaymentId: result.paymentId,
    description: `Check-in ${resourceName}${membershipType ? " + " + membershipType + " membership" : ""}`,
    sessionId: session.id,
  }).returning();

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "CHECK_IN",
    resourceType,
    resourceId,
    description: `Checked in client ${client.name} to ${resourceType} ${resourceName}`,
  });

  res.json({
    session: {
      id: session.id,
      clientId: session.clientId,
      clientName: client.name,
      resourceType: session.resourceType,
      resourceId: session.resourceId,
      resourceName: session.resourceName,
      status: session.status,
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
