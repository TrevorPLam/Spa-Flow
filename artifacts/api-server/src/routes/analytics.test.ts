import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import { rentalSessionsTable, transactionsTable } from '@workspace/db/schema';

describe('Analytics API', { tags: ['regression', 'integration'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/v1/analytics/visit-frequency', () => {
    it('should return visit frequency analytics for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      // Create rental sessions
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      await db.insert(rentalSessionsTable).values([
        {
          clientId: client.id,
          resourceType: 'locker',
          resourceId: 1,
          resourceName: 'L-001',
          status: 'completed',
          startTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
          endTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        },
        {
          clientId: client.id,
          resourceType: 'locker',
          resourceId: 2,
          resourceName: 'L-002',
          status: 'completed',
          startTime: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000),
          endTime: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        },
      ]);

      const response = await api.get('/api/v1/analytics/visit-frequency').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('frequentVisitors');
      expect(response.body).toHaveProperty('totalClients');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/analytics/visit-frequency').set(authHeaders);

      expect(response.status).toBe(403);
    });

    it('should validate date parameters', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.get('/api/v1/analytics/visit-frequency?startDate=invalid').set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/analytics/visit-duration', () => {
    it('should return visit duration analytics for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      await db.insert(rentalSessionsTable).values({
        clientId: client.id,
        resourceType: 'locker',
        resourceId: 1,
        resourceName: 'L-001',
        status: 'completed',
        startTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
        endTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours
      });

      const response = await api.get('/api/v1/analytics/visit-duration').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('longVisitCount');
      expect(response.body).toHaveProperty('shortVisitCount');
      expect(response.body).toHaveProperty('overallAvgDuration');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/analytics/visit-duration').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/peak-hours', () => {
    it('should return peak hours analysis for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      await db.insert(rentalSessionsTable).values({
        clientId: client.id,
        resourceType: 'locker',
        resourceId: 1,
        resourceName: 'L-001',
        status: 'completed',
        startTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
        endTime: new Date(startDate.getTime() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      });

      const response = await api.get('/api/v1/analytics/peak-hours').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('hourlyData');
      expect(response.body).toHaveProperty('detailedData');
      expect(response.body).toHaveProperty('peakHour');
      expect(Array.isArray(response.body.hourlyData)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/analytics/peak-hours').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/clv', () => {
    it('should return CLV analytics for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      await db.insert(transactionsTable).values({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental',
        squarePaymentId: 'sq-test-123',
        description: 'Locker rental',
      });

      const response = await api.get('/api/v1/analytics/clv').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('highValueCount');
      expect(response.body).toHaveProperty('mediumValueCount');
      expect(response.body).toHaveProperty('lowValueCount');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/analytics/clv').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/churn-risk', () => {
    it('should return churn risk analysis for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.get('/api/v1/analytics/churn-risk').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('atRiskClients');
      expect(response.body).toHaveProperty('criticalRiskCount');
      expect(response.body).toHaveProperty('highRiskCount');
      expect(response.body).toHaveProperty('mediumRiskCount');
      expect(response.body).toHaveProperty('totalClients');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/analytics/churn-risk').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/segmentation', () => {
    it('should return client segmentation for manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.get('/api/v1/analytics/segmentation').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('visitPatternCounts');
      expect(response.body).toHaveProperty('revenueTierCounts');
      expect(response.body).toHaveProperty('membershipTypeCounts');
      expect(response.body).toHaveProperty('totalClients');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/v1/analytics/segmentation').set(authHeaders);

      expect(response.status).toBe(403);
    });
  });
});
