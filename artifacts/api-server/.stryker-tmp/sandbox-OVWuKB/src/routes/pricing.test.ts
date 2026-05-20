// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import * as schema from '@workspace/db/schema';

describe('Pricing API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/pricing/calculate', () => {
    it('should calculate price for authenticated staff with member client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'one_time',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('appliedRules');
    });

    it('should calculate price for non-member client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
      // Non-member should have higher price
      expect(response.body.subtotal).toBeGreaterThan(0);
    });

    it('should calculate price for room resource type', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'room' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
    });

    it('should treat client as member when membershipType is provided in request', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
        membershipType: 'one_time' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      // Should apply member pricing
      expect(response.body.appliedRules).toBeDefined();
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const pricingData = {
        clientId: 99999,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').send(pricingData);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request data', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const invalidData = {
        clientId: 'invalid',
        resourceType: 'INVALID_TYPE' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing required fields', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const invalidData = {
        clientId: 123,
        // missing resourceType
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle client without DOB gracefully', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
        dobEncrypted: null,
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      // Should default to age 25 when DOB is missing
    });

    it('should calculate price with six_month membership type', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
        membershipType: 'six_month' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
    });
  });
});
