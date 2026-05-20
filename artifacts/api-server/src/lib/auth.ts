import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, refreshTokensTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { getEnv } from "./env";
import { logger } from "./logger";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createHash } from "crypto";
import { createAuthErrorResponse, AuthErrorCodes } from "./authErrors";
import { BCRYPT_ROUNDS } from "./constants";

const JWT_SECRET_KEY = new TextEncoder().encode(getEnv().JWT_SECRET);
const JWT_EXPIRY = getEnv().JWT_EXPIRY;
const REFRESH_TOKEN_EXPIRY_DAYS = getEnv().REFRESH_TOKEN_EXPIRY_DAYS;
const COOKIE_NAME = getEnv().COOKIE_NAME;

// Pre-computed bcrypt hash of a dummy password for timing-safe comparison
// This prevents timing attacks by ensuring password comparison takes constant time
// even when user doesn't exist
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-for-timing-safe-comparison", BCRYPT_ROUNDS);

/**
 * Hash a token for logging purposes.
 * Uses only the first 8 characters to identify the token without exposing it.
 * This allows debugging while maintaining security.
 *
 * @param token - The token to hash
 * @returns A hash of the first 8 characters of the token
 */
function hashTokenForLogging(token: string): string {
  const prefix = token.substring(0, 8);
  return createHash("sha256").update(prefix).digest("hex").substring(0, 16);
}

export interface AuthPayload {
  sub: string; // userId as string
  email: string;
  role: "STAFF" | "MANAGER";
  name: string;
}

/**
 * Valid role values for the application.
 * Matches the PostgreSQL enum definition in the database schema.
 */
export const VALID_ROLES = ["STAFF", "MANAGER"] as const;
export type ValidRole = typeof VALID_ROLES[number];

/**
 * Validates that a role value is one of the valid roles.
 * Provides runtime validation to complement TypeScript's compile-time checks.
 *
 * @param role - The role value to validate
 * @returns True if the role is valid, false otherwise
 */
export function isValidRole(role: unknown): role is ValidRole {
  return typeof role === "string" && VALID_ROLES.includes(role as ValidRole);
}

// Zod schema for runtime validation of JWT payload
const AuthPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: z.enum(["STAFF", "MANAGER"]),
  name: z.string(),
});

// Type guard function to validate JWT payload at runtime
function isValidAuthPayload(payload: unknown): payload is AuthPayload {
  return AuthPayloadSchema.safeParse(payload).success;
}

/**
 * Express Request interface augmented with authenticated user information.
 * The user property is set by the requireAuth middleware.
 */
export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export async function signToken(payload: AuthPayload): Promise<string> {
  // AuthPayload satisfies JWTPayload requirements - use intersection for type safety
  const jwtPayload: JWTPayload & AuthPayload = {
    ...payload,
  };
  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET_KEY);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    // Use runtime validation with type guard instead of unsafe assertion
    if (isValidAuthPayload(payload)) {
      return payload;
    }
    return null;
  } catch (error) {
    // Classify error type for appropriate logging
    let errorType = "unknown";
    let logLevel: "warn" | "error" = "error";

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : String(error);

    // Check error name first (more reliable), then message content
    // This approach works across different jose versions
    if (errorName === "JWTExpired") {
      errorType = "expired";
      logLevel = "warn"; // Expired tokens are expected, not necessarily malicious
    } else if (errorName === "JWSSignatureVerificationFailed") {
      errorType = "invalid_signature";
      logLevel = "error"; // Invalid signature suggests tampering or wrong secret
    } else if (errorName === "JWSInvalid") {
      errorType = "malformed";
      logLevel = "error"; // Malformed tokens suggest client bugs or attacks
    } else if (errorName === "JWTClaimValidationFailed") {
      errorType = "claim_validation_failed";
      logLevel = "error";
    } else if (errorMessage.toLowerCase().includes("expired")) {
      errorType = "expired";
      logLevel = "warn";
    } else if (errorMessage.toLowerCase().includes("signature")) {
      errorType = "invalid_signature";
      logLevel = "error";
    } else if (errorMessage.toLowerCase().includes("malformed")) {
      errorType = "malformed";
      logLevel = "error";
    } else if (errorMessage.toLowerCase().includes("claim")) {
      errorType = "claim_validation_failed";
      logLevel = "error";
    }

    const logData: Record<string, unknown> = {
      errorType,
      errorName,
      tokenHash: hashTokenForLogging(token),
      errorMessage,
    };

    if (logLevel === "warn") {
      logger.warn(logData, "Token verification failed");
    } else {
      logger.error(logData, "Token verification failed");
    }

    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15m
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getTokenFromRequest(req: Request): string | null {
  return req.cookies?.[COOKIE_NAME] || null;
}

// Middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json(createAuthErrorResponse(AuthErrorCodes.UNAUTHORIZED));
    return;
  }
  const payload = await verifyToken(token);
  if (!payload) {
    res.status(401).json(createAuthErrorResponse(AuthErrorCodes.INVALID_SESSION));
    return;
  }
  // Attach user to request
  (req as AuthRequest).user = payload;
  next();
}

export async function requireManager(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as AuthRequest).user;
    if (user?.role !== "MANAGER") {
      res.status(403).json(createAuthErrorResponse(AuthErrorCodes.MANAGER_ACCESS_REQUIRED));
      return;
    }
    next();
  });
}

/**
 * Timing-safe login result
 */
