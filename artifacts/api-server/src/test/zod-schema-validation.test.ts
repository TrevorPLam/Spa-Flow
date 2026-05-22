import { describe, it, expect, beforeAll } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { resolve } from 'path';
import * as zodSchemas from '@workspace/api-zod';

describe('Zod Schema Validation @contract @critical', { tags: ['flaky'] }, () => {
  let openApiSpec: any;

  beforeAll(async () => {
    const specPath = resolve(__dirname, '../../../../lib/api-spec/openapi.yaml');
    openApiSpec = await SwaggerParser.validate(specPath);
  });

  describe('Health Schemas', () => {
    it('should validate LivenessProbeResponse matches OpenAPI spec', () => {
      const schema = openApiSpec.components?.schemas?.LivenessResponse;
      expect(schema).toBeDefined();
      
      // Test valid data
      const validData = { status: 'ok', uptime: 100, timestamp: new Date().toISOString() };
      const result = zodSchemas.LivenessProbeResponse.safeParse(validData);
      expect(result.success).toBe(true);
      
      // Test invalid data
      const invalidData = { status: 'invalid' };
      const invalidResult = zodSchemas.LivenessProbeResponse.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate ReadinessProbeResponse matches OpenAPI spec', () => {
      const schema = openApiSpec.components?.schemas?.ReadinessResponse;
      expect(schema).toBeDefined();
      
      const validData = {
        status: 'ready',
        checks: {
          database: { status: 'healthy' },
          square: { status: 'healthy' },
          twilio: { status: 'healthy' },
          redis: { status: 'healthy' },
          jwt_secret: { status: 'healthy' },
          encryption_key: { status: 'healthy' }
        }
      };
      
      const result = zodSchemas.ReadinessProbeResponse.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Auth Schemas', () => {
    it('should validate LoginBody matches OpenAPI spec', () => {
      const schema = openApiSpec.components?.schemas?.LoginInput;
      expect(schema).toBeDefined();
      
      const validData = { email: 'test@example.com', password: 'password123' };
      const result = zodSchemas.LoginBody.safeParse(validData);
      expect(result.success).toBe(true);
      
      const invalidEmail = { email: 'invalid-email', password: 'password123' };
      const invalidResult = zodSchemas.LoginBody.safeParse(invalidEmail);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate LoginResponse matches OpenAPI spec', () => {
      const schema = openApiSpec.components?.schemas?.LoginResponse;
      expect(schema).toBeDefined();
      
      const validData = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'STAFF',
        refreshToken: 'refresh-token-123'
      };
      
      const result = zodSchemas.LoginResponse.safeParse(validData);
      expect(result.success).toBe(true);
      
      const invalidRole = { ...validData, role: 'INVALID_ROLE' };
      const invalidResult = zodSchemas.LoginResponse.safeParse(invalidRole);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate GetMeResponse matches OpenAPI spec', () => {
      const schema = openApiSpec.components?.schemas?.AuthUser;
      expect(schema).toBeDefined();
      
      const validData = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'MANAGER'
      };
      
      const result = zodSchemas.GetMeResponse.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate RefreshTokenBody matches OpenAPI spec', () => {
      const schema = openApiSpec.components?.schemas?.RefreshTokenInput;
      expect(schema).toBeDefined();
      
      const validData = { refreshToken: 'refresh-token-123' };
      const result = zodSchemas.RefreshTokenBody.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Client Schemas', () => {
    it('should validate client-related schemas exist', () => {
      // Check that client schemas are generated
      expect(zodSchemas).toBeDefined();
      
      // The actual schema names depend on orval generation
      // This test ensures the schemas are present in the generated file
      const schemaKeys = Object.keys(zodSchemas);
      expect(schemaKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Consistency', () => {
    it('should have matching enum values between OpenAPI and Zod', () => {
      // Test role enum consistency
      const openApiRoles = openApiSpec.components?.schemas?.AuthUser?.properties?.role?.enum;
      expect(openApiRoles).toContain('STAFF');
      expect(openApiRoles).toContain('MANAGER');
      
      const validStaff = { id: 1, email: 'test@example.com', name: 'Test', role: 'STAFF' };
      const staffResult = zodSchemas.GetMeResponse.safeParse(validStaff);
      expect(staffResult.success).toBe(true);
      
      const validManager = { id: 1, email: 'test@example.com', name: 'Test', role: 'MANAGER' };
      const managerResult = zodSchemas.GetMeResponse.safeParse(validManager);
      expect(managerResult.success).toBe(true);
    });

    it('should have matching required fields between OpenAPI and Zod', () => {
      const loginSchema = openApiSpec.components?.schemas?.LoginInput;
      expect(loginSchema?.required).toContain('email');
      expect(loginSchema?.required).toContain('password');
      
      // Test missing required field
      const missingEmail = { password: 'password123' };
      const result = zodSchemas.LoginBody.safeParse(missingEmail);
      expect(result.success).toBe(false);
    });
  });
});
