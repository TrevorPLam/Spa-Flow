import { Router } from "express";
import { db, savedSearchesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import {
  CreateSavedSearchBody,
  GetSavedSearchParams,
  UpdateSavedSearchBody,
  UpdateSavedSearchParams,
  DeleteSavedSearchParams,
} from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { sendValidationError, sendNotFoundError } from "../lib/response-formatters";

const router = Router();

router.get("/saved-searches", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const actingUser = (req as AuthRequest).user!;

  const savedSearches = await db
    .select()
    .from(savedSearchesTable)
    .where(eq(savedSearchesTable.userId, actingUser.sub))
    .orderBy(desc(savedSearchesTable.createdAt));

  res.json(savedSearches);
});

router.post("/saved-searches", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = CreateSavedSearchBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { name, filters } = parsed.data;
  const actingUser = (req as AuthRequest).user!;

  const [savedSearch] = await db
    .insert(savedSearchesTable)
    .values({
      userId: actingUser.sub,
      name,
      filters: filters as any,
    })
    .returning();

  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "CREATE_SAVED_SEARCH",
    resourceType: "saved_search",
    resourceId: savedSearch.id,
    description: `Created saved search "${name}"`,
  });

  res.status(201).json(savedSearch);
});

router.get("/saved-searches/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = GetSavedSearchParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const actingUser = (req as AuthRequest).user!;

  const [savedSearch] = await db
    .select()
    .from(savedSearchesTable)
    .where(
      and(
        eq(savedSearchesTable.id, params.data.id),
        eq(savedSearchesTable.userId, actingUser.sub)
      )
    );

  if (!savedSearch) {
    sendNotFoundError(res, "Saved search not found");
    return;
  }

  res.json(savedSearch);
});

router.patch("/saved-searches/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = UpdateSavedSearchParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const parsed = UpdateSavedSearchBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
    return;
  }

  const { name, filters } = parsed.data;
  const actingUser = (req as AuthRequest).user!;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (filters !== undefined) updates.filters = filters as any;

  const [savedSearch] = await db
    .update(savedSearchesTable)
    .set(updates)
    .where(
      and(
        eq(savedSearchesTable.id, params.data.id),
        eq(savedSearchesTable.userId, actingUser.sub)
      )
    )
    .returning();

  if (!savedSearch) {
    sendNotFoundError(res, "Saved search not found");
    return;
  }

  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "UPDATE_SAVED_SEARCH",
    resourceType: "saved_search",
    resourceId: savedSearch.id,
    description: `Updated saved search "${savedSearch.name}"`,
  });

  res.json(savedSearch);
});

router.delete("/saved-searches/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const params = DeleteSavedSearchParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const actingUser = (req as AuthRequest).user!;

  const [savedSearch] = await db
    .select()
    .from(savedSearchesTable)
    .where(
      and(
        eq(savedSearchesTable.id, params.data.id),
        eq(savedSearchesTable.userId, actingUser.sub)
      )
    );

  if (!savedSearch) {
    sendNotFoundError(res, "Saved search not found");
    return;
  }

  await db
    .delete(savedSearchesTable)
    .where(
      and(
        eq(savedSearchesTable.id, params.data.id),
        eq(savedSearchesTable.userId, actingUser.sub)
      )
    );

  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "DELETE_SAVED_SEARCH",
    resourceType: "saved_search",
    resourceId: params.data.id,
    description: `Deleted saved search "${savedSearch.name}"`,
  });

  res.sendStatus(204);
});

export default router;
