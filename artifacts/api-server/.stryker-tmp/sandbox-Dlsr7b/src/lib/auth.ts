// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { SignJWT, jwtVerify, type JWTPayload, errors as joseErrors } from "jose";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { getEnv } from "./env";
import { logger } from "./logger";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createHash } from "crypto";
import { createAuthErrorResponse, AuthErrorCodes } from "./authErrors";
const JWT_SECRET_KEY = new TextEncoder().encode(getEnv().JWT_SECRET);
const JWT_EXPIRY = getEnv().JWT_EXPIRY;
const REFRESH_TOKEN_EXPIRY_DAYS = getEnv().REFRESH_TOKEN_EXPIRY_DAYS;
const COOKIE_NAME = getEnv().COOKIE_NAME;

// Pre-computed bcrypt hash of a dummy password for timing-safe comparison
// This prevents timing attacks by ensuring password comparison takes constant time
// even when user doesn't exist
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-for-timing-safe-comparison", 10);

/**
 * Hash a token for logging purposes.
 * Uses only the first 8 characters to identify the token without exposing it.
 * This allows debugging while maintaining security.
 *
 * @param token - The token to hash
 * @returns A hash of the first 8 characters of the token
 */
function hashTokenForLogging(token: string): string {
  if (stryMutAct_9fa48("1")) {
    {}
  } else {
    stryCov_9fa48("1");
    const prefix = stryMutAct_9fa48("2") ? token : (stryCov_9fa48("2"), token.substring(0, 8));
    return stryMutAct_9fa48("3") ? createHash("sha256").update(prefix).digest("hex") : (stryCov_9fa48("3"), createHash("sha256").update(prefix).digest("hex").substring(0, 16));
  }
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
  if (stryMutAct_9fa48("6")) {
    {}
  } else {
    stryCov_9fa48("6");
    return stryMutAct_9fa48("9") ? typeof role === "string" || VALID_ROLES.includes(role as ValidRole) : stryMutAct_9fa48("8") ? false : stryMutAct_9fa48("7") ? true : (stryCov_9fa48("7", "8", "9"), (stryMutAct_9fa48("11") ? typeof role !== "string" : stryMutAct_9fa48("10") ? true : (stryCov_9fa48("10", "11"), typeof role === "string")) && VALID_ROLES.includes(role as ValidRole));
  }
}

// Zod schema for runtime validation of JWT payload
const AuthPayloadSchema = z.object(stryMutAct_9fa48("13") ? {} : (stryCov_9fa48("13"), {
  sub: z.string(),
  email: z.string(),
  role: z.enum(["STAFF", "MANAGER"]),
  name: z.string()
}));

// Type guard function to validate JWT payload at runtime
function isValidAuthPayload(payload: unknown): payload is AuthPayload {
  if (stryMutAct_9fa48("17")) {
    {}
  } else {
    stryCov_9fa48("17");
    return AuthPayloadSchema.safeParse(payload).success;
  }
}

/**
 * Express Request interface augmented with authenticated user information.
 * The user property is set by the requireAuth middleware.
 */
