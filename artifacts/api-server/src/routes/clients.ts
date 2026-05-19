import { Router } from "express";
import { db, clientsTable, membershipsTable, rentalSessionsTable, transactionsTable } from "@workspace/db";
import { eq, ilike, or, sql, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { encryptField, decryptField, maybeDecrypt } from "../lib/encryption";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientBody,
  UpdateClientParams,
  DeleteClientParams,
  AddMembershipParams,
  AddMembershipBody,
  GetClientRentalsParams,
  GetClientTransactionsParams,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";
import { apiLimiter } from "../middleware/rateLimit";
import { withCache, buildCacheKey, cacheDel, cacheDelPattern } from "../lib/cache";
import { logTransactionError } from "../lib/logger";
import { DEFAULT_PAGE_SIZE } from "../lib/constants";

const router = Router();

function formatClient(c: typeof clientsTable.$inferSelect, isManager: boolean) {
  const dob = isManager ? maybeDecrypt(c.dobEncrypted, c.dobDek) : (c.dobEncrypted ? "[encrypted]" : null);
  const address = isManager ? maybeDecrypt(c.addressEncrypted, c.addressDek) : (c.addressEncrypted ? "[encrypted]" : null);
  const documentNumber = isManager ? maybeDecrypt(c.documentNumberEncrypted, c.documentNumberDek) : (c.documentNumberEncrypted ? "[encrypted]" : null);

  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    memberId: c.memberId,
    membershipStatus: c.membershipStatus,
    membershipExpiresAt: c.membershipExpiresAt,
    notes: c.notes,
    dob,
    address,
    documentNumber,
    createdAt: c.createdAt,
    activeSessions: [],
  };
}

router.get("/clients", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, membershipStatus, page, limit } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? DEFAULT_PAGE_SIZE);

  let conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(clientsTable.name, `%${search}%`),
        ilike(clientsTable.email, `%${search}%`),
        ilike(clientsTable.phone, `%${search}%`),
        ilike(clientsTable.memberId, `%${search}%`)
      )
    );
  }
  if (membershipStatus) {
    conditions.push(eq(clientsTable.membershipStatus, membershipStatus as "none" | "one_time" | "six_month"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const isManager = (req as AuthRequest).user!.role === "MANAGER";

  // Create cache key for search results
  const cacheKey = buildCacheKey(
    'clients',
    'search',
    search || 'none',
    membershipStatus || 'none',
    (page ?? 1).toString(),
    (limit ?? DEFAULT_PAGE_SIZE).toString()
  );

  // Cache search results with 1-minute TTL
  const result = await withCache(cacheKey, 60, async () => {
    const [clients, countResult] = await Promise.all([
      db.select().from(clientsTable).where(where).orderBy(desc(clientsTable.createdAt)).limit(limit ?? DEFAULT_PAGE_SIZE).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(clientsTable).where(where),
    ]);

    const total = countResult[0]?.count ?? 0;
    const formatted = clients.map(c => formatClient(c, isManager));

    return { clients: formatted, total, page: page ?? 1, limit: limit ?? DEFAULT_PAGE_SIZE };
  });

  res.json(result);
});

router.post("/clients", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;

  // Encrypt PII fields
  let dobEncrypted = null, dobDek = null;
  let addressEncrypted = null, addressDek = null;
  let documentNumberEncrypted = null, documentNumberDek = null;

  if (d.dob) {
    const enc = encryptField(d.dob);
    dobEncrypted = enc.ciphertext;
    dobDek = enc.dek;
  }
  if (d.address) {
    const enc = encryptField(d.address);
    addressEncrypted = enc.ciphertext;
    addressDek = enc.dek;
  }
  if (d.documentNumber) {
    const enc = encryptField(d.documentNumber);
    documentNumberEncrypted = enc.ciphertext;
    documentNumberDek = enc.dek;
  }

  // Generate member ID
  const memberId = `SPF-${nanoid(8).toUpperCase()}`;

  const [client] = await db.insert(clientsTable).values({
    name: d.name,
    email: d.email ?? null,
    phone: d.phone ?? null,
    memberId,
    membershipStatus: (d.membershipStatus as "none" | "one_time" | "six_month") ?? "none",
    notes: d.notes ?? null,
    dobEncrypted,
    dobDek,
    addressEncrypted,
    addressDek,
    documentNumberEncrypted,
    documentNumberDek,
  }).returning();

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "CREATE_CLIENT",
    resourceType: "client",
    resourceId: client.id,
    description: `Created client profile for ${client.name}`,
  });

  // Invalidate client search cache on new client creation
  await cacheDelPattern('clients:search:*');

  const isManager = actingUser.role === "MANAGER";
  res.status(201).json(formatClient(client, isManager));
});

router.get("/clients/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const actingUser = (req as AuthRequest).user!;
  const isManager = actingUser.role === "MANAGER";
  const cacheKey = buildCacheKey('client', params.data.id.toString(), isManager ? 'manager' : 'staff');

  // Cache client lookup with 5-minute TTL
  const cachedClient = await withCache(cacheKey, 300, async () => {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
    if (!client) {
      return null;
    }

    if (isManager && (client.dobEncrypted || client.addressEncrypted || client.documentNumberEncrypted)) {
      await writeAuditLog({
        userId: parseInt(actingUser.sub),
        action: "VIEW_PII",
        resourceType: "client",
        resourceId: client.id,
        description: `Manager viewed PII for client ${client.name}`,
      });
    }

    // Get active sessions
    const activeSessions = await db.select().from(rentalSessionsTable)
      .where(and(eq(rentalSessionsTable.clientId, client.id), eq(rentalSessionsTable.status, "active")));

    const formatted = formatClient(client, isManager);
    formatted.activeSessions = activeSessions.map(s => ({
      id: s.id,
      clientId: s.clientId,
      clientName: client.name,
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      resourceName: s.resourceName,
      status: s.status,
      startTime: s.startTime,
      expiresAt: s.expiresAt,
      endTime: s.endTime,
      amountPaid: s.amountPaid ? parseFloat(s.amountPaid) : null,
    })) as typeof formatted.activeSessions;

    return formatted;
  });

  if (!cachedClient) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(cachedClient);
});

