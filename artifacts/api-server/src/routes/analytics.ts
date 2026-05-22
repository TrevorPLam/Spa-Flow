import { Router } from "express";
import { requireManager } from "../lib/auth";
import { apiLimiter } from "../middleware/rateLimit";
import {
  getVisitFrequency,
  getAverageVisitDuration,
  getPeakHoursAnalysis,
  getClientLifetimeValue,
  getChurnRiskAnalysis,
  getClientSegmentation,
} from "../services/analytics";

const router = Router();

/**
 * Get client visit frequency analytics
 * Manager-only endpoint for understanding visit patterns
 */
router.get("/analytics/visit-frequency", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const data = await getVisitFrequency(start, end);
  res.json(data);
});

/**
 * Get average visit duration analytics
 * Manager-only endpoint for understanding session length patterns
 */
router.get("/analytics/visit-duration", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const data = await getAverageVisitDuration(start, end);
  res.json(data);
});

/**
 * Get peak hours analysis for client visits
 * Manager-only endpoint for identifying busiest times
 */
router.get("/analytics/peak-hours", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const data = await getPeakHoursAnalysis(start, end);
  res.json(data);
});

/**
 * Get client lifetime value (CLV) analytics
 * Manager-only endpoint for understanding revenue contribution per client
 */
router.get("/analytics/clv", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const data = await getClientLifetimeValue(start, end);
  res.json(data);
});

/**
 * Get churn risk analysis
 * Manager-only endpoint for identifying at-risk clients
 */
router.get("/analytics/churn-risk", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { asOfDate } = req.query;

  const asOf = asOfDate ? new Date(asOfDate as string) : new Date();

  if (isNaN(asOf.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  const data = await getChurnRiskAnalysis(asOf);
  res.json(data);
});

/**
 * Get client segmentation analytics
 * Manager-only endpoint for comprehensive client segmentation
 */
router.get("/analytics/segmentation", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const data = await getClientSegmentation(start, end);
  res.json(data);
});

export default router;
