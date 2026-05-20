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
import { db, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { createHash } from "crypto";

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
 * Hash a user agent string for privacy-preserving device identification.
 * This allows users to recognize their devices without exposing full user agent strings.
 *
 * @param userAgent - The user agent string to hash
 * @returns A short hash of the user agent (first 8 chars for identification)
 */
function hashUserAgent(userAgent: string): string {
  if (stryMutAct_9fa48("371")) {
    {}
  } else {
    stryCov_9fa48("371");
    const prefix = stryMutAct_9fa48("372") ? userAgent : (stryCov_9fa48("372"), userAgent.substring(0, stryMutAct_9fa48("373") ? Math.max(50, userAgent.length) : (stryCov_9fa48("373"), Math.min(50, userAgent.length))));
    return stryMutAct_9fa48("374") ? createHash("sha256").update(prefix).digest("hex") : (stryCov_9fa48("374"), createHash("sha256").update(prefix).digest("hex").substring(0, 12));
  }
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
  if (stryMutAct_9fa48("377")) {
    {}
  } else {
    stryCov_9fa48("377");
    if (stryMutAct_9fa48("380") ? false : stryMutAct_9fa48("379") ? true : stryMutAct_9fa48("378") ? userAgent : (stryCov_9fa48("378", "379", "380"), !userAgent)) {
      if (stryMutAct_9fa48("381")) {
        {}
      } else {
        stryCov_9fa48("381");
        return "Unknown Device";
      }
    }

    // Check if this looks like a hash (64 hex characters = SHA-256)
    // If so, we can't parse it, return unknown
    if (stryMutAct_9fa48("385") ? userAgent.length === 64 || /^[a-f0-9]{64}$/.test(userAgent) : stryMutAct_9fa48("384") ? false : stryMutAct_9fa48("383") ? true : (stryCov_9fa48("383", "384", "385"), (stryMutAct_9fa48("387") ? userAgent.length !== 64 : stryMutAct_9fa48("386") ? true : (stryCov_9fa48("386", "387"), userAgent.length === 64)) && (stryMutAct_9fa48("391") ? /^[^a-f0-9]{64}$/ : stryMutAct_9fa48("390") ? /^[a-f0-9]$/ : stryMutAct_9fa48("389") ? /^[a-f0-9]{64}/ : stryMutAct_9fa48("388") ? /[a-f0-9]{64}$/ : (stryCov_9fa48("388", "389", "390", "391"), /^[a-f0-9]{64}$/)).test(userAgent))) {
      if (stryMutAct_9fa48("392")) {
        {}
      } else {
        stryCov_9fa48("392");
        return "Device (Hashed)";
      }
    }
    const ua = stryMutAct_9fa48("394") ? userAgent.toUpperCase() : (stryCov_9fa48("394"), userAgent.toLowerCase());

    // Detect browser
    let browser = "Unknown Browser";
    if (stryMutAct_9fa48("398") ? ua.includes("chrome") || !ua.includes("edg") : stryMutAct_9fa48("397") ? false : stryMutAct_9fa48("396") ? true : (stryCov_9fa48("396", "397", "398"), ua.includes("chrome") && (stryMutAct_9fa48("400") ? ua.includes("edg") : (stryCov_9fa48("400"), !ua.includes("edg"))))) {
      if (stryMutAct_9fa48("402")) {
        {}
      } else {
        stryCov_9fa48("402");
        browser = "Chrome";
      }
    } else if (stryMutAct_9fa48("406") ? ua.includes("safari") || !ua.includes("chrome") : stryMutAct_9fa48("405") ? false : stryMutAct_9fa48("404") ? true : (stryCov_9fa48("404", "405", "406"), ua.includes("safari") && (stryMutAct_9fa48("408") ? ua.includes("chrome") : (stryCov_9fa48("408"), !ua.includes("chrome"))))) {
      if (stryMutAct_9fa48("410")) {
        {}
      } else {
        stryCov_9fa48("410");
        browser = "Safari";
      }
    } else if (stryMutAct_9fa48("413") ? false : stryMutAct_9fa48("412") ? true : (stryCov_9fa48("412", "413"), ua.includes("firefox"))) {
      if (stryMutAct_9fa48("415")) {
        {}
      } else {
        stryCov_9fa48("415");
        browser = "Firefox";
      }
    } else if (stryMutAct_9fa48("418") ? false : stryMutAct_9fa48("417") ? true : (stryCov_9fa48("417", "418"), ua.includes("edg"))) {
      if (stryMutAct_9fa48("420")) {
        {}
      } else {
        stryCov_9fa48("420");
        browser = "Edge";
      }
    } else if (stryMutAct_9fa48("424") ? ua.includes("opera") && ua.includes("opr") : stryMutAct_9fa48("423") ? false : stryMutAct_9fa48("422") ? true : (stryCov_9fa48("422", "423", "424"), ua.includes("opera") || ua.includes("opr"))) {
      if (stryMutAct_9fa48("427")) {
        {}
      } else {
        stryCov_9fa48("427");
        browser = "Opera";
      }
    }

    // Detect OS
    let os = "Unknown OS";
    if (stryMutAct_9fa48("431") ? false : stryMutAct_9fa48("430") ? true : (stryCov_9fa48("430", "431"), ua.includes("windows"))) {
      if (stryMutAct_9fa48("433")) {
        {}
      } else {
        stryCov_9fa48("433");
        os = "Windows";
      }
    } else if (stryMutAct_9fa48("437") ? ua.includes("mac os x") && ua.includes("macintosh") : stryMutAct_9fa48("436") ? false : stryMutAct_9fa48("435") ? true : (stryCov_9fa48("435", "436", "437"), ua.includes("mac os x") || ua.includes("macintosh"))) {
      if (stryMutAct_9fa48("440")) {
        {}
      } else {
        stryCov_9fa48("440");
        os = "macOS";
      }
    } else if (stryMutAct_9fa48("443") ? false : stryMutAct_9fa48("442") ? true : (stryCov_9fa48("442", "443"), ua.includes("linux"))) {
      if (stryMutAct_9fa48("445")) {
        {}
      } else {
        stryCov_9fa48("445");
        os = "Linux";
      }
    } else if (stryMutAct_9fa48("448") ? false : stryMutAct_9fa48("447") ? true : (stryCov_9fa48("447", "448"), ua.includes("android"))) {
      if (stryMutAct_9fa48("450")) {
        {}
      } else {
        stryCov_9fa48("450");
        os = "Android";
      }
    } else if (stryMutAct_9fa48("454") ? (ua.includes("iphone") || ua.includes("ipad")) && ua.includes("ipod") : stryMutAct_9fa48("453") ? false : stryMutAct_9fa48("452") ? true : (stryCov_9fa48("452", "453", "454"), (stryMutAct_9fa48("456") ? ua.includes("iphone") && ua.includes("ipad") : stryMutAct_9fa48("455") ? false : (stryCov_9fa48("455", "456"), ua.includes("iphone") || ua.includes("ipad"))) || ua.includes("ipod"))) {
      if (stryMutAct_9fa48("460")) {
        {}
      } else {
        stryCov_9fa48("460");
        os = "iOS";
      }
    }

    // Detect mobile
    const isMobile = stryMutAct_9fa48("464") ? (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) && ua.includes("ipad") : stryMutAct_9fa48("463") ? false : stryMutAct_9fa48("462") ? true : (stryCov_9fa48("462", "463", "464"), (stryMutAct_9fa48("466") ? (ua.includes("mobile") || ua.includes("android")) && ua.includes("iphone") : stryMutAct_9fa48("465") ? false : (stryCov_9fa48("465", "466"), (stryMutAct_9fa48("468") ? ua.includes("mobile") && ua.includes("android") : stryMutAct_9fa48("467") ? false : (stryCov_9fa48("467", "468"), ua.includes("mobile") || ua.includes("android"))) || ua.includes("iphone"))) || ua.includes("ipad"));
    return `${browser} on ${os}${isMobile ? " (Mobile)" : ""}`;
  }
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
    if (stryMutAct_9fa48("476")) {
      {}
    } else {
      stryCov_9fa48("476");
      const sessions = await db.select(stryMutAct_9fa48("477") ? {} : (stryCov_9fa48("477"), {
        id: refreshTokensTable.id,
        userId: refreshTokensTable.userId,
        createdAt: refreshTokensTable.createdAt,
        expiresAt: refreshTokensTable.expiresAt,
        userAgent: refreshTokensTable.userAgent,
        tokenHash: refreshTokensTable.tokenHash
      })).from(refreshTokensTable).where(and(eq(refreshTokensTable.userId, userId), isNull(refreshTokensTable.revokedAt))).orderBy(desc(refreshTokensTable.createdAt));

      // Mark the current session if token hash is provided
      return sessions.map(stryMutAct_9fa48("478") ? () => undefined : (stryCov_9fa48("478"), session => stryMutAct_9fa48("479") ? {} : (stryCov_9fa48("479"), {
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent ? parseUserAgent(session.userAgent) : null,
        isCurrent: currentTokenHash ? stryMutAct_9fa48("482") ? session.tokenHash !== currentTokenHash : stryMutAct_9fa48("481") ? false : stryMutAct_9fa48("480") ? true : (stryCov_9fa48("480", "481", "482"), session.tokenHash === currentTokenHash) : stryMutAct_9fa48("483") ? true : (stryCov_9fa48("483"), false)
      })));
    }
  }

  /**
   * Revoke a specific session by ID.
   *
   * @param sessionId - The session ID to revoke
   * @param userId - The user ID (for authorization check)
   * @returns True if the session was revoked, false if not found or not authorized
   */
  async revokeSession(sessionId: number, userId: number): Promise<boolean> {
    if (stryMutAct_9fa48("484")) {
      {}
    } else {
      stryCov_9fa48("484");
      const result = await db.update(refreshTokensTable).set(stryMutAct_9fa48("485") ? {} : (stryCov_9fa48("485"), {
        revokedAt: new Date()
      })).where(and(eq(refreshTokensTable.id, sessionId), eq(refreshTokensTable.userId, userId)));

      // Check if any row was updated
      const rowCount = stryMutAct_9fa48("486") ? result.rowCount && 0 : (stryCov_9fa48("486"), result.rowCount ?? 0);
      return stryMutAct_9fa48("490") ? rowCount <= 0 : stryMutAct_9fa48("489") ? rowCount >= 0 : stryMutAct_9fa48("488") ? false : stryMutAct_9fa48("487") ? true : (stryCov_9fa48("487", "488", "489", "490"), rowCount > 0);
    }
  }

  /**
   * Revoke all sessions for a user except the current one.
   *
   * @param userId - The user ID
   * @param currentSessionId - The current session ID to keep active
   * @returns Number of sessions revoked
   */
  async revokeAllSessions(userId: number, currentSessionId?: number): Promise<number> {
    if (stryMutAct_9fa48("491")) {
      {}
    } else {
      stryCov_9fa48("491");
      if (stryMutAct_9fa48("493") ? false : stryMutAct_9fa48("492") ? true : (stryCov_9fa48("492", "493"), currentSessionId)) {
        if (stryMutAct_9fa48("494")) {
          {}
        } else {
          stryCov_9fa48("494");
          // Revoke all sessions first (including current)
          const result = await db.update(refreshTokensTable).set(stryMutAct_9fa48("495") ? {} : (stryCov_9fa48("495"), {
            revokedAt: new Date()
          })).where(and(eq(refreshTokensTable.userId, userId), isNull(refreshTokensTable.revokedAt)));

          // Restore the current session
          await db.update(refreshTokensTable).set(stryMutAct_9fa48("496") ? {} : (stryCov_9fa48("496"), {
            revokedAt: null
          })).where(eq(refreshTokensTable.id, currentSessionId));

          // Return count of revoked sessions (total - 1 for current)
          return stryMutAct_9fa48("497") ? Math.min(0, (result.rowCount ?? 0) - 1) : (stryCov_9fa48("497"), Math.max(0, stryMutAct_9fa48("498") ? (result.rowCount ?? 0) + 1 : (stryCov_9fa48("498"), (stryMutAct_9fa48("499") ? result.rowCount && 0 : (stryCov_9fa48("499"), result.rowCount ?? 0)) - 1)));
        }
      } else {
        if (stryMutAct_9fa48("500")) {
          {}
        } else {
          stryCov_9fa48("500");
          // Revoke all sessions
          const result = await db.update(refreshTokensTable).set(stryMutAct_9fa48("501") ? {} : (stryCov_9fa48("501"), {
            revokedAt: new Date()
          })).where(and(eq(refreshTokensTable.userId, userId), isNull(refreshTokensTable.revokedAt)));
          return stryMutAct_9fa48("502") ? result.rowCount && 0 : (stryCov_9fa48("502"), result.rowCount ?? 0);
        }
      }
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
    if (stryMutAct_9fa48("503")) {
      {}
    } else {
      stryCov_9fa48("503");
      const sessions = await db.select(stryMutAct_9fa48("504") ? {} : (stryCov_9fa48("504"), {
        id: refreshTokensTable.id,
        tokenHash: refreshTokensTable.tokenHash
      })).from(refreshTokensTable).where(isNull(refreshTokensTable.revokedAt));
      for (const session of sessions) {
        if (stryMutAct_9fa48("505")) {
          {}
        } else {
          stryCov_9fa48("505");
          const bcrypt = require("bcryptjs");
          const isValid = await bcrypt.compare(token, session.tokenHash);
          if (stryMutAct_9fa48("507") ? false : stryMutAct_9fa48("506") ? true : (stryCov_9fa48("506", "507"), isValid)) {
            if (stryMutAct_9fa48("508")) {
              {}
            } else {
              stryCov_9fa48("508");
              return session.id;
            }
          }
        }
      }
      return null;
    }
  }
}
export const sessionService = new SessionService();