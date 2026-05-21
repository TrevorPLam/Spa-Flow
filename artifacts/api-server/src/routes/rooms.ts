import { Router } from "express";
import { db, roomsTable, clientsTable, rentalSessionsTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { processSquarePayment } from "../lib/square";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, type CustomerType, type RoomQualityTier } from "../lib/pricing";
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
  BulkReleaseRoomsBody,
} from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { logTransactionError, logger } from "../lib/logger";
import { ROOM_TOTAL, SESSION_DURATION_MS, EXTENSION_DURATION_MS, EXTENSION_SURCHARGE_DIVISOR, WAITLIST_CONFIRM_MS } from "../lib/constants";
import { sendValidationError, sendNotFoundError, sendConflictError } from "../lib/response-formatters";

const router = Router();

/**
 * Formats a room record for API response
 * Includes client name if provided for display purposes
 *
 * @param r - The room record from the database
 * @param clientName - Optional client name for display
 * @returns Formatted room object for API response
 */
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
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { status } = parsed.data;
  // Type guard: status is validated by Zod schema to be one of these values
  // This assertion is safe because ListRoomsQueryParams already validates the status enum
  const where = status ? eq(roomsTable.status, status as "available" | "occupied" | "reserved") : undefined;
  const rooms = await db.select().from(roomsTable).where(where).orderBy(roomsTable.id);

  const clientIds = [...new Set(rooms.filter(r => r.clientId).map(r => r.clientId!))];
  const clientMap = new Map<number, string>();
  // Rationale: Using PostgreSQL ANY() operator for efficient array comparison in WHERE clause
  // This is more performant than multiple OR conditions and is safely parameterized by Drizzle's sql template
  if (clientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
      .where(sql`${clientsTable.id} = ANY(${clientIds})`);
    clients.forEach(c => clientMap.set(c.id, c.name));
  }

  res.json(rooms.map(r => formatRoom(r, r.clientId ? clientMap.get(r.clientId) : null)));
});

router.get("/rooms/occupancy", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  // Rationale: Using sql template for PostgreSQL-specific count(*)::int casting
  // This ensures proper type casting for the aggregation result
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
    sendValidationError(res, params.error.message);
    return;
  }

  const parsed = AssignRoomBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  // Use SELECT FOR UPDATE for atomic assignment
  // Rationale: FOR UPDATE is a PostgreSQL-specific feature for row-level locking that prevents race conditions
  // This raw SQL is necessary because Drizzle ORM does not support SELECT FOR UPDATE syntax
  const roomRows = await db.execute(
    sql`SELECT id, name, status, client_id, session_id, start_time, expires_at FROM rooms WHERE id = ${params.data.id} FOR UPDATE`
  );
  // Type guard: safely extract room from SQL result with null check
  const room = roomRows.rows[0] ? roomRows.rows[0] as typeof roomsTable.$inferSelect : undefined;

  if (!room) {
    sendNotFoundError(res, "Room not found");
    return;
  }
  if (room.status !== "available") {
    sendConflictError(res, "Room is not available");
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
  if (!client) {
    sendNotFoundError(res, "Client not found");
    return;
  }

  const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);
  const customerType: CustomerType = client.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;
  const roomTier = room.qualityTier as RoomQualityTier;

  const { subtotal } = calculatePrice({
    customerType,
    productType: "ROOM",
    startTime: new Date(),
    clientAge,
    hasBirthdayToday,
    roomTier,
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

  let session;
  try {
    session = await db.transaction(async (tx) => {
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
    });
  } catch (error) {
    logTransactionError("room assignment", error, { roomId: room.id, clientId: client.id });
    res.status(500).json({ error: "Failed to assign room" });
    return;
  }

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
    sendValidationError(res, params.error.message);
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room) {
    sendNotFoundError(res, "Room not found");
    return;
  }

  const sessionId = room.sessionId;
  const endTime = new Date();

  try {
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
        // Log waitlist assignment failure but don't fail release operation
        // This is an operational error - the room release should succeed even if waitlist fails
        logger.error({ 
          err: err instanceof Error ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          } : String(err),
          roomId: room.id,
          sessionId,
        }, 'Failed to assign waitlist entry during room release');
      }
    });
  } catch (error) {
    logTransactionError("room release", error, { roomId: room.id, sessionId });
    res.status(500).json({ error: "Failed to release room" });
    return;
  }

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
  if (!params.success) { sendValidationError(res, params.error.message); return; }
  const parsed = RenewRoomBody.safeParse(req.body);
  if (!parsed.success) { sendValidationError(res, parsed.error.message); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room || room.status !== "occupied") { sendValidationError(res, "Room is not occupied"); return; }

  const [client] = room.clientId ? await db.select().from(clientsTable).where(eq(clientsTable.id, room.clientId)) : [null];
  const dob = client ? maybeDecrypt(client.dobEncrypted, client.dobDek) : null;
  const customerType: CustomerType = client?.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const roomTier = room.qualityTier as RoomQualityTier;
  const { subtotal } = calculatePrice({ 
    customerType, 
    productType: "ROOM", 
    startTime: new Date(), 
    clientAge: dob ? calculateAge(dob) : 25, 
    hasBirthdayToday: dob ? isBirthdayToday(dob) : false,
    roomTier,
  });
  const { tax, total } = computeTotal(subtotal);

  if (total > 0) { await processSquarePayment(parsed.data.paymentToken, Math.round(total * 100), parsed.data.idempotencyKey, `Room ${room.name} renewal`); }

  const newExpiresAt = new Date((room.expiresAt ?? new Date()).getTime() + SESSION_DURATION_MS);
  try {
    await db.transaction(async (tx) => {
      await tx.update(roomsTable).set({ expiresAt: newExpiresAt }).where(eq(roomsTable.id, room.id));
      if (room.sessionId) {
        await tx.update(rentalSessionsTable).set({ expiresAt: newExpiresAt }).where(eq(rentalSessionsTable.id, room.sessionId));
        if (client) { await tx.insert(transactionsTable).values({ clientId: client.id, amount: String(subtotal), tax: String(tax), total: String(total), type: "renewal", squarePaymentId: parsed.data.idempotencyKey, description: `Room ${room.name} 6h renewal`, sessionId: room.sessionId }); }
      }
    });
  } catch (error) {
    logTransactionError("room renewal", error, { roomId: room.id, clientId: client?.id });
    res.status(500).json({ error: "Failed to renew room" });
    return;
  }

  const [session] = room.sessionId ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, room.sessionId)) : [null];
  res.json({ id: session?.id ?? 0, clientId: session?.clientId ?? 0, clientName: client?.name ?? null, resourceType: "room", resourceId: room.id, resourceName: room.name, status: "active", startTime: session?.startTime ?? new Date(), expiresAt: newExpiresAt, endTime: null, amountPaid: subtotal });
});

