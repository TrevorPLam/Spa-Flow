// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './auth';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Role Validation Integration Tests', () => {
  const testEmail = 'role-validation-test@example.com';
  const testPassword = 'TestPassword123!';
  const validSecret = 'a'.repeat(32);

  beforeAll(async () => {
    // Set up environment
    process.env.JWT_SECRET = validSecret;
    process.env.LOCKOUT_THRESHOLD = '5';
    process.env.LOCKOUT_DURATION_MS = '900000';
  });

  describe('role validation in login endpoint', () => {
    it('should accept valid STAFF role', async () => {
      // Create test user with valid role
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const [user] = await db.insert(usersTable).values({
        email: testEmail,
        name: 'Role Test User',
        passwordHash,
        role: 'STAFF',
      }).returning();

      try {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: testEmail, password: testPassword })
          .expect(200);

        expect(response.body).toHaveProperty('id', user.id);
        expect(response.body).toHaveProperty('email', testEmail);
        expect(response.body).toHaveProperty('role', 'STAFF');
      } finally {
        // Clean up
        await db.delete(usersTable).where(eq(usersTable.id, user.id));
      }
    });

    it('should accept valid MANAGER role', async () => {
      const managerEmail = 'manager-role-test@example.com';
      
      // Create test user with MANAGER role
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const [user] = await db.insert(usersTable).values({
        email: managerEmail,
        name: 'Manager Role Test User',
        passwordHash,
        role: 'MANAGER',
      }).returning();

      try {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: managerEmail, password: testPassword })
          .expect(200);

        expect(response.body).toHaveProperty('id', user.id);
        expect(response.body).toHaveProperty('email', managerEmail);
        expect(response.body).toHaveProperty('role', 'MANAGER');
      } finally {
        // Clean up
        await db.delete(usersTable).where(eq(usersTable.id, user.id));
      }
    });

    it('should return 500 if database contains invalid role (defense in depth)', async () => {
      // This test verifies the application layer validation works even if
      // database constraints are bypassed (e.g., via direct SQL manipulation)
      // We mock the database query to simulate this scenario
      
      const originalSelect = db.select;
      const mockUser = {
        id: 999,
        email: testEmail,
        name: 'Invalid Role User',
        passwordHash: await bcrypt.hash(testPassword, 10),
        role: 'ADMIN' as any, // Invalid role not in enum
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the database to return a user with invalid role
      vi.spyOn(db, 'select').mockImplementation(() => {
        return {
          from: () => ({
            where: () => Promise.resolve([mockUser]),
          }),
        } as any;
      });

      try {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: testEmail, password: testPassword });

        // Should return 500 due to invalid role
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Internal server error');
      } finally {
        // Restore original implementation
        vi.restoreAllMocks();
      }
    });
  });

  describe('role validation in refresh endpoint', () => {
    it('should accept valid role in token refresh', async () => {
      // Create test user
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const [user] = await db.insert(usersTable).values({
        email: testEmail,
        name: 'Refresh Role Test User',
        passwordHash,
        role: 'STAFF',
      }).returning();

      try {
        // Login to get refresh token
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({ email: testEmail, password: testPassword })
          .expect(200);

        const refreshToken = loginResponse.body.refreshToken;

        // Use refresh token to get new access token
        const refreshResponse = await request(app)
          .post('/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(refreshResponse.body).toHaveProperty('refreshToken');
        expect(refreshResponse.body.user).toHaveProperty('role', 'STAFF');
      } finally {
        // Clean up
        await db.delete(usersTable).where(eq(usersTable.id, user.id));
      }
    });

    it('should return 500 if database contains invalid role on refresh (defense in depth)', async () => {
      // Mock the database to return a user with invalid role during refresh
      const originalSelect = db.select;
      const mockUser = {
        id: 999,
        email: testEmail,
        name: 'Invalid Role User',
        role: 'SUPERUSER' as any, // Invalid role not in enum
      };

      let callCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        callCount++;
        // First call is for verifyRefreshToken (we want this to succeed)
        // Second call is for getting user data (we want this to return invalid role)
        if (callCount === 2) {
          return {
            from: () => ({
              where: () => Promise.resolve([mockUser]),
            }),
          } as any;
        }
        // For other calls, use original implementation
        return originalSelect();
      });

      try {
        const response = await request(app)
          .post('/auth/refresh')
          .send({ refreshToken: 'some-token' });

        // Should return 500 due to invalid role
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Internal server error');
      } finally {
        // Restore original implementation
        vi.restoreAllMocks();
      }
    });
  });
});
