import { db, clientsTable, rentalSessionsTable } from "@workspace/db";
import { eq, and, lt, gte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendSms } from "../lib/sms";
import { getEnv } from "../lib/env";
import { writeAuditLog } from "../lib/audit";

/**
 * SMS reminder message templates
 */
const REMINDER_MESSAGES = {
  "30": "SpaFlow: Your session will expire in 30 minutes. Please proceed to the front desk if you need to extend your rental.",
  "15": "SpaFlow: Your session will expire in 15 minutes. Please proceed to the front desk if you need to extend your rental.",
};

/**
 * Check for sessions expiring within the reminder window and send SMS reminders
 * Only sends to clients who have opted in to SMS reminders
 * Respects quiet hours (9 PM - 8 AM) unless session expires during quiet hours
 */
export async function checkAndSendExpirationReminders(): Promise<void> {
  const env = getEnv();
  const reminderMinutesList = env.REMINDER_MINUTES_BEFORE.split(",").map(Number);
  const now = new Date();

  try {
    for (const minutesBefore of reminderMinutesList) {
      const reminderTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
      const reminderWindowStart = new Date(reminderTime.getTime() - 2 * 60 * 1000); // 2-minute window
      const reminderWindowEnd = new Date(reminderTime.getTime() + 2 * 60 * 1000);

      // Find active sessions expiring within the reminder window
      const expiringSessions = await db
        .select({
          sessionId: rentalSessionsTable.id,
          clientId: rentalSessionsTable.clientId,
          clientPhone: clientsTable.phone,
          clientName: clientsTable.name,
          smsRemindersEnabled: clientsTable.smsRemindersEnabled,
          resourceName: rentalSessionsTable.resourceName,
          expiresAt: rentalSessionsTable.expiresAt,
        })
        .from(rentalSessionsTable)
        .innerJoin(clientsTable, eq(rentalSessionsTable.clientId, clientsTable.id))
        .where(
          and(
            eq(rentalSessionsTable.status, "active"),
            gte(rentalSessionsTable.expiresAt!, reminderWindowStart),
            lt(rentalSessionsTable.expiresAt!, reminderWindowEnd),
            eq(clientsTable.smsRemindersEnabled, "true")
          )
        );

      if (expiringSessions.length === 0) {
        continue;
      }

      logger.info(
        { count: expiringSessions.length, minutesBefore },
        `Found sessions expiring in ${minutesBefore} minutes`
      );

      // Send reminders to each client
      for (const session of expiringSessions) {
        if (!session.clientPhone) {
          logger.info({ clientId: session.clientId }, "Client has no phone number, skipping SMS reminder");
          continue;
        }

        // Check quiet hours (9 PM - 8 AM)
        const currentHour = now.getHours();
        const isQuietHours = currentHour >= 21 || currentHour < 8;
        
        // Skip quiet hours unless session expires during quiet hours
        if (isQuietHours) {
          const expiresHour = session.expiresAt ? new Date(session.expiresAt).getHours() : 0;
          const expiresDuringQuietHours = expiresHour >= 21 || expiresHour < 8;
          
          if (!expiresDuringQuietHours) {
            logger.info(
              { clientId: session.clientId, currentHour },
              "Skipping reminder during quiet hours"
            );
            continue;
          }
        }

        const message = REMINDER_MESSAGES[minutesBefore.toString() as keyof typeof REMINDER_MESSAGES];
        if (!message) {
          logger.warn({ minutesBefore }, "No reminder message template found");
          continue;
        }

        try {
          await sendSms(session.clientPhone, message);
          logger.info(
            { clientId: session.clientId, sessionId: session.sessionId, minutesBefore },
            "SMS reminder sent successfully"
          );

          // Log notification delivery (system user ID 0 for automated notifications)
          await writeAuditLog({
            userId: 0,
            action: "SMS_REMINDER_SENT",
            resourceType: "rental_session",
            resourceId: session.sessionId,
            description: `Sent ${minutesBefore}-minute expiration reminder to ${session.clientName}`,
          });
        } catch (err) {
          logger.error(
            { err, clientId: session.clientId, sessionId: session.sessionId },
            "Failed to send SMS reminder"
          );

          // Log failed delivery (system user ID 0 for automated notifications)
          await writeAuditLog({
            userId: 0,
            action: "SMS_REMINDER_FAILED",
            resourceType: "rental_session",
            resourceId: session.sessionId,
            description: `Failed to send ${minutesBefore}-minute expiration reminder to ${session.clientName}`,
          });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in expiration reminder check");
  }
}
