// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Request ID middleware generates a unique identifier for each HTTP request.
 * This is different from correlation ID:
 * - Request ID: unique per HTTP request (request-scoped)
 * - Correlation ID: spans multiple requests (flow-scoped, for distributed tracing)
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check for existing request ID in header
  const requestId = req.headers["x-request-id"] as string | undefined;

  // Generate new request ID if not provided
  req.requestId = requestId || randomUUID();

  // Add request ID to response header for client-side tracing
  res.setHeader("x-request-id", req.requestId);

  next();
}
