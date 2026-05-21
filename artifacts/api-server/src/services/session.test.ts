import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sessionService } from "./session";
import { db, refreshTokensTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../lib/constants";
import { createTestUserInDb } from "../test/test-helpers";

describe("SessionService", { tags: ['@regression', '@integration'] }, () => {
  let testUserId: number;
  let testSessionIds: number[] = [];

  beforeEach(async () => {
    // Create a test user in the database
    const testUser = await createTestUserInDb();
    testUserId = testUser.id;

    // Clean up any existing test sessions for this user
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test sessions (children before parents)
    for (const sessionId of testSessionIds) {
      try {
        await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, sessionId));
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, testUserId));

    // Clean up test user (parent after children)
    try {
      await db.delete(usersTable).where(eq(usersTable.id, testUserId));
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  describe("listSessions", () => {
    it("should return empty array for user with no sessions", async () => {
      const sessions = await sessionService.listSessions(testUserId);
      expect(sessions).toEqual([]);
    });

    it("should return all active sessions for a user", async () => {
      // Create multiple test sessions
      const session1 = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      }).returning();

      const session2 = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token2", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      }).returning();

      testSessionIds.push(session1[0].id, session2[0].id);

      const sessions = await sessionService.listSessions(testUserId);
      expect(sessions).toHaveLength(2);
      expect(sessions[0].userId).toBe(testUserId);
      expect(sessions[1].userId).toBe(testUserId);
      // Check that both user agents are present (order may vary)
      const userAgents = sessions.map(s => s.userAgent).filter((ua): ua is string => ua !== null);
      expect(userAgents.some(ua => ua.includes("Chrome"))).toBe(true);
      expect(userAgents.some(ua => ua.includes("Safari"))).toBe(true);
    });

    it("should not include revoked sessions", async () => {
      // Create an active session
      const activeSession = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("active", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      // Create a revoked session
      const revokedSession = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("revoked", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
        userAgent: "Mozilla/5.0 Firefox",
      }).returning();

      testSessionIds.push(activeSession[0].id, revokedSession[0].id);

      const sessions = await sessionService.listSessions(testUserId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(activeSession[0].id);
    });

    it("should mark current session when token hash provided", async () => {
      const tokenHash = await bcrypt.hash("current-token", BCRYPT_ROUNDS);
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(session[0].id);

      const sessions = await sessionService.listSessions(testUserId, tokenHash);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].isCurrent).toBe(true);
    });

    it("should not mark as current when token hash does not match", async () => {
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("different-token", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(session[0].id);

      const sessions = await sessionService.listSessions(testUserId, await bcrypt.hash("current-token", BCRYPT_ROUNDS));
      expect(sessions).toHaveLength(1);
      expect(sessions[0].isCurrent).toBe(false);
    });
  });

  describe("revokeSession", () => {
    it("should revoke a session by ID", async () => {
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(session[0].id);

      const revoked = await sessionService.revokeSession(session[0].id, testUserId);
      expect(revoked).toBe(true);

      // Verify session is revoked
      const [updatedSession] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.id, session[0].id));
      expect(updatedSession.revokedAt).not.toBeNull();
    });

    it("should return false for non-existent session", async () => {
      const revoked = await sessionService.revokeSession(999999, testUserId);
      expect(revoked).toBe(false);
    });

    it("should not revoke session belonging to different user", async () => {
      // Create a second test user
      const otherUser = await createTestUserInDb();
      const otherUserId = otherUser.id;

      const session = await db.insert(refreshTokensTable).values({
        userId: otherUserId,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(session[0].id);

      const revoked = await sessionService.revokeSession(session[0].id, testUserId);
      expect(revoked).toBe(false);

      // Verify session is still active
      const [updatedSession] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.id, session[0].id));
      expect(updatedSession.revokedAt).toBeNull();

      // Clean up the other user's session
      await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, session[0].id));
      await db.delete(usersTable).where(eq(usersTable.id, otherUserId));
    });
  });

  describe("revokeAllSessions", () => {
    it("should revoke all sessions for a user", async () => {
      // Create multiple sessions
      const session1 = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      const session2 = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token2", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Safari",
      }).returning();

      testSessionIds.push(session1[0].id, session2[0].id);

      const revokedCount = await sessionService.revokeAllSessions(testUserId);
      expect(revokedCount).toBe(2);

      // Verify all sessions are revoked
      const sessions = await sessionService.listSessions(testUserId);
      expect(sessions).toHaveLength(0);
    });

    it("should keep current session active when provided", async () => {
      const session1 = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      const session2 = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token2", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Safari",
      }).returning();

      testSessionIds.push(session1[0].id, session2[0].id);

      const revokedCount = await sessionService.revokeAllSessions(testUserId, session1[0].id);
      expect(revokedCount).toBe(1);

      // Verify session1 is still active
      const [updatedSession1] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.id, session1[0].id));
      expect(updatedSession1.revokedAt).toBeNull();

      // Verify session2 is revoked
      const [updatedSession2] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.id, session2[0].id));
      expect(updatedSession2.revokedAt).not.toBeNull();
    });

    it("should return 0 for user with no sessions", async () => {
      const revokedCount = await sessionService.revokeAllSessions(testUserId);
      expect(revokedCount).toBe(0);
    });
  });

  describe("getSessionIdForToken", () => {
    it("should return session ID for valid token", async () => {
      const token = "valid-token-12345";
      const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(session[0].id);

      const sessionId = await sessionService.getSessionIdForToken(token);
      expect(sessionId).toBe(session[0].id);
    });

    it("should return null for invalid token", async () => {
      const sessionId = await sessionService.getSessionIdForToken("invalid-token");
      expect(sessionId).toBeNull();
    });

    it("should return null for revoked session token", async () => {
      const token = "revoked-token-12345";
      const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(session[0].id);

      const sessionId = await sessionService.getSessionIdForToken(token);
      expect(sessionId).toBeNull();
    });
  });

  describe("parseUserAgent", () => {
    it("should parse Chrome on Windows", async () => {
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }).returning();

      testSessionIds.push(session[0].id);

      const sessions = await sessionService.listSessions(testUserId);
      expect(sessions[0].userAgent).toContain("Chrome");
      expect(sessions[0].userAgent).toContain("Windows");
    });

    it("should parse Safari on iPhone", async () => {
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      }).returning();

      testSessionIds.push(session[0].id);

      const sessions = await sessionService.listSessions(testUserId);
      expect(sessions[0].userAgent).toContain("Safari");
      expect(sessions[0].userAgent).toContain("iOS");
      expect(sessions[0].userAgent).toContain("Mobile");
    });

    it("should return 'Unknown Device' for null user agent", async () => {
      const session = await db.insert(refreshTokensTable).values({
        userId: testUserId,
        tokenHash: await bcrypt.hash("token", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: null,
      }).returning();

      testSessionIds.push(session[0].id);

      const sessions = await sessionService.listSessions(testUserId);
      expect(sessions[0].userAgent).toBe("Unknown Device");
    });
  });
});
