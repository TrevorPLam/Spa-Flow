// @ts-nocheck
import { Router } from "express";
import { db, lockersTable, roomsTable, transactionsTable, rentalSessionsTable, waitlistTable, clientsTable } from "@workspace/db";
import { sql, eq, gte, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { apiLimiter } from "../middleware/rateLimit";
import { LOCKER_TOTAL, ROOM_TOTAL } from "../lib/constants";

const router = Router();

router.get("/dashboard", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [lockerStats, roomStats, revenueResult, activeClientsResult, waitlistCount, recentTxns, activeRentals] = await Promise.all([
    db.select({ status: lockersTable.status, count: sql<number>`count(*)::int` }).from(lockersTable).groupBy(lockersTable.status),
    db.select({ status: roomsTable.status, count: sql<number>`count(*)::int` }).from(roomsTable).groupBy(roomsTable.status),
    db.select({ total: sql<number>`COALESCE(SUM(total::numeric), 0)::float` }).from(transactionsTable).where(gte(transactionsTable.createdAt, today)),
    db.select({ count: sql<number>`count(distinct client_id)::int` }).from(rentalSessionsTable).where(eq(rentalSessionsTable.status, "active")),
    db.select({ count: sql<number>`count(*)::int` }).from(waitlistTable).where(sql`status IN ('waiting', 'assigned')`),
    db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(10),
    db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.status, "active")).orderBy(desc(rentalSessionsTable.startTime)).limit(20),
  ]);

  const lockerOccupancy = { total: LOCKER_TOTAL, available: 0, occupied: 0, reserved: 0 };
  lockerStats.forEach(s => { if (s.status === "available") lockerOccupancy.available = s.count; else if (s.status === "occupied") lockerOccupancy.occupied = s.count; else lockerOccupancy.reserved = s.count; });

  const roomOccupancy = { total: ROOM_TOTAL, available: 0, occupied: 0, reserved: 0 };
  roomStats.forEach(s => { if (s.status === "available") roomOccupancy.available = s.count; else if (s.status === "occupied") roomOccupancy.occupied = s.count; else roomOccupancy.reserved = s.count; });

  // Fetch client names for recent transactions
  const clientIds = [...new Set(recentTxns.map(t => t.clientId))];
  const clientMap = new Map<number, string>();
  if (clientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable).where(sql`${clientsTable.id} = ANY(${clientIds})`);
    clients.forEach(c => clientMap.set(c.id, c.name));
  }

  const rentalClientIds = [...new Set(activeRentals.map(r => r.clientId))];
  const rentalClientMap = new Map<number, string>();
  if (rentalClientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable).where(sql`${clientsTable.id} = ANY(${rentalClientIds})`);
    clients.forEach(c => rentalClientMap.set(c.id, c.name));
  }

  res.json({
    lockerOccupancy,
    roomOccupancy,
    todayRevenue: revenueResult[0]?.total ?? 0,
    activeClients: activeClientsResult[0]?.count ?? 0,
    waitlistCount: waitlistCount[0]?.count ?? 0,
    recentTransactions: recentTxns.map(t => ({
      id: t.id,
      clientId: t.clientId,
      clientName: clientMap.get(t.clientId) ?? null,
      amount: parseFloat(t.amount),
      tax: parseFloat(t.tax),
      total: parseFloat(t.total),
      type: t.type,
      squarePaymentId: t.squarePaymentId,
      description: t.description,
      createdAt: t.createdAt,
    })),
    activeRentals: activeRentals.map(r => ({
      id: r.id,
      clientId: r.clientId,
      clientName: rentalClientMap.get(r.clientId) ?? null,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      resourceName: r.resourceName,
      status: r.status,
      startTime: r.startTime,
      expiresAt: r.expiresAt,
      endTime: r.endTime,
      amountPaid: r.amountPaid ? parseFloat(r.amountPaid) : null,
    })),
  });
});

export default router;
