import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import { transactionsTable } from '@workspace/db/schema';

describe('Transactions API', { tags: ['regression', 'integration'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
  });


  describe('GET /api/transactions', () => {
    it('should return list of transactions for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
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

      const response = await api.get('/api/transactions').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body.transactions).toBeInstanceOf(Array);
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(1);
      expect(response.body.transactions[0]).toHaveProperty('id');
      expect(response.body.transactions[0]).toHaveProperty('clientId', client.id);
      expect(response.body.transactions[0]).toHaveProperty('amount');
      expect(response.body.transactions[0]).toHaveProperty('tax');
      expect(response.body.transactions[0]).toHaveProperty('total');
    });

    it('should filter transactions by clientId', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client1 = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      const client2 = await createTestClientInDb({ name: 'Jane Smith', email: 'jane@example.com' });
      
      await db.insert(transactionsTable).values([
        { clientId: client1.id, amount: '100.00', tax: '8.88', total: '108.88', type: 'locker_rental', squarePaymentId: 'sq-1', description: 'Locker rental' },
        { clientId: client2.id, amount: '50.00', tax: '4.44', total: '54.44', type: 'product', squarePaymentId: 'sq-2', description: 'Product purchase' },
      ]);

      const response = await api.get(`/api/transactions?clientId=${client1.id}`).set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.transactions.length).toBe(1);
      expect(response.body.transactions[0].clientId).toBe(client1.id);
    });

    it('should support pagination', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ name: 'John Doe', email: 'john@example.com' });
      
      // Create 25 transactions
      const transactions = Array.from({ length: 25 }, (_, i) => ({
        clientId: client.id,
        amount: '100.00',
        tax: '8.88',
        total: '108.88',
        type: 'locker_rental' as const,
        squarePaymentId: `sq-${i}`,
        description: `Transaction ${i}`,
      }));
      await db.insert(transactionsTable).values(transactions);

      const response = await api.get('/api/transactions?page=1&limit=10').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.transactions.length).toBe(10);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.total).toBe(25);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/transactions');

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid query parameters', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/transactions?page=invalid').set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return empty list when no transactions exist', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/transactions').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.transactions).toBeInstanceOf(Array);
      expect(response.body.transactions.length).toBe(0);
      expect(response.body.total).toBe(0);
    });

    it('should include client name in transaction response', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
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

      const response = await api.get('/api/transactions').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.transactions[0]).toHaveProperty('clientName', 'John Doe');
    });
  });
});