router.post("/rooms/:id/extend", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = ExtendRoomParams.safeParse(req.params);
  if (!params.success) { sendValidationError(res, params.error.message); return; }
  const parsed = ExtendRoomBody.safeParse(req.body);
  if (!parsed.success) { sendValidationError(res, parsed.error.message); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room || room.status !== "occupied") { sendValidationError(res, "Room is not occupied"); return; }

  const [client] = room.clientId ? await db.select().from(clientsTable).where(eq(clientsTable.id, room.clientId)) : [null];
  const dob = client ? maybeDecrypt(client.dobEncrypted, client.dobDek) : null;
  const customerType: CustomerType = client?.membershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const roomTier = room.qualityTier as RoomQualityTier;
  const { subtotal: base } = calculatePrice({ 
    customerType, 
    productType: "ROOM", 
    startTime: new Date(), 
    clientAge: dob ? calculateAge(dob) : 25, 
    hasBirthdayToday: dob ? isBirthdayToday(dob) : false,
    roomTier,
  });
  const subtotal = Math.round((base / EXTENSION_SURCHARGE_DIVISOR) * 100) / 100;
  const { tax, total } = computeTotal(subtotal);

  if (total > 0) { await processSquarePayment(parsed.data.paymentToken, Math.round(total * 100), parsed.data.idempotencyKey, `Room ${room.name} 2h extension`); }

  const newExpiresAt = new Date((room.expiresAt ?? new Date()).getTime() + EXTENSION_DURATION_MS);
  try {
    await db.transaction(async (tx) => {
      await tx.update(roomsTable).set({ expiresAt: newExpiresAt }).where(eq(roomsTable.id, room.id));
      if (room.sessionId) {
        await tx.update(rentalSessionsTable).set({ expiresAt: newExpiresAt }).where(eq(rentalSessionsTable.id, room.sessionId));
        if (client) { await tx.insert(transactionsTable).values({ clientId: client.id, amount: String(subtotal), tax: String(tax), total: String(total), type: "extension", squarePaymentId: parsed.data.idempotencyKey, description: `Room ${room.name} 2h extension`, sessionId: room.sessionId }); }
      }
    });
  } catch (error) {
    logTransactionError("room extension", error, { roomId: room.id, clientId: client?.id });
    res.status(500).json({ error: "Failed to extend room" });
    return;
  }

  const [session] = room.sessionId ? await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, room.sessionId)) : [null];
  res.json({ id: session?.id ?? 0, clientId: session?.clientId ?? 0, clientName: client?.name ?? null, resourceType: "room", resourceId: room.id, resourceName: room.name, status: "active", startTime: session?.startTime ?? new Date(), expiresAt: newExpiresAt, endTime: null, amountPaid: subtotal });
});

