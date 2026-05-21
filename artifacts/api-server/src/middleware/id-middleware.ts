import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Factory function that creates a middleware for generating and tracking request-scoped IDs.
 *
 * This middleware extracts or generates a unique identifier from the request headers,
 * attaches it to the request object, and adds it to the response headers for traceability.
 *
 * @param headerName - The name of the HTTP header to check for an existing ID (e.g., "x-correlation-id")
 * @param requestPropertyName - The name of the property to set on the request object (e.g., "correlationId")
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // Create correlation ID middleware
 * const correlationIdMiddleware = createIdMiddleware("x-correlation-id", "correlationId");
 *
 * // Create request ID middleware
 * const requestIdMiddleware = createIdMiddleware("x-request-id", "requestId");
 * ```
 */
export function createIdMiddleware(
  headerName: string,
  requestPropertyName: keyof Request
): (req: Request, res: Response, next: NextFunction) => void {
  return function idMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Check for existing ID in header
    const id = req.headers[headerName] as string | undefined;

    // Generate new ID if not provided
    (req[requestPropertyName] as string) = id || randomUUID();

    // Add ID to response header for client-side tracing
    res.setHeader(headerName, req[requestPropertyName] as string);

    next();
  };
}