router.patch("/clients/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updates: Record<string, unknown> = {};

  if (d.name != null) updates.name = d.name;
  if (d.email != null) updates.email = d.email;
  if (d.phone != null) updates.phone = d.phone;
  if (d.notes != null) updates.notes = d.notes;
  if (d.membershipStatus != null) updates.membershipStatus = d.membershipStatus;

  if (d.dob) {
    const enc = encryptField(d.dob);
    updates.dobEncrypted = enc.ciphertext;
    updates.dobDek = enc.dek;
  }
  if (d.address) {
    const enc = encryptField(d.address);
    updates.addressEncrypted = enc.ciphertext;
    updates.addressDek = enc.dek;
  }
  if (d.documentNumber) {
    const enc = encryptField(d.documentNumber);
    updates.documentNumberEncrypted = enc.ciphertext;
    updates.documentNumberDek = enc.dek;
  }

  let client: typeof clientsTable.$inferSelect | null = null;
  try {
    client = await db.transaction(async (tx) => {
      const [client] = await tx.update(clientsTable).set(updates).where(eq(clientsTable.id, params.data.id)).returning();
      if (!client) {
        throw new Error("Client not found");
      }
      return client;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Client not found") {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    logTransactionError("client update", error, { clientId: params.data.id });
    throw error;
  }

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "UPDATE_CLIENT",
    resourceType: "client",
    resourceId: client.id,
    description: `Updated client ${client.name}`,
  });

  // Invalidate cache for this client (both manager and staff versions)
  await cacheDel(buildCacheKey('client', client.id.toString(), 'manager'));
  await cacheDel(buildCacheKey('client', client.id.toString(), 'staff'));
  // Invalidate client search cache
  await cacheDelPattern('clients:search:*');

  res.json(formatClient(client, actingUser.role === "MANAGER"));
});

router.delete("/clients/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id));

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "DELETE_CLIENT",
    resourceType: "client",
    resourceId: params.data.id,
    description: `Deleted client ${client.name}`,
  });

  // Invalidate cache for this client (both manager and staff versions)
  await cacheDel(buildCacheKey('client', params.data.id.toString(), 'manager'));
  await cacheDel(buildCacheKey('client', params.data.id.toString(), 'staff'));
  // Invalidate client search cache
  await cacheDelPattern('clients:search:*');

  res.sendStatus(204);
});

router.post("/clients/:id/memberships", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = AddMembershipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const { type } = parsed.data;
  const purchasedAt = new Date();
  let expiresAt: Date | null = null;
  if (type === "six_month") {
    expiresAt = new Date(purchasedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 6);
  }

  const membership = await db.transaction(async (tx) => {
    const [membership] = await tx.insert(membershipsTable).values({
      clientId: client.id,
      type: type as "one_time" | "six_month",
      purchasedAt,
      expiresAt,
    }).returning();

    // Update client membership status
    await tx.update(clientsTable).set({
      membershipStatus: type as "one_time" | "six_month",
      membershipExpiresAt: expiresAt,
    }).where(eq(clientsTable.id, client.id));

    return membership;
  }).catch((error) => {
    logTransactionError("membership addition", error, { clientId: client.id, type });
    throw error;
  });

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "ADD_MEMBERSHIP",
    resourceType: "client",
    resourceId: client.id,
    description: `Added ${type} membership for client ${client.name}`,
  });

  // Invalidate cache for this client (both manager and staff versions)
  await cacheDel(buildCacheKey('client', client.id.toString(), 'manager'));
  await cacheDel(buildCacheKey('client', client.id.toString(), 'staff'));
  // Invalidate client search cache
  await cacheDelPattern('clients:search:*');

  res.status(201).json({
    id: membership.id,
    clientId: membership.clientId,
    type: membership.type,
    purchasedAt: membership.purchasedAt,
    expiresAt: membership.expiresAt,
  });
});

router.get("/clients/:id/rentals", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetClientRentalsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sessions = await db.select().from(rentalSessionsTable)
    .where(eq(rentalSessionsTable.clientId, params.data.id))
    .orderBy(desc(rentalSessionsTable.startTime));

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, params.data.id));

  res.json(sessions.map(s => ({
    id: s.id,
    clientId: s.clientId,
    clientName: client?.name ?? null,
    resourceType: s.resourceType,
    resourceId: s.resourceId,
    resourceName: s.resourceName,
    status: s.status,
    startTime: s.startTime,
    expiresAt: s.expiresAt,
    endTime: s.endTime,
    amountPaid: s.amountPaid ? parseFloat(s.amountPaid) : null,
  })));
});

router.get("/clients/:id/transactions", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetClientTransactionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.clientId, params.data.id))
    .orderBy(desc(transactionsTable.createdAt));

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, params.data.id));

  res.json(txns.map(t => ({
    id: t.id,
    clientId: t.clientId,
    clientName: client?.name ?? null,
    amount: parseFloat(t.amount),
    tax: parseFloat(t.tax),
    total: parseFloat(t.total),
    type: t.type,
    squarePaymentId: t.squarePaymentId,
    description: t.description,
    createdAt: t.createdAt,
  })));
});

export default router;
