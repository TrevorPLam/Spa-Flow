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
import { db, auditLogsTable } from "@workspace/db";
import { logger } from "../lib/logger";
export interface LoginAttemptData {
  userId?: number;
  email: string;
  ipAddress: string;
  success: boolean;
  reason?: string;
  correlationId?: string;
}
export interface LogoutData {
  userId: number;
  ipAddress: string;
  correlationId?: string;
}

/**
 * AuthAuditLogger handles audit logging for authentication events.
 * Logs login attempts (success/failure) and logout events to the audit_logs table.
 * Follows OWASP best practices for security event logging.
 */
export class AuthAuditLogger {
  /**
   * Log a login attempt (success or failure)
   */
  async logLoginAttempt(data: LoginAttemptData): Promise<void> {
    if (stryMutAct_9fa48("263")) {
      {}
    } else {
      stryCov_9fa48("263");
      try {
        if (stryMutAct_9fa48("264")) {
          {}
        } else {
          stryCov_9fa48("264");
          await db.insert(auditLogsTable).values(stryMutAct_9fa48("265") ? {} : (stryCov_9fa48("265"), {
            userId: stryMutAct_9fa48("266") ? data.userId && null : (stryCov_9fa48("266"), data.userId ?? null),
            action: data.success ? "LOGIN_SUCCESS" : "LOGIN_FAILURE",
            resourceType: "AUTH",
            description: stryMutAct_9fa48("272") ? data.reason && (data.success ? "User logged in successfully" : "Login attempt failed") : stryMutAct_9fa48("271") ? false : stryMutAct_9fa48("270") ? true : (stryCov_9fa48("270", "271", "272"), data.reason || (data.success ? "User logged in successfully" : "Login attempt failed")),
            ipAddress: data.ipAddress,
            email: data.email,
            correlationId: stryMutAct_9fa48("275") ? data.correlationId && null : (stryCov_9fa48("275"), data.correlationId ?? null)
          }));
        }
      } catch (err) {
        if (stryMutAct_9fa48("276")) {
          {}
        } else {
          stryCov_9fa48("276");
          logger.error(stryMutAct_9fa48("277") ? {} : (stryCov_9fa48("277"), {
            err: err instanceof Error ? stryMutAct_9fa48("278") ? {} : (stryCov_9fa48("278"), {
              name: err.name,
              message: err.message,
              stack: err.stack
            }) : String(err),
            auditData: stryMutAct_9fa48("279") ? {} : (stryCov_9fa48("279"), {
              ...data,
              userId: stryMutAct_9fa48("280") ? data.userId && "null" : (stryCov_9fa48("280"), data.userId ?? "null")
            })
          }), "Failed to write auth audit log");
        }
      }
    }
  }

  /**
   * Log a logout event
   */
  async logLogout(data: LogoutData): Promise<void> {
    if (stryMutAct_9fa48("283")) {
      {}
    } else {
      stryCov_9fa48("283");
      try {
        if (stryMutAct_9fa48("284")) {
          {}
        } else {
          stryCov_9fa48("284");
          await db.insert(auditLogsTable).values(stryMutAct_9fa48("285") ? {} : (stryCov_9fa48("285"), {
            userId: data.userId,
            action: "LOGOUT",
            resourceType: "AUTH",
            description: "User logged out",
            ipAddress: data.ipAddress,
            correlationId: stryMutAct_9fa48("289") ? data.correlationId && null : (stryCov_9fa48("289"), data.correlationId ?? null)
          }));
        }
      } catch (err) {
        if (stryMutAct_9fa48("290")) {
          {}
        } else {
          stryCov_9fa48("290");
          logger.error(stryMutAct_9fa48("291") ? {} : (stryCov_9fa48("291"), {
            err: err instanceof Error ? stryMutAct_9fa48("292") ? {} : (stryCov_9fa48("292"), {
              name: err.name,
              message: err.message,
              stack: err.stack
            }) : String(err),
            auditData: data
          }), "Failed to write logout audit log");
        }
      }
    }
  }
}
export const authAuditLogger = new AuthAuditLogger();