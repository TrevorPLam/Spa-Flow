import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createUnauthenticatedRequest, createTestClientInDb, createTestRoomInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import { waitlistTable } from '@workspace/db/schema';

describe('Waitlist API', { tags: ['regression'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/v1/waitlist', () => {
    it('should return list of active waitlist entries for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      await db.insert(waitlistTable).values({
        clientId: client.id,
        position: 1,
        status: 'waiting',
      });

      const response = await api.get('/api/v1/waitlist').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('clientId', client.id);
      expect(response.body[0]).toHaveProperty('position');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should exclude confirmed and expired entries from list', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      await db.insert(waitlistTable).values([
        { clientId: client.id, position: 1, status: 'waiting' },
        { clientId: client.id, position: 2, status: 'confirmed' },
        { clientId: client.id, position: 3, status: 'expired' },
      ]);

      const response = await api.get('/api/v1/waitlist').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('waiting');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/v1/waitlist');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/waitlist', () => {
    it('should add client to waitlist for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const waitlistData = {
        clientId: client.id,
      };

      const response = await api.post('/api/v1/waitlist').set(authHeaders).send(waitlistData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('clientId', client.id);
      expect(response.body).toHaveProperty('position');
      expect(response.body).toHaveProperty('status', 'waiting');
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const waitlistData = {
        clientId: 99999,
      };

      const response = await api.post('/api/v1/waitlist').set(authHeaders).send(waitlistData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 when client is already on waitlist', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      await db.insert(waitlistTable).values({
        clientId: client.id,
        position: 1,
        status: 'waiting',
      });

      const waitlistData = {
        clientId: client.id,
      };

      const response = await api.post('/api/v1/waitlist').set(authHeaders).send(waitlistData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const headers = await createUnauthenticatedRequest();

      const response = await api.post('/api/v1/waitlist').set(headers).send({ clientId: client.id });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request data', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const invalidData = {
        clientId: 'invalid',
      };

      const response = await api.post('/api/v1/waitlist').set(authHeaders).send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/waitlist/:id', () => {
    it('should remove waitlist entry for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      const [entry] = await db.insert(waitlistTable).values({
        clientId: client.id,
        position: 1,
        status: 'waiting',
      }).returning();

      const response = await api.delete(`/api/v1/waitlist/${entry.id}`).set(authHeaders);

      expect(response.status).toBe(204);
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const headers = await createUnauthenticatedRequest();
      
      const [entry] = await db.insert(waitlistTable).values({
        clientId: client.id,
        position: 1,
        status: 'waiting',
      }).returning();

      const response = await api.delete(`/api/v1/waitlist/${entry.id}`).set(headers);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid ID parameter', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.delete('/api/v1/waitlist/invalid').set(authHeaders);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/waitlist/:id/confirm', () => {
    it('should confirm waitlist assignment for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const room = await createTestRoomInDb({ name: 'R101', status: 'available' });
      
      const [entry] = await db.insert(waitlistTable).values({
        clientId: client.id,
        position: 1,
        status: 'assigned',
        assignedRoomId: room.id,
      }).returning();

      const response = await api.post(`/api/v1/waitlist/${entry.id}/confirm`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'confirmed');
    });

    it('should return 404 for non-existent waitlist entry', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.post('/api/v1/waitlist/99999/confirm').set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when entry is not in assigned state', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      const [entry] = await db.insert(waitlistTable).values({
        clientId: client.id,
        position: 1,
        status: 'waiting',
      }).returning();

      const response = await api.post(`/api/v1/waitlist/${entry.id}/confirm`).set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const headers = await createUnauthenticatedRequest();
      
      const [entry] = await db.insert(waitlistTable).values({
        clientId: client.id,
        position: 1,
        status: 'assigned',
      }).returning();

      const response = await api.post(`/api/v1/waitlist/${entry.id}/confirm`).set(headers);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid ID parameter', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.post('/api/v1/waitlist/invalid/confirm').set(authHeaders);

      expect(response.status).toBe(400);
    });
  });
});
