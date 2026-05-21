import { Router } from "express";
import { db, waitlistTable, clientsTable, roomsTable, lockersTable, rentalSessionsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { AddToWaitlistBody, RemoveFromWaitlistParams, ConfirmWaitlistAssignmentParams } from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { sendValidationError, sendNotFoundError } from "../lib/response-formatters";

const router = Router();

/**
 * Formats a waitlist entry for API response using pre-loaded client, room, and locker maps
 * Used for batch operations to avoid N+1 queries
 *
 * @param w - The waitlist entry record from the database
 * @param clientMap - Map of client IDs to client data (name, phone)
 * @param roomMap - Map of room IDs to room names
 * @param lockerMap - Map of locker IDs to locker names
 * @returns Formatted waitlist entry for API response
 */
function formatEntry(w: typeof waitlistTable.$inferSelect, clientMap: Map<number, { name: string; phone: string | null }>, roomMap: Map<number, string>, lockerMap: Map<number, string>) {
  const client = clientMap.get(w.clientId);
  const room = w.assignedRoomId ? roomMap.get(w.assignedRoomId) : null;
  const locker = w.currentLockerId ? lockerMap.get(w.currentLockerId) : null;
  return {
    id: w.id,
    clientId: w.clientId,
    clientName: client?.name ?? null,
    clientPhone: client?.phone ?? null,
    position: w.position,
    status: w.status,
    assignedRoomId: w.assignedRoomId,
    assignedRoomName: room ?? null,
    currentLockerId: w.currentLockerId,
    currentLockerName: locker ?? null,
    assignedAt: w.assignedAt,
    confirmBy: w.confirmBy,
    createdAt: w.createdAt,
  };
}

/**
 * Formats a waitlist entry for API response with database lookups
 * Used for single entry operations where pre-loading maps is not feasible
 *
 * @param w - The waitlist entry record from the database
 * @returns Formatted waitlist entry for API response
 */
async function formatEntrySingle(w: typeof waitlistTable.$inferSelect) {
  const [client] = await db.select({ name: clientsTable.name, phone: clientsTable.phone })
    .from(clientsTable).where(eq(clientsTable.id, w.clientId));
  const [room] = w.assignedRoomId
    ? await db.select({ name: roomsTable.name }).from(roomsTable).where(eq(roomsTable.id, w.assignedRoomId))
    : [null];
  const [locker] = w.currentLockerId
    ? await db.select({ name: lockersTable.name }).from(lockersTable).where(eq(lockersTable.id, w.currentLockerId))
    : [null];
  return {
    id: w.id,
    clientId: w.clientId,
    clientName: client?.name ?? null,
    clientPhone: client?.phone ?? null,
    position: w.position,
    status: w.status,
    assignedRoomId: w.assignedRoomId,
    assignedRoomName: room?.name ?? null,
    currentLockerId: w.currentLockerId,
    currentLockerName: locker?.name ?? null,
    assignedAt: w.assignedAt,
    confirmBy: w.confirmBy,
    createdAt: w.createdAt,
  };
}

router.get("/waitlist", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  // Rationale: Using raw SQL for NOT IN clause - could be replaced with Drizzle's notIn() operator
  // Keeping as raw SQL for consistency with other PostgreSQL-specific patterns in this file
  const entries = await db.select().from(waitlistTable)
    .where(sql`status NOT IN ('confirmed', 'expired')`)
    .orderBy(waitlistTable.position);

  // Batch fetch client data
  const clientIds = [...new Set(entries.map(e => e.clientId))];
  const clientMap = new Map<number, { name: string; phone: string | null }>();
  // Rationale: Using PostgreSQL ANY() operator for efficient array comparison in WHERE clause
  // This is more performant than multiple OR conditions and is safely parameterized by Drizzle's sql template
  if (clientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name, phone: clientsTable.phone })
      .from(clientsTable)
      .where(sql`${clientsTable.id} = ANY(${clientIds})`);
    clients.forEach(c => clientMap.set(c.id, { name: c.name, phone: c.phone }));
  }

  // Batch fetch room data
  const roomIds = [...new Set(entries.map(e => e.assignedRoomId).filter((id): id is number => id !== null))];
  const roomMap = new Map<number, string>();
  // Rationale: Using PostgreSQL ANY() operator for efficient array comparison in WHERE clause
  // This is more performant than multiple OR conditions and is safely parameterized by Drizzle's sql template
  if (roomIds.length > 0) {
    const rooms = await db.select({ id: roomsTable.id, name: roomsTable.name })
      .from(roomsTable)
      .where(sql`${roomsTable.id} = ANY(${roomIds})`);
    rooms.forEach(r => roomMap.set(r.id, r.name));
  }

  // Batch fetch locker data
  const lockerIds = [...new Set(entries.map(e => e.currentLockerId).filter((id): id is number => id !== null))];
  const lockerMap = new Map<number, string>();
  if (lockerIds.length > 0) {
    const lockers = await db.select({ id: lockersTable.id, name: lockersTable.name })
      .from(lockersTable)
      .where(sql`${lockersTable.id} = ANY(${lockerIds})`);
    lockers.forEach(l => lockerMap.set(l.id, l.name));
  }

  const formatted = entries.map(e => formatEntry(e, clientMap, roomMap, lockerMap));
  res.json(formatted);
});