export interface LoginResult {
  success: boolean;
  user?: {
    id: number;
    email: string;
    name: string;
    passwordHash: string;
    role: "STAFF" | "MANAGER";
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

/**
 * Timing-safe login function that prevents user enumeration via timing attacks.
 * Always performs database query and password comparison, even when user doesn't exist.
 * Uses dummy hash comparison and random delay to normalize response times.
 *
 * @param email - User email
 * @param password - User password
 * @returns LoginResult with success status and user data if successful
 */
export async function timingSafeLogin(
  email: string,
  password: string
): Promise<LoginResult> {
  // Always query database to prevent timing-based user enumeration
  // Only select necessary columns to avoid issues with missing lockout columns
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      passwordHash: usersTable.passwordHash,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  // Use user's password hash if exists, otherwise use dummy hash
  const passwordHash = user ? user.passwordHash : DUMMY_PASSWORD_HASH;

  // bcrypt.compare is timing-safe, so this always takes the same time
  const valid = await bcrypt.compare(password, passwordHash);

  // Add small random delay (0-100ms) to normalize timing variations
  // from network, database, and other factors
  const randomDelay = Math.floor(Math.random() * 100);
  await new Promise((resolve) => setTimeout(resolve, randomDelay));

  if (!valid) {
    return { success: false, error: "Invalid credentials" };
  }

  // If we got here and user is null, it means the dummy hash comparison succeeded
  // which should never happen with a real password, but we handle it defensively
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  return { success: true, user };
}

/**
 * Refresh token payload interface
 */
export interface RefreshTokenPayload {
  userId: number;
}

/**
 * Generate a cryptographically random refresh token and store its hash in the database.
 *
 * @param userId - The user ID to associate with the refresh token
 * @param userAgent - Optional user agent string for device identification
 * @returns The raw refresh token (to be sent to the client)
 */
export async function generateRefreshToken(userId: number, userAgent?: string): Promise<string> {
  // Generate a cryptographically random token (32 bytes = 256 bits)
  const token = randomBytes(32).toString("hex");

  // Hash the token before storing (bcrypt is suitable for this use case)
  const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);

  // Calculate expiration date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Store the token hash in the database with user agent if provided
  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: userAgent || null,
  });

  return token;
}

/**
 * Verify a refresh token and return the associated user ID if valid.
 *
 * @param token - The refresh token to verify
 * @returns The user ID if the token is valid, null otherwise
 */
export async function verifyRefreshToken(token: string): Promise<number | null> {
  // Get all non-revoked tokens for this user (we'll need to hash and compare)
  // Since we don't know the user ID yet, we need to query all tokens and compare hashes
  // This is less efficient but necessary without knowing the user ID upfront
  const tokens = await db
    .select()
    .from(refreshTokensTable)
    .where(isNull(refreshTokensTable.revokedAt)); // Only non-revoked tokens

  // Check each token hash
  for (const refreshToken of tokens) {
    const isValid = await bcrypt.compare(token, refreshToken.tokenHash);
    if (isValid) {
      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        // Token is expired, revoke it
        await db
          .update(refreshTokensTable)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokensTable.id, refreshToken.id));
        return null;
      }
      return refreshToken.userId;
    }
  }

  return null;
}

/**
 * Rotate a refresh token: invalidate the old one and generate a new one.
 * This implements the refresh token rotation security pattern.
 *
 * @param oldToken - The old refresh token to rotate
 * @param userAgent - Optional user agent string for device identification
 * @returns The new refresh token, or null if the old token is invalid
 */
export async function rotateRefreshToken(oldToken: string, userAgent?: string): Promise<string | null> {
  // Find and verify the old token
  const tokens = await db
    .select()
    .from(refreshTokensTable)
    .where(isNull(refreshTokensTable.revokedAt));

  let oldTokenRecord: typeof refreshTokensTable.$inferSelect | null = null;

  for (const refreshToken of tokens) {
    const isValid = await bcrypt.compare(oldToken, refreshToken.tokenHash);
    if (isValid) {
      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        // Token is expired, revoke it
        await db
          .update(refreshTokensTable)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokensTable.id, refreshToken.id));
        return null;
      }
      oldTokenRecord = refreshToken;
      break;
    }
  }

  if (!oldTokenRecord) {
    return null;
  }

  // Revoke the old token
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.id, oldTokenRecord.id));

  // Generate a new token for the same user with the same user agent
  // Note: We pass the original user agent (from request) if available, otherwise use the stored one
  // The stored one is already hashed, so we can't recover the original for display
  // This is acceptable since we only need it for session continuity, not display
  return generateRefreshToken(oldTokenRecord.userId, userAgent || undefined);
}

/**
 * Validate password according to NIST SP 800-63B Rev 4 (2025) guidelines.
 * 
 * Requirements:
 * - Minimum 15 characters (when password is the only authenticator)
 * - Maximum 64 characters
 * - No mandatory composition rules (uppercase, lowercase, numbers, symbols)
 * - Full range of characters supported (ASCII printable, spaces, Unicode)
 * 
 * @param password - The password to validate
 * @returns True if the password meets requirements, false otherwise
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  // Check minimum length (NIST 2025: 15 characters for password-only auth)
  if (password.length < 15) {
    return { valid: false, error: "Password must be at least 15 characters long" };
  }

  // Check maximum length (NIST 2025: at least 64 characters supported)
  if (password.length > 64) {
    return { valid: false, error: "Password must be no more than 64 characters long" };
  }

  // No mandatory composition rules per NIST 2025
  // Passwords can include spaces, Unicode characters, and any printable ASCII
  // Future enhancement: Add compromised password blocklist screening

  return { valid: true };
}
