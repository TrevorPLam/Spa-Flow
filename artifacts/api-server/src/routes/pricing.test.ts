import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../test/test-helpers';
import { createAuthenticatedRequest, createTestClientInDb, cleanDatabase } from '../test/test-helpers';
import { 
  calculatePrice, 
  getTierPrice, 
  getTierMidpointPrice, 
  getTierPriceRange, 
  isPriceInRange,
  type CustomerType,
  type ProductType,
  type RoomQualityTier,
} from '../lib/pricing';

describe('Pricing API', { tags: ['regression'] }, () => {
  beforeEach(async () => {
    await cleanDatabase();
  });


  describe('POST /api/pricing/calculate', () => {
    it('should calculate price for authenticated staff with member client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'one_time',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('appliedRules');
    });

    it('should calculate price for non-member client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
      // Non-member should have higher price
      expect(response.body.subtotal).toBeGreaterThan(0);
    });

    it('should calculate price for room resource type', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'room' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
    });

    it('should treat client as member when membershipType is provided in request', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
        membershipType: 'one_time' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      // Should apply member pricing
      expect(response.body.appliedRules).toBeDefined();
    });

    it('should return 404 for non-existent client', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const pricingData = {
        clientId: 99999,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthenticated request', async () => {
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').send(pricingData);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request data', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const invalidData = {
        clientId: 'invalid',
        resourceType: 'INVALID_TYPE' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing required fields', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');

      const invalidData = {
        clientId: 123,
        // missing resourceType
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle client without DOB gracefully', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
        dobEncrypted: null,
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      // Should default to age 25 when DOB is missing
    });

    it('should calculate price with six_month membership type', async () => {
      const authHeaders = await createAuthenticatedRequest('STAFF');
      const client = await createTestClientInDb({ 
        name: 'John Doe', 
        email: 'john@example.com',
        membershipStatus: 'none',
      });

      const pricingData = {
        clientId: client.id,
        resourceType: 'locker' as const,
        membershipType: 'six_month' as const,
      };

      const response = await api.post('/api/pricing/calculate').set(authHeaders).send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
    });
  });
});

