import type {
  AuthUser,
  Client,
  ClientList,
  Dashboard,
  Locker,
  Room,
  Transaction,
  User,
} from '@workspace/api-client-react';

/**
 * Factory functions for generating realistic test data
 * Following 2026 best practices for test data generation
 */

export function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'STAFF',
    ...overrides,
  };
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'staff@example.com',
    name: 'Staff User',
    role: 'STAFF',
    createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
    ...overrides,
  };
}

export function createClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    membershipStatus: 'six_month',
    createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
    ...overrides,
  };
}

export function createClientList(count: number = 10, overrides: Partial<Client> = {}): ClientList {
  return {
    clients: Array.from({ length: count }, (_, i) =>
      createClient({
        id: i + 1,
        name: `Client ${i + 1}`,
        email: `client${i + 1}@example.com`,
        ...overrides,
      })
    ),
    total: count,
    page: 1,
    limit: 50,
  };
}

export function createDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    lockerOccupancy: {
      total: 167,
      available: 20,
      occupied: 145,
      reserved: 2,
    },
    roomOccupancy: {
      total: 38,
      available: 5,
      occupied: 30,
      reserved: 3,
    },
    todayRevenue: 500,
    activeClients: 75,
    waitlistCount: 10,
    lowStockCount: 3,
    recentTransactions: [],
    activeRentals: [],
    ...overrides,
  };
}

export function createLocker(overrides: Partial<Locker> = {}): Locker {
  return {
    id: 1,
    name: 'A1',
    status: 'available',
    ...overrides,
  };
}

export function createRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 1,
    name: '1',
    status: 'available',
    ...overrides,
  };
}

export function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    clientId: 1,
    type: 'locker_rental',
    amount: 10,
    tax: 0.89,
    total: 10.89,
    createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
    ...overrides,
  };
}
