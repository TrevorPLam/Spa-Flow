import { Router } from "express";
import { signToken, setAuthCookie, clearAuthCookie, requireAuth, type AuthRequest, timingSafeLogin, generateRefreshToken, rotateRefreshToken, verifyRefreshToken, isValidRole } from "../lib/auth";
import { createAuthErrorResponse, AuthErrorCodes } from "../lib/authErrors";
import { LoginBody } from "@workspace/api-zod";
import { authLimiter } from "../middleware/rateLimit";
import { accountLockoutService } from "../services/accountLockout";
import { authAuditLogger } from "../services/authAuditLogger";
import { passwordResetTokenService } from "../services/passwordReset";
import { sessionService } from "../services/session";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";
import bcrypt from "bcryptjs";

const router = Router();

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const correlationId = req.correlationId;

  // Use timing-safe login to prevent user enumeration via timing attacks
  const loginResult = await timingSafeLogin(email, password);

  if (!loginResult.success) {
    // Record failed attempt if user exists (timingSafeLogin already queried DB)
    if (loginResult.user) {
      await accountLockoutService.recordFailedAttempt(loginResult.user.id);
    }

    // Log failed login attempt
    await authAuditLogger.logLoginAttempt({
      userId: loginResult.user?.id,
      email,
      ipAddress,
      success: false,
      reason: loginResult.error || "Invalid credentials",
      correlationId,
    });

    res.status(401).json(createAuthErrorResponse(AuthErrorCodes.INVALID_CREDENTIALS));
    return;
  }

  const user = loginResult.user!;

  // Check if account is locked
  const isLocked = await accountLockoutService.isLocked(user.id);
  if (isLocked) {
    const lockoutStatus = await accountLockoutService.getLockoutStatus(user.id);

    // Log failed login due to lockout
    await authAuditLogger.logLoginAttempt({
      userId: user.id,
      email,
      ipAddress,
      success: false,
      reason: "Account locked",
      correlationId,
    });

    res.status(403).json({
      ...createAuthErrorResponse(AuthErrorCodes.ACCOUNT_LOCKED),
      lockedUntil: lockoutStatus.lockedUntil
    });
    return;
  }

  // Successful login - reset failed attempts
  await accountLockoutService.resetAttempts(user.id);

  // Log successful login
  await authAuditLogger.logLoginAttempt({
    userId: user.id,
    email,
    ipAddress,
    success: true,
    correlationId,
  });

  // Validate role before casting
  if (!isValidRole(user.role)) {
    logger.error({ userId: user.id, role: user.role }, "Invalid role found in database");
    res.status(500).json(createAuthErrorResponse(AuthErrorCodes.INTERNAL_SERVER_ERROR));
    return;
  }

  const token = await signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role,
    name: user.name,
  });

  // Generate refresh token with user agent
  const userAgent = req.headers['user-agent'];
  const refreshToken = await generateRefreshToken(user.id, userAgent);

  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, refreshToken });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const correlationId = req.correlationId;

  // Log logout event
  await authAuditLogger.logLogout({
    userId: parseInt(user.sub),
    ipAddress,
    correlationId,
  });

  clearAuthCookie(res);
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  res.json({ id: parseInt(user.sub), email: user.email, name: user.name, role: user.role });
});

const RefreshBody = z.object({
  refreshToken: z.string(),
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { refreshToken } = parsed.data;

  // Verify the old refresh token to get user ID
  const userId = await verifyRefreshToken(refreshToken);

  if (!userId) {
    res.status(401).json(createAuthErrorResponse(AuthErrorCodes.INVALID_REFRESH_TOKEN));
    return;
  }

  // Rotate the refresh token (invalidates old, generates new)
  const userAgent = req.headers['user-agent'];
  const newRefreshToken = await rotateRefreshToken(refreshToken, userAgent);

  if (!newRefreshToken) {
    res.status(401).json(createAuthErrorResponse(AuthErrorCodes.REFRESH_TOKEN_ROTATION_FAILED));
    return;
  }

  // Get user from database
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(401).json(createAuthErrorResponse(AuthErrorCodes.USER_NOT_FOUND));
    return;
  }

  // Validate role before casting
  if (!isValidRole(user.role)) {
    logger.error({ userId: user.id, role: user.role }, "Invalid role found in database");
    res.status(500).json(createAuthErrorResponse(AuthErrorCodes.INTERNAL_SERVER_ERROR));
    return;
  }

  // Generate new access token
  const token = await signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role,
    name: user.name,
  });

  setAuthCookie(res, token);
  res.json({
    refreshToken: newRefreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

const PasswordResetRequestBody = z.object({
  email: z.string().email(),
});

router.post("/auth/password-reset/request", async (req, res): Promise<void> => {
  const parsed = PasswordResetRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email } = parsed.data;

  // Request password reset - returns generic message to prevent user enumeration
  const result = await passwordResetTokenService.requestReset(email);

  res.json({ message: result.message });
});

const PasswordResetConfirmBody = z.object({
  token: z.string(),
  newPassword: z.string(),
});

router.post("/auth/password-reset/confirm", async (req, res): Promise<void> => {
  const parsed = PasswordResetConfirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { token, newPassword } = parsed.data;

  // Confirm password reset
  const result = await passwordResetTokenService.confirmReset(token, newPassword);

  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ error: result.message });
  }
});

// Session Management Endpoints

router.get("/auth/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const userId = parseInt(user.sub);

  // Get the current refresh token from the request to mark it as current
  const refreshToken = req.body.refreshToken || req.query.refreshToken;
  let currentTokenHash: string | undefined;

  if (refreshToken && typeof refreshToken === 'string') {
    // Get all non-revoked tokens to find the current one
    const { refreshTokensTable } = await import("@workspace/db");
    const { isNull } = await import("drizzle-orm");
    const tokens = await db
      .select({ tokenHash: refreshTokensTable.tokenHash })
      .from(refreshTokensTable)
      .where(isNull(refreshTokensTable.revokedAt));

    for (const token of tokens) {
      const isValid = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isValid) {
        currentTokenHash = token.tokenHash;
        break;
      }
    }
  }

  const sessions = await sessionService.listSessions(userId, currentTokenHash);
  res.json({ sessions });
});

router.delete("/auth/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const userId = parseInt(user.sub);
  const sessionIdParam = req.params.id;
  const sessionId = parseInt(Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam);

  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  // Get current session ID to prevent revoking current session
  const refreshToken = req.body.refreshToken || req.query.refreshToken;
  let currentSessionId: number | undefined;
  if (refreshToken && typeof refreshToken === 'string') {
    const sessionId = await sessionService.getSessionIdForToken(refreshToken);
    currentSessionId = sessionId ?? undefined;
  }

  // Prevent revoking current session
  if (currentSessionId && sessionId === currentSessionId) {
    res.status(400).json({ error: "Cannot revoke current session via API. Use logout instead." });
    return;
  }

  const revoked = await sessionService.revokeSession(sessionId, userId);

  if (!revoked) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ success: true });
});

router.delete("/auth/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const userId = parseInt(user.sub);

  // Get the current session ID to keep it active
  const refreshToken = req.body.refreshToken || req.query.refreshToken;
  let currentSessionId: number | undefined;

  if (refreshToken && typeof refreshToken === 'string') {
    const sessionId = await sessionService.getSessionIdForToken(refreshToken);
    currentSessionId = sessionId ?? undefined;
  }

  const revokedCount = await sessionService.revokeAllSessions(userId, currentSessionId);
  res.json({ success: true, revokedCount });
});

export default router;
