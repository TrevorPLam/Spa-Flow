import { cleanDatabase as cleanDb } from '../../../../lib/test-utils/src';
import { seedTestData } from './seed';
import { resetEnv } from '../lib/env';

// Load test environment variables
process.env.NODE_ENV = 'test';

// Test database setup utilities
export async function setupTestDatabase() {
  // Clean all tables before tests
  await cleanDatabase();

  // Seed test data if TEST_SEED environment variable is set
  if (process.env.TEST_SEED === 'true') {
    await seedTestData();
  }
}

export async function cleanDatabase() {
  // Reset cached environment for test isolation
  resetEnv();

  // Use shared cleanDatabase utility
  await cleanDb();
}

// Re-export fixture factories from shared test-utils for backward compatibility
export {
  createTestClient,
  createTestLocker,
  createTestRoom,
  createTestUser,
  createTestMembership,
} from '../../../../lib/test-utils/src';
