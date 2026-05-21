import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, createTestLockerInDb, createTestRoomInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import { productsTable } from '@workspace/db/schema';
import { validateResponse, validateRequestBody } from '../test/contract-validator';
import { encryptField } from '../lib/encryption';

// Mock Square and Twilio
vi.mock('../lib/square', () => ({
  processPayment: vi.fn().mockResolvedValue({ id: 'payment-test-123', status: 'COMPLETED' }),
}));

vi.mock('../lib/twilio', () => ({
  sendSms: vi.fn().mockResolvedValue({ sid: 'sms-test-123' }),
}));

describe('Check-in API', { tags: ['@regression'] }, () => {
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

    it('should auto-bundle one-time membership for 18-24 non-members renting lockers (1824 special)', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      // Create a 20-year-old non-member client
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 20);
      const encryptedDob = encryptField(dob.toISOString());
      const client = await createTestClientInDb({
        name: 'Jane Doe',
        email: 'jane@example.com',
        membershipStatus: 'none',
        dobEncrypted: encryptedDob.ciphertext,
        dobDek: encryptedDob.dek,
      });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        paymentToken: 'test-token-123',
        // No membershipType provided - should auto-bundle
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('transaction');
      expect(response.body).toHaveProperty('membership');
      expect(response.body.membershipBundled).toBe(true);
      expect(response.body.membership).toHaveProperty('type', 'one_time');
    });

    it('should not auto-bundle membership for 25+ year old non-members', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      // Create a 30-year-old non-member client
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 30);
      const encryptedDob = encryptField(dob.toISOString());
      const client = await createTestClientInDb({
        name: 'John Smith',
        email: 'john@example.com',
        membershipStatus: 'none',
        dobEncrypted: encryptedDob.ciphertext,
        dobDek: encryptedDob.dek,
      });
      const locker = await createTestLockerInDb({ name: 'L102', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session');
      expect(response.body.membershipBundled).toBe(false);
      expect(response.body.membership).toBeNull();
    });

    it('should not auto-bundle membership for room rentals (1824 special only applies to lockers)', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      // Create a 20-year-old non-member client
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 20);
      const encryptedDob = encryptField(dob.toISOString());
      const client = await createTestClientInDb({
        name: 'Jane Doe',
        email: 'jane@example.com',
        membershipStatus: 'none',
        dobEncrypted: encryptedDob.ciphertext,
        dobDek: encryptedDob.dek,
      });
      const room = await createTestRoomInDb({ name: 'R101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'ROOM' as const,
        resourceId: room.id,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session');
      expect(response.body.membershipBundled).toBe(false);
      expect(response.body.membership).toBeNull();
    });
  });

  describe('POST /api/checkin with products', () => {
    it('should process check-in with product purchases', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      // Create test products
      await db.insert(productsTable).values([
        { name: 'Water Bottle', price: '5.00', stock: 10 },
        { name: 'Towel', price: '10.00', stock: 5 },
      ]);

      const products = await db.select().from(productsTable);

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

    it('should return 409 when product is out of stock', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      // Create out of stock product
      const [product] = await db.insert(productsTable).values([
        { name: 'Water Bottle', price: '5.00', stock: 0 },
      ]).returning();

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
        productIds: [product.id],
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when product ID does not exist', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
        productIds: [99999],
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/checkin with membership', () => {
    it('should process check-in with six_month membership purchase', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'six_month' as const,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('membership');
      expect(response.body.membership).toHaveProperty('type', 'six_month');
    });

    it('should not create membership if client already has membership', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'one_time',
      });
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
      // Should not create new membership since client already has one
      expect(response.body.membership).toBeNull();
    });
  });

  describe('POST /api/checkin edge cases', () => {
    it('should handle check-in without membershipType', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
    });

    it('should handle check-in for member client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'one_time',
      });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        paymentToken: 'test-token-123',
      };

      const response = await api.post('/api/checkin').set(authHeaders).send(checkinData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
    });
  });

  describe('Contract Validation', () => {
    it('should validate POST /api/checkin request against OpenAPI spec', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const checkinData = {
        clientId: client.id,
        resourceType: 'LOCKER' as const,
        resourceId: locker.id,
        membershipType: 'one_time' as const,
        paymentToken: 'test-token-123',
      };

      const validation = await validateRequestBody('/api/checkin', 'post', checkinData);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Contract validation errors:', validation.errors);
      }
    });

    it('should validate POST /api/checkin response against OpenAPI spec', async () => {
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
      
      const validation = await validateResponse('/api/checkin', 'post', 200, response.body);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Contract validation errors:', validation.errors);
      }
    });
  });
});
