import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, createTestLockerInDb, cleanDatabase } from '../test/test-helpers';
import { db, clientsTable } from '@workspace/db';
import { transactionsTable, productsTable, rentalSessionsTable } from '@workspace/db/schema';

describe('Dashboard API', { tags: ['regression', 'integration'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
  });


  describe('GET /api/v1/dashboard', () => {
    it('should return dashboard data for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/dashboard').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lockerOccupancy');
      expect(response.body).toHaveProperty('roomOccupancy');
      expect(response.body).toHaveProperty('todayRevenue');
      expect(response.body).toHaveProperty('activeClients');
      expect(response.body).toHaveProperty('waitlistCount');
      expect(response.body).toHaveProperty('lowStockCount');
      expect(response.body).toHaveProperty('lowStockProducts');
      expect(response.body).toHaveProperty('recentTransactions');
      expect(response.body).toHaveProperty('activeRentals');
    });

    it('should return locker occupancy with correct structure', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/dashboard').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.lockerOccupancy).toHaveProperty('total');
      expect(response.body.lockerOccupancy).toHaveProperty('available');
      expect(response.body.lockerOccupancy).toHaveProperty('occupied');
      expect(response.body.lockerOccupancy).toHaveProperty('reserved');
      expect(typeof response.body.lockerOccupancy.total).toBe('number');
    });

    it('should return room occupancy with correct structure', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/dashboard').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.roomOccupancy).toHaveProperty('total');
      expect(response.body.roomOccupancy).toHaveProperty('available');
      expect(response.body.roomOccupancy).toHaveProperty('occupied');
      expect(response.body.roomOccupancy).toHaveProperty('reserved');
      expect(typeof response.body.roomOccupancy.total).toBe('number');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/v1/dashboard');

      expect(response.status).toBe(401);
    });

    it('should include recent transactions with client names', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      
      // Insert client directly in this test to ensure it exists
      const [client] = await db.insert(clientsTable).values({
        email: 'john@example.com',
        phone: '555-0100',
        memberId: 'MEM001',
        name: 'John Doe',
        membershipStatus: 'none',
        dobEncrypted: null,
        addressEncrypted: null,
      }).returning();

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
      });

      const response = await api.get('/api/v1/dashboard').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.recentTransactions).toBeInstanceOf(Array);
      if (response.body.recentTransactions.length > 0) {
        expect(response.body.recentTransactions[0]).toHaveProperty('clientName');
      }
    });

    it('should include low stock products', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      await db.insert(productsTable).values({
        name: 'Test Product',
        price: '10.00',
        stock: 2,
        lowStockThreshold: 5,
        category: 'accessory',
      });

      const response = await api.get('/api/v1/dashboard').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.lowStockProducts).toBeInstanceOf(Array);
      expect(response.body.lowStockCount).toBeGreaterThanOrEqual(0);
    });

    it('should include active rentals with client names', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      
      // Insert client directly in this test to ensure it exists
      const [client] = await db.insert(clientsTable).values({
        email: 'jane@example.com',
        phone: '555-0101',
        memberId: 'MEM002',
        name: 'Jane Smith',
        membershipStatus: 'none',
        dobEncrypted: null,
        addressEncrypted: null,
      }).returning();
      
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      await db.insert(rentalSessionsTable).values({
        clientId: client.id,
        resourceType: 'locker' as const,
        resourceId: locker.id,
        resourceName: 'L101',
        status: 'active',
        startTime: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      });

      const response = await api.get('/api/v1/dashboard').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.activeRentals).toBeInstanceOf(Array);
      if (response.body.activeRentals.length > 0) {
        expect(response.body.activeRentals[0]).toHaveProperty('clientName');
        expect(response.body.activeRentals[0]).toHaveProperty('resourceType');
        expect(response.body.activeRentals[0]).toHaveProperty('resourceName');
      }
    });
  });
});
