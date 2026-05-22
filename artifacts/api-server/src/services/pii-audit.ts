import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { writeAuditLog } from "../lib/audit";
import { logger } from "../lib/logger";

/**
 * Configuration for anomaly detection thresholds
 */
const ANOMALY_THRESHOLDS = {
  /** Number of PII accesses in a time window to trigger bulk access alert */
  BULK_ACCESS_THRESHOLD: 10,
  /** Time window in minutes for bulk access detection */
  BULK_ACCESS_WINDOW_MINUTES: 60,
  /** Number of rapid successive accesses to trigger alert */
  RAPID_ACCESS_THRESHOLD: 5,
  /** Time window in seconds for rapid access detection */
  RAPID_ACCESS_WINDOW_SECONDS: 60,
  /** Business hours start (24-hour format) */
  BUSINESS_HOURS_START: 8,
  /** Business hours end (24-hour format) */
  BUSINESS_HOURS_END: 20,
} as const;

/**
 * PII access anomaly detected
 */
export interface PIIAnomaly {
  type: "bulk_access" | "off_hours" | "rapid_access";
  userId: number;
  description: string;
  severity: "low" | "medium" | "high";
  metadata: Record<string, unknown>;
}

/**
 * Detects bulk PII access patterns
 * Triggers when a user accesses PII for more than threshold clients within a time window
 */
export async function detectBulkPIIAccess(userId: number): Promise<PIIAnomaly | null> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - ANOMALY_THRESHOLDS.BULK_ACCESS_WINDOW_MINUTES);

  const result = await db
    .select({ count: count() })
    .from(auditLogsTable)
    .where(
      and(
        eq(auditLogsTable.userId, userId),
        eq(auditLogsTable.action, "VIEW_PII"),
        gte(auditLogsTable.createdAt, windowStart)
      )
    );

  const accessCount = result[0]?.count ?? 0;

  if (accessCount >= ANOMALY_THRESHOLDS.BULK_ACCESS_THRESHOLD) {
    return {
      type: "bulk_access",
      userId,
      description: `User accessed PII for ${accessCount} clients in the last ${ANOMALY_THRESHOLDS.BULK_ACCESS_WINDOW_MINUTES} minutes`,
      severity: accessCount >= 20 ? "high" : "medium",
      metadata: {
        accessCount,
        windowMinutes: ANOMALY_THRESHOLDS.BULK_ACCESS_WINDOW_MINUTES,
      },
    };
  }

  return null;
}

/**
 * Detects off-hours PII access
 * Triggers when PII is accessed outside business hours
 */
export async function detectOffHoursPIIAccess(userId: number): Promise<PIIAnomaly | null> {
  const now = new Date();
  const hour = now.getHours();

  if (hour < ANOMALY_THRESHOLDS.BUSINESS_HOURS_START || hour >= ANOMALY_THRESHOLDS.BUSINESS_HOURS_END) {
    return {
      type: "off_hours",
      userId,
      description: `User accessed PII at ${hour}:00 (outside business hours ${ANOMALY_THRESHOLDS.BUSINESS_HOURS_START}:00-${ANOMALY_THRESHOLDS.BUSINESS_HOURS_END}:00)`,
      severity: "medium",
      metadata: {
        accessHour: hour,
        businessHoursStart: ANOMALY_THRESHOLDS.BUSINESS_HOURS_START,
        businessHoursEnd: ANOMALY_THRESHOLDS.BUSINESS_HOURS_END,
      },
    };
  }

  return null;
}

/**
 * Detects rapid successive PII access
 * Triggers when a user accesses PII multiple times within a short time window
 */
