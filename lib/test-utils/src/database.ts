import { db } from '@workspace/db';
import * as schema from '@workspace/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Clean all database tables in dependency order to avoid foreign key violations
 * Uses transactions for isolation when running in parallel
 */
export async function cleanDatabase() {
  // Use TRUNCATE with CASCADE to reset sequences and avoid foreign key violations
  // This is more efficient than DELETE and resets auto-increment sequences
  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE audit_logs, refresh_tokens, password_reset_tokens, waitlist_entries, transactions, rental_sessions, memberships, products, rooms, lockers, clients, users CASCADE`);
  });
}

/**
 * Setup test database by cleaning all tables
 * Call this in test setup hooks (beforeAll, beforeEach)
 */
export async function setupTestDatabase() {
  await cleanDatabase();
}
