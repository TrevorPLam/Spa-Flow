/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers in codebase
 */

// ============================================================================
// Resource Counts
// ============================================================================
export const LOCKER_TOTAL = 167;
export const ROOM_TOTAL = 38;

// ============================================================================
// Time Durations (in milliseconds)
// ============================================================================
export const SESSION_DURATION_HOURS = 6;
export const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;
export const EXTENSION_DURATION_HOURS = 2;
export const EXTENSION_DURATION_MS = EXTENSION_DURATION_HOURS * 60 * 60 * 1000;
export const WAITLIST_CONFIRM_MINUTES = 15;
export const WAITLIST_CONFIRM_MS = WAITLIST_CONFIRM_MINUTES * 60 * 1000;

// Cookie expiration times (in milliseconds)
export const AUTH_COOKIE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
export const CSRF_COOKIE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Security header timeouts (in milliseconds)
export const HSTS_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

// Timing-safe login random delay range (in milliseconds)
export const TIMING_SAFE_LOGIN_DELAY_MAX_MS = 100; // 0-100ms random delay

// ============================================================================
// Pricing (in dollars)
// ============================================================================
export const MEMBERSHIP_ONE_TIME_COST = 13;
export const MEMBERSHIP_SIX_MONTH_COST = 42;
export const EXTENSION_SURCHARGE_DIVISOR = 3;

// ============================================================================
// Pagination
// ============================================================================
export const DEFAULT_PAGE_SIZE = 20;

// ============================================================================
// Security
// ============================================================================
export const BCRYPT_ROUNDS = 12;

// ============================================================================
// Tax
// ============================================================================
export const DEFAULT_TAX_RATE = 0.08875;
