import { Router } from "express";
import { db, lockersTable, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireManager, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { apiLimiter } from "../middleware/rateLimit";
import { sendValidationError, sendNotFoundError } from "../lib/response-formatters";
import { broadcast, WebSocketEventType } from "../lib/websocket";

const router = Router();

/**
 * Set a resource (locker or room) to maintenance status
 * Requires manager role
 */
router.post("/maintenance/:resourceType/:id", requireAuth, requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { resourceType, id } = req.params;
  const { maintenanceNotes } = req.body as { maintenanceNotes?: string };

  if (resourceType !== "locker" && resourceType !== "room") {
    sendValidationError(res, "Invalid resource type. Must be 'locker' or 'room'");
    return;
  }

  if (!maintenanceNotes || typeof maintenanceNotes !== "string" || maintenanceNotes.trim().length === 0) {
    sendValidationError(res, "Maintenance notes are required when setting maintenance status");
    return;
  }

  const resourceId = parseInt(Array.isArray(id) ? id[0] : id);
  if (isNaN(resourceId)) {
    sendValidationError(res, "Invalid resource ID");
    return;
  }

  try {
    const table = resourceType === "locker" ? lockersTable : roomsTable;
    const [resource] = await db.select().from(table).where(eq(table.id, resourceId));

    if (!resource) {
      sendNotFoundError(res, `${resourceType} not found`);
      return;
    }

    if (resource.status === "maintenance") {
      sendValidationError(res, `${resourceType} is already in maintenance`);
      return;
    }

    if (resource.status === "occupied") {
      sendValidationError(res, `Cannot set ${resourceType} to maintenance while it is occupied`);
      return;
    }

    await db.update(table)
      .set({
        status: "maintenance",
        maintenanceNotes: maintenanceNotes.trim(),
      })
      .where(eq(table.id, resourceId));

    const actingUser = (req as AuthRequest).user!;
    await writeAuditLog({
      userId: parseInt(actingUser.sub),
      action: "SET_MAINTENANCE",
      resourceType: resourceType,
      resourceId: resourceId,
      description: `Set ${resourceType} ${resource.name} to maintenance: ${maintenanceNotes.trim()}`,
    });

    // Broadcast status change
    broadcast({
      type: resourceType === "locker" ? WebSocketEventType.LOCKER_STATUS_CHANGE : WebSocketEventType.ROOM_STATUS_CHANGE,
      data: {
        resourceType,
        resourceId,
        resourceName: resource.name,
        status: "maintenance",
        maintenanceNotes: maintenanceNotes.trim(),
        clientId: null,
        clientName: null,
        sessionId: null,
        startTime: null,
        expiresAt: null,
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      id: resource.id,
      name: resource.name,
      status: "maintenance",
      maintenanceNotes: maintenanceNotes.trim(),
    });
  } catch (error) {
    console.error(`Failed to set ${resourceType} to maintenance:`, error);
    res.status(500).json({ error: `Failed to set ${resourceType} to maintenance` });
  }
});

/**
 * Remove a resource from maintenance status
 * Requires manager role
 */
router.delete("/maintenance/:resourceType/:id", requireAuth, requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { resourceType, id } = req.params;

  if (resourceType !== "locker" && resourceType !== "room") {
    sendValidationError(res, "Invalid resource type. Must be 'locker' or 'room'");
    return;
  }

  const resourceId = parseInt(Array.isArray(id) ? id[0] : id);
  if (isNaN(resourceId)) {
    sendValidationError(res, "Invalid resource ID");
    return;
  }

  try {
    const table = resourceType === "locker" ? lockersTable : roomsTable;
    const [resource] = await db.select().from(table).where(eq(table.id, resourceId));

    if (!resource) {
      sendNotFoundError(res, `${resourceType} not found`);
      return;
    }

    if (resource.status !== "maintenance") {
      sendValidationError(res, `${resourceType} is not in maintenance`);
      return;
    }

    await db.update(table)
      .set({
        status: "available",
        maintenanceNotes: null,
      })
      .where(eq(table.id, resourceId));

    const actingUser = (req as AuthRequest).user!;
    await writeAuditLog({
      userId: parseInt(actingUser.sub),
      action: "REMOVE_MAINTENANCE",
      resourceType: resourceType,
      resourceId: resourceId,
      description: `Removed ${resourceType} ${resource.name} from maintenance`,
    });

    // Broadcast status change
    broadcast({
      type: resourceType === "locker" ? WebSocketEventType.LOCKER_STATUS_CHANGE : WebSocketEventType.ROOM_STATUS_CHANGE,
      data: {
        resourceType,
        resourceId,
        resourceName: resource.name,
        status: "available",
        maintenanceNotes: null,
        clientId: null,
        clientName: null,
        sessionId: null,
        startTime: null,
        expiresAt: null,
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      id: resource.id,
      name: resource.name,
      status: "available",
      maintenanceNotes: null,
    });
  } catch (error) {
    console.error(`Failed to remove ${resourceType} from maintenance:`, error);
    res.status(500).json({ error: `Failed to remove ${resourceType} from maintenance` });
  }
});

/**
 * Get all resources in maintenance
 * Requires manager role
 */
router.get("/maintenance", requireAuth, requireManager, apiLimiter, async (req, res): Promise<void> => {
  try {
    const lockers = await db.select().from(lockersTable).where(eq(lockersTable.status, "maintenance"));
    const rooms = await db.select().from(roomsTable).where(eq(roomsTable.status, "maintenance"));

    res.json({
      lockers: lockers.map(l => ({
        id: l.id,
        name: l.name,
        status: l.status,
        maintenanceNotes: l.maintenanceNotes,
      })),
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        maintenanceNotes: r.maintenanceNotes,
      })),
    });
  } catch (error) {
    console.error("Failed to get maintenance resources:", error);
    res.status(500).json({ error: "Failed to get maintenance resources" });
  }
});

export default router;
