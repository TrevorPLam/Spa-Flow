import { Router } from "express";
import { db, clientsTable, membershipsTable, rentalSessionsTable, transactionsTable } from "@workspace/db";
import { eq, ilike, or, sql, and, desc, gte, lte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { encryptField, maybeDecrypt } from "../lib/encryption";
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
  RenewMembershipParams,
  RenewMembershipBody,
  GetClientRentalProductsParams,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";
import { apiLimiter, piiLimiter } from "../middleware/rateLimit";
import { withCache, buildCacheKey, cacheDel, cacheDelPattern } from "../lib/cache";
import { logTransactionError, logger } from "../lib/logger";
import { DEFAULT_PAGE_SIZE, MEMBERSHIP_ONE_TIME_COST, MEMBERSHIP_SIX_MONTH_COST } from "../lib/constants";
import { sendValidationError, sendNotFoundError, sendConflictError } from "../lib/response-formatters";
import { processSquarePayment } from "../lib/square";

const router = Router();

/**
 * Formats a client record for API response
 * Decrypts PII (DOB, address, document number) only for manager role
 * Returns placeholder "[encrypted]" for non-managers
 *
 * @param c - The client record from the database
 * @param isManager - Whether the requesting user has manager role
 * @returns Formatted client object for API response
 */
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
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { 
    search, 
    membershipStatus, 
    preset,
    startDate, 
    endDate, 
    lastVisitAfter, 
    lastVisitBefore, 
    minVisits, 
    maxVisits, 
    minSpent, 
    maxSpent, 
    page, 
    limit 
  } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? DEFAULT_PAGE_SIZE);

  // Apply preset filters if provided (presets override individual parameters)
  let effectiveMembershipStatus = membershipStatus;
  let effectiveLastVisitAfter = lastVisitAfter;
  let effectiveLastVisitBefore = lastVisitBefore;
  let effectiveMinVisits = minVisits;
  let effectiveMaxVisits = maxVisits;
  let effectiveMinSpent = minSpent;
  let effectiveMaxSpent = maxSpent;

  if (preset) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    switch (preset) {
      case "active_members":
        effectiveMembershipStatus = "six_month" as const;
        break;
      case "expired_members":
        effectiveMembershipStatus = "none" as const;
        effectiveLastVisitBefore = ninetyDaysAgo;
        break;
      case "high_value":
        effectiveMinSpent = 500;
        break;
      case "recent_visitors":
        effectiveLastVisitAfter = thirtyDaysAgo;
        break;
      case "inactive":
        effectiveLastVisitBefore = sixtyDaysAgo;
        break;
    }
  }

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
  if (effectiveMembershipStatus) {
    conditions.push(eq(clientsTable.membershipStatus, effectiveMembershipStatus as "none" | "one_time" | "six_month"));
  }
  if (startDate) {
    conditions.push(gte(clientsTable.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(clientsTable.createdAt, endDate));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const isManager = (req as AuthRequest).user!.role === "MANAGER";

  // Create cache key for search results
  const cacheKey = buildCacheKey(
    'clients',
    'search',
    search || 'none',
    effectiveMembershipStatus || 'none',
    preset || 'none',
    startDate?.toISOString() || 'none',
    endDate?.toISOString() || 'none',
    effectiveLastVisitAfter?.toISOString() || 'none',
    effectiveLastVisitBefore?.toISOString() || 'none',
    (effectiveMinVisits ?? 'none').toString(),
    (effectiveMaxVisits ?? 'none').toString(),
    (effectiveMinSpent ?? 'none').toString(),
    (effectiveMaxSpent ?? 'none').toString(),
    (page ?? 1).toString(),
    (limit ?? DEFAULT_PAGE_SIZE).toString()
  );

  // Cache search results with 1-minute TTL
  const result = await withCache(cacheKey, 60, async () => {
    // Get base client list with basic filters
    const [clients, countResult] = await Promise.all([
      db.select().from(clientsTable).where(where).orderBy(desc(clientsTable.createdAt)).limit(limit ?? DEFAULT_PAGE_SIZE).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(clientsTable).where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    // Apply advanced filters that require subqueries
    let filteredClients = clients;
    
    // Filter by last visit date
    if (effectiveLastVisitAfter || effectiveLastVisitBefore) {
      const clientIds = clients.map(c => c.id);
      const lastVisits = await db
        .select({
          clientId: rentalSessionsTable.clientId,
          lastVisit: sql<string>`MAX(${rentalSessionsTable.startTime})`.as('lastVisit')
        })
        .from(rentalSessionsTable)
        .where(sql`${rentalSessionsTable.clientId} = ANY(${clientIds})`)
        .groupBy(rentalSessionsTable.clientId);
      
      const lastVisitMap = new Map(lastVisits.map(lv => [lv.clientId, new Date(lv.lastVisit)]));
      
      filteredClients = filteredClients.filter(c => {
        const lastVisit = lastVisitMap.get(c.id);
        if (!lastVisit) return false;
        if (effectiveLastVisitAfter && lastVisit < effectiveLastVisitAfter) return false;
        if (effectiveLastVisitBefore && lastVisit > effectiveLastVisitBefore) return false;
        return true;
      });
    }

    // Filter by total visits
    if (effectiveMinVisits !== undefined || effectiveMaxVisits !== undefined) {
      const clientIds = filteredClients.map(c => c.id);
      const visitCounts = await db
        .select({
          clientId: rentalSessionsTable.clientId,
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(rentalSessionsTable)
        .where(sql`${rentalSessionsTable.clientId} = ANY(${clientIds})`)
        .groupBy(rentalSessionsTable.clientId);
      
      const visitCountMap = new Map(visitCounts.map(vc => [vc.clientId, vc.count]));
      
      filteredClients = filteredClients.filter(c => {
        const count = visitCountMap.get(c.id) ?? 0;
        if (effectiveMinVisits !== undefined && count < effectiveMinVisits) return false;
        if (effectiveMaxVisits !== undefined && count > effectiveMaxVisits) return false;
        return true;
      });
    }

    // Filter by total spent
    if (effectiveMinSpent !== undefined || effectiveMaxSpent !== undefined) {
      const clientIds = filteredClients.map(c => c.id);
      const totalSpent = await db
        .select({
          clientId: transactionsTable.clientId,
          total: sql<number>`SUM(${transactionsTable.total})`.as('total')
        })
        .from(transactionsTable)
        .where(
          and(
            sql`${transactionsTable.clientId} = ANY(${clientIds})`,
            eq(transactionsTable.status, "completed")
          )
        )
        .groupBy(transactionsTable.clientId);
      
      const totalSpentMap = new Map<number, number>();
      for (const ts of totalSpent) {
        // @ts-expect-error - Drizzle typing mismatch: clientId is number at runtime
        totalSpentMap.set(ts.clientId, parseFloat(ts.total));
      }
      
      filteredClients = filteredClients.filter(c => {
        const spent = totalSpentMap.get(c.id) ?? 0;
        if (effectiveMinSpent !== undefined && spent < effectiveMinSpent) return false;
        if (effectiveMaxSpent !== undefined && spent > effectiveMaxSpent) return false;
        return true;
      });
    }

    const formatted = filteredClients.map(c => formatClient(c, isManager));

    return { clients: formatted, total, page: page ?? 1, limit: limit ?? DEFAULT_PAGE_SIZE };
  });

  res.json(result);
});

/**
 * GET /clients/suggest
 * Get client name suggestions for autocomplete
 * Returns suggestions based on partial input, prioritizing recent clients
 */
router.get("/clients/suggest", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const { q, limit } = req.query;
  
  if (!q || typeof q !== "string") {
    sendValidationError(res, "Query parameter 'q' is required");
    return;
  }

  const suggestionLimit = limit ? parseInt(limit as string) : 10;
  const searchTerm = `%${q}%`;

  // Get recent clients that match the search term
  const suggestions = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      email: clientsTable.email,
      phone: clientsTable.phone,
      memberId: clientsTable.memberId,
    })
    .from(clientsTable)
    .where(
      or(
        ilike(clientsTable.name, searchTerm),
        ilike(clientsTable.email, searchTerm),
        ilike(clientsTable.phone, searchTerm),
        ilike(clientsTable.memberId, searchTerm)
      )
    )
    .orderBy(desc(clientsTable.createdAt))
    .limit(suggestionLimit);

  res.json(suggestions);
});

/**
 * GET /clients/export
 * Export client search results to CSV
 * Exports client search results as a CSV file for spreadsheet import
 */
router.get("/clients/export", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { 
    search, 
    membershipStatus, 
    preset,
    startDate, 
    endDate, 
    lastVisitAfter, 
    lastVisitBefore, 
    minVisits, 
    maxVisits, 
    minSpent, 
    maxSpent 
  } = parsed.data;

  // Apply preset filters if provided (presets override individual parameters)
  let effectiveMembershipStatus = membershipStatus;
  let effectiveLastVisitAfter = lastVisitAfter;
  let effectiveLastVisitBefore = lastVisitBefore;
  let effectiveMinVisits = minVisits;
  let effectiveMaxVisits = maxVisits;
  let effectiveMinSpent = minSpent;
  let effectiveMaxSpent = maxSpent;

  if (preset) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    switch (preset) {
      case "active_members":
        effectiveMembershipStatus = "six_month" as const;
        break;
      case "expired_members":
        effectiveMembershipStatus = "none" as const;
        effectiveLastVisitBefore = ninetyDaysAgo;
        break;
      case "high_value":
        effectiveMinSpent = 500;
        break;
      case "recent_visitors":
        effectiveLastVisitAfter = thirtyDaysAgo;
        break;
      case "inactive":
        effectiveLastVisitBefore = sixtyDaysAgo;
        break;
    }
  }

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
  if (effectiveMembershipStatus) {
    conditions.push(eq(clientsTable.membershipStatus, effectiveMembershipStatus as "none" | "one_time" | "six_month"));
  }
  if (startDate) {
    conditions.push(gte(clientsTable.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(clientsTable.createdAt, endDate));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get all clients matching the base filters (no pagination for export)
  const clients = await db
    .select()
    .from(clientsTable)
    .where(where)
    .orderBy(desc(clientsTable.createdAt));

  // Apply advanced filters that require subqueries
  let filteredClients = clients;
  
  // Filter by last visit date
  if (effectiveLastVisitAfter || effectiveLastVisitBefore) {
    const clientIds = clients.map(c => c.id);
    const lastVisits = await db
      .select({
        clientId: rentalSessionsTable.clientId,
        lastVisit: sql<string>`MAX(${rentalSessionsTable.startTime})`.as('lastVisit')
      })
      .from(rentalSessionsTable)
      .where(sql`${rentalSessionsTable.clientId} = ANY(${clientIds})`)
      .groupBy(rentalSessionsTable.clientId);
    
    const lastVisitMap = new Map(lastVisits.map(lv => [lv.clientId, new Date(lv.lastVisit)]));
    
    filteredClients = filteredClients.filter(c => {
      const lastVisit = lastVisitMap.get(c.id);
      if (!lastVisit) return false;
      if (effectiveLastVisitAfter && lastVisit < effectiveLastVisitAfter) return false;
      if (effectiveLastVisitBefore && lastVisit > effectiveLastVisitBefore) return false;
      return true;
    });
  }

  // Filter by total visits
  if (effectiveMinVisits !== undefined || effectiveMaxVisits !== undefined) {
    const clientIds = filteredClients.map(c => c.id);
    const visitCounts = await db
      .select({
        clientId: rentalSessionsTable.clientId,
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(rentalSessionsTable)
      .where(sql`${rentalSessionsTable.clientId} = ANY(${clientIds})`)
      .groupBy(rentalSessionsTable.clientId);
    
    const visitCountMap = new Map(visitCounts.map(vc => [vc.clientId, vc.count]));
    
    filteredClients = filteredClients.filter(c => {
      const count = visitCountMap.get(c.id) ?? 0;
      if (effectiveMinVisits !== undefined && count < effectiveMinVisits) return false;
      if (effectiveMaxVisits !== undefined && count > effectiveMaxVisits) return false;
      return true;
    });
  }

  // Filter by total spent
  if (effectiveMinSpent !== undefined || effectiveMaxSpent !== undefined) {
    const clientIds = filteredClients.map(c => c.id);
    const totalSpent = await db
      .select({
        clientId: transactionsTable.clientId,
        total: sql<number>`SUM(${transactionsTable.total})`.as('total')
      })
      .from(transactionsTable)
      .where(
        and(
          sql`${transactionsTable.clientId} = ANY(${clientIds})`,
          eq(transactionsTable.status, "completed")
        )
      )
      .groupBy(transactionsTable.clientId);
    
    const totalSpentMap = new Map<number, number>();
    for (const ts of totalSpent) {
      // @ts-expect-error - Drizzle typing mismatch: clientId is number at runtime
      totalSpentMap.set(ts.clientId, parseFloat(ts.total));
    }
    
    filteredClients = filteredClients.filter(c => {
      const spent = totalSpentMap.get(c.id) ?? 0;
      if (effectiveMinSpent !== undefined && spent < effectiveMinSpent) return false;
      if (effectiveMaxSpent !== undefined && spent > effectiveMaxSpent) return false;
      return true;
    });
  }

  // Generate CSV
  const headers = ["ID", "Name", "Email", "Phone", "Member ID", "Membership Status", "Membership Expires", "Created At"];
  const csvRows = [headers.join(",")];

  for (const client of filteredClients) {
    const row = [
      client.id,
      `"${client.name.replace(/"/g, '""')}"`, // Escape quotes
      client.email ? `"${client.email.replace(/"/g, '""')}"` : "",
      client.phone ? `"${client.phone.replace(/"/g, '""')}"` : "",
      client.memberId ? `"${client.memberId.replace(/"/g, '""')}"` : "",
      client.membershipStatus,
      client.membershipExpiresAt ? client.membershipExpiresAt.toISOString().split('T')[0] : "",
      client.createdAt.toISOString().split('T')[0],
    ];
    csvRows.push(row.join(","));
  }

  const csv = csvRows.join("\n");
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

router.post("/clients", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
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
    sendValidationError(res, params.error.message);
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
    sendNotFoundError(res, "Client not found");
    return;
  }

  res.json(cachedClient);
});

router.patch("/clients/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
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
      sendNotFoundError(res, "Client not found");
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
    sendValidationError(res, params.error.message);
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    sendNotFoundError(res, "Client not found");
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
    sendValidationError(res, params.error.message);
    return;
  }

  const parsed = AddMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    sendNotFoundError(res, "Client not found");
    return;
  }

  const { type } = parsed.data;
  const purchasedAt = new Date();
  let expiresAt: Date | null = null;
  if (type === "six_month") {
    expiresAt = new Date(purchasedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 6);
  }

  let membership;
  try {
    membership = await db.transaction(async (tx) => {
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
    });
  } catch (error) {
    logTransactionError("membership addition", error, { clientId: client.id, type });
    res.status(500).json({ error: "Failed to add membership" });
    return;
  }

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

/**
 * POST /clients/:id/memberships/renew
 * Renew an expired membership with payment processing
 * Only allows renewal for expired memberships
 * Creates new membership record, updates client status, and creates transaction
 */
router.post("/clients/:id/memberships/renew", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = RenewMembershipParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const parsed = RenewMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { membershipType, paymentToken, idempotencyKey } = parsed.data;

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    sendNotFoundError(res, "Client not found");
    return;
  }

  // Validate membership is expired
  const now = new Date();
  const isExpired = client.membershipStatus !== "none" && client.membershipExpiresAt && new Date(client.membershipExpiresAt) < now;
  const hasNoMembership = client.membershipStatus === "none";

  if (!isExpired && !hasNoMembership) {
    sendConflictError(res, "Membership is not expired and cannot be renewed");
    return;
  }

  // Calculate membership cost
  const membershipCost = membershipType === "one_time" ? MEMBERSHIP_ONE_TIME_COST : MEMBERSHIP_SIX_MONTH_COST;
  const taxRate = 0.08875; // TODO: Use from constants/env
  const tax = membershipCost * taxRate;
  const total = membershipCost + tax;

  // Process payment
  let paymentResult: { paymentId: string; status: string };
  try {
    paymentResult = await processSquarePayment(
      paymentToken,
      Math.round(total * 100),
      idempotencyKey,
      `Membership renewal: ${membershipType} for ${client.name}`
    );
  } catch (error) {
    logTransactionError("membership renewal payment", error, { clientId: client.id, membershipType });
    res.status(500).json({ error: "Payment processing failed" });
    return;
  }

  // Calculate expiration date
  const purchasedAt = new Date();
  let expiresAt: Date | null = null;
  if (membershipType === "six_month") {
    expiresAt = new Date(purchasedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 6);
  }

  // Create membership, update client, and create transaction in a single transaction
  let membership: typeof membershipsTable.$inferSelect;
  try {
    membership = await db.transaction(async (tx) => {
      // Create new membership record
      const [membership] = await tx.insert(membershipsTable).values({
        clientId: client.id,
        type: membershipType as "one_time" | "six_month",
        purchasedAt,
        expiresAt,
      }).returning();

      // Update client membership status
      await tx.update(clientsTable).set({
        membershipStatus: membershipType as "one_time" | "six_month",
        membershipExpiresAt: expiresAt,
      }).where(eq(clientsTable.id, client.id));

      // Create transaction record
      await tx.insert(transactionsTable).values({
        clientId: client.id,
        amount: String(membershipCost),
        tax: String(tax),
        total: String(total),
        type: "membership",
        squarePaymentId: paymentResult.paymentId,
        description: `${membershipType} membership renewal for ${client.name}`,
      });

      return membership;
    });
  } catch (error) {
    logTransactionError("membership renewal", error, { clientId: client.id, membershipType });
    res.status(500).json({ error: "Failed to renew membership" });
    return;
  }

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "RENEW_MEMBERSHIP",
    resourceType: "client",
    resourceId: client.id,
    description: `Renewed ${membershipType} membership for client ${client.name}`,
  });

  // Invalidate cache for this client (both manager and staff versions)
  await cacheDel(buildCacheKey('client', client.id.toString(), 'manager'));
  await cacheDel(buildCacheKey('client', client.id.toString(), 'staff'));
  // Invalidate client search cache
  await cacheDelPattern('clients:search:*');

  res.json({
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
    sendValidationError(res, params.error.message);
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

router.get("/clients/:id/rentals/:sessionId/products", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetClientRentalProductsParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const { id: clientId, sessionId } = params.data;

  // Verify client exists
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) {
    sendNotFoundError(res, "Client not found");
    return;
  }

  // Verify rental session exists and belongs to client
  const [session] = await db.select().from(rentalSessionsTable)
    .where(and(eq(rentalSessionsTable.id, sessionId), eq(rentalSessionsTable.clientId, clientId)));
  if (!session) {
    sendNotFoundError(res, "Rental session not found");
    return;
  }

  // Fetch product transactions for this session
  const productTxns = await db.select().from(transactionsTable)
    .where(and(
      eq(transactionsTable.clientId, clientId),
      eq(transactionsTable.sessionId, sessionId),
      eq(transactionsTable.type, "product")
    ))
    .orderBy(desc(transactionsTable.createdAt));

  res.json(productTxns.map(t => ({
    id: t.id,
    clientId: t.clientId,
    clientName: client.name,
    amount: parseFloat(t.amount),
    tax: parseFloat(t.tax),
    total: parseFloat(t.total),
    type: t.type,
    squarePaymentId: t.squarePaymentId,
    description: t.description,
    sessionId: t.sessionId,
    createdAt: t.createdAt,
  })));
});

