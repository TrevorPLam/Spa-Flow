// @ts-nocheck
import pino from "pino";
import { getEnv } from "./env";

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
