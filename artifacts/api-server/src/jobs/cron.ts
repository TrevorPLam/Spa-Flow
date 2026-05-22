import cron from "node-cron";
import { db, rentalSessionsTable, lockersTable, roomsTable, waitlistTable } from "@workspace/db";
import { eq, lt, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { assignNextWaitlistEntry } from "../routes/rooms";
import { logCacheStats } from "../lib/cache";
import { reconciliationService } from "../services/reconciliation";

// Every 5 minutes: expire rental sessions and resources whose time has lapsed
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    // Expire overdue sessions
    const expiredSessions = await db
      .update(rentalSessionsTable)
      .set({ status: "expired" })
      .where(
        and(
          eq(rentalSessionsTable.status, "active"),
          lt(rentalSessionsTable.expiresAt, now)
        )
      )
      .returning({ id: rentalSessionsTable.id, resourceType: rentalSessionsTable.resourceType, resourceId: rentalSessionsTable.resourceId });

    if (expiredSessions.length > 0) {
      logger.info({ count: expiredSessions.length }, "Expired rental sessions");

      // Release expired lockers
      const expiredLockerSessionIds = expiredSessions
        .filter(s => s.resourceType === "locker")
        .map(s => s.resourceId);

      if (expiredLockerSessionIds.length > 0) {
        await db.update(lockersTable)
          .set({ status: "available", clientId: null, sessionId: null, startTime: null, expiresAt: null })
          .where(sql`${lockersTable.id} = ANY(${expiredLockerSessionIds})`);
      }

      // Release expired rooms and notify waitlist
      const expiredRoomIds = expiredSessions
        .filter(s => s.resourceType === "room")
        .map(s => s.resourceId);

      for (const roomId of expiredRoomIds) {
        await db.update(roomsTable)
          .set({ status: "available", clientId: null, sessionId: null, startTime: null, expiresAt: null })
          .where(eq(roomsTable.id, roomId));
        try {
          await assignNextWaitlistEntry(roomId);
        } catch (err) {
          logger.error({ err, roomId }, "Failed to assign waitlist entry after room expiry");
        }
      }
    }

    // Expire waitlist entries that weren't confirmed within 15 minutes
    const expiredWaitlist = await db
      .update(waitlistTable)
      .set({ status: "expired" })
      .where(
        and(
          eq(waitlistTable.status, "assigned"),
          lt(waitlistTable.confirmBy, now)
        )
      )
      .returning({ id: waitlistTable.id, assignedRoomId: waitlistTable.assignedRoomId });

    if (expiredWaitlist.length > 0) {
      logger.info({ count: expiredWaitlist.length }, "Expired waitlist assignments");

      // Re-release rooms that didn't get confirmed so next waitlist entry can claim them
      for (const entry of expiredWaitlist) {
        if (entry.assignedRoomId) {
          await db.update(roomsTable)
            .set({ status: "available" })
            .where(eq(roomsTable.id, entry.assignedRoomId));
          try {
            await assignNextWaitlistEntry(entry.assignedRoomId);
          } catch (err) {
            logger.error({ err, roomId: entry.assignedRoomId }, "Failed to assign waitlist entry after expired confirmation");
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in cron job");
  }
});

// Every hour: log cache statistics
cron.schedule("0 * * * *", async () => {
  try {
    logCacheStats();
  } catch (err) {
    logger.error({ err }, "Error logging cache statistics");
  }
});

// Daily at 2 AM: run payment reconciliation
cron.schedule("0 2 * * *", async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    logger.info({ date: yesterday }, "Starting scheduled payment reconciliation");
    const result = await reconciliationService.runReconciliation(yesterday);

    // Alert on discrepancies
    if (result.status === "discrepancy") {
      const totalDiscrepancies =
        result.discrepancies.missingInSquare.length +
        result.discrepancies.missingInInternal.length +
        result.discrepancies.amountMismatches.length;

      logger.warn(
        {
          date: yesterday,
          totalInternal: result.totalInternal,
          totalSquare: result.totalSquare,
          totalDiscrepancies,
          discrepancies: result.discrepancies,
        },
        "Payment reconciliation found discrepancies"
      );
    } else {
      logger.info(
        {
          date: yesterday,
          totalInternal: result.totalInternal,
          totalSquare: result.totalSquare,
        },
        "Payment reconciliation completed successfully - matched"
      );
    }
  } catch (err) {
    logger.error({ err }, "Error in scheduled payment reconciliation");
  }
});

logger.info("Background cron jobs initialized");
