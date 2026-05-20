import { APIRequestContext } from '@playwright/test';

// @ts-ignore - process is available in Node.js environment
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

/**
 * Test data helpers for E2E tests
 * These helpers create and clean up test data via API endpoints
 * to ensure test isolation and prevent flaky tests from shared state.
 */

export interface TestUser {
  id: number;
  email: string;
  password: string;
  name: string;
  role: 'STAFF' | 'MANAGER';
}

export interface TestClient {
  id: number;
  email: string;
  name: string;
  memberId: string;
}

/**
 * Create a test user via the test-only API endpoint
 * Returns the created user with known credentials
 */
export async function createTestUser(
  request: APIRequestContext,
  options: {
    email?: string;
    password?: string;
    name?: string;
    role?: 'STAFF' | 'MANAGER';
  } = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const userData = {
    email: options.email || `test-user-${timestamp}@example.com`,
    password: options.password || `TestPassword${timestamp}!`,
    name: options.name || `Test User ${timestamp}`,
    role: options.role || 'STAFF',
  };

  const response = await request.post(`${API_BASE_URL}/test/users`, {
    data: userData,
  });

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to create test user: ${error}`);
  }

  const user = await response.json();
  return {
    id: user.id,
    email: userData.email,
    password: userData.password,
    name: userData.name,
    role: userData.role,
  };
}

/**
 * Create a test client via the API endpoint
 * Returns the created client
 */
export async function createTestClient(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  options: {
    email?: string;
    name?: string;
    memberId?: string;
    phone?: string;
  } = {}
): Promise<TestClient> {
  const timestamp = Date.now();
  const clientData = {
    email: options.email || `test-client-${timestamp}@example.com`,
    name: options.name || `Test Client ${timestamp}`,
    memberId: options.memberId || `MEM${timestamp}`,
    phone: options.phone || '555-0100',
  };

  const response = await request.post(`${API_BASE_URL}/clients`, {
    headers: authHeaders,
    data: clientData,
  });

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to create test client: ${error}`);
  }

  const client = await response.json();
  return {
    id: client.id,
    email: client.email,
    name: client.name,
    memberId: client.memberId,
  };
}

/**
 * Clean up test data by deleting test users
 * Call this in afterEach hooks to ensure test isolation
 */
export async function cleanupTestData(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  userIds: number[]
): Promise<void> {
  for (const userId of userIds) {
    try {
      await request.delete(`${API_BASE_URL}/users/${userId}`, {
        headers: authHeaders,
      });
    } catch (error) {
      console.warn(`Failed to delete test user ${userId}:`, error);
    }
  }
}

/**
 * Clean up test clients
 */
export async function cleanupTestClients(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  clientIds: number[]
): Promise<void> {
  for (const clientId of clientIds) {
    try {
      await request.delete(`${API_BASE_URL}/clients/${clientId}`, {
        headers: authHeaders,
      });
    } catch (error) {
      console.warn(`Failed to delete test client ${clientId}:`, error);
    }
  }
}

/**
 * Reset user lockout state (for lockout testing)
 */
export async function resetUserLockout(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  userId: number
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/users/${userId}/unlock`, {
    headers: authHeaders,
  });

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to reset user lockout: ${error}`);
  }
}

/**
 * Get auth headers for a manager user (needed for cleanup operations)
 */
export async function getManagerAuthHeaders(
  request: APIRequestContext
): Promise<Record<string, string>> {
  // Use the seeded admin user for cleanup operations
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: 'admin@spaflow.com',
      password: 'SpaFlow2024!',
    },
  });

  if (!response.ok()) {
    throw new Error('Failed to authenticate as manager for cleanup');
  }

  const cookies = response.headers()['set-cookie'];
  return {
    Cookie: cookies || '',
  };
}
