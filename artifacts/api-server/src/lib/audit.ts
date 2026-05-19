import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export interface AuditParams {
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  description?: string;
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
    logger.error({ err, params }, "Failed to write audit log");
  }
}
