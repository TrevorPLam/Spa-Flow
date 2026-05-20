import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Correlation ID middleware generates or extracts a correlation ID from the request
 * and attaches it to the request object for traceability across the request lifecycle.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check for existing correlation ID in header
  const correlationId = req.headers["x-correlation-id"] as string | undefined;

  // Generate new correlation ID if not provided
  req.correlationId = correlationId || randomUUID();

  // Add correlation ID to response header for client-side tracing
  res.setHeader("x-correlation-id", req.correlationId);

  next();
}
