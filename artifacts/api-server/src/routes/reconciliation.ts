import { Router } from "express";
import { requireManager } from "../lib/auth";
import { apiLimiter } from "../middleware/rateLimit";
import { reconciliationService } from "../services/reconciliation";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Get daily reconciliation reports for a date range
 * Manager-only endpoint for payment reconciliation reporting
 */
router.get("/reconciliation", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  // Set default date range to last 30 days if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  try {
    const results = await reconciliationService.getReconciliationHistory(start, end);
    res.json({
      data: results,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  } catch (error) {
    logger.error({ error, startDate: start, endDate: end }, "Failed to fetch reconciliation history");
    res.status(500).json({ error: "Failed to fetch reconciliation history" });
  }
});

/**
 * Trigger reconciliation for a specific date
 * Manager-only endpoint for manual reconciliation runs
 */
router.post("/reconciliation/run", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { date } = req.body;

  // Default to today if no date provided
  const reconcileDate = date ? new Date(date) : new Date();

  // Validate date
  if (isNaN(reconcileDate.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  try {
    logger.info({ date: reconcileDate }, "Manual reconciliation triggered");
    const result = await reconciliationService.runReconciliation(reconcileDate);
    res.json({
      data: result,
      message: "Reconciliation completed successfully",
    });
  } catch (error) {
    logger.error({ error, date: reconcileDate }, "Manual reconciliation failed");
    res.status(500).json({ error: "Reconciliation failed" });
  }
});

export default router;