export interface AuthRequest extends Request {
  user?: AuthPayload;
}
export async function signToken(payload: AuthPayload): Promise<string> {
  if (stryMutAct_9fa48("18")) {
    {}
  } else {
    stryCov_9fa48("18");
    // AuthPayload satisfies JWTPayload requirements - use intersection for type safety
    const jwtPayload: JWTPayload & AuthPayload = stryMutAct_9fa48("19") ? {} : (stryCov_9fa48("19"), {
      ...payload
    });
    return new SignJWT(jwtPayload).setProtectedHeader(stryMutAct_9fa48("20") ? {} : (stryCov_9fa48("20"), {
      alg: "HS256"
    })).setIssuedAt().setExpirationTime(JWT_EXPIRY).sign(JWT_SECRET_KEY);
  }
}
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  if (stryMutAct_9fa48("22")) {
    {}
  } else {
    stryCov_9fa48("22");
    try {
      if (stryMutAct_9fa48("23")) {
        {}
      } else {
        stryCov_9fa48("23");
        const {
          payload
        } = await jwtVerify(token, JWT_SECRET_KEY);
        // Use runtime validation with type guard instead of unsafe assertion
        if (stryMutAct_9fa48("25") ? false : stryMutAct_9fa48("24") ? true : (stryCov_9fa48("24", "25"), isValidAuthPayload(payload))) {
          if (stryMutAct_9fa48("26")) {
            {}
          } else {
            stryCov_9fa48("26");
            return payload;
          }
        }
        return null;
      }
    } catch (error) {
      if (stryMutAct_9fa48("27")) {
        {}
      } else {
        stryCov_9fa48("27");
        // Classify error type for appropriate logging
        let errorType = "unknown";
        let logLevel: "warn" | "error" = "error";
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : String(error);

        // Check error name first (more reliable), then message content
        // This approach works across different jose versions
        if (stryMutAct_9fa48("32") ? errorName !== "JWTExpired" : stryMutAct_9fa48("31") ? false : stryMutAct_9fa48("30") ? true : (stryCov_9fa48("30", "31", "32"), errorName === "JWTExpired")) {
          if (stryMutAct_9fa48("34")) {
            {}
          } else {
            stryCov_9fa48("34");
            errorType = "expired";
            logLevel = "warn"; // Expired tokens are expected, not necessarily malicious
          }
        } else if (stryMutAct_9fa48("39") ? errorName !== "JWSSignatureVerificationFailed" : stryMutAct_9fa48("38") ? false : stryMutAct_9fa48("37") ? true : (stryCov_9fa48("37", "38", "39"), errorName === "JWSSignatureVerificationFailed")) {
          if (stryMutAct_9fa48("41")) {
            {}
          } else {
            stryCov_9fa48("41");
            errorType = "invalid_signature";
            logLevel = "error"; // Invalid signature suggests tampering or wrong secret
          }
        } else if (stryMutAct_9fa48("46") ? errorName !== "JWSInvalid" : stryMutAct_9fa48("45") ? false : stryMutAct_9fa48("44") ? true : (stryCov_9fa48("44", "45", "46"), errorName === "JWSInvalid")) {
          if (stryMutAct_9fa48("48")) {
            {}
          } else {
            stryCov_9fa48("48");
            errorType = "malformed";
            logLevel = "error"; // Malformed tokens suggest client bugs or attacks
          }
        } else if (stryMutAct_9fa48("53") ? errorName !== "JWTClaimValidationFailed" : stryMutAct_9fa48("52") ? false : stryMutAct_9fa48("51") ? true : (stryCov_9fa48("51", "52", "53"), errorName === "JWTClaimValidationFailed")) {
          if (stryMutAct_9fa48("55")) {
            {}
          } else {
            stryCov_9fa48("55");
            errorType = "claim_validation_failed";
            logLevel = "error";
          }
        } else if (stryMutAct_9fa48("60") ? errorMessage.toUpperCase().includes("expired") : stryMutAct_9fa48("59") ? false : stryMutAct_9fa48("58") ? true : (stryCov_9fa48("58", "59", "60"), errorMessage.toLowerCase().includes("expired"))) {
          if (stryMutAct_9fa48("62")) {
            {}
          } else {
            stryCov_9fa48("62");
            errorType = "expired";
            logLevel = "warn";
          }
        } else if (stryMutAct_9fa48("67") ? errorMessage.toUpperCase().includes("signature") : stryMutAct_9fa48("66") ? false : stryMutAct_9fa48("65") ? true : (stryCov_9fa48("65", "66", "67"), errorMessage.toLowerCase().includes("signature"))) {
          if (stryMutAct_9fa48("69")) {
            {}
          } else {
            stryCov_9fa48("69");
            errorType = "invalid_signature";
            logLevel = "error";
          }
        } else if (stryMutAct_9fa48("74") ? errorMessage.toUpperCase().includes("malformed") : stryMutAct_9fa48("73") ? false : stryMutAct_9fa48("72") ? true : (stryCov_9fa48("72", "73", "74"), errorMessage.toLowerCase().includes("malformed"))) {
          if (stryMutAct_9fa48("76")) {
            {}
          } else {
            stryCov_9fa48("76");
            errorType = "malformed";
            logLevel = "error";
          }
        } else if (stryMutAct_9fa48("81") ? errorMessage.toUpperCase().includes("claim") : stryMutAct_9fa48("80") ? false : stryMutAct_9fa48("79") ? true : (stryCov_9fa48("79", "80", "81"), errorMessage.toLowerCase().includes("claim"))) {
          if (stryMutAct_9fa48("83")) {
            {}
          } else {
            stryCov_9fa48("83");
            errorType = "claim_validation_failed";
            logLevel = "error";
          }
        }
        const logData: Record<string, unknown> = stryMutAct_9fa48("86") ? {} : (stryCov_9fa48("86"), {
          errorType,
          errorName,
          tokenHash: hashTokenForLogging(token),
          errorMessage
        });
        if (stryMutAct_9fa48("89") ? logLevel !== "warn" : stryMutAct_9fa48("88") ? false : stryMutAct_9fa48("87") ? true : (stryCov_9fa48("87", "88", "89"), logLevel === "warn")) {
          if (stryMutAct_9fa48("91")) {
            {}
          } else {
            stryCov_9fa48("91");
            logger.warn(logData, "Token verification failed");
          }
        } else {
          if (stryMutAct_9fa48("93")) {
            {}
          } else {
            stryCov_9fa48("93");
            logger.error(logData, "Token verification failed");
          }
        }
        return null;
      }
    }
  }
}
export function setAuthCookie(res: Response, token: string): void {
  if (stryMutAct_9fa48("95")) {
    {}
  } else {
    stryCov_9fa48("95");
    res.cookie(COOKIE_NAME, token, stryMutAct_9fa48("96") ? {} : (stryCov_9fa48("96"), {
      httpOnly: stryMutAct_9fa48("97") ? false : (stryCov_9fa48("97"), true),
      secure: stryMutAct_9fa48("100") ? getEnv().NODE_ENV !== "production" : stryMutAct_9fa48("99") ? false : stryMutAct_9fa48("98") ? true : (stryCov_9fa48("98", "99", "100"), getEnv().NODE_ENV === "production"),
      sameSite: "strict",
      maxAge: stryMutAct_9fa48("103") ? 15 * 60 / 1000 : (stryCov_9fa48("103"), (stryMutAct_9fa48("104") ? 15 / 60 : (stryCov_9fa48("104"), 15 * 60)) * 1000),
      // 15m
      path: "/"
    }));
  }
}
export function clearAuthCookie(res: Response): void {
  if (stryMutAct_9fa48("106")) {
    {}
  } else {
    stryCov_9fa48("106");
    res.clearCookie(COOKIE_NAME, stryMutAct_9fa48("107") ? {} : (stryCov_9fa48("107"), {
      path: "/"
    }));
  }
}
export function getTokenFromRequest(req: Request): string | null {
  if (stryMutAct_9fa48("109")) {
    {}
  } else {
    stryCov_9fa48("109");
    return stryMutAct_9fa48("112") ? req.cookies?.[COOKIE_NAME] && null : stryMutAct_9fa48("111") ? false : stryMutAct_9fa48("110") ? true : (stryCov_9fa48("110", "111", "112"), (stryMutAct_9fa48("113") ? req.cookies[COOKIE_NAME] : (stryCov_9fa48("113"), req.cookies?.[COOKIE_NAME])) || null);
  }
}

// Middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (stryMutAct_9fa48("114")) {
    {}
  } else {
    stryCov_9fa48("114");
    const token = getTokenFromRequest(req);
    if (stryMutAct_9fa48("117") ? false : stryMutAct_9fa48("116") ? true : stryMutAct_9fa48("115") ? token : (stryCov_9fa48("115", "116", "117"), !token)) {
      if (stryMutAct_9fa48("118")) {
        {}
      } else {
        stryCov_9fa48("118");
        res.status(401).json(createAuthErrorResponse(AuthErrorCodes.UNAUTHORIZED));
        return;
      }
    }
    const payload = await verifyToken(token);
    if (stryMutAct_9fa48("121") ? false : stryMutAct_9fa48("120") ? true : stryMutAct_9fa48("119") ? payload : (stryCov_9fa48("119", "120", "121"), !payload)) {
      if (stryMutAct_9fa48("122")) {
        {}
      } else {
        stryCov_9fa48("122");
        res.status(401).json(createAuthErrorResponse(AuthErrorCodes.INVALID_SESSION));
        return;
      }
    }
    // Attach user to request
    (req as AuthRequest).user = payload;
    next();
  }
}
export async function requireManager(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (stryMutAct_9fa48("123")) {
    {}
  } else {
    stryCov_9fa48("123");
    await requireAuth(req, res, async () => {
      if (stryMutAct_9fa48("124")) {
        {}
      } else {
        stryCov_9fa48("124");
        const user = (req as AuthRequest).user;
        if (stryMutAct_9fa48("127") ? user?.role === "MANAGER" : stryMutAct_9fa48("126") ? false : stryMutAct_9fa48("125") ? true : (stryCov_9fa48("125", "126", "127"), (stryMutAct_9fa48("128") ? user.role : (stryCov_9fa48("128"), user?.role)) !== "MANAGER")) {
          if (stryMutAct_9fa48("130")) {
            {}
          } else {
            stryCov_9fa48("130");
            res.status(403).json(createAuthErrorResponse(AuthErrorCodes.MANAGER_ACCESS_REQUIRED));
            return;
          }
        }
        next();
      }
    });
  }
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
export async function timingSafeLogin(email: string, password: string): Promise<LoginResult> {
  if (stryMutAct_9fa48("131")) {
    {}
  } else {
    stryCov_9fa48("131");
    // Always query database to prevent timing-based user enumeration
    // Only select necessary columns to avoid issues with missing lockout columns
    const [user] = await db.select(stryMutAct_9fa48("132") ? {} : (stryCov_9fa48("132"), {
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      passwordHash: usersTable.passwordHash,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt
    })).from(usersTable).where(eq(usersTable.email, email));

    // Use user's password hash if exists, otherwise use dummy hash
    const passwordHash = user ? user.passwordHash : DUMMY_PASSWORD_HASH;

    // bcrypt.compare is timing-safe, so this always takes the same time
    const valid = await bcrypt.compare(password, passwordHash);

    // Add small random delay (0-100ms) to normalize timing variations
    // from network, database, and other factors
    const randomDelay = Math.floor(stryMutAct_9fa48("133") ? Math.random() / 100 : (stryCov_9fa48("133"), Math.random() * 100));
    await new Promise(stryMutAct_9fa48("134") ? () => undefined : (stryCov_9fa48("134"), resolve => setTimeout(resolve, randomDelay)));
    if (stryMutAct_9fa48("137") ? false : stryMutAct_9fa48("136") ? true : stryMutAct_9fa48("135") ? valid : (stryCov_9fa48("135", "136", "137"), !valid)) {
      if (stryMutAct_9fa48("138")) {
        {}
      } else {
        stryCov_9fa48("138");
        return stryMutAct_9fa48("139") ? {} : (stryCov_9fa48("139"), {
          success: stryMutAct_9fa48("140") ? true : (stryCov_9fa48("140"), false),
          error: "Invalid credentials"
        });
      }
    }

    // If we got here and user is null, it means the dummy hash comparison succeeded
    // which should never happen with a real password, but we handle it defensively
    if (stryMutAct_9fa48("144") ? false : stryMutAct_9fa48("143") ? true : stryMutAct_9fa48("142") ? user : (stryCov_9fa48("142", "143", "144"), !user)) {
      if (stryMutAct_9fa48("145")) {
        {}
      } else {
        stryCov_9fa48("145");
        return stryMutAct_9fa48("146") ? {} : (stryCov_9fa48("146"), {
          success: stryMutAct_9fa48("147") ? true : (stryCov_9fa48("147"), false),
          error: "Invalid credentials"
        });
      }
    }
    return stryMutAct_9fa48("149") ? {} : (stryCov_9fa48("149"), {
      success: stryMutAct_9fa48("150") ? false : (stryCov_9fa48("150"), true),
      user
    });
  }
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
  if (stryMutAct_9fa48("151")) {
    {}
  } else {
    stryCov_9fa48("151");
    // Generate a cryptographically random token (32 bytes = 256 bits)
    const token = randomBytes(32).toString("hex");

    // Hash the token before storing (bcrypt is suitable for this use case)
    const tokenHash = await bcrypt.hash(token, 10);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    stryMutAct_9fa48("153") ? expiresAt.setTime(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS) : (stryCov_9fa48("153"), expiresAt.setDate(stryMutAct_9fa48("154") ? expiresAt.getDate() - REFRESH_TOKEN_EXPIRY_DAYS : (stryCov_9fa48("154"), expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)));

    // Store the token hash in the database with user agent if provided
    await db.insert(refreshTokensTable).values(stryMutAct_9fa48("155") ? {} : (stryCov_9fa48("155"), {
      userId,
      tokenHash,
      expiresAt,
      userAgent: stryMutAct_9fa48("158") ? userAgent && null : stryMutAct_9fa48("157") ? false : stryMutAct_9fa48("156") ? true : (stryCov_9fa48("156", "157", "158"), userAgent || null)
    }));
    return token;
  }
}

/**
 * Verify a refresh token and return the associated user ID if valid.
 *
 * @param token - The refresh token to verify
 * @returns The user ID if the token is valid, null otherwise
 */
export async function verifyRefreshToken(token: string): Promise<number | null> {
  if (stryMutAct_9fa48("159")) {
    {}
  } else {
    stryCov_9fa48("159");
    // Get all non-revoked tokens for this user (we'll need to hash and compare)
    // Since we don't know the user ID yet, we need to query all tokens and compare hashes
    // This is less efficient but necessary without knowing the user ID upfront
    const tokens = await db.select().from(refreshTokensTable).where(isNull(refreshTokensTable.revokedAt)); // Only non-revoked tokens

    // Check each token hash
    for (const refreshToken of tokens) {
      if (stryMutAct_9fa48("160")) {
        {}
      } else {
        stryCov_9fa48("160");
        const isValid = await bcrypt.compare(token, refreshToken.tokenHash);
        if (stryMutAct_9fa48("162") ? false : stryMutAct_9fa48("161") ? true : (stryCov_9fa48("161", "162"), isValid)) {
          if (stryMutAct_9fa48("163")) {
            {}
          } else {
            stryCov_9fa48("163");
            // Check if token is expired
            if (stryMutAct_9fa48("167") ? refreshToken.expiresAt >= new Date() : stryMutAct_9fa48("166") ? refreshToken.expiresAt <= new Date() : stryMutAct_9fa48("165") ? false : stryMutAct_9fa48("164") ? true : (stryCov_9fa48("164", "165", "166", "167"), refreshToken.expiresAt < new Date())) {
              if (stryMutAct_9fa48("168")) {
                {}
              } else {
                stryCov_9fa48("168");
                // Token is expired, revoke it
                await db.update(refreshTokensTable).set(stryMutAct_9fa48("169") ? {} : (stryCov_9fa48("169"), {
                  revokedAt: new Date()
                })).where(eq(refreshTokensTable.id, refreshToken.id));
                return null;
              }
            }
            return refreshToken.userId;
          }
        }
      }
    }
    return null;
  }
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
  if (stryMutAct_9fa48("170")) {
    {}
  } else {
    stryCov_9fa48("170");
    // Find and verify the old token
    const tokens = await db.select().from(refreshTokensTable).where(isNull(refreshTokensTable.revokedAt));
    let oldTokenRecord: typeof refreshTokensTable.$inferSelect | null = null;
    for (const refreshToken of tokens) {
      if (stryMutAct_9fa48("171")) {
        {}
      } else {
        stryCov_9fa48("171");
        const isValid = await bcrypt.compare(oldToken, refreshToken.tokenHash);
        if (stryMutAct_9fa48("173") ? false : stryMutAct_9fa48("172") ? true : (stryCov_9fa48("172", "173"), isValid)) {
          if (stryMutAct_9fa48("174")) {
            {}
          } else {
            stryCov_9fa48("174");
            // Check if token is expired
            if (stryMutAct_9fa48("178") ? refreshToken.expiresAt >= new Date() : stryMutAct_9fa48("177") ? refreshToken.expiresAt <= new Date() : stryMutAct_9fa48("176") ? false : stryMutAct_9fa48("175") ? true : (stryCov_9fa48("175", "176", "177", "178"), refreshToken.expiresAt < new Date())) {
              if (stryMutAct_9fa48("179")) {
                {}
              } else {
                stryCov_9fa48("179");
                // Token is expired, revoke it
                await db.update(refreshTokensTable).set(stryMutAct_9fa48("180") ? {} : (stryCov_9fa48("180"), {
                  revokedAt: new Date()
                })).where(eq(refreshTokensTable.id, refreshToken.id));
                return null;
              }
            }
            oldTokenRecord = refreshToken;
            break;
          }
        }
      }
    }
    if (stryMutAct_9fa48("183") ? false : stryMutAct_9fa48("182") ? true : stryMutAct_9fa48("181") ? oldTokenRecord : (stryCov_9fa48("181", "182", "183"), !oldTokenRecord)) {
      if (stryMutAct_9fa48("184")) {
        {}
      } else {
        stryCov_9fa48("184");
        return null;
      }
    }

    // Revoke the old token
    await db.update(refreshTokensTable).set(stryMutAct_9fa48("185") ? {} : (stryCov_9fa48("185"), {
      revokedAt: new Date()
    })).where(eq(refreshTokensTable.id, oldTokenRecord.id));

    // Generate a new token for the same user with the same user agent
    // Note: We pass the original user agent (from request) if available, otherwise use the stored one
    // The stored one is already hashed, so we can't recover the original for display
    // This is acceptable since we only need it for session continuity, not display
    return generateRefreshToken(oldTokenRecord.userId, stryMutAct_9fa48("188") ? userAgent && undefined : stryMutAct_9fa48("187") ? false : stryMutAct_9fa48("186") ? true : (stryCov_9fa48("186", "187", "188"), userAgent || undefined));
  }
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
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (stryMutAct_9fa48("189")) {
    {}
  } else {
    stryCov_9fa48("189");
    // Check minimum length (NIST 2025: 15 characters for password-only auth)
    if (stryMutAct_9fa48("193") ? password.length >= 15 : stryMutAct_9fa48("192") ? password.length <= 15 : stryMutAct_9fa48("191") ? false : stryMutAct_9fa48("190") ? true : (stryCov_9fa48("190", "191", "192", "193"), password.length < 15)) {
      if (stryMutAct_9fa48("194")) {
        {}
      } else {
        stryCov_9fa48("194");
        return stryMutAct_9fa48("195") ? {} : (stryCov_9fa48("195"), {
          valid: stryMutAct_9fa48("196") ? true : (stryCov_9fa48("196"), false),
          error: "Password must be at least 15 characters long"
        });
      }
    }

    // Check maximum length (NIST 2025: at least 64 characters supported)
    if (stryMutAct_9fa48("201") ? password.length <= 64 : stryMutAct_9fa48("200") ? password.length >= 64 : stryMutAct_9fa48("199") ? false : stryMutAct_9fa48("198") ? true : (stryCov_9fa48("198", "199", "200", "201"), password.length > 64)) {
      if (stryMutAct_9fa48("202")) {
        {}
      } else {
        stryCov_9fa48("202");
        return stryMutAct_9fa48("203") ? {} : (stryCov_9fa48("203"), {
          valid: stryMutAct_9fa48("204") ? true : (stryCov_9fa48("204"), false),
          error: "Password must be no more than 64 characters long"
        });
      }
    }

    // No mandatory composition rules per NIST 2025
    // Passwords can include spaces, Unicode characters, and any printable ASCII
    // Future enhancement: Add compromised password blocklist screening

    return stryMutAct_9fa48("206") ? {} : (stryCov_9fa48("206"), {
      valid: stryMutAct_9fa48("207") ? false : (stryCov_9fa48("207"), true)
    });
  }
}