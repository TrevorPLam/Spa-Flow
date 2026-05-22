import { db } from '@workspace/db';
import * as schema from '@workspace/db/schema';
import { sql } from 'drizzle-orm';
import { PostgresJsTransaction } from 'drizzle-orm/postgres-js';

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

/**
 * Run a test function within a transaction that is automatically rolled back
 * This is useful for integration tests that need real DB operations but should not persist data
 * 
 * @param testFn - The test function to run within the transaction
 * @returns The result of the test function
 * 
 * @example
 * const result = await withTransactionRollback(async (tx) => {
 *   const user = await tx.insert(schema.usersTable).values({ name: 'test' }).returning();
 *   return user[0];
 * });
 * // Data is automatically rolled back after the function completes
 */
export async function withTransactionRollback<T>(testFn: (tx: PostgresJsTransaction<any, any>) => Promise<T>): Promise<T> {
  let result: T;
  await db.transaction(async (tx) => {
    result = await testFn(tx);
    // Always rollback to prevent test data from persisting
    tx.rollback();
  });
  return result!;
}
