import { Router } from "express";
import { db, transactionsTable, clientsTable, transactionItemsTable, productsTable } from "@workspace/db";
import { eq, sql, desc, and, gte, lte, inArray } from "drizzle-orm";
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

  const { clientId, type, status, minAmount, maxAmount, startDate, endDate, productCategory, page, limit } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? DEFAULT_PAGE_SIZE);

  const conditions = [];
  if (clientId) conditions.push(eq(transactionsTable.clientId, clientId));
  if (type) conditions.push(eq(transactionsTable.type, type as any));
  if (status) conditions.push(eq(transactionsTable.status, status as any));
  if (minAmount !== undefined) conditions.push(gte(transactionsTable.amount, minAmount.toString()));
  if (maxAmount !== undefined) conditions.push(lte(transactionsTable.amount, maxAmount.toString()));
  if (startDate) conditions.push(gte(transactionsTable.createdAt, startDate));
  if (endDate) conditions.push(lte(transactionsTable.createdAt, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let txns: typeof transactionsTable.$inferSelect[];
  let countResult: { count: number }[];

  // If productCategory filter is applied, we need to join with transaction_items and products
  if (productCategory) {
    // Get product IDs that match the category
    const matchingProducts = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.category, productCategory));
    
    const productIds = matchingProducts.map(p => p.id);
    
    if (productIds.length === 0) {
      // No products match the category, return empty results
      txns = [];
      countResult = [{ count: 0 }];
    } else {
      // Get transaction IDs that have products in this category
      const matchingTransactionItems = await db
        .select({ transactionId: transactionItemsTable.transactionId })
        .from(transactionItemsTable)
        .where(inArray(transactionItemsTable.productId, productIds));
      
      const transactionIds = matchingTransactionItems.map(ti => ti.transactionId);
      
      // Add transaction ID filter to conditions
      const finalWhere = transactionIds.length > 0 
        ? and(where, inArray(transactionsTable.id, transactionIds))
        : and(where, sql`${transactionsTable.id} = -1`); // Force no results if no matching transactions
      
      [txns, countResult] = await Promise.all([
        db.select().from(transactionsTable).where(finalWhere).orderBy(desc(transactionsTable.createdAt)).limit(limit ?? DEFAULT_PAGE_SIZE).offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(transactionsTable).where(finalWhere),
      ]);
    }
  } else {
    [txns, countResult] = await Promise.all([
      db.select().from(transactionsTable).where(where).orderBy(desc(transactionsTable.createdAt)).limit(limit ?? DEFAULT_PAGE_SIZE).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(transactionsTable).where(where),
    ]);
  }

  const clientIds = [...new Set(txns.map(t => t.clientId))];
  const clientMap = new Map<number, string>();
  if (clientIds.length > 0) {
    const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
      .where(inArray(clientsTable.id, clientIds));
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
      status: t.status,
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
