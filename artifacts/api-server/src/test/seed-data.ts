/**
 * Seed data types for test database seeding
 * These interfaces define the structure of test data to be seeded
 */

export interface TestUser {
  email: string;
  name: string;
  passwordHash: string;
  role: 'STAFF' | 'MANAGER';
}

export interface TestClient {
  name: string;
  email: string | null;
  phone: string | null;
  memberId: string | null;
  membershipStatus: 'none' | 'one_time' | 'six_month';
  notes: string | null;
}

export interface TestLocker {
  name: string;
  status: 'available' | 'occupied' | 'reserved';
}

export interface TestRoom {
  name: string;
  status: 'available' | 'occupied' | 'reserved';
}

export interface TestMembership {
  clientId: number;
  type: 'one_time' | 'six_month';
  expiresAt: Date | null;
}

/**
 * Factory functions for creating seed data
 * These functions return deterministic test data for consistent seeding
 */

export function createSeedUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    email: 'test-user@example.com',
    name: 'Test User',
    passwordHash: '$2a$12$testHashForTestingOnly123456789012345678901234567890123456789012345678',
    role: 'STAFF',
    ...overrides,
  };
}

export function createSeedClient(overrides: Partial<TestClient> = {}): TestClient {
  return {
    name: 'Test Client',
    email: 'test-client@example.com',
    phone: '555-0100',
    memberId: 'MEM001',
    membershipStatus: 'none',
    notes: null,
    ...overrides,
  };
}

export function createSeedLocker(overrides: Partial<TestLocker> = {}): TestLocker {
  return {
    name: 'L1',
    status: 'available',
    ...overrides,
  };
}

export function createSeedRoom(overrides: Partial<TestRoom> = {}): TestRoom {
  return {
    name: 'R1',
    status: 'available',
    ...overrides,
  };
}

export function createSeedMembership(overrides: Partial<TestMembership> = {}): TestMembership {
  return {
    clientId: 1,
    type: 'one_time',
    expiresAt: null,
    ...overrides,
  };
}

/**
 * Predefined seed data sets
 * These are the actual data that will be seeded into the test database
 */

export const SEED_USERS: TestUser[] = [
  {
    email: 'manager@test.com',
    name: 'Test Manager',
    passwordHash: '$2a$12$testHashForTestingOnly123456789012345678901234567890123456789012345678',
    role: 'MANAGER',
  },
  {
    email: 'staff1@test.com',
    name: 'Test Staff 1',
    passwordHash: '$2a$12$testHashForTestingOnly123456789012345678901234567890123456789012345678',
    role: 'STAFF',
  },
  {
    email: 'staff2@test.com',
    name: 'Test Staff 2',
    passwordHash: '$2a$12$testHashForTestingOnly123456789012345678901234567890123456789012345678',
    role: 'STAFF',
  },
];

export const SEED_CLIENTS: TestClient[] = [
  {
    name: 'Alice Johnson',
    email: 'alice@test.com',
    phone: '555-0101',
    memberId: 'MEM001',
    membershipStatus: 'none',
    notes: null,
  },
  {
    name: 'Bob Smith',
    email: 'bob@test.com',
    phone: '555-0102',
    memberId: 'MEM002',
    membershipStatus: 'one_time',
    notes: 'Prefers morning appointments',
  },
  {
    name: 'Carol Williams',
    email: 'carol@test.com',
    phone: '555-0103',
    memberId: 'MEM003',
    membershipStatus: 'six_month',
    notes: null,
  },
  {
    name: 'David Brown',
    email: 'david@test.com',
    phone: '555-0104',
    memberId: 'MEM004',
    membershipStatus: 'none',
    notes: 'Allergic to certain products',
  },
  {
    name: 'Eva Davis',
    email: 'eva@test.com',
    phone: '555-0105',
    memberId: 'MEM005',
    membershipStatus: 'one_time',
    notes: null,
  },
];

export const SEED_LOCKERS: TestLocker[] = [
  { name: 'L1', status: 'available' },
  { name: 'L2', status: 'available' },
  { name: 'L3', status: 'available' },
];

export const SEED_ROOMS: TestRoom[] = [
  { name: 'R1', status: 'available' },
  { name: 'R2', status: 'available' },
];

// Memberships will be created dynamically based on seeded client IDs
export function getSeedMemberships(clientIds: number[]): TestMembership[] {
  return [
    {
      clientId: clientIds[1], // Bob Smith (MEM002)
      type: 'one_time',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    {
      clientId: clientIds[2], // Carol Williams (MEM003)
      type: 'six_month',
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
    },
  ];
}
