import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './auth';
import { db, auditLogsTable, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../lib/constants';

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Audit Logging Integration Tests', { tags: ['regression', 'integration'] }, () => {
  let testUserId: number;
  const testEmail = 'audit-test@example.com';
  const testPassword = 'TestPassword123!';
  const validSecret = 'a'.repeat(32);

  beforeAll(async () => {
    // Set up environment
    process.env.JWT_SECRET = validSecret;
    process.env.LOCKOUT_THRESHOLD = '5';
    process.env.LOCKOUT_DURATION_MS = '900000';

    // Create test user
    const passwordHash = await bcrypt.hash(testPassword, BCRYPT_ROUNDS);
    const [user] = await db.insert(usersTable).values({
      email: testEmail,
      name: 'Audit Test User',
      passwordHash,
      role: 'STAFF',
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(auditLogsTable).where(eq(auditLogsTable.userId, testUserId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  });

  beforeEach(async () => {
    // Clean up audit logs before each test
    await db.delete(auditLogsTable).where(eq(auditLogsTable.userId, testUserId));
  });

  describe('login audit logging', () => {
    it('should create audit record on successful login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('email', testEmail);

      // Verify audit log was created
      const [auditLog] = await db.select().from(auditLogsTable)
        .where(eq(auditLogsTable.userId, testUserId))
        .limit(1);

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('LOGIN_SUCCESS');
      expect(auditLog.resourceType).toBe('AUTH');
      expect(auditLog.userId).toBe(testUserId);
      expect(auditLog.email).toBe(testEmail);
      expect(auditLog.ipAddress).toBeDefined();
      expect(auditLog.correlationId).toBeDefined();
    });

    it('should create audit record on failed login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPassword123!' })
        .expect(401);

      expect(response.body).toHaveProperty('error');

      // Verify audit log was created
      const [auditLog] = await db.select().from(auditLogsTable)
        .where(eq(auditLogsTable.userId, testUserId))
        .limit(1);

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('LOGIN_FAILURE');
      expect(auditLog.resourceType).toBe('AUTH');
      expect(auditLog.userId).toBe(testUserId);
      expect(auditLog.email).toBe(testEmail);
      expect(auditLog.description).toContain('Invalid credentials');
    });

    it('should create audit record on failed login for non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'SomePassword123!' })
        .expect(401);

      expect(response.body).toHaveProperty('error');

      // Verify audit log was created (userId should be null)
      const [auditLog] = await db.select().from(auditLogsTable)
        .where(eq(auditLogsTable.email, 'nonexistent@example.com'))
        .limit(1);

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('LOGIN_FAILURE');
      expect(auditLog.resourceType).toBe('AUTH');
      expect(auditLog.userId).toBeNull();
      expect(auditLog.email).toBe('nonexistent@example.com');
    });

    it('should include correlation ID in audit log', async () => {
      const correlationId = 'test-correlation-123';

      const response = await request(app)
        .post('/auth/login')
        .set('X-Correlation-ID', correlationId)
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(correlationId);

      // Verify audit log includes correlation ID
      const [auditLog] = await db.select().from(auditLogsTable)
        .where(eq(auditLogsTable.userId, testUserId))
        .limit(1);

      expect(auditLog).toBeDefined();
      expect(auditLog.correlationId).toBe(correlationId);
    });
  });

  describe('logout audit logging', () => {
    it('should create audit record on logout', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      // Get token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      const cookiesArray = Array.isArray(cookies) ? cookies : [cookies].filter(Boolean);
      const sessionCookie = cookiesArray.find((c: string) => c.startsWith('spaflow_session='));

      // Logout with the session
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Cookie', sessionCookie || '')
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('success', true);

      // Verify audit log was created
      const logoutAuditLogs = await db.select().from(auditLogsTable)
        .where(eq(auditLogsTable.userId, testUserId));

      const logoutLog = logoutAuditLogs.find(log => log.action === 'LOGOUT');

      expect(logoutLog).toBeDefined();
      expect(logoutLog?.action).toBe('LOGOUT');
      expect(logoutLog?.resourceType).toBe('AUTH');
      expect(logoutLog?.userId).toBe(testUserId);
      expect(logoutLog?.description).toBe('User logged out');
      expect(logoutLog?.ipAddress).toBeDefined();
    });

    it('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
