import { db, usersTable, passwordResetTokensTable, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";
import { validatePassword } from "../lib/auth";
import { getEnv } from "../lib/env";
import { BCRYPT_ROUNDS } from "../lib/constants";

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
    // Always query database to prevent timing-based user enumeration
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      // Return generic message to prevent user enumeration
      logger.info({ email }, "Password reset requested for non-existent email");
      return {
        success: true,
        message: "If an account with this email exists, a password reset link has been sent.",
      };
    }

    // Generate a cryptographically random token (32 bytes = 256 bits, well above OWASP 128-bit minimum)
    const token = randomBytes(32).toString("hex");

    // Hash the token before storing (bcrypt is suitable for this use case)
    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);

    // Calculate expiration date (30 minutes from now per OWASP best practices)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES);

    // Store the token hash in the database
    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // In production, send email with reset link
    // For now, log the token (in production, this would be sent via email)
    logger.info(
      { userId: user.id, email: user.email, tokenPrefix: token.substring(0, 8) },
      "Password reset token generated (email would be sent in production)"
    );

    // TODO: Integrate email service to send reset link
    // The email should contain a link like: https://app.com/reset-password?token=xxx

    // In test/development mode, include the token in the response for E2E testing
    const env = getEnv();
    const result: PasswordResetRequestResult = {
      success: true,
      message: "If an account with this email exists, a password reset link has been sent.",
    };

    if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development') {
      result.token = token;
      logger.warn({ userId: user.id, email: user.email }, "Password reset token included in response (test mode only)");
    }

    return result;
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
    // Validate password according to NIST 2025 guidelines
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return {
        success: false,
        message: passwordValidation.error || "Invalid password",
      };
    }

    // Find and verify the token
    const tokens = await db
      .select()
      .from(passwordResetTokensTable)
      .where(isNull(passwordResetTokensTable.usedAt));

    let tokenRecord: typeof passwordResetTokensTable.$inferSelect | null = null;

    for (const resetToken of tokens) {
      const isValid = await bcrypt.compare(token, resetToken.tokenHash);
      if (isValid) {
        tokenRecord = resetToken;
        break;
      }
    }

    if (!tokenRecord) {
      return {
        success: false,
        message: "Invalid or expired reset token",
      };
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      return {
        success: false,
        message: "Reset token has expired",
      };
    }

    // Check if token has already been used
    if (tokenRecord.usedAt) {
      return {
        success: false,
        message: "Reset token has already been used",
      };
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update user's password
    await db
      .update(usersTable)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, tokenRecord.userId));

    // Mark the token as used
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, tokenRecord.id));

    // Invalidate all existing refresh tokens for the user (revoke all sessions)
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.userId, tokenRecord.userId),
          isNull(refreshTokensTable.revokedAt)
        )
      );

    logger.info(
      { userId: tokenRecord.userId },
      "Password reset completed, all sessions invalidated"
    );

    // TODO: Send email notification that password has been reset (don't include password)

    return {
      success: true,
      message: "Password has been reset successfully. Please log in with your new password.",
    };
  }
}

export const passwordResetTokenService = new PasswordResetTokenService();
