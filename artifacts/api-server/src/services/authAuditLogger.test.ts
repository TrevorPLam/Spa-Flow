import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authAuditLogger } from './authAuditLogger';
import { db, auditLogsTable } from '@workspace/db';
import { logger } from '../lib/logger';

// Mock the database
vi.mock('@workspace/db', () => ({
  db: {
    insert: vi.fn(),
  },
  auditLogsTable: {},
}));

// Mock the logger
vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('AuthAuditLogger', { tags: ['@regression', '@integration'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logLoginAttempt', () => {
    it('should log successful login attempt', async () => {
      const mockInsert = vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await authAuditLogger.logLoginAttempt({
        userId: 123,
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        success: true,
        correlationId: 'test-correlation-id',
      });

      expect(mockInsert).toHaveBeenCalledWith(auditLogsTable);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log failed login attempt', async () => {
      const mockInsert = vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await authAuditLogger.logLoginAttempt({
        userId: 123,
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        success: false,
        reason: 'Invalid credentials',
        correlationId: 'test-correlation-id',
      });

      expect(mockInsert).toHaveBeenCalledWith(auditLogsTable);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log failed login attempt for non-existent user (userId undefined)', async () => {
      const mockInsert = vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await authAuditLogger.logLoginAttempt({
        userId: undefined,
        email: 'nonexistent@example.com',
        ipAddress: '192.168.1.1',
        success: false,
        reason: 'Invalid credentials',
        correlationId: 'test-correlation-id',
      });

      expect(mockInsert).toHaveBeenCalledWith(auditLogsTable);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log without correlation ID when not provided', async () => {
      const mockInsert = vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await authAuditLogger.logLoginAttempt({
        userId: 123,
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        success: true,
      });

      expect(mockInsert).toHaveBeenCalledWith(auditLogsTable);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log error to logger when database insert fails', async () => {
      const mockError = new Error('Database connection failed');
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockRejectedValue(mockError),
      } as any);

      await authAuditLogger.logLoginAttempt({
        userId: 123,
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        success: true,
        correlationId: 'test-correlation-id',
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            name: 'Error',
            message: 'Database connection failed',
          }),
          auditData: expect.objectContaining({
            userId: 123,
            email: 'test@example.com',
          }),
        }),
        'Failed to write auth audit log'
      );
    });
  });

  describe('logLogout', () => {
    it('should log logout event', async () => {
      const mockInsert = vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await authAuditLogger.logLogout({
        userId: 123,
        ipAddress: '192.168.1.1',
        correlationId: 'test-correlation-id',
      });

      expect(mockInsert).toHaveBeenCalledWith(auditLogsTable);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log logout without correlation ID when not provided', async () => {
      const mockInsert = vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await authAuditLogger.logLogout({
        userId: 123,
        ipAddress: '192.168.1.1',
      });

      expect(mockInsert).toHaveBeenCalledWith(auditLogsTable);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log error to logger when database insert fails', async () => {
      const mockError = new Error('Database connection failed');
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockRejectedValue(mockError),
      } as any);

      await authAuditLogger.logLogout({
        userId: 123,
        ipAddress: '192.168.1.1',
        correlationId: 'test-correlation-id',
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            name: 'Error',
            message: 'Database connection failed',
          }),
          auditData: expect.objectContaining({
            userId: 123,
            ipAddress: '192.168.1.1',
          }),
        }),
        'Failed to write logout audit log'
      );
    });
  });
});