router.post("/rooms/bulk-release", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = BulkReleaseRoomsBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { operation, status, resourceIds } = parsed.data;
  const actingUser = (req as AuthRequest).user!;

  // Determine which rooms to release based on operation type
  let roomsToRelease: typeof roomsTable.$inferSelect[] = [];

  if (operation === "all_expired") {
    // Release all rooms where expiresAt is in the past
    roomsToRelease = await db.select().from(roomsTable).where(
      sql`${roomsTable.status} = 'occupied' AND ${roomsTable.expiresAt} < NOW()`
    );
  } else if (operation === "by_status") {
    if (!status) {
      sendValidationError(res, "Status is required for by_status operation");
      return;
    }
    roomsToRelease = await db.select().from(roomsTable).where(eq(roomsTable.status, status as "occupied" | "reserved"));
  } else if (operation === "by_ids") {
    if (!resourceIds || resourceIds.length === 0) {
      sendValidationError(res, "Resource IDs are required for by_ids operation");
      return;
    }
    roomsToRelease = await db.select().from(roomsTable).where(
      sql`${roomsTable.id} = ANY(${resourceIds})`
    );
  }

  const totalRequested = roomsToRelease.length;
  const failed: Array<{ resourceId: number; reason: string }> = [];
  const endTime = new Date();

  // Process each room release in a transaction
  for (const room of roomsToRelease) {
    try {
      await db.transaction(async (tx) => {
        if (room.sessionId) {
          await tx.update(rentalSessionsTable).set({ status: "completed", endTime })
            .where(eq(rentalSessionsTable.id, room.sessionId));
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
          // Log waitlist assignment failure but don't fail release operation
          logger.error({
            err: err instanceof Error ? {
              name: err.name,
              message: err.message,
              stack: err.stack,
            } : String(err),
            roomId: room.id,
          }, 'Failed to assign waitlist entry during bulk room release');
        }
      });

      // Audit log for each individual release
      await writeAuditLog({
        userId: parseInt(actingUser.sub),
        action: "BULK_RELEASE_ROOM",
        resourceType: "room",
        resourceId: room.id,
        description: `Bulk released room ${room.name} (operation: ${operation})`,
      });
    } catch (error) {
      failed.push({ resourceId: room.id, reason: error instanceof Error ? error.message : "Unknown error" });
      logTransactionError("bulk room release", error, { roomId: room.id, operation });
    }
  }

  const totalReleased = totalRequested - failed.length;
  const result = {
    totalRequested,
    totalReleased,
    failed,
  };

  res.json(result);
});

// Atomically assign room to next waitlist entry
export async function assignNextWaitlistEntry(roomId: number): Promise<void> {
  // Rationale: FOR UPDATE is a PostgreSQL-specific feature for row-level locking that prevents race conditions
  // This raw SQL is necessary because Drizzle ORM does not support SELECT FOR UPDATE syntax
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
  // Type guard: safely extract entry from SQL result with null check
  const entry = rows.rows[0] ? rows.rows[0] as { id: number; client_id: number; client_phone: string; client_name: string } : undefined;
  if (!entry) return;

  const confirmBy = new Date(Date.now() + WAITLIST_CONFIRM_MS);
  // Rationale: Using raw SQL with NOW() for timestamp assignment in conjunction with FOR UPDATE locking
  // This ensures atomic assignment of room to waitlist entry with proper timestamps
  await db.execute(
    sql`UPDATE waitlist_entries SET status = 'assigned', assigned_room_id = ${roomId}, assigned_at = NOW(), confirm_by = ${confirmBy} WHERE id = ${entry!.id}`
  );
  await db.update(roomsTable).set({ status: "reserved" }).where(eq(roomsTable.id, roomId));

  if (entry!.client_phone) {
    await sendSms(entry.client_phone, WAITLIST_ROOM_MSG);
  }
}

export default router;