export async function detectRapidPIIAccess(userId: number): Promise<PIIAnomaly | null> {
  const windowStart = new Date();
  windowStart.setSeconds(windowStart.getSeconds() - ANOMALY_THRESHOLDS.RAPID_ACCESS_WINDOW_SECONDS);

  const result = await db
    .select({ count: count() })
    .from(auditLogsTable)
    .where(
      and(
        eq(auditLogsTable.userId, userId),
        eq(auditLogsTable.action, "VIEW_PII"),
        gte(auditLogsTable.createdAt, windowStart)
      )
    );

  const accessCount = result[0]?.count ?? 0;

  if (accessCount >= ANOMALY_THRESHOLDS.RAPID_ACCESS_THRESHOLD) {
    return {
      type: "rapid_access",
      userId,
      description: `User accessed PII ${accessCount} times in ${ANOMALY_THRESHOLDS.RAPID_ACCESS_WINDOW_SECONDS} seconds`,
      severity: "high",
      metadata: {
        accessCount,
        windowSeconds: ANOMALY_THRESHOLDS.RAPID_ACCESS_WINDOW_SECONDS,
      },
    };
  }

  return null;
}

/**
 * Runs all anomaly detection checks for a user
 * Returns any anomalies detected
 */
export async function detectPIIAnomalies(userId: number): Promise<PIIAnomaly[]> {
  const anomalies: PIIAnomaly[] = [];

  const [bulkAnomaly, offHoursAnomaly, rapidAnomaly] = await Promise.all([
    detectBulkPIIAccess(userId),
    detectOffHoursPIIAccess(userId),
    detectRapidPIIAccess(userId),
  ]);

  if (bulkAnomaly) anomalies.push(bulkAnomaly);
  if (offHoursAnomaly) anomalies.push(offHoursAnomaly);
  if (rapidAnomaly) anomalies.push(rapidAnomaly);

  return anomalies;
}

/**
 * Logs a PII access anomaly to the audit log
 */
export async function logPIIAnomaly(anomaly: PIIAnomaly, requestingUserId: number): Promise<void> {
  await writeAuditLog({
    userId: requestingUserId,
    action: "PII_ANOMALY_DETECTED",
    resourceType: "pii_audit",
    description: anomaly.description,
    requestId: `anomaly-${anomaly.type}-${anomaly.userId}-${Date.now()}`,
  });

  logger.warn({
    anomaly,
    requestingUserId,
  }, "PII access anomaly detected");
}

/**
 * Sends an alert to managers about a PII access anomaly
 * Attempts to use notification system if available, otherwise logs only
 */
export async function sendPIIAnomalyAlert(anomaly: PIIAnomaly): Promise<void> {
  try {
    // Get all manager users to notify them
    const managers = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.role, "MANAGER"));

    if (managers.length === 0) {
      logger.warn({ anomaly }, "No managers found to notify about PII anomaly");
      return;
    }

    // Log the alert for all managers
    for (const manager of managers) {
      await writeAuditLog({
        userId: manager.id,
        action: "PII_ANOMALY_ALERT",
        resourceType: "pii_audit",
        description: `PII access anomaly alert: ${anomaly.description}`,
        requestId: `alert-${anomaly.type}-${anomaly.userId}-${Date.now()}`,
      });
    }

    // Note: SMS notifications require phone numbers which are not stored in users table
    // Future enhancement: add phone field to users table or use a separate contact table
    logger.info({ anomaly, managerCount: managers.length }, "PII anomaly alert logged for managers");
  } catch (error) {
    logger.error({ err: error, anomaly }, "Failed to send PII anomaly alert");
  }
}

/**
 * Checks for PII access anomalies after a PII access event
 * Should be called after each PII access to detect patterns
 */
export async function checkPIIAccessAnomalies(userId: number): Promise<void> {
  const anomalies = await detectPIIAnomalies(userId);

  for (const anomaly of anomalies) {
    await logPIIAnomaly(anomaly, userId);
    // Send alert for high and medium severity anomalies
    if (anomaly.severity === "high" || anomaly.severity === "medium") {
      await sendPIIAnomalyAlert(anomaly);
    }
  }
}
