import { Router } from "express";
import { db, transactionsTable, clientsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { ListTransactionsQueryParams } from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { DEFAULT_PAGE_SIZE } from "../lib/constants";

const router = Router();

router.get("/transactions", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientId, page, limit } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? DEFAULT_PAGE_SIZE);

  const where = clientId ? eq(transactionsTable.clientId, clientId) : undefined;

  const [txns, countResult] = await Promise.all([
    db.select().from(transactionsTable).where(where).orderBy(desc(transactionsTable.createdAt)).limit(limit ?? DEFAULT_PAGE_SIZE).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(transactionsTable).where(where),
  ]);

  const clientIds = [...new Set(txns.map(t => t.clientId))];
  const clientMap = new Map<number, string>();
  if (clientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
      .where(sql`${clientsTable.id} = ANY(${clientIds})`);
    clients.forEach(c => clientMap.set(c.id, c.name));
  }

  const total = countResult[0]?.count ?? 0;
  res.json({
    transactions: txns.map(t => ({
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
    total,
    page: page ?? 1,
    limit: limit ?? DEFAULT_PAGE_SIZE,
  });
});

export default router;
