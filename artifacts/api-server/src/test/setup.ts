import { cleanDatabase as cleanDb } from '../../../../lib/test-utils/src';
import { seedTestData } from './seed';
import { resetEnv } from '../lib/env';

// Load test environment variables
// Set required secrets BEFORE any modules are imported to prevent validation errors
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a'.repeat(32); // 32-character hex secret for tests
process.env.ENCRYPTION_KEY = 'a'.repeat(32); // 32-character base64 key for tests
process.env.CSRF_SECRET = 'a'.repeat(32); // 32-character base64 secret for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spaflow_test';

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
