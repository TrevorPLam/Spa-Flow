/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers in codebase
 */

// Resource counts
export const LOCKER_TOTAL = 167;
export const ROOM_TOTAL = 38;

// Time durations in milliseconds
export const SESSION_DURATION_HOURS = 6;
export const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;
export const EXTENSION_DURATION_HOURS = 2;
export const EXTENSION_DURATION_MS = EXTENSION_DURATION_HOURS * 60 * 60 * 1000;
export const WAITLIST_CONFIRM_MINUTES = 15;
export const WAITLIST_CONFIRM_MS = WAITLIST_CONFIRM_MINUTES * 60 * 1000;

// Membership pricing (in dollars)
export const MEMBERSHIP_ONE_TIME_COST = 13;
export const MEMBERSHIP_SIX_MONTH_COST = 42;

// Extension surcharge calculation
export const EXTENSION_SURCHARGE_DIVISOR = 3;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;

// Password hashing rounds
export const BCRYPT_ROUNDS = 12;

// Default tax rate (NYC)
export const DEFAULT_TAX_RATE = 0.08875;
