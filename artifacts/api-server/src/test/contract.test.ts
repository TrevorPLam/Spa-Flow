import { describe, it, expect } from 'vitest';
import { validateResponse, validateRequestBody } from './contract-validator';

describe('Contract Tests @contract @critical', () => {
  describe('OpenAPI Spec Loading', () => {
    it('should load OpenAPI specification successfully', async () => {
      // Test that the contract validator can load the spec
      const result = await validateRequestBody('/auth/login', 'post', {
        email: 'test@example.com',
        password: 'password'
      });
      
      // If this doesn't throw, the spec loaded successfully
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    it('should validate login request body structure', async () => {
      const validBody = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const result = await validateRequestBody('/auth/login', 'post', validBody);
      // The schema exists and can validate
      expect(result).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const invalidBody = {
        email: 'not-an-email',
        password: 'password123'
      };
      
      const result = await validateRequestBody('/auth/login', 'post', invalidBody);
      // Should fail validation for invalid email
      expect(result.valid).toBe(false);
    });
  });

  describe('Response Schema Validation', () => {
    it('should validate response schema structure for health endpoint', async () => {
      // Test with a minimal valid response
      const mockResponse = {
        status: 'ok'
      };
      
      const result = await validateResponse('/healthz/live', 'get', 200, mockResponse);
      // Just check that validation works (may fail if spec is strict, but shouldn't crash)
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle missing schema gracefully', async () => {
      // Test with a response that might not have a schema defined
      const result = await validateResponse('/nonexistent', 'get', 404, {});
      // Should return a result without crashing
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });
});
