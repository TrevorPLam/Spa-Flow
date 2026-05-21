import { Router } from "express";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";
import { db, specialEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireManager, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { invalidateSpecialEventsCache, isSpecialEventActive } from "../lib/special-events";
import { InsertSpecialEvent } from "@workspace/db/schema";

const router = Router();

/**
 * GET /api/v1/config
 * Returns frontend configuration values including tax rate and active special events
 * This endpoint provides runtime configuration to the frontend,
 * ensuring consistency between frontend and backend without hardcoding values.
 */
router.get("/", async (req, res) => {
  try {
    const env = getEnv();

    // Check if there's an active special event today
    const specialsDisabled = await isSpecialEventActive();

    const config = {
      taxRate: env.TAX_RATE,
      specialsDisabled,
    };

    logger.info({ config: { taxRate: config.taxRate, specialsDisabled: config.specialsDisabled } }, "Config endpoint called");

    res.json(config);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch configuration");
    res.status(500).json({ error: "Failed to fetch configuration" });
  }
});

/**
 * GET /api/v1/config/special-events
 * Returns all special events (manager only)
 */
router.get("/special-events", requireAuth, requireManager, async (req: AuthRequest, res) => {
  try {
    const events = await db
      .select()
      .from(specialEventsTable)
      .orderBy(desc(specialEventsTable.startDate));

    res.json(events);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch special events");
    res.status(500).json({ error: "Failed to fetch special events" });
  }
});

/**
 * POST /api/v1/config/special-events
 * Creates a new special event (manager only)
 */
router.post("/special-events", requireAuth, requireManager, async (req: AuthRequest, res) => {
  try {
    const eventData: InsertSpecialEvent = req.body;

    const [newEvent] = await db
      .insert(specialEventsTable)
      .values(eventData)
      .returning();

    // Invalidate cache for the event date range
    await invalidateSpecialEventsCache(newEvent.startDate);
    await invalidateSpecialEventsCache(newEvent.endDate);

    // Audit log
    await writeAuditLog({
      userId: parseInt(req.user!.sub, 10),
      action: "CREATE_SPECIAL_EVENT",
      resourceType: "special_event",
      resourceId: newEvent.id,
      description: `Created special event: ${newEvent.name}`,
    });

    logger.info({ eventId: newEvent.id, eventName: newEvent.name }, "Special event created");

    res.status(201).json(newEvent);
  } catch (error) {
    logger.error({ err: error }, "Failed to create special event");
    res.status(500).json({ error: "Failed to create special event" });
  }
});

/**
 * PUT /api/v1/config/special-events/:id
 * Updates an existing special event (manager only)
 */
router.put("/special-events/:id", requireAuth, requireManager, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const eventData: Partial<InsertSpecialEvent> = req.body;

    const [existingEvent] = await db
      .select()
      .from(specialEventsTable)
      .where(eq(specialEventsTable.id, eventId));

    if (!existingEvent) {
      res.status(404).json({ error: "Special event not found" });
      return;
    }

    const [updatedEvent] = await db
      .update(specialEventsTable)
      .set(eventData)
      .where(eq(specialEventsTable.id, eventId))
      .returning();

    // Invalidate cache for both old and new date ranges
    await invalidateSpecialEventsCache(existingEvent.startDate);
    await invalidateSpecialEventsCache(existingEvent.endDate);
    if (updatedEvent.startDate) {
      await invalidateSpecialEventsCache(updatedEvent.startDate);
    }
    if (updatedEvent.endDate) {
      await invalidateSpecialEventsCache(updatedEvent.endDate);
    }

    // Audit log
    await writeAuditLog({
      userId: parseInt(req.user!.sub, 10),
      action: "UPDATE_SPECIAL_EVENT",
      resourceType: "special_event",
      resourceId: eventId,
      description: `Updated special event: ${updatedEvent.name}`,
    });

    logger.info({ eventId, eventName: updatedEvent.name }, "Special event updated");

    res.json(updatedEvent);
  } catch (error) {
    logger.error({ err: error }, "Failed to update special event");
    res.status(500).json({ error: "Failed to update special event" });
  }
});

/**
 * DELETE /api/v1/config/special-events/:id
 * Deletes a special event (manager only)
 */
router.delete("/special-events/:id", requireAuth, requireManager, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

    const [existingEvent] = await db
      .select()
      .from(specialEventsTable)
      .where(eq(specialEventsTable.id, eventId));

    if (!existingEvent) {
      res.status(404).json({ error: "Special event not found" });
      return;
    }

    await db
      .delete(specialEventsTable)
      .where(eq(specialEventsTable.id, eventId));

    // Invalidate cache for the event date range
    await invalidateSpecialEventsCache(existingEvent.startDate);
    await invalidateSpecialEventsCache(existingEvent.endDate);

    // Audit log
    await writeAuditLog({
      userId: parseInt(req.user!.sub, 10),
      action: "DELETE_SPECIAL_EVENT",
      resourceType: "special_event",
      resourceId: eventId,
      description: `Deleted special event: ${existingEvent.name}`,
    });

    logger.info({ eventId, eventName: existingEvent.name }, "Special event deleted");

    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, "Failed to delete special event");
    res.status(500).json({ error: "Failed to delete special event" });
  }
});

export default router;
