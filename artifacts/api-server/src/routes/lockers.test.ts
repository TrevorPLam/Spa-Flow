import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestLockerInDb, createTestClientInDb, cleanDatabase } from '../test/test-helpers';

describe('Lockers API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/lockers', () => {
    it('should return list of lockers for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      await createTestLockerInDb({ name: 'L101' });
      await createTestLockerInDb({ name: 'L102' });

      const response = await api.get('/api/lockers').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/lockers');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/lockers/:id/assign', () => {
    it('should assign locker to client for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const assignData = {
        clientId: client.id,
        duration: 'HOURLY' as const,
      };

      const response = await api.post(`/api/lockers/${locker.id}/assign`).set(authHeaders).send(assignData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'occupied');
      expect(response.body).toHaveProperty('currentClientId', client.id);
    });

    it('should return 400 when assigning already occupied locker', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ 
        name: 'L101', 
        status: 'occupied',
        clientId: client.id,
      });

      const assignData = {
        clientId: client.id,
        duration: 'HOURLY' as const,
      };

      const response = await api.post(`/api/lockers/${locker.id}/assign`).set(authHeaders).send(assignData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const locker = await createTestLockerInDb({ name: 'L101' });
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.post(`/api/lockers/${locker.id}/assign`).send({
        clientId: client.id,
        duration: 'HOURLY',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/lockers/:id/release', () => {
    it('should release locker for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ 
        name: 'L101', 
        status: 'occupied',
        clientId: client.id,
      });

      const response = await api.post(`/api/lockers/${locker.id}/release`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'available');
      expect(response.body).not.toHaveProperty('currentClientId');
    });

    it('should return 404 for non-existent locker', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.post('/api/lockers/99999/release').set(authHeaders);

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const locker = await createTestLockerInDb({ name: 'L101' });

      const response = await api.post(`/api/lockers/${locker.id}/release`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/lockers/:id/renew', () => {
    it('should renew locker rental for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const locker = await createTestLockerInDb({ 
        name: 'L101', 
        status: 'occupied',
        clientId: client.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
      });

      const renewData = { duration: 'HOURLY' as const };

      const response = await api.post(`/api/lockers/${locker.id}/renew`).set(authHeaders).send(renewData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should return 400 when renewing available locker', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const locker = await createTestLockerInDb({ name: 'L101', status: 'available' });

      const response = await api.post(`/api/lockers/${locker.id}/renew`).set(authHeaders).send({
        duration: 'HOURLY',
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const locker = await createTestLockerInDb({ name: 'L101' });

      const response = await api.post(`/api/lockers/${locker.id}/renew`).send({
        duration: 'HOURLY',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/lockers/summary', () => {
    it('should return locker summary for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      await createTestLockerInDb({ name: 'L101', status: 'available' });
      await createTestLockerInDb({ name: 'L102', status: 'occupied' });

      const response = await api.get('/api/lockers/summary').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('available');
      expect(response.body).toHaveProperty('occupied');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/lockers/summary');

      expect(response.status).toBe(401);
    });
  });
});