describe('Room Price Range Selection', () => {
  describe('getTierPrice', () => {
    it('should return minimum price for standard tier on weekday', () => {
      const price = getTierPrice('standard', false);
      expect(price).toBe(25);
    });

    it('should return minimum price for standard tier on weekend', () => {
      const price = getTierPrice('standard', true);
      expect(price).toBe(28);
    });

    it('should return minimum price for premium tier on weekday', () => {
      const price = getTierPrice('premium', false);
      expect(price).toBe(29);
    });

    it('should return minimum price for premium tier on weekend', () => {
      const price = getTierPrice('premium', true);
      expect(price).toBe(32);
    });

    it('should return minimum price for deluxe tier on weekday', () => {
      const price = getTierPrice('deluxe', false);
      expect(price).toBe(33);
    });

    it('should return minimum price for deluxe tier on weekend', () => {
      const price = getTierPrice('deluxe', true);
      expect(price).toBe(36);
    });
  });

  describe('getTierMidpointPrice', () => {
    it('should return midpoint for standard tier on weekday', () => {
      const price = getTierMidpointPrice('standard', false);
      expect(price).toBe(26.5);
    });

    it('should return midpoint for standard tier on weekend', () => {
      const price = getTierMidpointPrice('standard', true);
      expect(price).toBe(29.5);
    });

    it('should return midpoint for premium tier on weekday', () => {
      const price = getTierMidpointPrice('premium', false);
      expect(price).toBe(30.5);
    });

    it('should return midpoint for premium tier on weekend', () => {
      const price = getTierMidpointPrice('premium', true);
      expect(price).toBe(33.5);
    });

    it('should return midpoint for deluxe tier on weekday', () => {
      const price = getTierMidpointPrice('deluxe', false);
      expect(price).toBe(33.5);
    });

    it('should return midpoint for deluxe tier on weekend', () => {
      const price = getTierMidpointPrice('deluxe', true);
      expect(price).toBe(36.5);
    });
  });

  describe('getTierPriceRange', () => {
    it('should return correct range for standard tier on weekday', () => {
      const range = getTierPriceRange('standard', false);
      expect(range).toEqual({ min: 25, max: 28 });
    });

    it('should return correct range for standard tier on weekend', () => {
      const range = getTierPriceRange('standard', true);
      expect(range).toEqual({ min: 28, max: 31 });
    });

    it('should return correct range for premium tier on weekday', () => {
      const range = getTierPriceRange('premium', false);
      expect(range).toEqual({ min: 29, max: 32 });
    });

    it('should return correct range for premium tier on weekend', () => {
      const range = getTierPriceRange('premium', true);
      expect(range).toEqual({ min: 32, max: 35 });
    });

    it('should return correct range for deluxe tier on weekday', () => {
      const range = getTierPriceRange('deluxe', false);
      expect(range).toEqual({ min: 33, max: 34 });
    });

    it('should return correct range for deluxe tier on weekend', () => {
      const range = getTierPriceRange('deluxe', true);
      expect(range).toEqual({ min: 36, max: 37 });
    });
  });

  describe('isPriceInRange', () => {
    it('should return true for price within range', () => {
      const inRange = isPriceInRange(26, 'standard', false);
      expect(inRange).toBe(true);
    });

    it('should return true for price at minimum of range', () => {
      const inRange = isPriceInRange(25, 'standard', false);
      expect(inRange).toBe(true);
    });

    it('should return true for price at maximum of range', () => {
      const inRange = isPriceInRange(28, 'standard', false);
      expect(inRange).toBe(true);
    });

    it('should return false for price below range', () => {
      const inRange = isPriceInRange(24, 'standard', false);
      expect(inRange).toBe(false);
    });

    it('should return false for price above range', () => {
      const inRange = isPriceInRange(29, 'standard', false);
      expect(inRange).toBe(false);
    });
  });

  describe('calculatePrice with room tier', () => {
    it('should use midpoint price when no selectedPrice provided', () => {
      const result = calculatePrice({
        customerType: 'NON_MEMBER' as CustomerType,
        productType: 'ROOM' as ProductType,
        startTime: new Date('2026-05-20T10:00:00'), // weekday
        clientAge: 30,
        hasBirthdayToday: false,
        roomTier: 'standard' as RoomQualityTier,
      });

      expect(result.subtotal).toBe(26.5);
      expect(result.appliedRules).toContain('Standard room rate (weekday)');
    });

    it('should use selected price when provided and within range', () => {
      const result = calculatePrice({
        customerType: 'NON_MEMBER' as CustomerType,
        productType: 'ROOM' as ProductType,
        startTime: new Date('2026-05-20T10:00:00'), // weekday
        clientAge: 30,
        hasBirthdayToday: false,
        roomTier: 'standard' as RoomQualityTier,
        selectedPrice: 27,
      });

      expect(result.subtotal).toBe(27);
      expect(result.appliedRules).toContain('Standard room rate (weekday) - custom price $27');
    });

    it('should fall back to midpoint when selected price is outside range', () => {
      const result = calculatePrice({
        customerType: 'NON_MEMBER' as CustomerType,
        productType: 'ROOM' as ProductType,
        startTime: new Date('2026-05-20T10:00:00'), // weekday
        clientAge: 30,
        hasBirthdayToday: false,
        roomTier: 'standard' as RoomQualityTier,
        selectedPrice: 30, // outside range 25-28
      });

      expect(result.subtotal).toBe(26.5);
      expect(result.appliedRules).toContain('Invalid price: $30 outside range $25-$28');
    });

    it('should use weekend pricing for weekend time', () => {
      const result = calculatePrice({
        customerType: 'NON_MEMBER' as CustomerType,
        productType: 'ROOM' as ProductType,
        startTime: new Date('2026-05-17T10:00:00'), // Saturday
        clientAge: 30,
        hasBirthdayToday: false,
        roomTier: 'premium' as RoomQualityTier,
      });

      expect(result.subtotal).toBe(33.5); // midpoint of 32-35
      expect(result.appliedRules).toContain('Premium room rate (weekend)');
    });

    it('should use premium tier pricing', () => {
      const result = calculatePrice({
        customerType: 'NON_MEMBER' as CustomerType,
        productType: 'ROOM' as ProductType,
        startTime: new Date('2026-05-20T10:00:00'), // weekday
        clientAge: 30,
        hasBirthdayToday: false,
        roomTier: 'premium' as RoomQualityTier,
      });

      expect(result.subtotal).toBe(30.5); // midpoint of 29-32
      expect(result.appliedRules).toContain('Premium room rate (weekday)');
    });

    it('should use deluxe tier pricing', () => {
      const result = calculatePrice({
        customerType: 'NON_MEMBER' as CustomerType,
        productType: 'ROOM' as ProductType,
        startTime: new Date('2026-05-20T10:00:00'), // weekday
        clientAge: 30,
        hasBirthdayToday: false,
        roomTier: 'deluxe' as RoomQualityTier,
      });

      expect(result.subtotal).toBe(33.5); // midpoint of 33-34
      expect(result.appliedRules).toContain('Deluxe room rate (weekday)');
    });
  });
});
