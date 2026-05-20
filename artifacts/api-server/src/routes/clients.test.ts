import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import * as schema from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { validateResponse, validateRequestBody } from '../test/contract-validator';

describe('Clients API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/clients', () => {
    it('should return list of clients for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      await createTestClientInDb({ name: 'Jane Smith', email: 'jane@example.com' });

      const response = await api.get('/api/clients').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return list of clients for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.get('/api/clients').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/clients');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/clients/:id', () => {
    it('should return client details for authenticated staff (PII masked)', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        dobEncrypted: 'encrypted-dob-data',
        addressEncrypted: 'encrypted-address-data'
      });

      const response = await api.get(`/api/clients/${client.id}`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', client.id);
      expect(response.body).toHaveProperty('name', 'John Doe');
      expect(response.body).not.toHaveProperty('dobEncrypted');
      expect(response.body).not.toHaveProperty('addressEncrypted');
    });

    it('should return client details with PII for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        dobEncrypted: 'encrypted-dob-data',
        addressEncrypted: 'encrypted-address-data'
      });

      const response = await api.get(`/api/clients/${client.id}`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', client.id);
      expect(response.body).toHaveProperty('name', 'John Doe');
      expect(response.body).toHaveProperty('dobEncrypted');
      expect(response.body).toHaveProperty('addressEncrypted');
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/clients/99999').set(authHeaders);

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.get(`/api/clients/${client.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/clients', () => {
    it('should create a new client for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const newClient = {
        email: 'newclient@example.com',
        phone: '555-0123',
        memberId: 'MEM123',
        name: 'New Client',
      };

      const response = await api.post('/api/clients').set(authHeaders).send(newClient);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', newClient.email);
      expect(response.body).toHaveProperty('name', newClient.name);
    });

    it('should return 400 for invalid client data', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const invalidClient = {
        email: 'invalid-email',
        name: '', // Empty name
      };

      const response = await api.post('/api/clients').set(authHeaders).send(invalidClient);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const newClient = {
        email: 'newclient@example.com',
        name: 'New Client',
      };

      const response = await api.post('/api/clients').send(newClient);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/clients/:id', () => {
    it('should update client for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const updateData = { name: 'John Updated', phone: '555-9999' };
      const response = await api.put(`/api/clients/${client.id}`).set(authHeaders).send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'John Updated');
      expect(response.body).toHaveProperty('phone', '555-9999');
    });

    it('should return 403 when staff tries to update client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const updateData = { name: 'John Updated' };
      const response = await api.put(`/api/clients/${client.id}`).set(authHeaders).send(updateData);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.put('/api/clients/99999').set(authHeaders).send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/clients/:id', () => {
    it('should delete client for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.delete(`/api/clients/${client.id}`).set(authHeaders);

      expect(response.status).toBe(200);
      
      // Verify client is deleted
      const deletedClient = await db.select().from(schema.clientsTable).where(eq(schema.clientsTable.id, client.id));
      expect(deletedClient).toHaveLength(0);
    });

    it('should return 403 when staff tries to delete client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.delete(`/api/clients/${client.id}`).set(authHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.delete('/api/clients/99999').set(authHeaders);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/clients/:id/memberships', () => {
    it('should return client memberships for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      await db.insert(schema.membershipsTable).values({
        clientId: client.id,
        type: 'six_month',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const response = await api.get(`/api/clients/${client.id}/memberships`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.get(`/api/clients/${client.id}/memberships`);

      expect(response.status).toBe(401);
    });
  });

  describe('Contract Validation', () => {
    it('should validate GET /api/clients response against OpenAPI spec', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.get('/api/clients').set(authHeaders);

      expect(response.status).toBe(200);
      
      const validation = await validateResponse('/api/clients', 'get', 200, response.body);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Contract validation errors:', validation.errors);
      }
    });

    it('should validate POST /api/clients request against OpenAPI spec', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const newClient = {
        email: 'newclient@example.com',
        phone: '555-0123',
        memberId: 'MEM123',
        name: 'New Client',
      };

      const validation = await validateRequestBody('/api/clients', 'post', newClient);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Contract validation errors:', validation.errors);
      }
    });

    it('should validate POST /api/clients response against OpenAPI spec', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const newClient = {
        email: 'newclient@example.com',
        phone: '555-0123',
        memberId: 'MEM123',
        name: 'New Client',
      };

      const response = await api.post('/api/clients').set(authHeaders).send(newClient);

      expect(response.status).toBe(201);
      
      const validation = await validateResponse('/api/clients', 'post', 201, response.body);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Contract validation errors:', validation.errors);
      }
    });

    it('should validate GET /api/clients/:id response against OpenAPI spec', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        dobEncrypted: 'encrypted-dob-data',
        addressEncrypted: 'encrypted-address-data'
      });

      const response = await api.get(`/api/clients/${client.id}`).set(authHeaders);

      expect(response.status).toBe(200);
      
      const validation = await validateResponse('/api/clients/:id', 'get', 200, response.body);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Contract validation errors:', validation.errors);
      }
    });
  });
});