router.post("/waitlist", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = AddToWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  // Check if already on waitlist
  // Rationale: Using raw SQL for IN clause - could be replaced with Drizzle's inArray() operator
  // Keeping as raw SQL for consistency with other PostgreSQL-specific patterns in this file
  const [existing] = await db.select().from(waitlistTable)
    .where(and(eq(waitlistTable.clientId, client.id), sql`status IN ('waiting', 'assigned')`));
  if (existing) {
    res.status(409).json({ error: "Client is already on the waitlist" });
    return;
  }

  // Get next position
  // Rationale: Using raw SQL for MAX aggregation is more efficient than fetching all positions
  // This could be replaced with Drizzle ORM but the raw SQL is clear and performant
  const maxPosResult = await db.execute(sql`SELECT COALESCE(MAX(position), 0) as max_pos FROM waitlist_entries WHERE status IN ('waiting', 'assigned')`);
  const position = ((maxPosResult.rows[0] as { max_pos: number })?.max_pos ?? 0) + 1;

  // Check if client has an active locker rental
  const [activeRental] = await db.select({ resourceId: rentalSessionsTable.resourceId })
    .from(rentalSessionsTable)
    .where(and(
      eq(rentalSessionsTable.clientId, client.id),
      eq(rentalSessionsTable.status, "active"),
      eq(rentalSessionsTable.resourceType, "locker")
    ));
  const currentLockerId = activeRental?.resourceId ?? null;

  const [entry] = await db.insert(waitlistTable).values({
    clientId: client.id,
    position,
    status: "waiting",
    currentLockerId,
  }).returning();

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "ADD_WAITLIST",
    resourceType: "waitlist",
    resourceId: entry.id,
    description: `Added ${client.name} to waitlist at position ${position}`,
  });

  res.status(201).json(await formatEntrySingle(entry));
});

router.delete("/waitlist/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = RemoveFromWaitlistParams.safeParse(req.params);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  // Check if waitlist entry exists
  const [entry] = await db.select().from(waitlistTable).where(eq(waitlistTable.id, parsed.data.id));
  if (!entry) {
    sendNotFoundError(res, "Waitlist entry not found");
    return;
  }

  await db.delete(waitlistTable).where(eq(waitlistTable.id, parsed.data.id));

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "REMOVE_WAITLIST",
    resourceType: "waitlist",
    resourceId: parsed.data.id,
    description: `Removed waitlist entry ${parsed.data.id}`,
  });

  res.sendStatus(204);
});

router.post("/waitlist/:id/confirm", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ConfirmWaitlistAssignmentParams.safeParse(req.params);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const [entry] = await db.select().from(waitlistTable).where(eq(waitlistTable.id, parsed.data.id));
  if (!entry) {
    sendNotFoundError(res, "Waitlist entry not found");
    return;
  }
  if (entry.status !== "assigned") {
    sendValidationError(res, "Entry is not in assigned state");
    return;
  }

  await db.update(waitlistTable).set({ status: "confirmed" }).where(eq(waitlistTable.id, entry.id));

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "CONFIRM_WAITLIST",
    resourceType: "waitlist",
    resourceId: entry.id,
    description: `Confirmed waitlist assignment for entry ${entry.id}`,
  });

  const updated = await db.select().from(waitlistTable).where(eq(waitlistTable.id, entry.id));
  res.json(await formatEntrySingle(updated[0]));
});

export default router;
