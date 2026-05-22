// Set required environment variables BEFORE any imports
// The auth module loads JWT_SECRET at import time
const validSecret = 'a'.repeat(32);
process.env.JWT_SECRET = validSecret;
process.env.ENCRYPTION_KEY = validSecret;
process.env.CSRF_SECRET = validSecret;

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import authRouter from "./auth";
import { db, refreshTokensTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken } from "../lib/auth";
import { BCRYPT_ROUNDS } from "../lib/constants";
import cookieParser from "cookie-parser";
import { resetEnv } from "../lib/env";

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', authRouter);

describe("Session Management Endpoints", { tags: ['smoke', 'critical'] }, () => {
  // Type for test user based on database schema
  type TestUser = {
    id: number;
    email: string;
    name: string;
    passwordHash: string;
    role: 'STAFF' | 'MANAGER';
    createdAt: Date;
    updatedAt: Date;
  };

  let testUser: TestUser;
  let authToken: string;
  let testSessionIds: number[] = [];
  let otherUserIds: number[] = [];

  beforeEach(async () => {
    // Reset cached environment to ensure test values are used
    resetEnv();
    // Create a test user with unique email
    const passwordHash = await bcrypt.hash("TestPassword123!@#", BCRYPT_ROUNDS);
    const [user] = await db.insert(usersTable).values({
      email: `session-test-${Date.now()}@example.com`,
      name: "Session Test User",
      passwordHash,
      role: "STAFF",
    }).returning();

    testUser = user;

    // Generate auth token
    authToken = await signToken({
      sub: String(user.id),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Clean up any existing test sessions
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, user.id));
  });

  afterEach(async () => {
    // Clean up test sessions
    for (const sessionId of testSessionIds) {
      try {
        await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, sessionId));
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, testUser.id));
    await db.delete(usersTable).where(eq(usersTable.id, testUser.id));

    // Clean up other users created during tests
    for (const otherUserId of otherUserIds) {
      try {
        await db.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, otherUserId));
        await db.delete(usersTable).where(eq(usersTable.id, otherUserId));
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });

  describe("GET /auth/sessions", () => {
    it("should return empty array for user with no sessions", async () => {
      const response = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessions).toEqual([]);
    });

    it("should return all active sessions for authenticated user", async () => {
      // Create test sessions
      const session1 = await db.insert(refreshTokensTable).values({
        userId: testUser.id,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      }).returning();

      const session2 = await db.insert(refreshTokensTable).values({
        userId: testUser.id,
        tokenHash: await bcrypt.hash("token2", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      }).returning();

      testSessionIds.push(session1[0].id, session2[0].id);

      const response = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessions).toHaveLength(2);
      expect(response.body.sessions[0].userId).toBe(testUser.id);
      expect(response.body.sessions[1].userId).toBe(testUser.id);
      // Check that both user agents are present (order may vary due to createdAt sorting)
      const userAgents = response.body.sessions.map((s: any) => s.userAgent);
      expect(userAgents).toContainEqual(expect.stringContaining("Chrome"));
      expect(userAgents).toContainEqual(expect.stringContaining("Safari"));
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/v1/auth/sessions");

      expect(response.status).toBe(401);
    });

    it("should not include revoked sessions", async () => {
      // Create active session
      const activeSession = await db.insert(refreshTokensTable).values({
        userId: testUser.id,
        tokenHash: await bcrypt.hash("active", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      // Create revoked session
      const revokedSession = await db.insert(refreshTokensTable).values({
        userId: testUser.id,
        tokenHash: await bcrypt.hash("revoked", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
        userAgent: "Mozilla/5.0 Firefox",
      }).returning();

      testSessionIds.push(activeSession[0].id, revokedSession[0].id);

      const response = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessions).toHaveLength(1);
      expect(response.body.sessions[0].id).toBe(activeSession[0].id);
    });
  });

  describe("DELETE /auth/sessions/:id", () => {
    it("should revoke a specific session", async () => {
      const session = await db.insert(refreshTokensTable).values({
        userId: testUser.id,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(session[0].id);

      const response = await request(app)
        .delete(`/api/v1/auth/sessions/${session[0].id}`)
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify session is revoked
      const [updatedSession] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.id, session[0].id));
      expect(updatedSession.revokedAt).not.toBeNull();
    });

    it("should return 404 for non-existent session", async () => {
      const response = await request(app)
        .delete("/api/v1/auth/sessions/999999")
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Session not found");
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .delete("/api/v1/auth/sessions/1");

      expect(response.status).toBe(401);
    });

    it("should not revoke session belonging to different user", async () => {
      // Create another user with unique email
      const otherPasswordHash = await bcrypt.hash("OtherPassword123!@#", BCRYPT_ROUNDS);
      const [otherUser] = await db.insert(usersTable).values({
        email: `other-session-test-${Date.now()}@example.com`,
        name: "Other Session Test User",
        passwordHash: otherPasswordHash,
        role: "STAFF",
      }).returning();

      otherUserIds.push(otherUser.id);

      // Create session for other user
      const otherSession = await db.insert(refreshTokensTable).values({
        userId: otherUser.id,
        tokenHash: await bcrypt.hash("other-token", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      testSessionIds.push(otherSession[0].id);

      // Try to revoke with first user's auth
      const response = await request(app)
        .delete(`/api/v1/auth/sessions/${otherSession[0].id}`)
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid session ID", async () => {
      const response = await request(app)
        .delete("/api/v1/auth/sessions/invalid")
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid session ID");
    });
  });

  describe("DELETE /auth/sessions", () => {
    it("should revoke all sessions for user", async () => {
      // Create multiple sessions
      const session1 = await db.insert(refreshTokensTable).values({
        userId: testUser.id,
        tokenHash: await bcrypt.hash("token1", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Chrome",
      }).returning();

      const session2 = await db.insert(refreshTokensTable).values({
        userId: testUser.id,
        tokenHash: await bcrypt.hash("token2", BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 Safari",
      }).returning();

      testSessionIds.push(session1[0].id, session2[0].id);

      const response = await request(app)
        .delete("/api/v1/auth/sessions")
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.revokedCount).toBe(2);

      // Verify all sessions are revoked
      const sessions = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.userId, testUser.id));
      sessions.forEach((session) => {
        expect(session.revokedAt).not.toBeNull();
      });
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .delete("/api/v1/auth/sessions");

      expect(response.status).toBe(401);
    });

    it("should return 0 revoked count for user with no sessions", async () => {
      const response = await request(app)
        .delete("/api/v1/auth/sessions")
        .set("Cookie", `spaflow_session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.revokedCount).toBe(0);
    });
  });
});
