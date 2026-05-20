import pino from "pino";

/**
 * Creates a bootstrap logger for use before full environment initialization.
 * This file has no dependencies to avoid circular dependencies.
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
