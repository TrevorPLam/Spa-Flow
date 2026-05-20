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
import { db, usersTable, passwordResetTokensTable, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";
import { validatePassword } from "../lib/auth";
import { getEnv } from "../lib/env";
const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 30; // OWASP recommends 15-60 minutes

export interface PasswordResetRequestResult {
  success: boolean;
  message: string;
  token?: string; // Only included in test mode
}
export interface PasswordResetConfirmResult {
  success: boolean;
  message: string;
}

/**
 * PasswordResetTokenService handles password reset token generation, validation,
 * and password reset operations following OWASP and NIST 2025 best practices.
 */
export class PasswordResetTokenService {
  /**
   * Request a password reset for a user.
   * Generates a reset token and (in production) sends it via email.
   * Returns a generic message regardless of whether the email exists to prevent user enumeration.
   *
   * @param email - The user's email address
   * @returns Result with success and generic message
   */
  async requestReset(email: string): Promise<PasswordResetRequestResult> {
    if (stryMutAct_9fa48("294")) {
      {}
    } else {
      stryCov_9fa48("294");
      // Always query database to prevent timing-based user enumeration
      const [user] = await db.select(stryMutAct_9fa48("295") ? {} : (stryCov_9fa48("295"), {
        id: usersTable.id,
        email: usersTable.email
      })).from(usersTable).where(eq(usersTable.email, email));
      if (stryMutAct_9fa48("298") ? false : stryMutAct_9fa48("297") ? true : stryMutAct_9fa48("296") ? user : (stryCov_9fa48("296", "297", "298"), !user)) {
        if (stryMutAct_9fa48("299")) {
          {}
        } else {
          stryCov_9fa48("299");
          // Return generic message to prevent user enumeration
          logger.info(stryMutAct_9fa48("300") ? {} : (stryCov_9fa48("300"), {
            email
          }), "Password reset requested for non-existent email");
          return stryMutAct_9fa48("302") ? {} : (stryCov_9fa48("302"), {
            success: stryMutAct_9fa48("303") ? false : (stryCov_9fa48("303"), true),
            message: "If an account with this email exists, a password reset link has been sent."
          });
        }
      }

      // Generate a cryptographically random token (32 bytes = 256 bits, well above OWASP 128-bit minimum)
      const token = randomBytes(32).toString("hex");

      // Hash the token before storing (bcrypt is suitable for this use case)
      const tokenHash = await bcrypt.hash(token, 10);

      // Calculate expiration date (30 minutes from now per OWASP best practices)
      const expiresAt = new Date();
      stryMutAct_9fa48("306") ? expiresAt.setHours(expiresAt.getMinutes() + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES) : (stryCov_9fa48("306"), expiresAt.setMinutes(stryMutAct_9fa48("307") ? expiresAt.getMinutes() - PASSWORD_RESET_TOKEN_EXPIRY_MINUTES : (stryCov_9fa48("307"), expiresAt.getMinutes() + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES)));

      // Store the token hash in the database
      await db.insert(passwordResetTokensTable).values(stryMutAct_9fa48("308") ? {} : (stryCov_9fa48("308"), {
        userId: user.id,
        tokenHash,
        expiresAt
      }));

      // In production, send email with reset link
      // For now, log the token (in production, this would be sent via email)
      logger.info(stryMutAct_9fa48("309") ? {} : (stryCov_9fa48("309"), {
        userId: user.id,
        email: user.email,
        tokenPrefix: stryMutAct_9fa48("310") ? token : (stryCov_9fa48("310"), token.substring(0, 8))
      }), "Password reset token generated (email would be sent in production)");

      // TODO: Integrate email service to send reset link
      // The email should contain a link like: https://app.com/reset-password?token=xxx

      // In test/development mode, include the token in the response for E2E testing
      const env = getEnv();
      const result: PasswordResetRequestResult = stryMutAct_9fa48("312") ? {} : (stryCov_9fa48("312"), {
        success: stryMutAct_9fa48("313") ? false : (stryCov_9fa48("313"), true),
        message: "If an account with this email exists, a password reset link has been sent."
      });
      if (stryMutAct_9fa48("317") ? env.NODE_ENV === 'test' && env.NODE_ENV === 'development' : stryMutAct_9fa48("316") ? false : stryMutAct_9fa48("315") ? true : (stryCov_9fa48("315", "316", "317"), (stryMutAct_9fa48("319") ? env.NODE_ENV !== 'test' : stryMutAct_9fa48("318") ? false : (stryCov_9fa48("318", "319"), env.NODE_ENV === 'test')) || (stryMutAct_9fa48("322") ? env.NODE_ENV !== 'development' : stryMutAct_9fa48("321") ? false : (stryCov_9fa48("321", "322"), env.NODE_ENV === 'development')))) {
        if (stryMutAct_9fa48("324")) {
          {}
        } else {
          stryCov_9fa48("324");
          result.token = token;
          logger.warn(stryMutAct_9fa48("325") ? {} : (stryCov_9fa48("325"), {
            userId: user.id,
            email: user.email
          }), "Password reset token included in response (test mode only)");
        }
      }
      return result;
    }
  }

  /**
   * Confirm a password reset using a reset token.
   * Validates the token, updates the user's password, marks the token as used,
   * and invalidates all existing sessions for the user.
   *
   * @param token - The reset token
   * @param newPassword - The new password
   * @returns Result with success status and message
   */
  async confirmReset(token: string, newPassword: string): Promise<PasswordResetConfirmResult> {
    if (stryMutAct_9fa48("327")) {
      {}
    } else {
      stryCov_9fa48("327");
      // Validate password according to NIST 2025 guidelines
      const passwordValidation = validatePassword(newPassword);
      if (stryMutAct_9fa48("330") ? false : stryMutAct_9fa48("329") ? true : stryMutAct_9fa48("328") ? passwordValidation.valid : (stryCov_9fa48("328", "329", "330"), !passwordValidation.valid)) {
        if (stryMutAct_9fa48("331")) {
          {}
        } else {
          stryCov_9fa48("331");
          return stryMutAct_9fa48("332") ? {} : (stryCov_9fa48("332"), {
            success: stryMutAct_9fa48("333") ? true : (stryCov_9fa48("333"), false),
            message: stryMutAct_9fa48("336") ? passwordValidation.error && "Invalid password" : stryMutAct_9fa48("335") ? false : stryMutAct_9fa48("334") ? true : (stryCov_9fa48("334", "335", "336"), passwordValidation.error || "Invalid password")
          });
        }
      }

      // Find and verify the token
      const tokens = await db.select().from(passwordResetTokensTable).where(isNull(passwordResetTokensTable.usedAt));
      let tokenRecord: typeof passwordResetTokensTable.$inferSelect | null = null;
      for (const resetToken of tokens) {
        if (stryMutAct_9fa48("338")) {
          {}
        } else {
          stryCov_9fa48("338");
          const isValid = await bcrypt.compare(token, resetToken.tokenHash);
          if (stryMutAct_9fa48("340") ? false : stryMutAct_9fa48("339") ? true : (stryCov_9fa48("339", "340"), isValid)) {
            if (stryMutAct_9fa48("341")) {
              {}
            } else {
              stryCov_9fa48("341");
              tokenRecord = resetToken;
              break;
            }
          }
        }
      }
      if (stryMutAct_9fa48("344") ? false : stryMutAct_9fa48("343") ? true : stryMutAct_9fa48("342") ? tokenRecord : (stryCov_9fa48("342", "343", "344"), !tokenRecord)) {
        if (stryMutAct_9fa48("345")) {
          {}
        } else {
          stryCov_9fa48("345");
          return stryMutAct_9fa48("346") ? {} : (stryCov_9fa48("346"), {
            success: stryMutAct_9fa48("347") ? true : (stryCov_9fa48("347"), false),
            message: "Invalid or expired reset token"
          });
        }
      }

      // Check if token is expired
      if (stryMutAct_9fa48("352") ? tokenRecord.expiresAt >= new Date() : stryMutAct_9fa48("351") ? tokenRecord.expiresAt <= new Date() : stryMutAct_9fa48("350") ? false : stryMutAct_9fa48("349") ? true : (stryCov_9fa48("349", "350", "351", "352"), tokenRecord.expiresAt < new Date())) {
        if (stryMutAct_9fa48("353")) {
          {}
        } else {
          stryCov_9fa48("353");
          return stryMutAct_9fa48("354") ? {} : (stryCov_9fa48("354"), {
            success: stryMutAct_9fa48("355") ? true : (stryCov_9fa48("355"), false),
            message: "Reset token has expired"
          });
        }
      }

      // Check if token has already been used
      if (stryMutAct_9fa48("358") ? false : stryMutAct_9fa48("357") ? true : (stryCov_9fa48("357", "358"), tokenRecord.usedAt)) {
        if (stryMutAct_9fa48("359")) {
          {}
        } else {
          stryCov_9fa48("359");
          return stryMutAct_9fa48("360") ? {} : (stryCov_9fa48("360"), {
            success: stryMutAct_9fa48("361") ? true : (stryCov_9fa48("361"), false),
            message: "Reset token has already been used"
          });
        }
      }

      // Hash the new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update user's password
      await db.update(usersTable).set(stryMutAct_9fa48("363") ? {} : (stryCov_9fa48("363"), {
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      })).where(eq(usersTable.id, tokenRecord.userId));

      // Mark the token as used
      await db.update(passwordResetTokensTable).set(stryMutAct_9fa48("364") ? {} : (stryCov_9fa48("364"), {
        usedAt: new Date()
      })).where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Invalidate all existing refresh tokens for the user (revoke all sessions)
      await db.update(refreshTokensTable).set(stryMutAct_9fa48("365") ? {} : (stryCov_9fa48("365"), {
        revokedAt: new Date()
      })).where(and(eq(refreshTokensTable.userId, tokenRecord.userId), isNull(refreshTokensTable.revokedAt)));
      logger.info(stryMutAct_9fa48("366") ? {} : (stryCov_9fa48("366"), {
        userId: tokenRecord.userId
      }), "Password reset completed, all sessions invalidated");

      // TODO: Send email notification that password has been reset (don't include password)

      return stryMutAct_9fa48("368") ? {} : (stryCov_9fa48("368"), {
        success: stryMutAct_9fa48("369") ? false : (stryCov_9fa48("369"), true),
        message: "Password has been reset successfully. Please log in with your new password."
      });
    }
  }
}
export const passwordResetTokenService = new PasswordResetTokenService();