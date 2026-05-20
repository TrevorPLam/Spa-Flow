// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to original env before each test
    process.env = { ...originalEnv };
    // Reset modules to clear cache
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = { ...originalEnv };
  });

  describe('authentication configuration', () => {
    it('should use default JWT_EXPIRY when not set', async () => {
      delete process.env.JWT_EXPIRY;
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.JWT_EXPIRY).toBe('15m');
    });

    it('should use custom JWT_EXPIRY when set', async () => {
      process.env.JWT_EXPIRY = '30m';
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.JWT_EXPIRY).toBe('30m');
    });

    it('should reject invalid JWT_EXPIRY format', async () => {
      process.env.JWT_EXPIRY = 'invalid';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });

    it('should accept valid JWT_EXPIRY formats', async () => {
      const validFormats = ['15m', '1h', '30s', '2d'];
      for (const format of validFormats) {
        process.env.JWT_EXPIRY = format;
        const { validateEnv } = await import('./env');
        const env = validateEnv();
        expect(env.JWT_EXPIRY).toBe(format);
        vi.resetModules(); // Reset between iterations
      }
    });

    it('should use default COOKIE_NAME when not set', async () => {
      delete process.env.COOKIE_NAME;
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.COOKIE_NAME).toBe('spaflow_session');
    });

    it('should use custom COOKIE_NAME when set', async () => {
      process.env.COOKIE_NAME = 'custom_session';
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.COOKIE_NAME).toBe('custom_session');
    });

    it('should reject empty COOKIE_NAME', async () => {
      process.env.COOKIE_NAME = '';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });

    it('should reject COOKIE_NAME longer than 100 characters', async () => {
      process.env.COOKIE_NAME = 'a'.repeat(101);
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });

    it('should use default REFRESH_TOKEN_EXPIRY_DAYS when not set', async () => {
      delete process.env.REFRESH_TOKEN_EXPIRY_DAYS;
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.REFRESH_TOKEN_EXPIRY_DAYS).toBe(7);
    });

    it('should use custom REFRESH_TOKEN_EXPIRY_DAYS when set', async () => {
      process.env.REFRESH_TOKEN_EXPIRY_DAYS = '14';
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.REFRESH_TOKEN_EXPIRY_DAYS).toBe(14);
    });

    it('should reject REFRESH_TOKEN_EXPIRY_DAYS less than 1', async () => {
      process.env.REFRESH_TOKEN_EXPIRY_DAYS = '0';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });

    it('should reject REFRESH_TOKEN_EXPIRY_DAYS greater than 30', async () => {
      process.env.REFRESH_TOKEN_EXPIRY_DAYS = '31';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });

    it('should reject non-numeric REFRESH_TOKEN_EXPIRY_DAYS', async () => {
      process.env.REFRESH_TOKEN_EXPIRY_DAYS = 'invalid';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });
  });

  describe('account lockout configuration', () => {
    it('should use default LOCKOUT_THRESHOLD when not set', async () => {
      delete process.env.LOCKOUT_THRESHOLD;
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.LOCKOUT_THRESHOLD).toBe(5);
    });

    it('should use custom LOCKOUT_THRESHOLD when set', async () => {
      process.env.LOCKOUT_THRESHOLD = '10';
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.LOCKOUT_THRESHOLD).toBe(10);
    });

    it('should reject LOCKOUT_THRESHOLD less than 1', async () => {
      process.env.LOCKOUT_THRESHOLD = '0';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });

    it('should reject LOCKOUT_THRESHOLD greater than 20', async () => {
      process.env.LOCKOUT_THRESHOLD = '21';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });

    it('should use default LOCKOUT_DURATION_MS when not set', async () => {
      delete process.env.LOCKOUT_DURATION_MS;
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.LOCKOUT_DURATION_MS).toBe(900000);
    });

    it('should use custom LOCKOUT_DURATION_MS when set', async () => {
      process.env.LOCKOUT_DURATION_MS = '1800000';
      const { validateEnv } = await import('./env');
      const env = validateEnv();
      expect(env.LOCKOUT_DURATION_MS).toBe(1800000);
    });

    it('should reject LOCKOUT_DURATION_MS less than 60000', async () => {
      process.env.LOCKOUT_DURATION_MS = '59999';
      const { validateEnv } = await import('./env');
      expect(() => validateEnv()).toThrow();
    });
  });

  describe('validation caching', () => {
    it('should cache validated environment', async () => {
      process.env.JWT_EXPIRY = '20m';
      const { validateEnv, getEnv } = await import('./env');
      const env1 = validateEnv();
      const env2 = getEnv();
      expect(env1).toBe(env2);
    });

    it('should not revalidate on subsequent getEnv calls', async () => {
      process.env.JWT_EXPIRY = '20m';
      const { validateEnv, getEnv } = await import('./env');
      validateEnv();
      process.env.JWT_EXPIRY = '30m';
      const env = getEnv();
      expect(env.JWT_EXPIRY).toBe('20m'); // Should still be cached value
    });
  });
});
