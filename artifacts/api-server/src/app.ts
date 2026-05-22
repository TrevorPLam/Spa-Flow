import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import csrf from "csrf";
import timeout from "connect-timeout";
import * as Sentry from "@sentry/node";
import swaggerUi from "swagger-ui-express";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import router from "./routes";
import { logger } from "./lib/logger";
import { getEnv } from "./lib/env";
import { isSentryInitialized, captureUserContext, captureRequestContext } from "./lib/sentry";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { requestIdMiddleware } from "./middleware/requestId";
import { CSRF_COOKIE_MAX_AGE_MS, HSTS_MAX_AGE_MS } from "./lib/constants";
import "./jobs/cron";

const app: Express = express();

// haltOnTimedOut middleware - stops request flow if timeout has occurred
// This must be called after middleware that could take time to process
const haltOnTimedOut = (req: Request, res: Response, next: NextFunction) => {
  if (!req.timedout) next();
};

// CSRF token generation and validation
const csrfTokens = new csrf();
const CSRF_COOKIE_NAME = '_csrf';

// CSRF protection middleware
const csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // For state-changing requests, validate CSRF token
  const token = req.headers['x-csrf-token'] as string || req.body._csrf;
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  if (!token || !cookieToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Verify the token matches the cookie token (double-submit pattern)
  if (token !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// CSRF token generation middleware
const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const env = getEnv();
  const token = csrfTokens.create(env.CSRF_SECRET);
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_COOKIE_MAX_AGE_MS
  });
  res.locals.csrfToken = token;
  next();
};

// Request ID middleware - must be first in the chain
app.use(requestIdMiddleware);

// Correlation ID middleware - for traceability across requests
app.use(correlationIdMiddleware);

// Request timeout middleware - must be early in the chain
app.use(timeout(getEnv().REQUEST_TIMEOUT));

// Content-Type validation middleware - validates requests with bodies have proper Content-Type
const contentTypeValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation for GET, HEAD, OPTIONS requests (no body expected)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip validation if Content-Type header is not present (body parsers will handle this)
  if (!req.headers['content-type']) {
    return next();
  }

  // Validate Content-Type for requests that expect a body
  const validTypes = ['application/json', 'application/x-www-form-urlencoded'];
  const contentType = req.headers['content-type'];

  // Use Express's req.is() to check if Content-Type matches allowed types
  // req.is() handles charset and other parameters correctly
  if (!req.is(validTypes)) {
    logger.warn({ contentType, method: req.method, url: req.url }, 'Invalid Content-Type');
    return res.status(415).json({ error: 'Unsupported Media Type. Use application/json or application/x-www-form-urlencoded' });
  }

  next();
};

app.use(contentTypeValidationMiddleware);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: HSTS_MAX_AGE_MS,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: "deny",
  },
  xContentTypeOptions: true,
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          requestId: (req as any).requestId,
          correlationId: (req as any).correlationId,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// CORS origin whitelist configuration
const env = getEnv();
const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Block requests with no origin in production (security: prevents null origin bypass attacks)
      // Allow in development for testing tools (curl, Postman, etc.)
      if (!origin) {
        if (env.NODE_ENV === 'production') {
          logger.warn('CORS: Blocked request with no origin in production');
          return callback(new Error('Origin header required in production'));
        }
        // Development: allow no-origin for testing convenience
        logger.debug('CORS: Allowed no-origin request in development');
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS: Origin not allowed');
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Halt on timeout after body parsers to prevent further processing if timeout occurred
app.use(haltOnTimedOut);

// Timeout error handler - returns 504 Gateway Timeout when request exceeds time limit
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.timedout) {
    logger.warn({ requestId: (req as any).requestId, url: req.url }, 'Request timed out');
    res.status(504).json({ error: 'Request timeout' });
    return;
  }
  next();
});

// CSRF protection middleware (exempt health endpoints for monitoring systems)
const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for health check endpoints, login, and session management (JWT-authenticated)
  if (req.path.startsWith('/healthz/') ||
      req.path.startsWith('/api/v1/healthz/') ||
      req.path === '/api/auth/login' ||
      req.path === '/api/v1/auth/login' ||
      req.path.startsWith('/api/auth/sessions') ||
      req.path.startsWith('/api/v1/auth/sessions')) {
    return next();
  }
  csrfTokenMiddleware(req, res, next);
};

const csrfProtectionMiddlewareExempt = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for health check endpoints, login, and session management (JWT-authenticated)
  if (req.path.startsWith('/healthz/') ||
      req.path.startsWith('/api/v1/healthz/') ||
      req.path === '/api/auth/login' ||
      req.path === '/api/v1/auth/login' ||
      req.path.startsWith('/api/auth/sessions') ||
      req.path.startsWith('/api/v1/auth/sessions')) {
    return next();
  }
  csrfProtectionMiddleware(req, res, next);
};

app.use(csrfMiddleware);
app.use(csrfProtectionMiddlewareExempt);

// Capture request context for Sentry
if (isSentryInitialized()) {
  app.use(captureRequestContext);
}

// Capture user context for Sentry (must be after CSRF, before routes)
if (isSentryInitialized()) {
  app.use(captureUserContext);
}

// API versioning - mount all routes under /api/v1
app.use("/api/v1", router);

// Serve OpenAPI/Swagger documentation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.resolve(__dirname, "..", "..", "..", "lib", "api-spec", "openapi.yaml");

try {
  const openApiSpec = yaml.load(fs.readFileSync(openApiPath, "utf-8")) as object;
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: "SpaFlow API Documentation",
    customCss: '.swagger-ui .topbar { display: none }',
  }));
  logger.info("OpenAPI documentation available at /api-docs");
} catch (error) {
  logger.warn({ error }, "Failed to load OpenAPI specification, documentation endpoint disabled");
}

// Global error handler - captures and logs errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  
  // Send error to Sentry if initialized
  if (isSentryInitialized()) {
    Sentry.captureException(err);
  }
  
  res.status(500).json({ error: "Internal server error" });
});

export default app;
