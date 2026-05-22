import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

// Load environment-specific .env file based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(projectRoot, envFile) });

import app from "./app";
import { logger } from "./lib/logger";
import { validateEnv } from "./lib/env";
import { pool } from "@workspace/db";
import { closeCache } from "./lib/cache";
import { initSentry } from "./lib/sentry";
import { initializeWebSocketServer, closeAllConnections } from "./lib/websocket";
import type { Server } from "http";

// Validate environment variables at startup
validateEnv();

// Initialize Sentry as early as possible
initSentry();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Shutdown state to prevent duplicate shutdowns
let isShuttingDown = false;

// Graceful shutdown handler (exported for testing)
export async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn({ signal }, "Shutdown already in progress, ignoring signal");
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Starting graceful shutdown");

  // Force exit after timeout if shutdown takes too long
  const SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds
  const timeoutId = setTimeout(() => {
    logger.error(
      { timeout: SHUTDOWN_TIMEOUT_MS },
      "Shutdown timeout exceeded, forcing exit"
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // Close WebSocket connections
    closeAllConnections();

    // Close HTTP server to stop accepting new connections
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            logger.info("HTTP server closed, in-flight requests completed");
            resolve();
          }
        });
      });
    }

    // Close database connection pool
    try {
      await pool.end();
      logger.info("Database connection pool closed");
    } catch (err) {
      logger.error({ err }, "Error closing database pool");
    }

    // Close Redis cache connection
    try {
      await closeCache();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.error({ err }, "Error closing Redis connection");
    }

    // Clear timeout and exit successfully
    clearTimeout(timeoutId);
    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  }
}

// Start server
const server: Server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Initialize WebSocket server after HTTP server is listening
  initializeWebSocketServer(server);
});

// Handle SIGTERM (sent by process managers like Kubernetes, Docker, PM2)
process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM").catch((err) => {
    logger.error({ err }, "Unhandled error during SIGTERM shutdown");
    process.exit(1);
  });
});

// Handle SIGINT (sent by Ctrl+C)
process.on("SIGINT", () => {
  gracefulShutdown("SIGINT").catch((err) => {
    logger.error({ err }, "Unhandled error during SIGINT shutdown");
    process.exit(1);
  });
});

// Handle uncaught exceptions during shutdown
process.on("uncaughtException", (err) => {
  if (isShuttingDown) {
    logger.error({ err }, "Uncaught exception during shutdown, continuing cleanup");
    return;
  }
  logger.error({ err }, "Uncaught exception during normal operation");
  process.exit(1);
});

// Handle unhandled rejections during shutdown
process.on("unhandledRejection", (reason) => {
  if (isShuttingDown) {
    logger.error({ reason }, "Unhandled rejection during shutdown, continuing cleanup");
    return;
  }
  logger.error({ reason }, "Unhandled rejection during normal operation");
  process.exit(1);
});
