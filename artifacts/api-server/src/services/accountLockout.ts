import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getEnv } from "../lib/env";

export interface LockoutStatus {
  isLocked: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
  remainingAttempts: number;
}

export class AccountLockoutService {
  private threshold: number;
  private durationMs: number;

  constructor() {
    const env = getEnv();
    this.threshold = env.LOCKOUT_THRESHOLD;
    this.durationMs = env.LOCKOUT_DURATION_MS;
  }

  /**
   * Record a failed login attempt for a user
   * Increments the failed attempt counter and locks the account if threshold is reached
   */
  async recordFailedAttempt(userId: number): Promise<void> {
    const [user] = await db
      .select({
        failedLoginAttempts: usersTable.failedLoginAttempts,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const now = new Date();
    const lockedUntil = newAttempts >= this.threshold ? new Date(now.getTime() + this.durationMs) : null;

    await db
      .update(usersTable)
      .set({
        failedLoginAttempts: newAttempts,
        lastFailedLoginAt: now,
        lockedUntil,
      })
      .where(eq(usersTable.id, userId));
  }

  /**
   * Check if a user account is currently locked
   * Returns true if locked and lockout period has not expired
   */
  async isLocked(userId: number): Promise<boolean> {
    const [user] = await db
      .select({
        lockedUntil: usersTable.lockedUntil,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      return false;
    }

    if (!user.lockedUntil) {
      return false;
    }

    const now = new Date();
    if (user.lockedUntil < now) {
      // Lockout has expired, clear it
      await this.resetAttempts(userId);
      return false;
    }

    return true;
  }

  /**
   * Get the current lockout status for a user
   */
  async getLockoutStatus(userId: number): Promise<LockoutStatus> {
    const [user] = await db
      .select({
        failedLoginAttempts: usersTable.failedLoginAttempts,
        lockedUntil: usersTable.lockedUntil,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    const isLocked = await this.isLocked(userId);
    const remainingAttempts = Math.max(0, this.threshold - (user.failedLoginAttempts || 0));

    return {
      isLocked,
      failedAttempts: user.failedLoginAttempts || 0,
      lockedUntil: user.lockedUntil,
      remainingAttempts,
    };
  }

  /**
   * Reset failed login attempts and clear lockout for a user
   * Called after successful login or manual unlock
   */
  async resetAttempts(userId: number): Promise<void> {
    await db
      .update(usersTable)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      })
      .where(eq(usersTable.id, userId));
  }
}

export const accountLockoutService = new AccountLockoutService();
