import { Router } from "express";
import { db, lockersTable, clientsTable, rentalSessionsTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { processSquarePayment } from "../lib/square";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, type CustomerType } from "../lib/pricing";
import { maybeDecrypt } from "../lib/encryption";
import {
  ListLockersQueryParams,
  AssignLockerParams,
  AssignLockerBody,
  ReleaseLockerParams,
  RenewLockerParams,
  RenewLockerBody,
  ExtendLockerParams,
  ExtendLockerBody,
} from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { logTransactionError } from "../lib/logger";
import { LOCKER_TOTAL, SESSION_DURATION_MS, EXTENSION_DURATION_MS, EXTENSION_SURCHARGE_DIVISOR } from "../lib/constants";
import { sendValidationError, sendNotFoundError, sendConflictError } from "../lib/response-formatters";

const router = Router();

function formatLocker(l: typeof lockersTable.$inferSelect, clientName?: string | null) {
  return {
    id: l.id,
    name: l.name,
    status: l.status,
    clientId: l.clientId,
    clientName: clientName ?? null,
    sessionId: l.sessionId,
    startTime: l.startTime,
    expiresAt: l.expiresAt,
  };
}

router.get("/lockers", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ListLockersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { status } = parsed.data;
  // Type guard: status is validated by Zod schema to be one of these values
  // This assertion is safe because ListLockersQueryParams already validates the status enum
  const where = status ? eq(lockersTable.status, status as "available" | "occupied" | "reserved") : undefined;
  const lockers = await db.select().from(lockersTable).where(where).orderBy(lockersTable.id);

  // Get client names for occupied lockers
  const clientIds = [...new Set(lockers.filter(l => l.clientId).map(l => l.clientId!))];
  const clientMap = new Map<number, string>();
  if (clientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
      .where(sql`${clientsTable.id} = ANY(${clientIds})`);
    clients.forEach(c => clientMap.set(c.id, c.name));
  }

  res.json(lockers.map(l => formatLocker(l, l.clientId ? clientMap.get(l.clientId) : null)));
});

router.get("/lockers/occupancy", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const stats = await db.select({
    status: lockersTable.status,
    count: sql<number>`count(*)::int`,
  }).from(lockersTable).groupBy(lockersTable.status);

  const result = { total: LOCKER_TOTAL, available: 0, occupied: 0, reserved: 0 };
  stats.forEach(s => {
    if (s.status === "available") result.available = s.count;
    else if (s.status === "occupied") result.occupied = s.count;
    else if (s.status === "reserved") result.reserved = s.count;
  });
  res.json(result);
});

