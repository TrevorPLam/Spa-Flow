import { createIdMiddleware } from "./id-middleware";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Request ID middleware generates a unique identifier for each HTTP request.
 *
 * This is different from correlation ID:
 * - Request ID: unique per HTTP request (request-scoped)
 * - Correlation ID: spans multiple requests (flow-scoped, for distributed tracing)
 */
export const requestIdMiddleware = createIdMiddleware("x-request-id", "requestId");
