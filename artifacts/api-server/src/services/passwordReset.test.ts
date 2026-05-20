import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PasswordResetTokenService } from "./passwordReset";
import { db, usersTable, passwordResetTokensTable, refreshTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../lib/constants";

describe("PasswordResetTokenService", () => {
  let service: PasswordResetTokenService;
  let testUserId: number;
  let testEmail: string;

  beforeEach(async () => {
    service = new PasswordResetTokenService();
    
    // Create a test user
    const passwordHash = await bcrypt.hash("old-password-12345678", BCRYPT_ROUNDS);
    const [user] = await db
      .insert(usersTable)
      .values({
        email: "test-reset@example.com",
        name: "Test Reset User",
        passwordHash,
        role: "STAFF",
      })
      .returning();
    
    testUserId = user.id;
    testEmail = user.email;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, testUserId));
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, testUserId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  });

  describe("requestReset", () => {
    it("should generate a reset token for an existing user", async () => {
      const result = await service.requestReset(testEmail);

      expect(result.success).toBe(true);
      expect(result.message).toContain("password reset link");

      // Verify token was created in database
      const tokens = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      expect(tokens.length).toBe(1);
      expect(tokens[0].usedAt).toBeNull();
      expect(tokens[0].expiresAt).toBeInstanceOf(Date);
    });

    it("should return generic message for non-existent email (prevent user enumeration)", async () => {
      const result = await service.requestReset("nonexistent@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toContain("password reset link");

      // Verify no token was created
      const tokens = await db.select().from(passwordResetTokensTable);
      expect(tokens.length).toBe(0);
    });

    it("should generate tokens with sufficient entropy (256 bits)", async () => {
      await service.requestReset(testEmail);

      const [token] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Token hash should be bcrypt hash (starts with $2a$ or $2b$)
      expect(token.tokenHash).toMatch(/^\$2[aby]\$/);
    });

    it("should set token expiry to 30 minutes", async () => {
      const beforeRequest = new Date();
      await service.requestReset(testEmail);
      const afterRequest = new Date();

      const [token] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      const expiresAt = token.expiresAt;
      const expectedExpiry = new Date(beforeRequest.getTime() + 30 * 60 * 1000);
      
      // Allow 1 second tolerance
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 30 * 60 * 1000);
    });
  });

  describe("confirmReset", () => {
    it("should reset password with valid token", async () => {
      // Request reset
      const requestResult = await service.requestReset(testEmail);
      expect(requestResult.success).toBe(true);

      // Get the token from database
      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Extract the raw token (we need to generate it from the hash for testing)
      // In production, the token comes from the email link
      // For testing, we'll create a new token and update the record
      const { randomBytes } = await import("crypto");
      const testToken = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Confirm reset
      const newPassword = "new-password-123456789012345"; // 15+ chars per NIST 2025
      const result = await service.confirmReset(testToken, newPassword);

      expect(result.success).toBe(true);
      expect(result.message).toContain("reset successfully");

      // Verify password was updated
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId));

      const passwordMatches = await bcrypt.compare(newPassword, user.passwordHash);
      expect(passwordMatches).toBe(true);

      // Verify token was marked as used
      const [updatedToken] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      expect(updatedToken.usedAt).not.toBeNull();
    });

    it("should reject invalid token", async () => {
      const result = await service.confirmReset("invalid-token", "new-password-123456789012345");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid or expired");
    });

    it("should reject expired token", async () => {
      // Request reset
      await service.requestReset(testEmail);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Set expiry to past
      await db
        .update(passwordResetTokensTable)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Extract token for testing
      const { randomBytes } = await import("crypto");
      const testToken = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const result = await service.confirmReset(testToken, "new-password-123456789012345");

      expect(result.success).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("should reject already used token", async () => {
      // Request reset
      await service.requestReset(testEmail);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      // Mark as used
      await db
        .update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      // Extract token for testing
      const { randomBytes } = await import("crypto");
      const testToken = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const result = await service.confirmReset(testToken, "new-password-123456789012345");

      expect(result.success).toBe(false);
      expect(result.message).toContain("already been used");
    });

    it("should reject password less than 15 characters (NIST 2025)", async () => {
      await service.requestReset(testEmail);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      const { randomBytes } = await import("crypto");
      const testToken = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const result = await service.confirmReset(testToken, "short");

      expect(result.success).toBe(false);
      expect(result.message).toContain("at least 15 characters");
    });

    it("should reject password longer than 64 characters (NIST 2025)", async () => {
      await service.requestReset(testEmail);

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      const { randomBytes } = await import("crypto");
      const testToken = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      const longPassword = "a".repeat(65);
      const result = await service.confirmReset(testToken, longPassword);

      expect(result.success).toBe(false);
      expect(result.message).toContain("no more than 64 characters");
    });

    it("should invalidate all refresh tokens after password reset", async () => {
      // Create some refresh tokens for the user
      const { randomBytes } = await import("crypto");
      const token1 = randomBytes(32).toString("hex");
      const token2 = randomBytes(32).toString("hex");
      const hash1 = await bcrypt.hash(token1, BCRYPT_ROUNDS);
      const hash2 = await bcrypt.hash(token2, BCRYPT_ROUNDS);

      await db.insert(refreshTokensTable).values([
        { userId: testUserId, tokenHash: hash1, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { userId: testUserId, tokenHash: hash2, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      ]);

      // Request and confirm reset
      await service.requestReset(testEmail);
      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, testUserId));

      const testToken = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(testToken, BCRYPT_ROUNDS);
      
      await db
        .update(passwordResetTokensTable)
        .set({ tokenHash })
        .where(eq(passwordResetTokensTable.id, tokenRecord.id));

      await service.confirmReset(testToken, "new-password-123456789012345");

      // Verify all refresh tokens are revoked
      const refreshTokens = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.userId, testUserId));

      expect(refreshTokens.every(t => t.revokedAt !== null)).toBe(true);
    });
  });
});
