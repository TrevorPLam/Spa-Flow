import { Response } from "express";

/**
 * Standard error response format
 * Provides consistent error structure across all endpoints
 * This matches the existing format used in the codebase
 */
export interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Error codes for common error scenarios
 * These provide programmatic error handling capabilities
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  LOCKED: "LOCKED",
  PAYMENT_ERROR: "PAYMENT_ERROR",
} as const;

/**
 * Creates a standardized error response
 * @param error - Error message
 * @param code - Optional error code for programmatic handling
 */
export function createErrorResponse(error: string, code?: string): ErrorResponse {
  const response: ErrorResponse = { error };
  if (code) {
    response.code = code;
  }
  return response;
}

/**
 * Sends a standardized error response
 * @param res - Express response object
 * @param error - Error message
 * @param status - HTTP status code
 * @param code - Optional error code
 */
export function sendErrorResponse(
  res: Response,
  error: string,
  status: number,
  code?: string
): void {
  const response = createErrorResponse(error, code);
  res.status(status).json(response);
}

/**
 * Convenience functions for common error scenarios
 * These maintain backward compatibility with existing error formats
 */

export function sendValidationError(res: Response, error: string): void {
  sendErrorResponse(res, error, 400, ErrorCodes.VALIDATION_ERROR);
}

export function sendNotFoundError(res: Response, error: string): void {
  sendErrorResponse(res, error, 404, ErrorCodes.NOT_FOUND);
}

export function sendConflictError(res: Response, error: string): void {
  sendErrorResponse(res, error, 409, ErrorCodes.CONFLICT);
}

export function sendUnauthorizedError(res: Response, error: string = "Authentication required"): void {
  sendErrorResponse(res, error, 401, ErrorCodes.UNAUTHORIZED);
}

export function sendForbiddenError(res: Response, error: string = "Insufficient permissions"): void {
  sendErrorResponse(res, error, 403, ErrorCodes.FORBIDDEN);
}

export function sendInternalError(res: Response, error: string = "An internal server error occurred"): void {
  sendErrorResponse(res, error, 500, ErrorCodes.INTERNAL_ERROR);
}

export function sendLockedError(res: Response, error: string): void {
  sendErrorResponse(res, error, 423, ErrorCodes.LOCKED);
}
