import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, cleanDatabase } from '../test/test-helpers';
import { db } from '@workspace/db';
import { productsTable } from '@workspace/db/schema';

// Mock cache functions
vi.mock('../lib/cache', () => ({
  withCache: vi.fn(async (key, ttl, fn) => await fn()),
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
  cacheDelPattern: vi.fn(async () => {}),
}));

describe('Products API', { tags: ['regression'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
  });


  describe('GET /api/products', () => {
    it('should return list of products for authenticated staff', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      
      await db.insert(productsTable).values([
        { name: 'Water Bottle', price: '5.00', stock: 10, category: 'beverage' },
        { name: 'Towel', price: '10.00', stock: 5, category: 'accessory' },
      ]);

      const response = await api.get('/api/products').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      
      // Create 25 products
      const products = Array.from({ length: 25 }, (_, i) => ({
        name: `Product ${i}`,
        price: '10.00',
        stock: 10,
      }));
      await db.insert(productsTable).values(products);

      const response = await api.get('/api/products?page=1&limit=10').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/products?page=0').set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for limit exceeding maximum', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const response = await api.get('/api/products?limit=101').set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await api.get('/api/products');

      expect(response.status).toBe(401);
    });

    it('should include pagination metadata', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      
      await db.insert(productsTable).values([
        { name: 'Product 1', price: '10.00', stock: 10 },
        { name: 'Product 2', price: '20.00', stock: 5 },
      ]);

      const response = await api.get('/api/products?page=1&limit=10').set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.meta).toHaveProperty('totalCount');
      expect(response.body.meta).toHaveProperty('totalPages');
      expect(response.body.meta).toHaveProperty('hasNextPage');
      expect(response.body.meta).toHaveProperty('hasPreviousPage');
    });
  });

  describe('POST /api/products', () => {
    it('should create product for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const productData = {
        name: 'Water Bottle',
        price: 5.00,
        stock: 10,
        category: 'beverage',
        description: 'Reusable water bottle',
      };

      const response = await api.post('/api/products').set(authHeaders).send(productData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Water Bottle');
      expect(response.body).toHaveProperty('price', 5.00);
      expect(response.body).toHaveProperty('stock', 10);
    });

    it('should return 401 for unauthenticated request', async () => {
      const productData = {
        name: 'Water Bottle',
        price: 5.00,
        stock: 10,
      };

      const response = await api.post('/api/products').send(productData);

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const productData = {
        name: 'Water Bottle',
        price: 5.00,
        stock: 10,
      };

      const response = await api.post('/api/products').set(authHeaders).send(productData);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid product data', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const invalidData = {
        name: 'Water Bottle',
        price: 'invalid',
        stock: 10,
      };

      const response = await api.post('/api/products').set(authHeaders).send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('should update product for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      
      const [product] = await db.insert(productsTable).values({
        name: 'Water Bottle',
        price: '5.00',
        stock: 10,
      }).returning();

      const updateData = {
        price: 7.50,
        stock: 15,
      };

      const response = await api.patch(`/api/products/${product.id}`).set(authHeaders).send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', product.id);
      expect(response.body).toHaveProperty('price', 7.50);
      expect(response.body).toHaveProperty('stock', 15);
    });

    it('should return 404 for non-existent product', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.patch('/api/products/99999').set(authHeaders).send({ price: 10.00 });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const [product] = await db.insert(productsTable).values({
        name: 'Water Bottle',
        price: '5.00',
        stock: 10,
      }).returning();

      const response = await api.patch(`/api/products/${product.id}`).send({ price: 10.00 });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      
      const [product] = await db.insert(productsTable).values({
        name: 'Water Bottle',
        price: '5.00',
        stock: 10,
      }).returning();

      const response = await api.patch(`/api/products/${product.id}`).set(authHeaders).send({ price: 10.00 });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID parameter', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.patch('/api/products/invalid').set(authHeaders).send({ price: 10.00 });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product for authenticated manager', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');
      
      const [product] = await db.insert(productsTable).values({
        name: 'Water Bottle',
        price: '5.00',
        stock: 10,
      }).returning();

      const response = await api.delete(`/api/products/${product.id}`).set(authHeaders);

      expect(response.status).toBe(204);
    });

    it('should return 401 for unauthenticated request', async () => {
      const [product] = await db.insert(productsTable).values({
        name: 'Water Bottle',
        price: '5.00',
        stock: 10,
      }).returning();

      const response = await api.delete(`/api/products/${product.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-manager user', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      
      const [product] = await db.insert(productsTable).values({
        name: 'Water Bottle',
        price: '5.00',
        stock: 10,
      }).returning();

      const response = await api.delete(`/api/products/${product.id}`).set(authHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID parameter', async () => {
      const authHeaders = await createAuthenticatedRequest('MANAGER');

      const response = await api.delete('/api/products/invalid').set(authHeaders);

      expect(response.status).toBe(400);
    });
  });
});
