import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestUserInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import * as schema from '@workspace/db/schema';

describe('Audit Logs API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/audit-logs', () => {
    it('should return list of audit logs for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const user = await createTestUserInDb({ email: 'user@example.com', name: 'Test User' });
      
      await db.insert(schema.auditLogsTable).values({
        userId: user.id,
        action: 'CREATE_USER',
        resourceType: 'user',
        resourceId: 1,
        description: 'Created user test@example.com',
      });

      const response = await api.get('/api/audit-logs').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body.logs).toBeInstanceOf(Array);
      expect(response.body.logs.length).toBeGreaterThanOrEqual(1);
      expect(response.body.logs[0]).toHaveProperty('id');
      expect(response.body.logs[0]).toHaveProperty('userId');
      expect(response.body.logs[0]).toHaveProperty('action');
      expect(response.body.logs[0]).toHaveProperty('resourceType');
      expect(response.body.logs[0]).toHaveProperty('resourceId');
      expect(response.body.logs[0]).toHaveProperty('description');
      expect(response.body.logs[0]).toHaveProperty('createdAt');
    });

    it('should include user name in audit log response', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const user = await createTestUserInDb({ email: 'user@example.com', name: 'Test User' });
      
      await db.insert(schema.auditLogsTable).values({
        userId: user.id,
        action: 'CREATE_USER',
        resourceType: 'user',
        resourceId: 1,
        description: 'Created user test@example.com',
      });

      const response = await api.get('/api/audit-logs').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.logs[0]).toHaveProperty('userName', 'Test User');
    });

    it('should filter audit logs by action', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const user = await createTestUserInDb({ email: 'user@example.com', name: 'Test User' });
      
      await db.insert(schema.auditLogsTable).values([
        { userId: user.id, action: 'CREATE_USER', resourceType: 'user', resourceId: 1, description: 'Created user' },
        { userId: user.id, action: 'DELETE_USER', resourceType: 'user', resourceId: 2, description: 'Deleted user' },
        { userId: user.id, action: 'UPDATE_USER', resourceType: 'user', resourceId: 1, description: 'Updated user' },
      ]);

      const response = await api.get('/api/audit-logs?action=CREATE').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBeGreaterThanOrEqual(1);
      expect(response.body.logs[0].action).toContain('CREATE');
    });

    it('should filter audit logs by userId', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const user1 = await createTestUserInDb({ email: 'user1@example.com', name: 'User One' });
      const user2 = await createTestUserInDb({ email: 'user2@example.com', name: 'User Two' });
      
      await db.insert(schema.auditLogsTable).values([
        { userId: user1.id, action: 'CREATE_USER', resourceType: 'user', resourceId: 1, description: 'User 1 action' },
        { userId: user2.id, action: 'CREATE_USER', resourceType: 'user', resourceId: 2, description: 'User 2 action' },
      ]);

      const response = await api.get(`/api/audit-logs?userId=${user1.id}`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(1);
      expect(response.body.logs[0].userId).toBe(user1.id);
    });

    it('should support pagination', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const user = await createTestUserInDb({ email: 'user@example.com', name: 'Test User' });
      
      // Create 25 audit logs
      const logs = Array.from({ length: 25 }, (_, i) => ({
        userId: user.id,
        action: 'TEST_ACTION',
        resourceType: 'test',
        resourceId: i,
        description: `Test action ${i}`,
      }));
      await db.insert(schema.auditLogsTable).values(logs);

      const response = await api.get('/api/audit-logs?page=1&limit=10').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(10);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.total).toBe(25);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/audit-logs');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/audit-logs').set(authHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid query parameters', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.get('/api/audit-logs?page=invalid').set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return empty list when no audit logs exist', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.get('/api/audit-logs').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeInstanceOf(Array);
      expect(response.body.logs.length).toBe(0);
      expect(response.body.total).toBe(0);
    });

    it('should handle combined filters (action and userId)', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const user1 = await createTestUserInDb({ email: 'user1@example.com', name: 'User One' });
      const user2 = await createTestUserInDb({ email: 'user2@example.com', name: 'User Two' });
      
      await db.insert(schema.auditLogsTable).values([
        { userId: user1.id, action: 'CREATE_USER', resourceType: 'user', resourceId: 1, description: 'User 1 create' },
        { userId: user1.id, action: 'DELETE_USER', resourceType: 'user', resourceId: 2, description: 'User 1 delete' },
        { userId: user2.id, action: 'CREATE_USER', resourceType: 'user', resourceId: 3, description: 'User 2 create' },
      ]);

      const response = await api.get(`/api/audit-logs?action=CREATE&userId=${user1.id}`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(1);
      expect(response.body.logs[0].userId).toBe(user1.id);
      expect(response.body.logs[0].action).toContain('CREATE');
    });
  });
});
