import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import { clientsTable, membershipsTable, transactionsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { validateResponse, validateRequestBody } from '../test/contract-validator';

describe('Clients API', { tags: ['smoke', 'critical'] }, () => {
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
      const deletedClient = await db.select().from(clientsTable).where(eq(clientsTable.id, client.id));
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
      
      await db.insert(membershipsTable).values({
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

  describe('GET /api/clients/:id/pii', () => {
    it('should return decrypted PII for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        dobEncrypted: 'encrypted-dob-data',
        dobDek: 'encrypted-dek',
        addressEncrypted: 'encrypted-address-data',
        addressDek: 'encrypted-dek',
        documentNumberEncrypted: 'encrypted-doc-data',
        documentNumberDek: 'encrypted-dek',
      });

      const response = await api.get(`/api/clients/${client.id}/pii`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', client.id);
      expect(response.body).toHaveProperty('name', 'John Doe');
      expect(response.body).toHaveProperty('dob');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('documentNumber');
    });

    it('should return 403 when staff tries to access PII endpoint', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        dobEncrypted: 'encrypted-dob-data',
        dobDek: 'encrypted-dek',
      });

      const response = await api.get(`/api/clients/${client.id}/pii`).set(authHeaders);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });

      const response = await api.get(`/api/clients/${client.id}/pii`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.get('/api/clients/99999/pii').set(authHeaders);

      expect(response.status).toBe(404);
    });

    it('should create audit log entry for PII access', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        dobEncrypted: 'encrypted-dob-data',
        dobDek: 'encrypted-dek',
      });

      await api.get(`/api/clients/${client.id}/pii`).set(authHeaders);

      // Verify audit log entry was created
      const auditLogs = await db.select().from(require('@workspace/db/schema').auditLogsTable)
        .where(eq(require('@workspace/db/schema').auditLogsTable.action, 'VIEW_PII'));
      
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0]).toHaveProperty('resourceType', 'client');
      expect(auditLogs[0]).toHaveProperty('resourceId', client.id);
    });
  });

  describe('POST /api/clients/:id/memberships/renew', () => {
    it('should renew expired membership with payment', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({
        name: 'John Doe',
        email: 'john@example.com',
        membershipStatus: 'six_month',
        membershipExpiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
      });

      const renewalData = {
        membershipType: 'six_month',
        paymentToken: 'SQUARE_MOCK_TOKEN_RENEWAL',
        idempotencyKey: `renewal_${client.id}_${Date.now()}`,
      };

      const response = await api.post(`/api/clients/${client.id}/memberships/renew`).set(authHeaders).send(renewalData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type', 'six_month');
      expect(response.body).toHaveProperty('purchasedAt');
      expect(response.body).toHaveProperty('expiresAt');

      // Verify client membership status was updated
      const updatedClient = await db.select().from(clientsTable).where(eq(clientsTable.id, client.id));
      expect(updatedClient[0].membershipStatus).toBe('six_month');
      expect(updatedClient[0].membershipExpiresAt).not.toBeNull();

      // Verify transaction was created
      const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.clientId, client.id));
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[transactions.length - 1].type).toBe('membership');
    });

    it('should allow renewal for client with no membership', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({
        name: 'John Doe',
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const renewalData = {
        membershipType: 'one_time',
        paymentToken: 'SQUARE_MOCK_TOKEN_RENEWAL',
        idempotencyKey: `renewal_${client.id}_${Date.now()}`,
      };

      const response = await api.post(`/api/clients/${client.id}/memberships/renew`).set(authHeaders).send(renewalData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('type', 'one_time');
    });

    it('should reject renewal for active membership', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({
        name: 'John Doe',
        email: 'john@example.com',
        membershipStatus: 'six_month',
        membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      });

      const renewalData = {
        membershipType: 'six_month',
        paymentToken: 'SQUARE_MOCK_TOKEN_RENEWAL',
        idempotencyKey: `renewal_${client.id}_${Date.now()}`,
      };

      const response = await api.post(`/api/clients/${client.id}/memberships/renew`).set(authHeaders).send(renewalData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const renewalData = {
        membershipType: 'one_time',
        paymentToken: 'SQUARE_MOCK_TOKEN_RENEWAL',
        idempotencyKey: `renewal_99999_${Date.now()}`,
      };

      const response = await api.post('/api/clients/99999/memberships/renew').set(authHeaders).send(renewalData);

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({
        name: 'John Doe',
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const renewalData = {
        membershipType: 'one_time',
        paymentToken: 'SQUARE_MOCK_TOKEN_RENEWAL',
        idempotencyKey: `renewal_${client.id}_${Date.now()}`,
      };

      const response = await api.post(`/api/clients/${client.id}/memberships/renew`).send(renewalData);

      expect(response.status).toBe(401);
    });

    it('should create audit log entry for renewal', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({
        name: 'John Doe',
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const renewalData = {
        membershipType: 'one_time',
        paymentToken: 'SQUARE_MOCK_TOKEN_RENEWAL',
        idempotencyKey: `renewal_${client.id}_${Date.now()}`,
      };

      await api.post(`/api/clients/${client.id}/memberships/renew`).set(authHeaders).send(renewalData);

      // Verify audit log entry was created
      const auditLogs = await db.select().from(require('@workspace/db/schema').auditLogsTable)
        .where(eq(require('@workspace/db/schema').auditLogsTable.action, 'RENEW_MEMBERSHIP'));

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0]).toHaveProperty('resourceType', 'client');
      expect(auditLogs[0]).toHaveProperty('resourceId', client.id);
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

    it('should validate GET /api/clients/:id/pii response against OpenAPI spec', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        dobEncrypted: 'encrypted-dob-data',
        dobDek: 'encrypted-dek',
      });

      const response = await api.get(`/api/clients/${client.id}/pii`).set(authHeaders);

      expect(response.status).toBe(200);
      
      const validation = await validateResponse('/api/clients/:id/pii', 'get', 200, response.body);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Contract validation errors:', validation.errors);
      }
    });
  });
});