router.get("/clients/:id/transactions", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetClientTransactionsParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const { sessionId } = req.query;
  const whereConditions = [eq(transactionsTable.clientId, params.data.id)];

  // Add sessionId filter if provided
  if (sessionId) {
    whereConditions.push(eq(transactionsTable.sessionId, parseInt(sessionId as string)));
  }

  const txns = await db.select().from(transactionsTable)
    .where(and(...whereConditions))
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
    sessionId: t.sessionId,
    createdAt: t.createdAt,
  })));
});

/**
 * GET /clients/:id/pii
 * Manager-only endpoint to decrypt and return client PII
 * Requires MANAGER role and applies strict rate limiting
 * Logs all PII access for audit trail
 */
router.get("/clients/:id/pii", requireAuth, piiLimiter, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const actingUser = (req as AuthRequest).user!;

  // Require MANAGER role for PII access
  if (actingUser.role !== "MANAGER") {
    res.status(403).json({ error: "PII access requires manager role" });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    sendNotFoundError(res, "Client not found");
    return;
  }

  // Decrypt PII fields
  const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);
  const address = maybeDecrypt(client.addressEncrypted, client.addressDek);
  const documentNumber = maybeDecrypt(client.documentNumberEncrypted, client.documentNumberDek);

  // Log PII access for audit trail
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "VIEW_PII",
    resourceType: "client",
    resourceId: client.id,
    description: `Manager viewed PII for client ${client.name} (DOB, address, document number)`,
  });

  res.json({
    id: client.id,
    name: client.name,
    dob,
    address,
    documentNumber,
  });
});

