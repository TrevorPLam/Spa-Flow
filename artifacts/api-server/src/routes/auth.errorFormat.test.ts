import { describe, it, expect } from 'vitest';
import { AuthErrorCodes, AuthErrorMessages } from '../lib/authErrors';

describe('Auth Error Response Format Tests', () => {
  describe('error code consistency', () => {
    it('should use consistent error code format', () => {
      Object.values(AuthErrorCodes).forEach((code) => {
        expect(code).toMatch(/^AUTH_\d{3}$/);
      });
    });

    it('should have unique error codes', () => {
      const codes = Object.values(AuthErrorCodes);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have sequential error codes', () => {
      const codes = Object.values(AuthErrorCodes);
      const numericCodes = codes.map((code) => parseInt(code.replace('AUTH_', '')));
      const sortedCodes = [...numericCodes].sort((a, b) => a - b);
      expect(numericCodes).toEqual(sortedCodes);
    });

    it('should verify all error codes are defined', () => {
      expect(AuthErrorCodes.UNAUTHORIZED).toBe('AUTH_001');
      expect(AuthErrorCodes.INVALID_CREDENTIALS).toBe('AUTH_002');
      expect(AuthErrorCodes.INVALID_SESSION).toBe('AUTH_003');
      expect(AuthErrorCodes.INVALID_REFRESH_TOKEN).toBe('AUTH_004');
      expect(AuthErrorCodes.REFRESH_TOKEN_ROTATION_FAILED).toBe('AUTH_005');
      expect(AuthErrorCodes.MANAGER_ACCESS_REQUIRED).toBe('AUTH_006');
      expect(AuthErrorCodes.ACCOUNT_LOCKED).toBe('AUTH_007');
      expect(AuthErrorCodes.USER_NOT_FOUND).toBe('AUTH_008');
      expect(AuthErrorCodes.INVALID_REQUEST).toBe('AUTH_009');
      expect(AuthErrorCodes.INTERNAL_SERVER_ERROR).toBe('AUTH_010');
    });
  });

  describe('error message consistency', () => {
    it('should have messages for all error codes', () => {
      Object.values(AuthErrorCodes).forEach((code) => {
        expect(AuthErrorMessages[code]).toBeDefined();
        expect(typeof AuthErrorMessages[code]).toBe('string');
        expect(AuthErrorMessages[code].length).toBeGreaterThan(0);
      });
    });

    it('should not reveal sensitive information in error messages', () => {
      Object.values(AuthErrorMessages).forEach((message) => {
        expect(message.toLowerCase()).not.toContain('password');
        expect(message.toLowerCase()).not.toContain('database');
        expect(message.toLowerCase()).not.toContain('sql');
        expect(message.toLowerCase()).not.toContain('stack');
      });
    });

    it('should have user-friendly but generic messages', () => {
      expect(AuthErrorMessages[AuthErrorCodes.UNAUTHORIZED]).toBe('Unauthorized');
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_CREDENTIALS]).toBe('Invalid credentials');
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_SESSION]).toBe('Invalid or expired session');
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_REFRESH_TOKEN]).toBe('Invalid or expired refresh token');
      expect(AuthErrorMessages[AuthErrorCodes.REFRESH_TOKEN_ROTATION_FAILED]).toBe('Failed to rotate refresh token');
      expect(AuthErrorMessages[AuthErrorCodes.MANAGER_ACCESS_REQUIRED]).toBe('Manager access required');
      expect(AuthErrorMessages[AuthErrorCodes.ACCOUNT_LOCKED]).toBe('Account temporarily locked due to too many failed login attempts');
      expect(AuthErrorMessages[AuthErrorCodes.USER_NOT_FOUND]).toBe('User not found');
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_REQUEST]).toBe('Invalid request');
      expect(AuthErrorMessages[AuthErrorCodes.INTERNAL_SERVER_ERROR]).toBe('Internal server error');
    });
  });
});
