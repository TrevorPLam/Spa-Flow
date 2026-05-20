/**
 * Standardized error codes and messages for authentication endpoints.
 * Following RFC 7807 Problem Details for HTTP APIs best practices.
 */

/**
 * Authentication error codes for programmatic client handling.
 * These codes are stable and should not change between versions.
 */
export const AuthErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: "AUTH_001",
  INVALID_CREDENTIALS: "AUTH_002",
  INVALID_SESSION: "AUTH_003",
  INVALID_REFRESH_TOKEN: "AUTH_004",
  REFRESH_TOKEN_ROTATION_FAILED: "AUTH_005",

  // Authorization errors (403)
  MANAGER_ACCESS_REQUIRED: "AUTH_006",
  ACCOUNT_LOCKED: "AUTH_007",

  // Not found errors (404)
  USER_NOT_FOUND: "AUTH_008",

  // Validation errors (400)
  INVALID_REQUEST: "AUTH_009",

  // Server errors (500)
  INTERNAL_SERVER_ERROR: "AUTH_010",
} as const;

/**
 * Type-safe error code type.
 */
export type AuthErrorCode = typeof AuthErrorCodes[keyof typeof AuthErrorCodes];

/**
 * Human-readable error messages for authentication errors.
 * These messages are user-friendly but generic for security purposes.
 */
export const AuthErrorMessages = {
  [AuthErrorCodes.UNAUTHORIZED]: "Unauthorized",
  [AuthErrorCodes.INVALID_CREDENTIALS]: "Invalid credentials",
  [AuthErrorCodes.INVALID_SESSION]: "Invalid or expired session",
  [AuthErrorCodes.INVALID_REFRESH_TOKEN]: "Invalid or expired refresh token",
  [AuthErrorCodes.REFRESH_TOKEN_ROTATION_FAILED]: "Failed to rotate refresh token",
  [AuthErrorCodes.MANAGER_ACCESS_REQUIRED]: "Manager access required",
  [AuthErrorCodes.ACCOUNT_LOCKED]: "Account temporarily locked due to too many failed login attempts",
  [AuthErrorCodes.USER_NOT_FOUND]: "User not found",
  [AuthErrorCodes.INVALID_REQUEST]: "Invalid request",
  [AuthErrorCodes.INTERNAL_SERVER_ERROR]: "Internal server error",
} as const;

/**
 * Standardized error response interface.
 * Follows RFC 7807 Problem Details for HTTP APIs pattern.
 */
export interface AuthErrorResponse {
  error: string; // Human-readable message
  code: AuthErrorCode; // Machine-readable error code
}

/**
 * Creates a standardized error response object.
 *
 * @param code - The error code from AuthErrorCodes
 * @param customMessage - Optional custom message override
 * @returns A standardized error response object
 */
export function createAuthErrorResponse(
  code: AuthErrorCode,
  customMessage?: string
): AuthErrorResponse {
  return {
    error: customMessage || AuthErrorMessages[code],
    code,
  };
}
