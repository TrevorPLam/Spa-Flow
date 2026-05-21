import { createIdMiddleware } from "./id-middleware";

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
 *
 * This is different from request ID:
 * - Correlation ID: spans multiple requests (flow-scoped, for distributed tracing)
 * - Request ID: unique per HTTP request (request-scoped)
 */
export const correlationIdMiddleware = createIdMiddleware("x-correlation-id", "correlationId");
