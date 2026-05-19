import { Router } from "express";
import { db, waitlistTable, clientsTable, roomsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { AddToWaitlistBody, RemoveFromWaitlistParams, ConfirmWaitlistAssignmentParams } from "@workspace/api-zod";

const router = Router();

async function formatEntry(w: typeof waitlistTable.$inferSelect) {
  const [client] = await db.select({ name: clientsTable.name, phone: clientsTable.phone })
    .from(clientsTable).where(eq(clientsTable.id, w.clientId));
  const [room] = w.assignedRoomId
    ? await db.select({ name: roomsTable.name }).from(roomsTable).where(eq(roomsTable.id, w.assignedRoomId))
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
    assignedAt: w.assignedAt,
    confirmBy: w.confirmBy,
    createdAt: w.createdAt,
  };
}

router.get("/waitlist", requireAuth, async (req, res): Promise<void> => {
  const entries = await db.select().from(waitlistTable)
    .where(sql`status NOT IN ('confirmed', 'expired')`)
    .orderBy(waitlistTable.position);
  const formatted = await Promise.all(entries.map(formatEntry));
  res.json(formatted);
});

router.post("/waitlist", requireAuth, async (req, res): Promise<void> => {
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
  const [existing] = await db.select().from(waitlistTable)
    .where(and(eq(waitlistTable.clientId, client.id), sql`status IN ('waiting', 'assigned')`));
  if (existing) {
    res.status(409).json({ error: "Client is already on the waitlist" });
    return;
  }

  // Get next position
  const maxPosResult = await db.execute(sql`SELECT COALESCE(MAX(position), 0) as max_pos FROM waitlist_entries WHERE status IN ('waiting', 'assigned')`);
  const position = ((maxPosResult.rows[0] as { max_pos: number })?.max_pos ?? 0) + 1;

  const [entry] = await db.insert(waitlistTable).values({
    clientId: client.id,
    position,
    status: "waiting",
  }).returning();

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "ADD_WAITLIST",
    resourceType: "waitlist",
    resourceId: entry.id,
    description: `Added ${client.name} to waitlist at position ${position}`,
  });

  res.status(201).json(await formatEntry(entry));
});

router.delete("/waitlist/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = RemoveFromWaitlistParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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

router.post("/waitlist/:id/confirm", requireAuth, async (req, res): Promise<void> => {
  const parsed = ConfirmWaitlistAssignmentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entry] = await db.select().from(waitlistTable).where(eq(waitlistTable.id, parsed.data.id));
  if (!entry) {
    res.status(404).json({ error: "Waitlist entry not found" });
    return;
  }
  if (entry.status !== "assigned") {
    res.status(400).json({ error: "Entry is not in assigned state" });
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
  res.json(await formatEntry(updated[0]));
});

export default router;
