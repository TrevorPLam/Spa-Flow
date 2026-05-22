import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { getHealthMetrics, clearMetrics } from "../lib/monitoring";
import { requireManager } from "../lib/auth";

const router: IRouter = Router();

/**
 * Get current health metrics for monitoring dashboard
 * Manager-only access
 */
router.get("/metrics", requireManager, async (_req, res) => {
  try {
    const metrics = await getHealthMetrics();
    
    res.json({
      status: "ok",
      timestamp: new Date(),
      metrics,
    });
  } catch (error) {
    logger.error({ error }, "Failed to get health metrics");
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve health metrics",
    });
  }
});

/**
 * Clear metric history (for testing purposes)
 * Manager-only access
 */
router.post("/metrics/clear", requireManager, (_req, res) => {
  try {
    clearMetrics();
    
    res.json({
      status: "ok",
      message: "Metrics cleared successfully",
    });
  } catch (error) {
    logger.error({ error }, "Failed to clear metrics");
    res.status(500).json({
      status: "error",
      message: "Failed to clear metrics",
    });
  }
});

export default router;
