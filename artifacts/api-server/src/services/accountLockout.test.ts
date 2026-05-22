import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@workspace/db';
import { AccountLockoutService } from './accountLockout';

// Mock the database
vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  usersTable: {},
}));

describe('AccountLockoutService', { tags: ['regression', 'integration'] }, () => {
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
      const mockWhereUpdate = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({
        where: mockWhereUpdate,
      } as any);
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ failedLoginAttempts: 2 }]),
        }),
      } as any);
      
      mockUpdate.mockReturnValue({
        set: mockSet,
      } as any);
      
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
      const mockWhereUpdate = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({
        where: mockWhereUpdate,
      } as any);
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ failedLoginAttempts: 4 }]),
        }),
      } as any);
      
      mockUpdate.mockReturnValue({
        set: mockSet,
      } as any);
      
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
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);
      
      await expect(service.recordFailedAttempt(999)).rejects.toThrow('User not found');
    });
  });

  describe('isLocked', () => {
    it('should return false when user has no lockout', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ lockedUntil: null }]),
        }),
      } as any);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(false);
    });

    it('should return false when lockout has expired', async () => {
      const mockWhereUpdate = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({
        where: mockWhereUpdate,
      } as any);
      
      const pastDate = new Date(Date.now() - 10000);
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ lockedUntil: pastDate }]),
        }),
      } as any);
      
      mockUpdate.mockReturnValue({
        set: mockSet,
      } as any);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(false);
      expect(mockSet).toHaveBeenCalled(); // Should reset expired lockout
    });

    it('should return true when account is locked and lockout has not expired', async () => {
      const futureDate = new Date(Date.now() + 900000);
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ lockedUntil: futureDate }]),
        }),
      } as any);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);
      
      const isLocked = await service.isLocked(999);
      
      expect(isLocked).toBe(false);
    });
  });

  describe('getLockoutStatus', () => {
    it('should return lockout status with remaining attempts', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              failedLoginAttempts: 2,
              lockedUntil: null,
            },
          ]),
        }),
      } as any);
      
      const status = await service.getLockoutStatus(1);
      
      expect(status).toEqual({
        isLocked: false,
        failedAttempts: 2,
        lockedUntil: null,
        remainingAttempts: 3, // 5 - 2
      });
    });

    it('should return lockout status when locked', async () => {
      const futureDate = new Date(Date.now() + 900000);
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              failedLoginAttempts: 5,
              lockedUntil: futureDate,
            },
          ]),
        }),
      } as any);
      
      const status = await service.getLockoutStatus(1);
      
      expect(status).toEqual({
        isLocked: true,
        failedAttempts: 5,
        lockedUntil: futureDate,
        remainingAttempts: 0,
      });
    });

    it('should throw error when user not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);
      
      await expect(service.getLockoutStatus(999)).rejects.toThrow('User not found');
    });
  });

  describe('resetAttempts', () => {
    it('should reset failed attempts and clear lockout', async () => {
      const mockWhereUpdate = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({
        where: mockWhereUpdate,
      });
      
      mockUpdate.mockReturnValue({
        set: mockSet,
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
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          ]),
        }),
      } as any);
      
      const status = await service.getLockoutStatus(1);
      
      expect(status.failedAttempts).toBe(0);
      expect(status.remainingAttempts).toBe(5);
    });

    it('should handle null timestamp fields', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              failedLoginAttempts: 3,
              lockedUntil: null,
            },
          ]),
        }),
      } as any);
      
      const isLocked = await service.isLocked(1);
      
      expect(isLocked).toBe(false);
    });
  });
});
