import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestRoomInDb, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { broadcast } from '../lib/websocket';

// Mock the broadcast function
vi.mock('../lib/websocket', () => ({
  broadcast: vi.fn(),
  WebSocketEventType: {
    LOCKER_STATUS_CHANGE: 'LOCKER_STATUS_CHANGE',
    ROOM_STATUS_CHANGE: 'ROOM_STATUS_CHANGE',
    WAITLIST_UPDATE: 'WAITLIST_UPDATE',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    RESOURCE_RELEASED: 'RESOURCE_RELEASED',
  },
}));

describe('Rooms API', { tags: ['regression'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });


  describe('POST /api/v1/rooms/bulk-release', () => {
    it('should release all expired rooms', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      // Create an expired room (expiresAt in the past)
      await createTestRoomInDb({ name: 'R101', status: 'occupied', clientId: client.id });

      // Create a non-expired room
      await createTestRoomInDb({ name: 'R102', status: 'available' });

      const response = await api.post('/api/v1/rooms/bulk-release').set(authHeaders).send({
        operation: 'all_expired',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalRequested');
      expect(response.body).toHaveProperty('totalReleased');
      expect(response.body).toHaveProperty('failed');
      expect(response.body.totalReleased).toBeGreaterThan(0);
      expect(broadcast).toHaveBeenCalled();
    });

    it('should release rooms by status', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      await createTestRoomInDb({ name: 'R101', status: 'occupied', clientId: client.id });
      await createTestRoomInDb({ name: 'R102', status: 'occupied', clientId: client.id });
      await createTestRoomInDb({ name: 'R103', status: 'available' });

      const response = await api.post('/api/v1/rooms/bulk-release').set(authHeaders).send({
        operation: 'by_status',
        status: 'occupied',
      });

      expect(response.status).toBe(200);
      expect(response.body.totalReleased).toBe(2);
      expect(broadcast).toHaveBeenCalled();
    });

    it('should release rooms by IDs', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      const room1 = await createTestRoomInDb({ name: 'R101', status: 'occupied', clientId: client.id });
      const room2 = await createTestRoomInDb({ name: 'R102', status: 'occupied', clientId: client.id });
      await createTestRoomInDb({ name: 'R103', status: 'available' });

      const response = await api.post('/api/v1/rooms/bulk-release').set(authHeaders).send({
        operation: 'by_ids',
        resourceIds: [room1.id, room2.id],
      });

      expect(response.status).toBe(200);
      expect(response.body.totalReleased).toBe(2);
      expect(broadcast).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.post('/api/v1/rooms/bulk-release').send({
        operation: 'all_expired',
      });

      expect(response.status).toBe(401);
    });

    it('should validate required operation field', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const response = await api.post('/api/v1/rooms/bulk-release').set(authHeaders).send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/rooms', () => {
    it('should return list of rooms for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      await createTestRoomInDb({ name: 'R101' });
      await createTestRoomInDb({ name: 'R102' });

      const response = await api.get('/api/v1/rooms').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/v1/rooms');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/rooms/:id/assign', () => {
    it('should assign room to client for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const room = await createTestRoomInDb({ name: 'R101', status: 'available' });
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const assignData = {
        clientId: client.id,
        duration: 'HOURLY' as const,
      };

      const response = await api.post(`/api/v1/rooms/${room.id}/assign`).set(authHeaders).send(assignData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'occupied');
      expect(response.body).toHaveProperty('currentClientId', client.id);
      expect(broadcast).toHaveBeenCalled();
    });

    it('should return 400 when assigning already occupied room', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const room = await createTestRoomInDb({ 
        name: 'R101', 
        status: 'occupied',
        clientId: client.id,
      });

      const assignData = {
        clientId: client.id,
        duration: 'HOURLY' as const,
      };

      const response = await api.post(`/api/v1/rooms/${room.id}/assign`).set(authHeaders).send(assignData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const room = await createTestRoomInDb({ name: 'R101' });
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.post(`/api/v1/rooms/${room.id}/assign`).send({
        clientId: client.id,
        duration: 'HOURLY',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/rooms/:id/release', () => {
    it('should release room for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const room = await createTestRoomInDb({ 
        name: 'R101', 
        status: 'occupied',
        clientId: client.id,
      });

      const response = await api.post(`/api/v1/rooms/${room.id}/release`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'available');
      expect(response.body).not.toHaveProperty('currentClientId');
      expect(broadcast).toHaveBeenCalled();
    });

    it('should return 404 for non-existent room', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.post('/api/v1/rooms/99999/release').set(authHeaders);

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const room = await createTestRoomInDb({ name: 'R101' });

      const response = await api.post(`/api/v1/rooms/${room.id}/release`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/rooms/:id/renew', () => {
    it('should renew room rental for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const room = await createTestRoomInDb({ 
        name: 'R101', 
        status: 'occupied',
        clientId: client.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const renewData = { duration: 'HOURLY' as const };

      const response = await api.post(`/api/v1/rooms/${room.id}/renew`).set(authHeaders).send(renewData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should return 400 when renewing available room', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const room = await createTestRoomInDb({ name: 'R101', status: 'available' });

      const response = await api.post(`/api/v1/rooms/${room.id}/renew`).set(authHeaders).send({
        duration: 'HOURLY',
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const room = await createTestRoomInDb({ name: 'R101' });

      const response = await api.post(`/api/v1/rooms/${room.id}/renew`).send({
        duration: 'HOURLY',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/rooms/summary', () => {
    it('should return room summary for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      await createTestRoomInDb({ name: 'R101', status: 'available' });
      await createTestRoomInDb({ name: 'R102', status: 'occupied' });

      const response = await api.get('/api/v1/rooms/summary').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('available');
      expect(response.body).toHaveProperty('occupied');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/v1/rooms/summary');

      expect(response.status).toBe(401);
    });
  });
});
