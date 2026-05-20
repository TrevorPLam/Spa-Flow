import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { logger } from "../lib/logger";
import type { AuthRequest } from "../lib/auth";

/**
 * Auth rate limiter: 5 attempts per 15 minutes per IP
 * Applied to login endpoint to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: "Too many login attempts",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful logins
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
  handler: (req, res) => {
    logger.warn({
      msg: "Rate limit exceeded for auth endpoint",
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: "Too many login attempts",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * API rate limiter: 100 requests per minute per user
 * Applied to authenticated API endpoints
 * Uses user ID from JWT token for user-based limiting
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: "API rate limit exceeded",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Extract user ID from JWT token for user-based limiting
    const user = (req as AuthRequest).user;
    return user?.sub || req.ip || 'unknown'; // Fallback to IP if no user, then 'unknown'
  },
  handler: (req, res) => {
    logger.warn({
      msg: "Rate limit exceeded for API endpoint",
      ip: req.ip,
      path: req.path,
      userId: (req as AuthRequest).user?.sub,
    });
    res.status(429).json({
      error: "API rate limit exceeded",
      retryAfter: "1 minute",
    });
  },
});

/**
 * Check-in rate limiter: 10 requests per minute per user
 * Applied to check-in endpoint to prevent resource abuse
 * Uses user ID from JWT token for user-based limiting
 */
export const checkinLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: "Check-in rate limit exceeded",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Extract user ID from JWT token for user-based limiting
    const user = (req as AuthRequest).user;
    return user?.sub || req.ip || 'unknown'; // Fallback to IP if no user, then 'unknown'
  },
  handler: (req, res) => {
    logger.warn({
      msg: "Rate limit exceeded for check-in endpoint",
      ip: req.ip,
      path: req.path,
      userId: (req as AuthRequest).user?.sub,
    });
    res.status(429).json({
      error: "Check-in rate limit exceeded",
      retryAfter: "1 minute",
    });
  },
});

/**
 * Health check rate limiter: 100 requests per minute per IP
 * Applied to health check endpoints to prevent DoS attacks while allowing monitoring systems
 * Uses IP-based limiting with higher limits to accommodate frequent health checks
 */
export const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute (higher than regular endpoints for monitoring)
  message: {
    error: "Health check rate limit exceeded",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP address for health check limiting
    return req.ip || 'unknown';
  },
  handler: (req, res) => {
    logger.warn({
      msg: "Rate limit exceeded for health check endpoint",
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: "Health check rate limit exceeded",
      retryAfter: "1 minute",
    });
  },
});
