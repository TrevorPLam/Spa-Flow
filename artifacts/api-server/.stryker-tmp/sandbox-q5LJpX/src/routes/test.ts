// @ts-nocheck
import { Router } from "express";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { db, passwordResetTokensTable, usersTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";

const router = Router();

// Middleware to ensure test-only routes are only accessible in test environment
const testOnlyMiddleware = (req: any, res: any, next: any) => {
  const env = getEnv();
  if (env.NODE_ENV !== 'test' && env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: "Not found" });
  }
  next();
};

router.use(testOnlyMiddleware);

/**
 * GET /test/password-reset-token/:userId
 * Test-only endpoint to retrieve the most recent password reset token for a user.
 * This is needed for E2E testing since tokens are generated randomly and not sent via email in test mode.
 * Only accessible by authenticated users (MANAGER role recommended).
 */
router.get("/password-reset-token/:userId", requireAuth, async (req: any, res): Promise<void> => {
  const userIdParam = req.params.id;
  const userId = parseInt(Array.isArray(userIdParam) ? userIdParam[0] : userIdParam);

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    // Get the most recent unused reset token for this user
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.userId, userId),
          isNull(passwordResetTokensTable.usedAt)
        )
      )
      .orderBy(desc(passwordResetTokensTable.createdAt))
      .limit(1);

    if (!tokenRecord) {
      res.status(404).json({ error: "No reset token found for this user" });
      return;
    }

    // Since the token is hashed in the database, we can't retrieve the original token
    // For testing purposes, we need to return a known test token or modify the service
    // For now, we'll return the token hash and let the test handle it differently
    // A better approach would be to modify the password reset service to store the token in memory for testing
    
    // Log that this is a test-only operation
    logger.warn({ userId }, "Test-only endpoint accessed: password reset token retrieval");

    res.status(500).json({ 
      error: "Cannot retrieve original token (hashed in database). Use mock token approach or modify service for testing." 
    });
  } catch (error) {
    logger.error({ error, userId }, "Failed to retrieve password reset token");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /test/password-reset-token/:userId/expire
 * Test-only endpoint to manually expire a password reset token for testing.
 * Only accessible by authenticated users.
 */
router.post("/password-reset-token/:userId/expire", requireAuth, async (req: any, res): Promise<void> => {
  const userIdParam = req.params.id;
  const userId = parseInt(Array.isArray(userIdParam) ? userIdParam[0] : userIdParam);

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    // Set the most recent unused token's expiry to the past
    const result = await db
      .update(passwordResetTokensTable)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // Expired 1 second ago
      .where(
        and(
          eq(passwordResetTokensTable.userId, userId),
          isNull(passwordResetTokensTable.usedAt)
        )
      )
      .returning();

    if (result.length === 0) {
      res.status(404).json({ error: "No reset token found for this user" });
      return;
    }

    logger.warn({ userId }, "Test-only endpoint accessed: password reset token expiration");

    res.json({ success: true, message: "Token expired successfully" });
  } catch (error) {
    logger.error({ error, userId }, "Failed to expire password reset token");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
