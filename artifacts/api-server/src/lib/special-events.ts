import { db, specialEventsTable } from "@workspace/db";
import { and, lte, gte, sql } from "drizzle-orm";
import { withCache, buildCacheKey } from "./cache";

/**
 * Checks if there is an active special event for a given date
 * A special event is active if the date falls within the event's start and end date range
 * and the event has disableSpecials set to true
 *
 * @param date - The date to check for active special events
 * @returns True if there is an active special event that disables specials, false otherwise
 */
export async function isSpecialEventActive(date: Date = new Date()): Promise<boolean> {
  // Build cache key based on date (only date part, not time)
  const dateKey = date.toISOString().split('T')[0];
  const cacheKey = buildCacheKey('special_events', 'active', dateKey);

  // Use cache-aside pattern with 5-minute TTL
  const cached = await withCache<boolean>(
    cacheKey,
    300, // 5 minutes
    async () => {
      // Query for active special events
      // An event is active if: start_date <= date <= end_date AND disable_specials = true
      const activeEvents = await db
        .select({ id: specialEventsTable.id })
        .from(specialEventsTable)
        .where(
          and(
            lte(specialEventsTable.startDate, date),
            gte(specialEventsTable.endDate, date),
            sql`${specialEventsTable.disableSpecials} = true`
          )
        )
        .limit(1);

      return activeEvents.length > 0;
    }
  );

  // Handle cache miss/error by returning false (no special event)
  return cached ?? false;
}

/**
 * Invalidates the special events cache for a given date
 * Call this after creating, updating, or deleting special events
 *
 * @param date - The date to invalidate cache for (defaults to today)
 */
export async function invalidateSpecialEventsCache(date: Date = new Date()): Promise<void> {
  const dateKey = date.toISOString().split('T')[0];
  const cacheKey = buildCacheKey('special_events', 'active', dateKey);
  const { cacheDel } = await import("./cache");
  await cacheDel(cacheKey);
}
