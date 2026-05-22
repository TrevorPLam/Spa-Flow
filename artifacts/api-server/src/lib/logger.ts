import pino from "pino";
import { getEnv } from "./env";
import { createBootstrapLogger } from "./logger-bootstrap";

export { createBootstrapLogger };

const env = getEnv();
const isProduction = env.NODE_ENV === "production";

/**
 * Pino logger instance configured for the application
 * - Redacts sensitive data (authorization headers, cookies)
 * - Uses pretty printing in development
 * - Uses JSON format in production
 * - Includes correlation IDs for log aggregation
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

/**
 * Generate a unique correlation ID for request tracing
 * Used to link all logs for a single request across distributed systems
 */
export function generateCorrelationId(): string {
  return `cid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a child logger with correlation ID and additional context
 * This enables log aggregation and distributed tracing
 */
export function createCorrelationLogger(
  correlationId: string,
  context?: Record<string, unknown>
): pino.Logger {
  return logger.child({
    correlationId,
    ...context,
  });
}

/**
 * Logs a transaction error with standardized format
 * Includes error details, operation name, and optional context
 *
 * @param operation - The operation that failed (e.g., "createLocker", "updateSession")
 * @param error - The error that occurred
 * @param context - Additional context data for debugging
 */
export function logTransactionError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  logger.error({
    type: "transaction_error",
    operation,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : String(error),
    ...context,
  }, `Transaction failed: ${operation}`);
}
