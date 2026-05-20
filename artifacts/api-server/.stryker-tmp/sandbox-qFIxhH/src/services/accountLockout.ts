// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
    if (stryMutAct_9fa48("208")) {
      {}
    } else {
      stryCov_9fa48("208");
      const env = getEnv();
      this.threshold = env.LOCKOUT_THRESHOLD;
      this.durationMs = env.LOCKOUT_DURATION_MS;
    }
  }

  /**
   * Record a failed login attempt for a user
   * Increments the failed attempt counter and locks the account if threshold is reached
   */
  async recordFailedAttempt(userId: number): Promise<void> {
    if (stryMutAct_9fa48("209")) {
      {}
    } else {
      stryCov_9fa48("209");
      const [user] = await db.select(stryMutAct_9fa48("210") ? {} : (stryCov_9fa48("210"), {
        failedLoginAttempts: usersTable.failedLoginAttempts
      })).from(usersTable).where(eq(usersTable.id, userId));
      if (stryMutAct_9fa48("213") ? false : stryMutAct_9fa48("212") ? true : stryMutAct_9fa48("211") ? user : (stryCov_9fa48("211", "212", "213"), !user)) {
        if (stryMutAct_9fa48("214")) {
          {}
        } else {
          stryCov_9fa48("214");
          throw new Error("User not found");
        }
      }
      const newAttempts = stryMutAct_9fa48("216") ? (user.failedLoginAttempts || 0) - 1 : (stryCov_9fa48("216"), (stryMutAct_9fa48("219") ? user.failedLoginAttempts && 0 : stryMutAct_9fa48("218") ? false : stryMutAct_9fa48("217") ? true : (stryCov_9fa48("217", "218", "219"), user.failedLoginAttempts || 0)) + 1);
      const now = new Date();
      const lockedUntil = (stryMutAct_9fa48("223") ? newAttempts < this.threshold : stryMutAct_9fa48("222") ? newAttempts > this.threshold : stryMutAct_9fa48("221") ? false : stryMutAct_9fa48("220") ? true : (stryCov_9fa48("220", "221", "222", "223"), newAttempts >= this.threshold)) ? new Date(stryMutAct_9fa48("224") ? now.getTime() - this.durationMs : (stryCov_9fa48("224"), now.getTime() + this.durationMs)) : null;
      await db.update(usersTable).set(stryMutAct_9fa48("225") ? {} : (stryCov_9fa48("225"), {
        failedLoginAttempts: newAttempts,
        lastFailedLoginAt: now,
        lockedUntil
      })).where(eq(usersTable.id, userId));
    }
  }

  /**
   * Check if a user account is currently locked
   * Returns true if locked and lockout period has not expired
   */
  async isLocked(userId: number): Promise<boolean> {
    if (stryMutAct_9fa48("226")) {
      {}
    } else {
      stryCov_9fa48("226");
      const [user] = await db.select(stryMutAct_9fa48("227") ? {} : (stryCov_9fa48("227"), {
        lockedUntil: usersTable.lockedUntil
      })).from(usersTable).where(eq(usersTable.id, userId));
      if (stryMutAct_9fa48("230") ? false : stryMutAct_9fa48("229") ? true : stryMutAct_9fa48("228") ? user : (stryCov_9fa48("228", "229", "230"), !user)) {
        if (stryMutAct_9fa48("231")) {
          {}
        } else {
          stryCov_9fa48("231");
          return stryMutAct_9fa48("232") ? true : (stryCov_9fa48("232"), false);
        }
      }
      if (stryMutAct_9fa48("235") ? false : stryMutAct_9fa48("234") ? true : stryMutAct_9fa48("233") ? user.lockedUntil : (stryCov_9fa48("233", "234", "235"), !user.lockedUntil)) {
        if (stryMutAct_9fa48("236")) {
          {}
        } else {
          stryCov_9fa48("236");
          return stryMutAct_9fa48("237") ? true : (stryCov_9fa48("237"), false);
        }
      }
      const now = new Date();
      if (stryMutAct_9fa48("241") ? user.lockedUntil >= now : stryMutAct_9fa48("240") ? user.lockedUntil <= now : stryMutAct_9fa48("239") ? false : stryMutAct_9fa48("238") ? true : (stryCov_9fa48("238", "239", "240", "241"), user.lockedUntil < now)) {
        if (stryMutAct_9fa48("242")) {
          {}
        } else {
          stryCov_9fa48("242");
          // Lockout has expired, clear it
          await this.resetAttempts(userId);
          return stryMutAct_9fa48("243") ? true : (stryCov_9fa48("243"), false);
        }
      }
      return stryMutAct_9fa48("244") ? false : (stryCov_9fa48("244"), true);
    }
  }

  /**
   * Get the current lockout status for a user
   */
  async getLockoutStatus(userId: number): Promise<LockoutStatus> {
    if (stryMutAct_9fa48("245")) {
      {}
    } else {
      stryCov_9fa48("245");
      const [user] = await db.select(stryMutAct_9fa48("246") ? {} : (stryCov_9fa48("246"), {
        failedLoginAttempts: usersTable.failedLoginAttempts,
        lockedUntil: usersTable.lockedUntil
      })).from(usersTable).where(eq(usersTable.id, userId));
      if (stryMutAct_9fa48("249") ? false : stryMutAct_9fa48("248") ? true : stryMutAct_9fa48("247") ? user : (stryCov_9fa48("247", "248", "249"), !user)) {
        if (stryMutAct_9fa48("250")) {
          {}
        } else {
          stryCov_9fa48("250");
          throw new Error("User not found");
        }
      }
      const isLocked = await this.isLocked(userId);
      const remainingAttempts = stryMutAct_9fa48("252") ? Math.min(0, this.threshold - (user.failedLoginAttempts || 0)) : (stryCov_9fa48("252"), Math.max(0, stryMutAct_9fa48("253") ? this.threshold + (user.failedLoginAttempts || 0) : (stryCov_9fa48("253"), this.threshold - (stryMutAct_9fa48("256") ? user.failedLoginAttempts && 0 : stryMutAct_9fa48("255") ? false : stryMutAct_9fa48("254") ? true : (stryCov_9fa48("254", "255", "256"), user.failedLoginAttempts || 0)))));
      return stryMutAct_9fa48("257") ? {} : (stryCov_9fa48("257"), {
        isLocked,
        failedAttempts: stryMutAct_9fa48("260") ? user.failedLoginAttempts && 0 : stryMutAct_9fa48("259") ? false : stryMutAct_9fa48("258") ? true : (stryCov_9fa48("258", "259", "260"), user.failedLoginAttempts || 0),
        lockedUntil: user.lockedUntil,
        remainingAttempts
      });
    }
  }

  /**
   * Reset failed login attempts and clear lockout for a user
   * Called after successful login or manual unlock
   */
  async resetAttempts(userId: number): Promise<void> {
    if (stryMutAct_9fa48("261")) {
      {}
    } else {
      stryCov_9fa48("261");
      await db.update(usersTable).set(stryMutAct_9fa48("262") ? {} : (stryCov_9fa48("262"), {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null
      })).where(eq(usersTable.id, userId));
    }
  }
}
export const accountLockoutService = new AccountLockoutService();