import { beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';

// Load test environment variables
process.env.NODE_ENV = 'test';

// Test database setup utilities
export async function setupTestDatabase() {
  // Clean all tables before tests
  await cleanDatabase();
}

export async function cleanDatabase() {
  // Delete in order of dependencies to avoid foreign key violations
  await db.delete(schema.waitlistTable);
  await db.delete(schema.transactionsTable);
  await db.delete(schema.rentalSessionsTable);
  await db.delete(schema.membershipsTable);
  await db.delete(schema.productsTable);
  await db.delete(schema.roomsTable);
  await db.delete(schema.lockersTable);
  await db.delete(schema.clientsTable);
  await db.delete(schema.usersTable);
}

// Test fixture data generators
export function createTestClient(overrides: Partial<typeof schema.clientsTable.$inferInsert> = {}) {
  return {
    email: `test-${Date.now()}@example.com`,
    phone: '555-0100',
    memberId: `MEM${Date.now()}`,
    name: 'Test Client',
    membershipStatus: 'none' as const,
    dobEncrypted: null,
    addressEncrypted: null,
    ...overrides,
  };
}

export function createTestLocker(overrides: Partial<typeof schema.lockersTable.$inferInsert> = {}) {
  return {
    name: `L${Date.now()}`,
    status: 'available' as const,
    ...overrides,
  };
}

export function createTestRoom(overrides: Partial<typeof schema.roomsTable.$inferInsert> = {}) {
  return {
    name: `R${Date.now()}`,
    status: 'available' as const,
    ...overrides,
  };
}

export function createTestUser(overrides: Partial<typeof schema.usersTable.$inferInsert> = {}) {
  return {
    email: `user-${Date.now()}@example.com`,
    passwordHash: '$2a$10$test',
    role: 'STAFF' as const,
    name: 'Test User',
    ...overrides,
  };
}

export function createTestMembership(overrides: Partial<typeof schema.membershipsTable.$inferInsert> = {}) {
  return {
    clientId: 0,
    type: 'one_time' as const,
    ...overrides,
  };
}
