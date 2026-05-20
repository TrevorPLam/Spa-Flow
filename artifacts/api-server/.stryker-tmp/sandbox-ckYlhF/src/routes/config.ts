// @ts-nocheck
import { Router } from "express";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/v1/config
 * Returns frontend configuration values including tax rate
 * This endpoint provides runtime configuration to the frontend,
 * ensuring consistency between frontend and backend without hardcoding values.
 */
router.get("/", (req, res) => {
  try {
    const env = getEnv();
    
    const config = {
      taxRate: env.TAX_RATE,
    };
    
    logger.info({ config: { taxRate: config.taxRate } }, "Config endpoint called");
    
    res.json(config);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch configuration");
    res.status(500).json({ error: "Failed to fetch configuration" });
  }
});

export default router;
