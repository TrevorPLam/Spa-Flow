import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import csrf from "csrf";
import { randomUUID } from "node:crypto";
import router from "./routes";
import { logger } from "./lib/logger";
import { logCacheStats } from "./lib/cache";
import { getEnv } from "./lib/env";
import "./jobs/cron";

const app: Express = express();

// Request ID generation middleware - should be first in the middleware chain
const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// CSRF token generation and validation
const csrfTokens = new csrf();
const CSRF_SECRET = process.env.CSRF_SECRET || csrfTokens.secretSync();
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
  const token = csrfTokens.create(CSRF_SECRET);
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });
  res.locals.csrfToken = token;
  next();
};

// Request ID middleware - must be first in the chain
app.use(requestIdMiddleware);

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
    maxAge: 31536000,
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
          id: req.id,
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
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CSRF protection middleware
app.use(csrfTokenMiddleware);
app.use(csrfProtectionMiddleware);

app.use("/api", router);

export default app;
