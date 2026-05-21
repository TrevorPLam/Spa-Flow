/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers in codebase
 */

import { getEnv } from './env.js';

// ============================================================================
// Resource Counts (Physical Capacity - Not Configurable)
// ============================================================================
/** Total number of lockers available in the facility */
export const LOCKER_TOTAL = 167;
/** Total number of private dressing rooms available in the facility */
export const ROOM_TOTAL = 38;

// ============================================================================
// Time Durations (in milliseconds)
// ============================================================================
/** Default session duration in hours (configurable via SESSION_DURATION_HOURS env var) */
export const SESSION_DURATION_HOURS = getEnv().SESSION_DURATION_HOURS;
/** Default session duration in milliseconds */
export const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;
/** Extension duration in hours (configurable via EXTENSION_DURATION_HOURS env var) */
export const EXTENSION_DURATION_HOURS = getEnv().EXTENSION_DURATION_HOURS;
/** Extension duration in milliseconds */
export const EXTENSION_DURATION_MS = EXTENSION_DURATION_HOURS * 60 * 60 * 1000;
/** Waitlist confirmation window in minutes (configurable via WAITLIST_CONFIRM_MINUTES env var) */
export const WAITLIST_CONFIRM_MINUTES = getEnv().WAITLIST_CONFIRM_MINUTES;
/** Waitlist confirmation window in milliseconds */
export const WAITLIST_CONFIRM_MS = WAITLIST_CONFIRM_MINUTES * 60 * 1000;

// Cookie expiration times (in milliseconds)
/** Authentication cookie max age in milliseconds */
export const AUTH_COOKIE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
/** CSRF cookie max age in milliseconds */
export const CSRF_COOKIE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Security header timeouts (in milliseconds)
/** HSTS (HTTP Strict Transport Security) max age in milliseconds */
export const HSTS_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

// Timing-safe login random delay range (in milliseconds)
/** Maximum random delay for timing-safe login in milliseconds */
export const TIMING_SAFE_LOGIN_DELAY_MAX_MS = 100; // 0-100ms random delay

// ============================================================================
// Pricing (in dollars) - Configurable via Environment Variables
// ============================================================================
/** Cost of one-time membership purchase in dollars (configurable via MEMBERSHIP_ONE_TIME_COST env var) */
export const MEMBERSHIP_ONE_TIME_COST = getEnv().MEMBERSHIP_ONE_TIME_COST;
/** Cost of six-month membership purchase in dollars (configurable via MEMBERSHIP_SIX_MONTH_COST env var) */
export const MEMBERSHIP_SIX_MONTH_COST = getEnv().MEMBERSHIP_SIX_MONTH_COST;
/** Divisor for extension surcharge calculation (configurable via EXTENSION_SURCHARGE_DIVISOR env var) */
export const EXTENSION_SURCHARGE_DIVISOR = getEnv().EXTENSION_SURCHARGE_DIVISOR;

// ============================================================================
// Pagination - Configurable via Environment Variables
// ============================================================================
/** Default number of items per page for paginated endpoints (configurable via DEFAULT_PAGE_SIZE env var) */
export const DEFAULT_PAGE_SIZE = getEnv().DEFAULT_PAGE_SIZE;

// ============================================================================
// Security
// ============================================================================
/** Number of rounds for bcrypt password hashing */
export const BCRYPT_ROUNDS = 12;

// ============================================================================
// Tax
// ============================================================================
/** Default tax rate (8.875% for NYC) as a decimal */
export const DEFAULT_TAX_RATE = 0.08875;
