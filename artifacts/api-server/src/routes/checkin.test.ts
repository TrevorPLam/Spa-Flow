import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, createTestLockerInDb, createTestRoomInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import * as schema from '@workspace/db/schema';

// Mock Square and Twilio
vi.mock('../lib/square', () => ({
  processPayment: vi.fn().mockResolvedValue({ id: 'payment-test-123', status: 'COMPLETED' }),
}));

vi.mock('../lib/twilio', () => ({
  sendSms: vi.fn().mockResolvedValue({ sid: 'sms-test-123' }),
}));

describe('Check-in API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/checkin', () => {
    it('should process check-in with locker assignment for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('transactionId');
    });

    it('should process check-in with room assignment for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const room = await createTestRoomInDb({ name: 'R101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'ROOM' as const,
        resourceId: room.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('transactionId');
    });

    it('should return 400 when resource is already occupied', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ 
        name: 'L101', 
        status: 'occupied',
        clientId: client.id,
      });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: 99999,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent resource', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: 99999,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').send(checkinData);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid check-in data', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const invalidData = {
        clientId: 'invalid',
        resourceType: 'INVALID' as const,
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/checkin with products', () => {
    it('should process check-in with product purchases', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      // Create test products
      await db.insert(schema.productsTable).values([
        { name: 'Water Bottle', price: '5.00', stock: 10 },
        { name: 'Towel', price: '10.00', stock: 5 },
      ]);

      const products = await db.select().from(schema.productsTable);

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
        productIds: [products[0].id, products[1].id],
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('transactionId');
    });
  });
});
