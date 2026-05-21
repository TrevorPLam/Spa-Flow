import { describe, it, expect } from 'vitest';
import { api } from '../test/test-helpers';

describe('Config API', { tags: ['smoke'] }, () => {
  describe('GET /api/v1/config', () => {
    it('should return configuration values', async () => {
      const response = await api.get('/api/v1/config');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('taxRate');
      expect(typeof response.body.taxRate).toBe('number');
    });

    it('should return tax rate as a decimal between 0 and 1', async () => {
      const response = await api.get('/api/v1/config');

      expect(response.status).toBe(200);
      expect(response.body.taxRate).toBeGreaterThanOrEqual(0);
      expect(response.body.taxRate).toBeLessThanOrEqual(1);
    });
  });
});
