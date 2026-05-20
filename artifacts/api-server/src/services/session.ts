import { db, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";

/**
 * Session information for display to users
 */
export interface SessionInfo {
  id: number;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  isCurrent: boolean;
}

/**
 * Parse user agent to extract device/browser information.
 * Returns a simplified, user-friendly description.
 * Note: Since we now store hashed user agents for privacy, this will return "Unknown Device"
 * for hashed values. The original user agent is not recoverable from the hash.
 *
 * @param userAgent - The user agent string (may be hashed)
 * @returns A simplified device description (e.g., "Chrome on Windows", "Safari on iPhone")
 */
function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) {
    return "Unknown Device";
  }

  // Check if this looks like a hash (64 hex characters = SHA-256)
  // If so, we can't parse it, return unknown
  if (userAgent.length === 64 && /^[a-f0-9]{64}$/.test(userAgent)) {
    return "Device (Hashed)";
  }

  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser = "Unknown Browser";
  if (ua.includes("chrome") && !ua.includes("edg")) {
    browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("edg")) {
    browser = "Edge";
  } else if (ua.includes("opera") || ua.includes("opr")) {
    browser = "Opera";
  }

  // Detect OS
  let os = "Unknown OS";
  if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("mac os x") || ua.includes("macintosh")) {
    os = "macOS";
  } else if (ua.includes("linux")) {
    os = "Linux";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    os = "iOS";
  }

  // Detect mobile
  const isMobile = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad");

  return `${browser} on ${os}${isMobile ? " (Mobile)" : ""}`;
}

/**
 * SessionService handles session management operations.
 * Provides methods to list, revoke, and manage user sessions.
 */
export class SessionService {
  /**
   * List all active sessions for a user.
   *
   * @param userId - The user ID to list sessions for
   * @param currentTokenHash - Optional hash of the current session's refresh token to mark as current
   * @returns Array of session information
   */
  async listSessions(userId: number, currentTokenHash?: string): Promise<SessionInfo[]> {
    const sessions = await db
      .select({
        id: refreshTokensTable.id,
        userId: refreshTokensTable.userId,
        createdAt: refreshTokensTable.createdAt,
        expiresAt: refreshTokensTable.expiresAt,
        userAgent: refreshTokensTable.userAgent,
        tokenHash: refreshTokensTable.tokenHash,
      })
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          isNull(refreshTokensTable.revokedAt)
        )
      )
      .orderBy(desc(refreshTokensTable.createdAt));

    // Mark the current session if token hash is provided
    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent ? parseUserAgent(session.userAgent) : null,
      isCurrent: currentTokenHash ? session.tokenHash === currentTokenHash : false,
    }));
  }

  /**
   * Revoke a specific session by ID.
   *
   * @param sessionId - The session ID to revoke
   * @param userId - The user ID (for authorization check)
   * @returns True if the session was revoked, false if not found or not authorized
   */
  async revokeSession(sessionId: number, userId: number): Promise<boolean> {
    const result = await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.id, sessionId),
          eq(refreshTokensTable.userId, userId)
        )
      );

    // Check if any row was updated
    const rowCount = result.rowCount ?? 0;
    return rowCount > 0;
  }

  /**
   * Revoke all sessions for a user except the current one.
   *
   * @param userId - The user ID
   * @param currentSessionId - The current session ID to keep active
   * @returns Number of sessions revoked
   */
  async revokeAllSessions(userId: number, currentSessionId?: number): Promise<number> {
    if (currentSessionId) {
      // Revoke all sessions first (including current)
      const result = await db
        .update(refreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokensTable.userId, userId),
            isNull(refreshTokensTable.revokedAt)
          )
        );

      // Restore the current session
      await db
        .update(refreshTokensTable)
        .set({ revokedAt: null })
        .where(eq(refreshTokensTable.id, currentSessionId));

      // Return count of revoked sessions (total - 1 for current)
      return Math.max(0, (result.rowCount ?? 0) - 1);
    } else {
      // Revoke all sessions
      const result = await db
        .update(refreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokensTable.userId, userId),
            isNull(refreshTokensTable.revokedAt)
          )
        );

      return result.rowCount ?? 0;
    }
  }

  /**
   * Get the session ID for a given refresh token.
   * Used to identify the current session for marking in the list.
   *
   * @param token - The refresh token
   * @returns The session ID, or null if not found
   */
  async getSessionIdForToken(token: string): Promise<number | null> {
    const sessions = await db
      .select({
        id: refreshTokensTable.id,
        tokenHash: refreshTokensTable.tokenHash,
      })
      .from(refreshTokensTable)
      .where(isNull(refreshTokensTable.revokedAt));

    for (const session of sessions) {
      const bcrypt = require("bcryptjs");
      const isValid = await bcrypt.compare(token, session.tokenHash);
      if (isValid) {
        return session.id;
      }
    }

    return null;
  }
}

export const sessionService = new SessionService();