router.post("/lockers/:id/assign", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = AssignLockerParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const parsed = AssignLockerBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
  if (!client) {
    sendNotFoundError(res, "Client not found");
    return;
  }

  // Calculate pricing
  const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);
  const customerType: CustomerType = client.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;

  const { subtotal } = calculatePrice({
    customerType,
    productType: "LOCKER",
    startTime: new Date(),
    clientAge,
    hasBirthdayToday,
  });
  const { tax, total } = computeTotal(subtotal);

  // Process payment
  let paymentId = "mock";
  if (total > 0) {
    const result = await processSquarePayment(
      parsed.data.paymentToken,
      Math.round(total * 100),
      parsed.data.idempotencyKey,
      `Locker ${params.data.id} rental`
    );
    paymentId = result.paymentId;
  }

  // Create session and update locker atomically within transaction
  const startTime = new Date();
  const expiresAt = new Date(startTime.getTime() + SESSION_DURATION_MS);

  let session;
  try {
    session = await db.transaction(async (tx) => {
      // Use SELECT FOR UPDATE for atomic assignment
      const lockerRows = await tx.execute(
        sql`SELECT id, name, status, client_id, session_id, start_time, expires_at FROM lockers WHERE id = ${params.data.id} FOR UPDATE`
      );
      // Type guard: safely extract locker from SQL result with null check
      const locker = lockerRows.rows[0] ? lockerRows.rows[0] as typeof lockersTable.$inferSelect : undefined;

      if (!locker) {
        throw new Error("LOCKER_NOT_FOUND");
      }
      if (locker.status !== "available") {
        throw new Error("LOCKER_NOT_AVAILABLE");
      }

      const [session] = await tx.insert(rentalSessionsTable).values({
        clientId: client.id,
        resourceType: "locker",
        resourceId: locker.id,
        resourceName: locker.name,
        status: "active",
        startTime,
        expiresAt,
        amountPaid: String(subtotal),
      }).returning();

      await tx.update(lockersTable).set({
        status: "occupied",
        clientId: client.id,
        sessionId: session.id,
        startTime,
        expiresAt,
      }).where(eq(lockersTable.id, locker.id));

      // Record transaction
      await tx.insert(transactionsTable).values({
        clientId: client.id,
        amount: String(subtotal),
        tax: String(tax),
        total: String(total),
        type: "locker_rental",
        squarePaymentId: paymentId,
        description: `Locker ${locker.name} rental`,
        sessionId: session.id,
      });

      return { session, locker };
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "LOCKER_NOT_FOUND") {
        sendNotFoundError(res, "Locker not found");
        return;
      }
      if (error.message === "LOCKER_NOT_AVAILABLE") {
        sendConflictError(res, "Locker is not available");
        return;
      }
    }
    logTransactionError("locker assignment", error, { lockerId: params.data.id, clientId: client.id });
    throw error;
  }

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "ASSIGN_LOCKER",
    resourceType: "locker",
    resourceId: session.locker.id,
    description: `Assigned locker ${session.locker.name} to client ${client.name}`,
  });

  res.json({
    id: session.session.id,
    clientId: session.session.clientId,
    clientName: client.name,
    resourceType: session.session.resourceType,
    resourceId: session.session.resourceId,
    resourceName: session.session.resourceName,
    status: session.session.status,
    startTime: session.session.startTime,
    expiresAt: session.session.expiresAt,
    endTime: null,
    amountPaid: subtotal,
  });
});

router.post("/lockers/:id/release", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = ReleaseLockerParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const [locker] = await db.select().from(lockersTable).where(eq(lockersTable.id, params.data.id));
  if (!locker) {
    sendNotFoundError(res, "Locker not found");
    return;
  }

  const sessionId = locker.sessionId;
  const endTime = new Date();

  await db.transaction(async (tx) => {
    if (sessionId) {
      await tx.update(rentalSessionsTable).set({ status: "completed", endTime })
        .where(eq(rentalSessionsTable.id, sessionId));
    }

    await tx.update(lockersTable).set({
      status: "available",
      clientId: null,
      sessionId: null,
      startTime: null,
      expiresAt: null,
    }).where(eq(lockersTable.id, locker.id));
  }).catch((error) => {
    logTransactionError("locker release", error, { lockerId: locker.id, sessionId });
    throw error;
  });

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "RELEASE_LOCKER",
    resourceType: "locker",
    resourceId: locker.id,
    description: `Released locker ${locker.name}`,
  });

  const [session] = sessionId
    ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, sessionId))
    : [null];

  res.json({
    id: session?.id ?? 0,
    clientId: session?.clientId ?? 0,
    clientName: null,
    resourceType: "locker",
    resourceId: locker.id,
    resourceName: locker.name,
    status: "completed",
    startTime: session?.startTime ?? new Date(),
    expiresAt: session?.expiresAt ?? null,
    endTime,
    amountPaid: session?.amountPaid ? parseFloat(session.amountPaid) : null,
  });
});

