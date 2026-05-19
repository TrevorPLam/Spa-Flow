import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";
import { getEnv } from "./env";
import type { AuthPayload } from "./auth";
import { logger } from "./logger";

let isInitialized = false;

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Must be called as early as possible in the application lifecycle
 */
export function initSentry(): void {
  if (isInitialized) {
    return;
  }

  const env = getEnv();

  // Only initialize if SENTRY_DSN is provided
  if (!env.SENTRY_DSN) {
    logger.info("Sentry DSN not provided, skipping Sentry initialization");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    release: env.SENTRY_RELEASE,
    
    // Performance monitoring - sample 10% of transactions in production, 100% in development
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Filter out sensitive data from request headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["x-csrf-token"];
      }

      // Filter out sensitive data from cookies
      if (event.request?.cookies) {
        delete event.request.cookies["spaflow_session"];
        delete event.request.cookies["_csrf"];
      }

      // Add custom context for better error grouping
      if (event.exception) {
        event.tags = {
          ...event.tags,
          errorType: hint.originalException?.constructor?.name || "Unknown",
        };
      }

      return event;
    },
  });

  isInitialized = true;
  logger.info("Sentry initialized successfully");
}

/**
 * Middleware to capture user context from JWT token
 * Must be used after authentication middleware
 */
export function captureUserContext(req: Request, res: Response, next: NextFunction): void {
  if (!isInitialized) {
    return next();
  }

  // Extract user from request if authenticated
  const user = (req as { user?: AuthPayload }).user;
  
  if (user) {
    Sentry.setUser({
      id: user.sub,
      email: user.email,
      username: user.name,
    });
    Sentry.setTag("userRole", user.role);
  } else {
    // Clear user context if not authenticated
    Sentry.setUser(null);
  }

  next();
}

/**
 * Middleware to capture request context and custom tags
 */
export function captureRequestContext(req: Request, res: Response, next: NextFunction): void {
  if (!isInitialized) {
    return next();
  }

  // Add request ID for tracing
  Sentry.setTag("requestId", (req as { id?: string }).id || "unknown");
  
  // Add route information
  Sentry.setTag("route", req.route?.path || req.path);
  Sentry.setTag("method", req.method);
  
  // Add custom context
  Sentry.setContext("request", {
    method: req.method,
    url: req.url?.split("?")[0],
    query: Object.keys(req.query).length > 0 ? "<filtered>" : undefined,
  });

  next();
}

/**
 * Capture a custom error with additional context
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!isInitialized) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a custom message for logging
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  if (!isInitialized) {
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return isInitialized;
}
