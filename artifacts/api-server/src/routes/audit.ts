import { Router } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import { requireManager } from "../lib/auth";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";

const router = Router();

router.get("/audit-logs", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ListAuditLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { startDate, endDate, page, limit, action, userId } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? 50);

  const conditions = [];
  if (action) conditions.push(sql`${auditLogsTable.action} ILIKE ${'%' + action + '%'}`);
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  if (startDate) conditions.push(gte(auditLogsTable.createdAt, startDate));
  if (endDate) conditions.push(lte(auditLogsTable.createdAt, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db.select().from(auditLogsTable).where(where).orderBy(desc(auditLogsTable.createdAt)).limit(limit ?? 50).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
  ]);

  const userIds = [...new Set(logs.map(l => l.userId))];
  const userMap = new Map<number, string>();
  if (userIds.length > 0) {
    const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
      .where(sql`${usersTable.id} = ANY(${userIds})`);
    users.forEach(u => userMap.set(u.id, u.name));
  }

  const total = countResult[0]?.count ?? 0;
  res.json({
    logs: logs.map(l => ({
      id: l.id,
      userId: l.userId,
      userName: l.userId != null ? userMap.get(l.userId) ?? null : null,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      description: l.description,
      createdAt: l.createdAt,
    })),
    total,
    page: page ?? 1,
    limit: limit ?? 50,
  });
});

export default router;
