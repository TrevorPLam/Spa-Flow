import { Router } from "express";
import { db, roomsTable, clientsTable, rentalSessionsTable, transactionsTable, waitlistTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { processSquarePayment } from "../lib/square";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, type CustomerType } from "../lib/pricing";
import { maybeDecrypt } from "../lib/encryption";
import { sendSms, WAITLIST_ROOM_MSG } from "../lib/sms";
import {
  ListRoomsQueryParams,
  AssignRoomParams,
  AssignRoomBody,
  ReleaseRoomParams,
  RenewRoomParams,
  RenewRoomBody,
  ExtendRoomParams,
  ExtendRoomBody,
} from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { logTransactionError } from "../lib/logger";
import { ROOM_TOTAL, SESSION_DURATION_MS, EXTENSION_DURATION_MS, EXTENSION_SURCHARGE_DIVISOR, WAITLIST_CONFIRM_MS } from "../lib/constants";

const router = Router();

function formatRoom(r: typeof roomsTable.$inferSelect, clientName?: string | null) {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    clientId: r.clientId,
    clientName: clientName ?? null,
    sessionId: r.sessionId,
    startTime: r.startTime,
    expiresAt: r.expiresAt,
  };
}

router.get("/rooms", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ListRoomsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status } = parsed.data;
  const where = status ? eq(roomsTable.status, status as "available" | "occupied" | "reserved") : undefined;
  const rooms = await db.select().from(roomsTable).where(where).orderBy(roomsTable.id);

  const clientIds = [...new Set(rooms.filter(r => r.clientId).map(r => r.clientId!))];
  const clientMap = new Map<number, string>();
  if (clientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
      .where(sql`${clientsTable.id} = ANY(${clientIds})`);
    clients.forEach(c => clientMap.set(c.id, c.name));
  }

  res.json(rooms.map(r => formatRoom(r, r.clientId ? clientMap.get(r.clientId) : null)));
});

router.get("/rooms/occupancy", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const stats = await db.select({
    status: roomsTable.status,
    count: sql<number>`count(*)::int`,
  }).from(roomsTable).groupBy(roomsTable.status);

  const result = { total: ROOM_TOTAL, available: 0, occupied: 0, reserved: 0 };
  stats.forEach(s => {
    if (s.status === "available") result.available = s.count;
    else if (s.status === "occupied") result.occupied = s.count;
    else if (s.status === "reserved") result.reserved = s.count;
  });
  res.json(result);
});

router.post("/rooms/:id/assign", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = AssignRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AssignRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Use SELECT FOR UPDATE for atomic assignment
  const roomRows = await db.execute(
    sql`SELECT * FROM rooms WHERE id = ${params.data.id} FOR UPDATE`
  );
  const room = roomRows.rows[0] as typeof roomsTable.$inferSelect | undefined;

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.status !== "available") {
    res.status(409).json({ error: "Room is not available" });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);
  const customerType: CustomerType = client.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;

  const { subtotal } = calculatePrice({
    customerType,
    productType: "ROOM",
    startTime: new Date(),
    clientAge,
    hasBirthdayToday,
  });
  const { tax, total } = computeTotal(subtotal);

  let paymentId = "mock";
  if (total > 0) {
    const result = await processSquarePayment(
      parsed.data.paymentToken,
      Math.round(total * 100),
      parsed.data.idempotencyKey,
      `Room ${room.name} rental`
    );
    paymentId = result.paymentId;
  }

  const startTime = new Date();
  const expiresAt = new Date(startTime.getTime() + SESSION_DURATION_MS);

  const session = await db.transaction(async (tx) => {
    const [session] = await tx.insert(rentalSessionsTable).values({
      clientId: client.id,
      resourceType: "room",
      resourceId: room.id,
      resourceName: room.name,
      status: "active",
      startTime,
      expiresAt,
      amountPaid: String(subtotal),
    }).returning();

    await tx.update(roomsTable).set({
      status: "occupied",
      clientId: client.id,
      sessionId: session.id,
      startTime,
      expiresAt,
    }).where(eq(roomsTable.id, room.id));

    await tx.insert(transactionsTable).values({
      clientId: client.id,
      amount: String(subtotal),
      tax: String(tax),
      total: String(total),
      type: "room_rental",
      squarePaymentId: paymentId,
      description: `Room ${room.name} rental`,
      sessionId: session.id,
    });

    return session;
  }).catch((error) => {
    logTransactionError("room assignment", error, { roomId: room.id, clientId: client.id });
    throw error;
  });

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "ASSIGN_ROOM",
    resourceType: "room",
    resourceId: room.id,
    description: `Assigned room ${room.name} to client ${client.name}`,
  });

  res.json({
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
    amountPaid: subtotal,
  });
});

