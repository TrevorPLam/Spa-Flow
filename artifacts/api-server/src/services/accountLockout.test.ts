import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { AccountLockoutService } from './accountLockout';

// Mock the database
vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  usersTable: {},
}));

describe('AccountLockoutService', () => {
  let service: AccountLockoutService;
  const mockSelect = vi.mocked(db.select);
  const mockUpdate = vi.mocked(db.update);

  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables for lockout configuration
    vi.stubEnv('LOCKOUT_THRESHOLD', '5');
    vi.stubEnv('LOCKOUT_DURATION_MS', '900000'); // 15 minutes
    service = new AccountLockoutService();
  });

  describe('recordFailedAttempt', () => {
    it('should increment failed attempts when below threshold', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockSet = vi.fn().mockResolvedValue(undefined);
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([{ failedLoginAttempts: 2 }]);
      
      mockUpdate.mockReturnValue({
        set: mockSet,
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue(undefined);
      
      await service.recordFailedAttempt(1);
      
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 3,
          lastFailedLoginAt: expect.any(Date),
          lockedUntil: null,
        })
      );
    });

    it('should lock account when threshold is reached', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockSet = vi.fn().mockResolvedValue(undefined);
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([{ failedLoginAttempts: 4 }]);
      
      mockUpdate.mockReturnValue({
        set: mockSet,
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue(undefined);
      
      await service.recordFailedAttempt(1);
      
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 5,
          lastFailedLoginAt: expect.any(Date),
          lockedUntil: expect.any(Date),
        })
      );
    });

    it('should throw error when user not found', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([]);
      
      await expect(service.recordFailedAttempt(999)).rejects.toThrow('User not found');
    });
  });

  describe('isLocked', () => {
    it('should return false when user has no lockout', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([{ lockedUntil: null }]);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(false);
    });

    it('should return false when lockout has expired', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockSet = vi.fn().mockResolvedValue(undefined);
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      const pastDate = new Date(Date.now() - 10000);
      mockWhere.mockResolvedValue([{ lockedUntil: pastDate }]);
      
      mockUpdate.mockReturnValue({
        set: mockSet,
        where: mockWhere,
      } as any);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(false);
      expect(mockSet).toHaveBeenCalled(); // Should reset expired lockout
    });

    it('should return true when account is locked and lockout has not expired', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      const futureDate = new Date(Date.now() + 900000);
      mockWhere.mockResolvedValue([{ lockedUntil: futureDate }]);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(true);
    });

    it('should return false when user not found', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([]);
      
      const isLocked = await service.isLocked(999);
      
      expect(isLocked).toBe(false);
    });
  });

  describe('getLockoutStatus', () => {
    it('should return lockout status with remaining attempts', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([
        {
          failedLoginAttempts: 2,
          lockedUntil: null,
        },
      ]);
      
      const status = await service.getLockoutStatus(1);
      
      expect(status).toEqual({
        isLocked: false,
        failedAttempts: 2,
        lockedUntil: null,
        remainingAttempts: 3, // 5 - 2
      });
    });

    it('should return lockout status when locked', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      const futureDate = new Date(Date.now() + 900000);
      mockWhere.mockResolvedValue([
        {
          failedLoginAttempts: 5,
          lockedUntil: futureDate,
        },
      ]);
      
      const status = await service.getLockoutStatus(1);
      
      expect(status).toEqual({
        isLocked: true,
        failedAttempts: 5,
        lockedUntil: futureDate,
        remainingAttempts: 0,
      });
    });

    it('should throw error when user not found', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([]);
      
      await expect(service.getLockoutStatus(999)).rejects.toThrow('User not found');
    });
  });

  describe('resetAttempts', () => {
    it('should reset failed attempts and clear lockout', async () => {
      const mockSet = vi.fn().mockResolvedValue(undefined);
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      
      mockUpdate.mockReturnValue({
        set: mockSet,
        where: mockWhere,
      } as any);
      
      await service.resetAttempts(1);
      
      expect(mockSet).toHaveBeenCalledWith({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle zero failed attempts', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([
        {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      ]);
      
      const status = await service.getLockoutStatus(1);
      
      expect(status.failedAttempts).toBe(0);
      expect(status.remainingAttempts).toBe(5);
    });

    it('should handle null timestamp fields', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      
      mockSelect.mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);
      
      mockFrom.mockReturnValue({
        where: mockWhere,
      } as any);
      
      mockWhere.mockResolvedValue([
        {
          failedLoginAttempts: 3,
          lockedUntil: null,
        },
      ]);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(false);
    });
  });
});
