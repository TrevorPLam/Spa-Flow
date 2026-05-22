import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import { transactionsTable, membershipsTable } from '@workspace/db/schema';

describe('Reports API', { tags: ['regression', 'integration'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/v1/reports/revenue/membership', () => {
    it('should return revenue by membership type for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      // Create a membership transaction
      await db.insert(membershipsTable).values({
        clientId: client.id,
        type: 'six_month',
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '42.00',
        tax: '3.72',
        total: '45.72',
        type: 'membership',
        squarePaymentId: 'sq-test-123',
        description: 'Six-month membership',
      });

      const response = await api.get('/api/v1/reports/revenue/membership').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalTax');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/reports/revenue/membership').set(authHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/v1/reports/revenue/membership');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/reports/revenue/time-of-day', () => {
    it('should return revenue by time of day for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
      });

      const response = await api.get('/api/v1/reports/revenue/time-of-day').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('peakHour');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalTax');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/reports/revenue/time-of-day').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/revenue/day-of-week', () => {
    it('should return revenue by day of week for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
      });

      const response = await api.get('/api/v1/reports/revenue/day-of-week').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('bestDay');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalTax');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/reports/revenue/day-of-week').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/analytics/conversion-rate', () => {
    it('should return conversion rate for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      await db.insert(membershipsTable).values({
        clientId: client.id,
        type: 'six_month',
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '42.00',
        tax: '3.72',
        total: '45.72',
        type: 'membership',
        squarePaymentId: 'sq-test-123',
        description: 'Six-month membership',
      });

      const response = await api.get('/api/v1/reports/analytics/conversion-rate').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('conversionCount');
      expect(response.body).toHaveProperty('totalClients');
      expect(response.body).toHaveProperty('conversionRate');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      expect(typeof response.body.conversionRate).toBe('number');
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/reports/analytics/conversion-rate').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/analytics/avg-transaction', () => {
    it('should return average transaction value for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
      });

      const response = await api.get('/api/v1/reports/analytics/avg-transaction').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.overall).toHaveProperty('avgAmount');
      expect(response.body.overall).toHaveProperty('avgTotal');
      expect(response.body.overall).toHaveProperty('count');
      expect(response.body.overall).toHaveProperty('totalRevenue');
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/reports/analytics/avg-transaction').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/revenue/breakdown', () => {
    it('should return revenue breakdown for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
      });

      const response = await api.get('/api/v1/reports/revenue/breakdown').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalTax');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/reports/revenue/breakdown').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/analytics/discounts', () => {
    it('should return discount analytics for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Birthday discount applied',
      });

      const response = await api.get('/api/v1/reports/analytics/discounts').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('totalTransactions');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/reports/analytics/discounts').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('Date Range Filtering', () => {
    it('should respect startDate parameter', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
        createdAt: pastDate,
      });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const response = await api.get(`/api/v1/reports/revenue/time-of-day?startDate=${startDate}`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('startDate');
    });

    it('should respect endDate parameter', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
      });

      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const response = await api.get(`/api/v1/reports/revenue/time-of-day?endDate=${endDate}`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('endDate');
    });

    it('should return 400 for invalid date format', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.get('/api/v1/reports/revenue/time-of-day?startDate=invalid-date').set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when startDate is after endDate', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const response = await api.get(`/api/v1/reports/revenue/time-of-day?startDate=${startDate}&endDate=${endDate}`).set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