router.post("/rooms/:id/release", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = ReleaseRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const sessionId = room.sessionId;
  const endTime = new Date();

  await db.transaction(async (tx) => {
    if (sessionId) {
      await tx.update(rentalSessionsTable).set({ status: "completed", endTime })
        .where(eq(rentalSessionsTable.id, sessionId));
    }

    await tx.update(roomsTable).set({
      status: "available",
      clientId: null,
      sessionId: null,
      startTime: null,
      expiresAt: null,
    }).where(eq(roomsTable.id, room.id));

    // Atomically assign next waitlist entry
    try {
      await assignNextWaitlistEntry(room.id);
    } catch (err) {
      // Don't fail release if waitlist assignment fails
    }
  }).catch((error) => {
    logTransactionError("room release", error, { roomId: room.id, sessionId });
    throw error;
  });

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "RELEASE_ROOM",
    resourceType: "room",
    resourceId: room.id,
    description: `Released room ${room.name}`,
  });

  const [session] = sessionId
    ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, sessionId))
    : [null];

  res.json({
    id: session?.id ?? 0,
    clientId: session?.clientId ?? 0,
    clientName: null,
    resourceType: "room",
    resourceId: room.id,
    resourceName: room.name,
    status: "completed",
    startTime: session?.startTime ?? new Date(),
    expiresAt: session?.expiresAt ?? null,
    endTime,
    amountPaid: session?.amountPaid ? parseFloat(session.amountPaid) : null,
  });
});

router.post("/rooms/:id/renew", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = RenewRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = RenewRoomBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room || room.status !== "occupied") { res.status(400).json({ error: "Room is not occupied" }); return; }

  const [client] = room.clientId ? await db.select().from(clientsTable).where(eq(clientsTable.id, room.clientId)) : [null];
  const dob = client ? maybeDecrypt(client.dobEncrypted, client.dobDek) : null;
  const customerType: CustomerType = client?.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const { subtotal } = calculatePrice({ customerType, productType: "ROOM", startTime: new Date(), clientAge: dob ? calculateAge(dob) : 25, hasBirthdayToday: dob ? isBirthdayToday(dob) : false });
  const { tax, total } = computeTotal(subtotal);

  if (total > 0) { await processSquarePayment(parsed.data.paymentToken, Math.round(total * 100), parsed.data.idempotencyKey, `Room ${room.name} renewal`); }

  const newExpiresAt = new Date((room.expiresAt ?? new Date()).getTime() + SESSION_DURATION_MS);
  await db.transaction(async (tx) => {
    await tx.update(roomsTable).set({ expiresAt: newExpiresAt }).where(eq(roomsTable.id, room.id));
    if (room.sessionId) {
      await tx.update(rentalSessionsTable).set({ expiresAt: newExpiresAt }).where(eq(rentalSessionsTable.id, room.sessionId));
      if (client) { await tx.insert(transactionsTable).values({ clientId: client.id, amount: String(subtotal), tax: String(tax), total: String(total), type: "renewal", squarePaymentId: parsed.data.idempotencyKey, description: `Room ${room.name} 6h renewal`, sessionId: room.sessionId }); }
    }
  }).catch((error) => {
    logTransactionError("room renewal", error, { roomId: room.id, clientId: client?.id });
    throw error;
  });

  const [session] = room.sessionId ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, room.sessionId)) : [null];
  res.json({ id: session?.id ?? 0, clientId: session?.clientId ?? 0, clientName: client?.name ?? null, resourceType: "room", resourceId: room.id, resourceName: room.name, status: "active", startTime: session?.startTime ?? new Date(), expiresAt: newExpiresAt, endTime: null, amountPaid: subtotal });
});

