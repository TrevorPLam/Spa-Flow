import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export interface AuditParams {
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  description?: string;
  // Optional request context for enhanced error logging
  requestId?: string;
  timestamp?: Date;
}

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
