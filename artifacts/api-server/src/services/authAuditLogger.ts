import { db, auditLogsTable } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * Data for a login attempt audit log entry
 */
export interface LoginAttemptData {
  /** Optional user ID (null if user not found) */
  userId?: number;
  /** Email address used for login attempt */
  email: string;
  /** IP address of the request */
  ipAddress: string;
  /** Whether the login attempt was successful */
  success: boolean;
  /** Optional reason for failure */
  reason?: string;
  /** Optional correlation ID for request tracing */
  correlationId?: string;
}

/**
 * Data for a logout audit log entry
 */
export interface LogoutData {
  /** User ID of the user logging out */
  userId: number;
  /** IP address of the request */
  ipAddress: string;
  /** Optional correlation ID for request tracing */
  correlationId?: string;
}

/**
 * AuthAuditLogger handles audit logging for authentication events.
 * Logs login attempts (success/failure) and logout events to the audit_logs table.
 * Follows OWASP best practices for security event logging.
 */
export class AuthAuditLogger {
  /**
   * Logs a login attempt (success or failure)
   * Logs to audit_logs table with appropriate action type
   *
   * @param data - Login attempt data including email, IP, and success status
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
   * Logs a logout event
   * Logs to audit_logs table with LOGOUT action type
   *
   * @param data - Logout data including user ID and IP address
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
