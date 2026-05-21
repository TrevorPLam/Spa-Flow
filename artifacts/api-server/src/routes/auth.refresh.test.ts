import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './auth';
import { db, refreshTokensTable, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuthErrorCodes, AuthErrorMessages } from '../lib/authErrors';
import { BCRYPT_ROUNDS } from '../lib/constants';

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Refresh Token Integration Tests', { tags: ['regression', 'integration'] }, () => {
  let testUserId: number;
  const testEmail = 'refresh-test@example.com';
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
      name: 'Refresh Test User',
      passwordHash,
      role: 'STAFF',
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, testUserId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  });

  beforeEach(async () => {
    // Clean up refresh tokens before each test
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, testUserId));
  });

  describe('login returns refresh token', () => {
    it('should return refresh token in response body on successful login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).toHaveProperty('refreshToken');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.refreshToken.length).toBeGreaterThan(0);
    });
  });

  describe('refresh endpoint', () => {
    it('should return new access token and refresh token when valid refresh token is provided', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const { refreshToken: initialRefreshToken } = loginResponse.body;

      // Use refresh token to get new tokens
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: initialRefreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body).toHaveProperty('user');
      expect(refreshResponse.body.refreshToken).not.toBe(initialRefreshToken);
      expect(refreshResponse.body.user.id).toBe(testUserId);
    });

    it('should return 401 when invalid refresh token is provided', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe(AuthErrorCodes.INVALID_REFRESH_TOKEN);
      expect(response.body.error).toBe(AuthErrorMessages[AuthErrorCodes.INVALID_REFRESH_TOKEN]);
    });

    it('should return 401 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should invalidate old refresh token after rotation', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const { refreshToken: initialRefreshToken } = loginResponse.body;

      // Use refresh token to get new tokens
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: initialRefreshToken })
        .expect(200);

      const { refreshToken: newRefreshToken } = refreshResponse.body;

      // Try to use old refresh token again - should fail
      const secondRefreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: initialRefreshToken })
        .expect(401);

      expect(secondRefreshResponse.body).toHaveProperty('error');
      expect(secondRefreshResponse.body).toHaveProperty('code');
      expect(secondRefreshResponse.body.code).toBe(AuthErrorCodes.INVALID_REFRESH_TOKEN);
      expect(secondRefreshResponse.body.error).toBe(AuthErrorMessages[AuthErrorCodes.INVALID_REFRESH_TOKEN]);

      // New refresh token should still work
      const thirdRefreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      expect(thirdRefreshResponse.body).toHaveProperty('refreshToken');
    });

    it('should set new access token in cookie', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const { refreshToken } = loginResponse.body;

      // Use refresh token to get new tokens
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Check that new session cookie is set
      const cookies = refreshResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookiesArray = Array.isArray(cookies) ? cookies : [cookies].filter(Boolean);
      const sessionCookie = cookiesArray.find((c: string) => c.startsWith('spaflow_session='));
      expect(sessionCookie).toBeDefined();
    });
  });

  describe('error response format', () => {
    it('should include error code in refresh token error responses', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(typeof response.body.code).toBe('string');
      expect(response.body.code).toMatch(/^AUTH_\d{3}$/);
    });

    it('should include error message matching the error code', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.code).toBe(AuthErrorCodes.INVALID_REFRESH_TOKEN);
      expect(response.body.error).toBe(AuthErrorMessages[AuthErrorCodes.INVALID_REFRESH_TOKEN]);
    });
  });

  describe('refresh token storage', () => {
    it('should store refresh token hash in database', async () => {
      // Login to get refresh token
      await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      // Verify token is stored in database
      const tokens = await db.select().from(refreshTokensTable)
        .where(eq(refreshTokensTable.userId, testUserId));

      expect(tokens.length).toBe(1);
      expect(tokens[0].userId).toBe(testUserId);
      expect(tokens[0].tokenHash).toBeDefined();
      expect(tokens[0].expiresAt).toBeDefined();
      expect(tokens[0].revokedAt).toBeNull();
    });

    it('should revoke old refresh token after rotation', async () => {
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const { refreshToken: initialToken } = loginResponse.body;

      // Rotate token
      await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: initialToken })
        .expect(200);

      // Verify old token is revoked
      const tokens = await db.select().from(refreshTokensTable)
        .where(eq(refreshTokensTable.userId, testUserId));

      expect(tokens.length).toBe(2); // Old (revoked) and new (active)
      const revokedTokens = tokens.filter(t => t.revokedAt !== null);
      expect(revokedTokens.length).toBe(1);
    });
  });
});
