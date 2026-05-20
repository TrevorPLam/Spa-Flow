import * as schema from '@workspace/db/schema';

/**
 * Create test client fixture data
 * @param overrides - Partial client data to override defaults
 * @returns Client fixture object
 */
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

/**
 * Create test locker fixture data
 * @param overrides - Partial locker data to override defaults
 * @returns Locker fixture object
 */
export function createTestLocker(overrides: Partial<typeof schema.lockersTable.$inferInsert> = {}) {
  return {
    name: `L${Date.now()}`,
    status: 'available' as const,
    ...overrides,
  };
}

/**
 * Create test room fixture data
 * @param overrides - Partial room data to override defaults
 * @returns Room fixture object
 */
export function createTestRoom(overrides: Partial<typeof schema.roomsTable.$inferInsert> = {}) {
  return {
    name: `R${Date.now()}`,
    status: 'available' as const,
    ...overrides,
  };
}

/**
 * Create test user fixture data
 * @param overrides - Partial user data to override defaults
 * @returns User fixture object
 */
export function createTestUser(overrides: Partial<typeof schema.usersTable.$inferInsert> = {}) {
  return {
    email: `user-${Date.now()}@example.com`,
    passwordHash: '$2a$10$test',
    role: 'STAFF' as const,
    name: 'Test User',
    ...overrides,
  };
}

/**
 * Create test membership fixture data
 * @param overrides - Partial membership data to override defaults
 * @returns Membership fixture object
 */
export function createTestMembership(overrides: Partial<typeof schema.membershipsTable.$inferInsert> = {}) {
  return {
    clientId: 0,
    type: 'one_time' as const,
    ...overrides,
  };
}