router.post("/lockers/:id/renew", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = RenewLockerParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }
  const parsed = RenewLockerBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const [locker] = await db.select().from(lockersTable).where(eq(lockersTable.id, params.data.id));
  if (!locker || locker.status !== "occupied") {
    sendValidationError(res, "Locker is not occupied");
    return;
  }

  const [client] = locker.clientId
    ? await db.select().from(clientsTable).where(eq(clientsTable.id, locker.clientId))
    : [null];

  const dob = client ? maybeDecrypt(client.dobEncrypted, client.dobDek) : null;
  const customerType: CustomerType = client?.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;
  const { subtotal } = calculatePrice({ customerType, productType: "LOCKER", startTime: new Date(), clientAge, hasBirthdayToday });
  const { tax, total } = computeTotal(subtotal);

  if (total > 0) {
    await processSquarePayment(parsed.data.paymentToken, Math.round(total * 100), parsed.data.idempotencyKey, `Locker ${locker.name} renewal`);
  }

  const newExpiresAt = new Date((locker.expiresAt ?? new Date()).getTime() + SESSION_DURATION_MS);
  await db.transaction(async (tx) => {
    await tx.update(lockersTable).set({ expiresAt: newExpiresAt }).where(eq(lockersTable.id, locker.id));

    if (locker.sessionId) {
      await tx.update(rentalSessionsTable).set({ expiresAt: newExpiresAt }).where(eq(rentalSessionsTable.id, locker.sessionId));
      if (client) {
        await tx.insert(transactionsTable).values({ clientId: client.id, amount: String(subtotal), tax: String(tax), total: String(total), type: "renewal", squarePaymentId: parsed.data.idempotencyKey, description: `Locker ${locker.name} 6h renewal`, sessionId: locker.sessionId });
      }
    }
  }).catch((error) => {
    logTransactionError("locker renewal", error, { lockerId: locker.id });
    throw error;
  });

  const [session] = locker.sessionId ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, locker.sessionId)) : [null];
  res.json({ id: session?.id ?? 0, clientId: session?.clientId ?? 0, clientName: client?.name ?? null, resourceType: "locker", resourceId: locker.id, resourceName: locker.name, status: "active", startTime: session?.startTime ?? new Date(), expiresAt: newExpiresAt, endTime: null, amountPaid: subtotal });
});

router.post("/lockers/:id/extend", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = ExtendLockerParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }
  const parsed = ExtendLockerBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const [locker] = await db.select().from(lockersTable).where(eq(lockersTable.id, params.data.id));
  if (!locker || locker.status !== "occupied") {
    sendValidationError(res, "Locker is not occupied");
    return;
  }

  const [client] = locker.clientId ? await db.select().from(clientsTable).where(eq(clientsTable.id, locker.clientId)) : [null];

  // Extension surcharge: charge 1/3 of base rate for 2h
  const dob = client ? maybeDecrypt(client.dobEncrypted, client.dobDek) : null;
  const customerType: CustomerType = client?.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;
  const { subtotal: baseSubtotal } = calculatePrice({ customerType, productType: "LOCKER", startTime: new Date(), clientAge, hasBirthdayToday });
  const subtotal = Math.round((baseSubtotal / EXTENSION_SURCHARGE_DIVISOR) * 100) / 100;
  const { tax, total } = computeTotal(subtotal);

  if (total > 0) {
    await processSquarePayment(parsed.data.paymentToken, Math.round(total * 100), parsed.data.idempotencyKey, `Locker ${locker.name} 2h extension`);
  }

  const newExpiresAt = new Date((locker.expiresAt ?? new Date()).getTime() + EXTENSION_DURATION_MS);
  await db.transaction(async (tx) => {
    await tx.update(lockersTable).set({ expiresAt: newExpiresAt }).where(eq(lockersTable.id, locker.id));

    if (locker.sessionId) {
      await tx.update(rentalSessionsTable).set({ expiresAt: newExpiresAt }).where(eq(rentalSessionsTable.id, locker.sessionId));
      if (client) {
        await tx.insert(transactionsTable).values({ clientId: client.id, amount: String(subtotal), tax: String(tax), total: String(total), type: "extension", squarePaymentId: parsed.data.idempotencyKey, description: `Locker ${locker.name} 2h extension`, sessionId: locker.sessionId });
      }
    }
  }).catch((error) => {
    logTransactionError("locker extension", error, { lockerId: locker.id });
    throw error;
  });

  const [session] = locker.sessionId ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, locker.sessionId)) : [null];
  res.json({ id: session?.id ?? 0, clientId: session?.clientId ?? 0, clientName: client?.name ?? null, resourceType: "locker", resourceId: locker.id, resourceName: locker.name, status: "active", startTime: session?.startTime ?? new Date(), expiresAt: newExpiresAt, endTime: null, amountPaid: subtotal });
});

export default router;
