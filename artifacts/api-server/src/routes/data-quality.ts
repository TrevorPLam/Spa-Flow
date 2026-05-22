import { Router } from "express";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { logger } from "../lib/logger";
import {
  detectDuplicates,
  validateClientData,
  detectAnomalies,
  mergeClients,
  bulkValidateClients,
} from "../services/data-quality";
import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { apiLimiter } from "../middleware/rateLimit";
import { sendValidationError, sendNotFoundError } from "../lib/response-formatters";

const router = Router();

/**
 * GET /data-quality/duplicates
 * Get potential duplicate clients
 * Requires MANAGER role
 */
router.get("/data-quality/duplicates", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  
  // Manager-only access
  if (user.role !== "MANAGER") {
    res.status(403).json({ error: "Manager access required" });
    return;
  }

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const minConfidence = req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : 0.7;

    const duplicates = await detectDuplicates(limit, minConfidence);

    // Write audit log
    await writeAuditLog({
      userId: parseInt(user.sub),
      action: "VIEW_DUPLICATES",
      resourceType: "DATA_QUALITY",
      description: `Viewed ${duplicates.length} duplicate candidates`,
    });

    res.json({ duplicates });
  } catch (error) {
    logger.error({ error, userId: user.sub }, "Failed to detect duplicates");
    res.status(500).json({ error: "Failed to detect duplicates" });
  }
});

/**
 * GET /data-quality/anomalies
 * Get data anomalies
 * Requires MANAGER role
 */
router.get("/data-quality/anomalies", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  
  // Manager-only access
  if (user.role !== "MANAGER") {
    res.status(403).json({ error: "Manager access required" });
    return;
  }

  try {
    const anomalies = await detectAnomalies();

    // Write audit log
    await writeAuditLog({
      userId: parseInt(user.sub),
      action: "VIEW_ANOMALIES",
      resourceType: "DATA_QUALITY",
      description: `Viewed ${anomalies.length} data anomalies`,
    });

    res.json({ anomalies });
  } catch (error) {
    logger.error({ error, userId: user.sub }, "Failed to detect anomalies");
    res.status(500).json({ error: "Failed to detect anomalies" });
  }
});

/**
 * POST /data-quality/validate
 * Validate a client's data
 * Requires MANAGER role
 */
router.post("/data-quality/validate", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  
  // Manager-only access
  if (user.role !== "MANAGER") {
    res.status(403).json({ error: "Manager access required" });
    return;
  }

  const { clientId } = req.body;

  if (!clientId || typeof clientId !== "number") {
    sendValidationError(res, "clientId is required and must be a number");
    return;
  }

  try {
    const clients = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    if (!clients.length) {
      sendNotFoundError(res, "Client not found");
      return;
    }

    const validation = validateClientData(clients[0]);

    // Write audit log
    await writeAuditLog({
      userId: parseInt(user.sub),
      action: "VALIDATE_CLIENT",
      resourceType: "CLIENT",
      resourceId: clientId,
      description: `Validated client data`,
    });

    res.json({ clientId, validation });
  } catch (error) {
    logger.error({ error, userId: user.sub, clientId }, "Failed to validate client");
    res.status(500).json({ error: "Failed to validate client" });
  }
});

/**
 * POST /data-quality/validate/bulk
 * Validate multiple clients in bulk
 * Requires MANAGER role
 */
router.post("/data-quality/validate/bulk", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  
  // Manager-only access
  if (user.role !== "MANAGER") {
    res.status(403).json({ error: "Manager access required" });
    return;
  }

  const { clientIds } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    sendValidationError(res, "clientIds is required and must be a non-empty array");
    return;
  }

  if (clientIds.some((id) => typeof id !== "number")) {
    sendValidationError(res, "All clientIds must be numbers");
    return;
  }

  try {
    const results = await bulkValidateClients(clientIds);

    // Write audit log
    await writeAuditLog({
      userId: parseInt(user.sub),
      action: "BULK_VALIDATE_CLIENTS",
      resourceType: "DATA_QUALITY",
      description: `Bulk validated ${clientIds.length} clients`,
    });

    res.json({ results: Object.fromEntries(results) });
  } catch (error) {
    logger.error({ error, userId: user.sub, clientIds }, "Failed to bulk validate clients");
    res.status(500).json({ error: "Failed to bulk validate clients" });
  }
});

/**
 * POST /data-quality/merge
 * Merge a duplicate client into a primary client
 * Requires MANAGER role
 */
router.post("/data-quality/merge", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  
  // Manager-only access
  if (user.role !== "MANAGER") {
    res.status(403).json({ error: "Manager access required" });
    return;
  }

  const { primaryId, duplicateId } = req.body;

  if (!primaryId || typeof primaryId !== "number") {
    sendValidationError(res, "primaryId is required and must be a number");
    return;
  }

  if (!duplicateId || typeof duplicateId !== "number") {
    sendValidationError(res, "duplicateId is required and must be a number");
    return;
  }

  if (primaryId === duplicateId) {
    sendValidationError(res, "primaryId and duplicateId must be different");
    return;
  }

  try {
    const result = await mergeClients(primaryId, duplicateId, parseInt(user.sub));

    res.json({ result });
  } catch (error) {
    logger.error({ error, userId: user.sub, primaryId, duplicateId }, "Failed to merge clients");
    res.status(500).json({ 
      error: "Failed to merge clients",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
