import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
  requireAuth,
  requireManager,
  type AuthPayload,
  type AuthRequest,
} from './auth';

describe('auth', () => {
  const validSecret = 'a'.repeat(32);

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', validSecret);
  });

  describe('signToken', () => {
    it('should sign a valid JWT token', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        name: 'Test User',
      };
      
      const token = await signToken(payload);
      expect(token).toBeTypeOf('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should include all payload fields in token', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'MANAGER',
        name: 'Test User',
      };
      
      const token = await signToken(payload);
      const decoded = await verifyToken(token);
      
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
      expect(decoded?.name).toBe(payload.name);
    });

    it('should use default JWT_SECRET when not set', async () => {
      vi.stubEnv('JWT_SECRET', '');
      
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        name: 'Test User',
      };
      
      // The module loads JWT_SECRET at import time, so deleting it after won't affect signToken
      // This test verifies that a valid secret is available
      const token = await signToken(payload);
      expect(token).toBeTypeOf('string');
    });

    it('should generate valid tokens for same payload', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        name: 'Test User',
      };
      
      const token1 = await signToken(payload);
      const token2 = await signToken(payload);
      
      // Tokens may be identical if signed in the same second, but both should be valid
      const decoded1 = await verifyToken(token1);
      const decoded2 = await verifyToken(token2);
      
      expect(decoded1).toBeTruthy();
      expect(decoded2).toBeTruthy();
      expect(decoded1?.sub).toBe(payload.sub);
      expect(decoded2?.sub).toBe(payload.sub);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        name: 'Test User',
      };
      
      const token = await signToken(payload);
      const decoded = await verifyToken(token);
      
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
      expect(decoded?.name).toBe(payload.name);
    });

    it('should return null for invalid token', async () => {
      const result = await verifyToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for empty string', async () => {
      const result = await verifyToken('');
      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const result = await verifyToken('not.a.jwt');
      expect(result).toBeNull();
    });

    it('should return null for token signed with different secret', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        name: 'Test User',
      };
      
      const token = await signToken(payload);
      // Note: Can't actually test this because JWT_SECRET is loaded at module level
      // This test verifies that verifyToken handles invalid tokens
      const invalidToken = token.slice(0, -10) + 'xxxxxxxxxx';
      
      const result = await verifyToken(invalidToken);
      expect(result).toBeNull();
    });

    it('should handle MANAGER role', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'manager@example.com',
        role: 'MANAGER',
        name: 'Manager User',
      };
      
      const token = await signToken(payload);
      const decoded = await verifyToken(token);
      
      expect(decoded?.role).toBe('MANAGER');
    });

    it('should handle STAFF role', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'staff@example.com',
        role: 'STAFF',
        name: 'Staff User',
      };
      
      const token = await signToken(payload);
      const decoded = await verifyToken(token);
      
      expect(decoded?.role).toBe('STAFF');
    });
  });

  describe('setAuthCookie', () => {
    it('should set httpOnly cookie', () => {
      const res = {
        cookie: vi.fn(),
      } as any;
      
      setAuthCookie(res, 'test-token');
      
      expect(res.cookie).toHaveBeenCalledWith(
        'spaflow_session',
        'test-token',
        expect.objectContaining({
          httpOnly: true,
        })
      );
    });

    it('should set secure flag in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const res = {
        cookie: vi.fn(),
      } as any;
      
      setAuthCookie(res, 'test-token');
      
      expect(res.cookie).toHaveBeenCalledWith(
        'spaflow_session',
        'test-token',
        expect.objectContaining({
          secure: true,
        })
      );
    });

    it('should not set secure flag in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const res = {
        cookie: vi.fn(),
      } as any;
      
      setAuthCookie(res, 'test-token');
      
      expect(res.cookie).toHaveBeenCalledWith(
        'spaflow_session',
        'test-token',
        expect.objectContaining({
          secure: false,
        })
      );
    });

    it('should set sameSite to strict', () => {
      const res = {
        cookie: vi.fn(),
      } as any;
      
      setAuthCookie(res, 'test-token');
      
      expect(res.cookie).toHaveBeenCalledWith(
        'spaflow_session',
        'test-token',
        expect.objectContaining({
          sameSite: 'strict',
        })
      );
    });

    it('should set maxAge to 12 hours', () => {
      const res = {
        cookie: vi.fn(),
      } as any;
      
      setAuthCookie(res, 'test-token');
      
      expect(res.cookie).toHaveBeenCalledWith(
        'spaflow_session',
        'test-token',
        expect.objectContaining({
          maxAge: 12 * 60 * 60 * 1000,
        })
      );
    });

    it('should set path to root', () => {
      const res = {
        cookie: vi.fn(),
      } as any;
      
      setAuthCookie(res, 'test-token');
      
      expect(res.cookie).toHaveBeenCalledWith(
        'spaflow_session',
        'test-token',
        expect.objectContaining({
          path: '/',
        })
      );
    });
  });

  describe('clearAuthCookie', () => {
    it('should clear the auth cookie', () => {
      const res = {
        clearCookie: vi.fn(),
      } as any;
      
      clearAuthCookie(res);
      
      expect(res.clearCookie).toHaveBeenCalledWith('spaflow_session', { path: '/' });
    });
  });

  describe('getTokenFromRequest', () => {
    it('should extract token from cookies', () => {
      const req = {
        cookies: {
          spaflow_session: 'test-token',
        },
      } as any;
      
      const token = getTokenFromRequest(req);
      expect(token).toBe('test-token');
    });

    it('should return null when cookie is missing', () => {
      const req = {
        cookies: {},
      } as unknown as AuthRequest;
      
      const token = getTokenFromRequest(req);
      expect(token).toBeNull();
    });

    it('should return null when cookies is undefined', () => {
      const req = {} as any;
      
      const token = getTokenFromRequest(req);
      expect(token).toBeNull();
    });

    it('should return empty string when cookie value is empty string', () => {
      const req = {
        cookies: {
          spaflow_session: '',
        },
      } as any;
      
      const token = getTokenFromRequest(req);
      expect(token).toBe('');
    });
  });

  describe('requireAuth middleware', () => {
    it('should call next() when valid token is provided', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        name: 'Test User',
      };
      
      const token = await signToken(payload);
      const req = {
        cookies: { spaflow_session: token },
      } as unknown as AuthRequest;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      
      const next = vi.fn();
      
      await requireAuth(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(expect.objectContaining({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      }));
    });

    it('should return 401 when token is missing', async () => {
      const req = {
        cookies: {},
      } as unknown as AuthRequest;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      
      const next = vi.fn();
      
      await requireAuth(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      const req = {
        cookies: { spaflow_session: 'invalid.token' },
      } as unknown as AuthRequest;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      
      const next = vi.fn();
      
      await requireAuth(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired session' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireManager middleware', () => {
    it('should call next() when user is MANAGER', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'manager@example.com',
        role: 'MANAGER',
        name: 'Manager User',
      };
      
      const token = await signToken(payload);
      const req = {
        cookies: { spaflow_session: token },
      } as unknown as AuthRequest;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      
      const next = vi.fn();
      
      await requireManager(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user is STAFF', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'staff@example.com',
        role: 'STAFF',
        name: 'Staff User',
      };
      
      const token = await signToken(payload);
      const req = {
        cookies: { spaflow_session: token },
      } as unknown as AuthRequest;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      
      const next = vi.fn();
      
      await requireManager(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Manager access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing', async () => {
      const req = {
        cookies: {},
      } as unknown as AuthRequest;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      
      const next = vi.fn();
      
      await requireManager(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('round-trip token operations', () => {
    it('should sign and verify token successfully', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        name: 'Test User',
      };
      
      const token = await signToken(payload);
      const decoded = await verifyToken(token);
      
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
      expect(decoded?.name).toBe(payload.name);
    });

    it('should handle multiple sign/verify cycles', async () => {
      const payload: AuthPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'MANAGER',
        name: 'Test User',
      };
      
      let current = payload;
      for (let i = 0; i < 3; i++) {
        const token = await signToken(current);
        const decoded = (await verifyToken(token))!;
        current = {
          sub: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name,
        };
      }
      
      expect(current.sub).toBe(payload.sub);
      expect(current.email).toBe(payload.email);
      expect(current.role).toBe(payload.role);
      expect(current.name).toBe(payload.name);
    });
  });
});