/**
 * POST /clients/:id/merge
 * Merge a duplicate client into this client
 * Requires MANAGER role
 * Moves rental sessions and transactions from duplicate to primary
 * Archives the duplicate client
 */
router.post("/clients/:id/merge", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const { duplicateId } = req.body;

  if (!duplicateId || typeof duplicateId !== "number") {
    sendValidationError(res, "duplicateId is required and must be a number");
    return;
  }

  if (params.data.id === duplicateId) {
    sendValidationError(res, "Cannot merge a client with itself");
    return;
  }

  const actingUser = (req as AuthRequest).user!;

  // Require MANAGER role for merge operations
  if (actingUser.role !== "MANAGER") {
    res.status(403).json({ error: "Client merge requires manager role" });
    return;
  }

  try {
    const { mergeClients } = await import("../services/data-quality");
    const result = await mergeClients(params.data.id, duplicateId, parseInt(actingUser.sub));

    res.json({ result });
  } catch (error) {
    logger.error({ error, primaryId: params.data.id, duplicateId, userId: actingUser.sub }, "Failed to merge clients");
    res.status(500).json({ 
      error: "Failed to merge clients",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /clients/:id/notifications
 * Get notification history for a client
 * Requires MANAGER role
 */
router.get("/clients/:id/notifications", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const actingUser = (req as AuthRequest).user!;

  // Require MANAGER role for notification history
  if (actingUser.role !== "MANAGER") {
    res.status(403).json({ error: "Notification history requires manager role" });
    return;
  }

  try {
    const { auditLogsTable } = await import("@workspace/db");
    const { desc } = await import("drizzle-orm");

    const notifications = await db
      .select({
        id: auditLogsTable.id,
        action: auditLogsTable.action,
        resourceType: auditLogsTable.resourceType,
        resourceId: auditLogsTable.resourceId,
        description: auditLogsTable.description,
        createdAt: auditLogsTable.createdAt,
      })
      .from(auditLogsTable)
      .where(
        and(
          eq(auditLogsTable.resourceType, "rental_session"),
          sql`${auditLogsTable.action} IN ('SMS_REMINDER_SENT', 'SMS_REMINDER_FAILED')`
        )
      )
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(50);

    // Filter notifications related to this client's sessions
    const clientSessions = await db
      .select({ id: rentalSessionsTable.id })
      .from(rentalSessionsTable)
      .where(eq(rentalSessionsTable.clientId, params.data.id));

    const clientSessionIds = new Set(clientSessions.map(s => s.id));
    const clientNotifications = notifications.filter(n => n.resourceId && clientSessionIds.has(n.resourceId));

    res.json({ notifications: clientNotifications });
  } catch (error) {
    logger.error({ error, clientId: params.data.id }, "Failed to fetch notification history");
    res.status(500).json({
      error: "Failed to fetch notification history",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
