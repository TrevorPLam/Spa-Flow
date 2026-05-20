import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './auth';
import { db, passwordResetTokensTable, refreshTokensTable, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../lib/constants';

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Password Reset Integration Tests', { tags: ['@regression', '@integration'] }, () => {
  let testUserId: number;
  const testEmail = 'password-reset-test@example.com';
  const testPassword = 'old-password-12345678'; // 15+ chars per NIST 2025
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
      name: 'Password Reset Test User',
      passwordHash,
      role: 'STAFF',
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, testUserId));
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, testUserId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  });

  beforeEach(async () => {
    // Clean up reset tokens before each test
    await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, testUserId));
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, testUserId));
  });

  describe('password reset request endpoint', () => {
    it('should return generic message for valid email', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link');
    });

    it('should return generic message for invalid email (prevent user enumeration)', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link');
      // Message should be identical to valid email case
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should create reset token in database for valid email', async () => {
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      const tokens = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      expect(tokens.length).toBe(1);
      expect(tokens[0].usedAt).toBeNull();
      expect(tokens[0].expiresAt).toBeInstanceOf(Date);
    });

    it('should not create reset token for invalid email', async () => {
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      const tokens = await db.select().from(passwordResetTokensTable);
      expect(tokens.length).toBe(0);
    });
  });

  describe('password reset confirm endpoint', () => {
    it('should reset password with valid token', async () => {
      // Request reset
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      // Get the token from database
      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Generate a test token (in production, this comes from email)
      const { randomBytes } = await import('crypto');
      const testToken = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Confirm reset
      const newPassword = 'new-password-123456789012345'; // 15+ chars per NIST 2025
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: testToken, newPassword })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset successfully');

      // Verify password was updated
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId));

      const passwordMatches = await bcrypt.compare(newPassword, user.passwordHash);
      expect(passwordMatches).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: 'invalid-token', newPassword: 'new-password-123456789012345' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should return 400 for expired token', async () => {
      // Request reset
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Set expiry to past
      await db
        .update(passwordResetTokensTable)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Generate test token
      const { randomBytes } = await import('crypto');
      const testToken = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: testToken, newPassword: 'new-password-123456789012345' })
        .expect(400);

      expect(response.body.error).toContain('expired');
    });

    it('should return 400 for already used token', async () => {
      // Request reset
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Mark as used
      await db
        .update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Generate test token
      const { randomBytes } = await import('crypto');
      const testToken = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: testToken, newPassword: 'new-password-123456789012345' })
        .expect(400);

      expect(response.body.error).toContain('already been used');
    });

    it('should return 400 for password less than 15 characters (NIST 2025)', async () => {
      // Request reset
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Generate test token
      const { randomBytes } = await import('crypto');
      const testToken = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: testToken, newPassword: 'short' })
        .expect(400);

      expect(response.body.error).toContain('at least 15 characters');
    });

    it('should return 400 for password longer than 64 characters (NIST 2025)', async () => {
      // Request reset
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Generate test token
      const { randomBytes } = await import('crypto');
      const testToken = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const longPassword = 'a'.repeat(65);
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: testToken, newPassword: longPassword })
        .expect(400);

      expect(response.body.error).toContain('no more than 64 characters');
    });

    it('should invalidate all refresh tokens after password reset', async () => {
      // Create some refresh tokens for the user
      const { randomBytes } = await import('crypto');
      const token1 = randomBytes(32).toString('hex');
      const token2 = randomBytes(32).toString('hex');
      const hash1 = await bcrypt.hash(token1, BCRYPT_ROUNDS);
      const hash2 = await bcrypt.hash(token2, BCRYPT_ROUNDS);

      await db.insert(refreshTokensTable).values([
        { userId: testUserId, tokenHash: hash1, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { userId: testUserId, tokenHash: hash2, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      ]);

      // Request and confirm reset
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      const testToken = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: testToken, newPassword: 'new-password-123456789012345' })
        .expect(200);

      // Verify all refresh tokens are revoked
      const refreshTokens = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.userId, testUserId));

      expect(refreshTokens.every(t => t.revokedAt !== null)).toBe(true);
    });

    it('should mark token as used after successful reset', async () => {
      // Request reset
      await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      expect(tokenRecord.usedAt).toBeNull();

      // Generate test token
      const { randomBytes } = await import('crypto');
      const testToken = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Confirm reset
      await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: testToken, newPassword: 'new-password-123456789012345' })
        .expect(200);

      // Verify token is marked as used
      const [updatedToken] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      expect(updatedToken.usedAt).not.toBeNull();
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ newPassword: 'new-password-123456789012345' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: 'some-token' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
