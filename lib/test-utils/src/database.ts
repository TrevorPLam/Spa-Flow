import { db } from '@workspace/db';
import * as schema from '@workspace/db/schema';

/**
 * Clean all database tables in dependency order to avoid foreign key violations
 * Uses transactions for isolation when running in parallel
 */
export async function cleanDatabase() {
  // Delete in order of dependencies to avoid foreign key violations
  // Uses transactions for isolation when running in parallel
  await db.transaction(async (tx) => {
    await tx.delete(schema.auditLogsTable);
    await tx.delete(schema.refreshTokensTable);
    await tx.delete(schema.passwordResetTokensTable);
    await tx.delete(schema.waitlistTable);
    await tx.delete(schema.transactionsTable);
    await tx.delete(schema.rentalSessionsTable);
    await tx.delete(schema.membershipsTable);
    await tx.delete(schema.productsTable);
    await tx.delete(schema.roomsTable);
    await tx.delete(schema.lockersTable);
    await tx.delete(schema.clientsTable);
    await tx.delete(schema.usersTable);
  });
}

/**
 * Setup test database by cleaning all tables
 * Call this in test setup hooks (beforeAll, beforeEach)
 */
export async function setupTestDatabase() {
  await cleanDatabase();
}
