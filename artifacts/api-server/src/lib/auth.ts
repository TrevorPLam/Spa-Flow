import { SignJWT, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getEnv } from "./env";

const JWT_SECRET_KEY = new TextEncoder().encode(getEnv().JWT_SECRET);
const JWT_EXPIRY = "12h";
const COOKIE_NAME = "spaflow_session";

export interface AuthPayload {
  sub: string; // userId as string
  email: string;
  role: "STAFF" | "MANAGER";
  name: string;
}

/**
 * Express Request interface augmented with authenticated user information.
 * The user property is set by the requireAuth middleware.
 */
export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET_KEY);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 12 * 60 * 60 * 1000, // 12h
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getTokenFromRequest(req: Request): string | null {
  return req.cookies?.[COOKIE_NAME] ?? null;
}

// Middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = await verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  // Attach user to request
  (req as AuthRequest).user = payload;
  next();
}

export async function requireManager(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as AuthRequest).user;
    if (user?.role !== "MANAGER") {
      res.status(403).json({ error: "Manager access required" });
      return;
    }
    next();
  });
}