router.post("/rooms/:id/extend", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = ExtendRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = ExtendRoomBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room || room.status !== "occupied") { res.status(400).json({ error: "Room is not occupied" }); return; }

  const [client] = room.clientId ? await db.select().from(clientsTable).where(eq(clientsTable.id, room.clientId)) : [null];
  const dob = client ? maybeDecrypt(client.dobEncrypted, client.dobDek) : null;
  const customerType: CustomerType = client?.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const { subtotal: base } = calculatePrice({ customerType, productType: "ROOM", startTime: new Date(), clientAge: dob ? calculateAge(dob) : 25, hasBirthdayToday: dob ? isBirthdayToday(dob) : false });
  const subtotal = Math.round((base / EXTENSION_SURCHARGE_DIVISOR) * 100) / 100;
  const { tax, total } = computeTotal(subtotal);

  if (total > 0) { await processSquarePayment(parsed.data.paymentToken, Math.round(total * 100), parsed.data.idempotencyKey, `Room ${room.name} 2h extension`); }

  const newExpiresAt = new Date((room.expiresAt ?? new Date()).getTime() + EXTENSION_DURATION_MS);
  await db.transaction(async (tx) => {
    await tx.update(roomsTable).set({ expiresAt: newExpiresAt }).where(eq(roomsTable.id, room.id));
    if (room.sessionId) {
      await tx.update(rentalSessionsTable).set({ expiresAt: newExpiresAt }).where(eq(rentalSessionsTable.id, room.sessionId));
      if (client) { await tx.insert(transactionsTable).values({ clientId: client.id, amount: String(subtotal), tax: String(tax), total: String(total), type: "extension", squarePaymentId: parsed.data.idempotencyKey, description: `Room ${room.name} 2h extension`, sessionId: room.sessionId }); }
    }
  }).catch((error) => {
    logTransactionError("room extension", error, { roomId: room.id, clientId: client?.id });
    throw error;
  });

  const [session] = room.sessionId ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, room.sessionId)) : [null];
  res.json({ id: session?.id ?? 0, clientId: session?.clientId ?? 0, clientName: client?.name ?? null, resourceType: "room", resourceId: room.id, resourceName: room.name, status: "active", startTime: session?.startTime ?? new Date(), expiresAt: newExpiresAt, endTime: null, amountPaid: subtotal });
});

// Atomically assign room to next waitlist entry
export async function assignNextWaitlistEntry(roomId: number): Promise<void> {
  const rows = await db.execute(
    sql`SELECT we.*, c.phone as client_phone, c.name as client_name
        FROM waitlist_entries we
        JOIN clients c ON c.id = we.client_id
        WHERE we.status = 'waiting'
        ORDER BY we.position ASC
        LIMIT 1
        FOR UPDATE`
  );

  if (rows.rows.length === 0) return;
  const entry = rows.rows[0] as { id: number; client_id: number; client_phone: string; client_name: string };

  const confirmBy = new Date(Date.now() + WAITLIST_CONFIRM_MS);
  await db.execute(
    sql`UPDATE waitlist_entries SET status = 'assigned', assigned_room_id = ${roomId}, assigned_at = NOW(), confirm_by = ${confirmBy} WHERE id = ${entry.id}`
  );
  await db.update(roomsTable).set({ status: "reserved" }).where(eq(roomsTable.id, roomId));

  if (entry.client_phone) {
    await sendSms(entry.client_phone, WAITLIST_ROOM_MSG);
  }
}

export default router;
