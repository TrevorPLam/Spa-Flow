import { db, auditLogsTable } from "@workspace/db";
import { logger } from "../lib/logger";

export interface LoginAttemptData {
  userId?: number;
  email: string;
  ipAddress: string;
  success: boolean;
  reason?: string;
  correlationId?: string;
}

export interface LogoutData {
  userId: number;
  ipAddress: string;
  correlationId?: string;
}

/**
 * AuthAuditLogger handles audit logging for authentication events.
 * Logs login attempts (success/failure) and logout events to the audit_logs table.
 * Follows OWASP best practices for security event logging.
 */
export class AuthAuditLogger {
  /**
   * Log a login attempt (success or failure)
   */
  async logLoginAttempt(data: LoginAttemptData): Promise<void> {
    try {
      await db.insert(auditLogsTable).values({
        userId: data.userId ?? null,
        action: data.success ? "LOGIN_SUCCESS" : "LOGIN_FAILURE",
        resourceType: "AUTH",
        description: data.reason || (data.success ? "User logged in successfully" : "Login attempt failed"),
        ipAddress: data.ipAddress,
        email: data.email,
        correlationId: data.correlationId ?? null,
      });
    } catch (err) {
      logger.error(
        {
          err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
          auditData: { ...data, userId: data.userId ?? "null" },
        },
        "Failed to write auth audit log"
      );
    }
  }

  /**
   * Log a logout event
   */
  async logLogout(data: LogoutData): Promise<void> {
    try {
      await db.insert(auditLogsTable).values({
        userId: data.userId,
        action: "LOGOUT",
        resourceType: "AUTH",
        description: "User logged out",
        ipAddress: data.ipAddress,
        correlationId: data.correlationId ?? null,
      });
    } catch (err) {
      logger.error(
        {
          err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
          auditData: data,
        },
        "Failed to write logout audit log"
      );
    }
  }
}

export const authAuditLogger = new AuthAuditLogger();
