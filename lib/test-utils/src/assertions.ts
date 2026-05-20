import { expect } from 'vitest';

/**
 * Custom assertion for API error responses
 * @param response - API response object
 * @param expectedStatus - Expected HTTP status code
 * @param expectedMessage - Expected error message (optional)
 */
export function assertApiError(
  response: { status: number; body?: { error?: string } },
  expectedStatus: number,
  expectedMessage?: string
) {
  expect(response.status).toBe(expectedStatus);
  if (expectedMessage) {
    expect(response.body?.error).toContain(expectedMessage);
  }
}

/**
 * Custom assertion for successful API responses
 * @param response - API response object
 * @param expectedStatus - Expected HTTP status code (default: 200)
 */
export function assertApiSuccess(
  response: { status: number },
  expectedStatus: number = 200
) {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Custom assertion for database record existence
 * @param record - Database record or null/undefined
 * @param message - Custom error message
 */
export function assertRecordExists<T>(record: T | null | undefined, message?: string) {
  expect(record).toBeDefined();
  expect(record).not.toBeNull();
}

/**
 * Custom assertion for database record non-existence
 * @param record - Database record or null/undefined
 * @param message - Custom error message
 */
export function assertRecordNotExists<T>(record: T | null | undefined, message?: string) {
  expect(record).toBeNull();
}
