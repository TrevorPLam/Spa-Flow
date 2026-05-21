import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Parameters for writing an audit log entry
 */
export interface AuditParams {
  /** ID of the user performing the action */
  userId: number;
  /** Action being performed (e.g., "CREATE_LOCKER", "UPDATE_SESSION") */
  action: string;
  /** Type of resource being acted upon (e.g., "LOCKER", "ROOM", "CLIENT") */
  resourceType: string;
  /** Optional ID of the specific resource */
  resourceId?: number;
  /** Optional human-readable description of the action */
  description?: string;
  /** Optional request ID for tracing */
  requestId?: string;
  /** Optional timestamp (defaults to current time if not provided) */
  timestamp?: Date;
}

/**
 * Writes an audit log entry to the database
 * Logs an error but does not throw if the write fails
 *
 * @param params - Audit log parameters
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      description: params.description ?? null,
    });
  } catch (err) {
    logger.error({ 
      err: err instanceof Error ? {
        name: err.name,
        message: err.message,
        stack: err.stack,
      } : String(err),
      auditParams: params,
      requestId: params.requestId,
      timestamp: params.timestamp || new Date().toISOString(),
    }, "Failed to write audit log");
  }
}
