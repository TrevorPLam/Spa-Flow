import pino from "pino";
import { getEnv } from "./env";

/**
 * Creates a bootstrap logger for use before full environment initialization.
 * This avoids circular dependency between logger.ts and env.ts.
 * The bootstrap logger uses minimal configuration and defaults to 'info' level.
 */
export function createBootstrapLogger() {
  return pino({
    level: 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
  });
}

const env = getEnv();
const isProduction = env.NODE_ENV === "production";

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
