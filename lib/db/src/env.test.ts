import { describe, it, expect, beforeEach } from 'vitest';
import { validateDbEnv, getDbEnv, getDatabaseConfig, resetDbEnv } from './env';

describe('env.ts', () => {
  beforeEach(() => {
    // Reset environment cache before each test
    resetDbEnv();
    // Clear process.env modifications
    delete process.env.DATABASE_URL;
    delete process.env.DB_POOL_MAX;
    delete process.env.DB_POOL_IDLE_TIMEOUT_MS;
    delete process.env.DB_POOL_CONNECTION_TIMEOUT_MS;
    delete process.env.DB_STATEMENT_TIMEOUT_MS;
    delete process.env.DB_LOCK_TIMEOUT_MS;
    delete process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS;
  });

  describe('validateDbEnv', () => {
    it('should validate with all required environment variables set', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_MAX = '10';
      process.env.DB_POOL_IDLE_TIMEOUT_MS = '30000';
      process.env.DB_POOL_CONNECTION_TIMEOUT_MS = '5000';
      process.env.DB_STATEMENT_TIMEOUT_MS = '30000';
      process.env.DB_LOCK_TIMEOUT_MS = '5000';
      process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS = '60000';

      const env = validateDbEnv();
      expect(env.DATABASE_URL).toBe('postgresql://user:password@localhost:5432/testdb');
      expect(env.DB_POOL_MAX).toBe(10);
      expect(env.DB_POOL_IDLE_TIMEOUT_MS).toBe(30000);
      expect(env.DB_POOL_CONNECTION_TIMEOUT_MS).toBe(5000);
      expect(env.DB_STATEMENT_TIMEOUT_MS).toBe(30000);
      expect(env.DB_LOCK_TIMEOUT_MS).toBe(5000);
      expect(env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS).toBe(60000);
    });

    it('should use default values when optional variables are not set', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';

      const env = validateDbEnv();
      expect(env.DATABASE_URL).toBe('postgresql://user:password@localhost:5432/testdb');
      expect(env.DB_POOL_MAX).toBe(20); // default
      expect(env.DB_POOL_IDLE_TIMEOUT_MS).toBe(30000); // default
      expect(env.DB_POOL_CONNECTION_TIMEOUT_MS).toBe(5000); // default
      expect(env.DB_STATEMENT_TIMEOUT_MS).toBe(30000); // default
      expect(env.DB_LOCK_TIMEOUT_MS).toBe(5000); // default
      expect(env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS).toBe(60000); // default
    });

    it('should throw error when DATABASE_URL is missing', () => {
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DATABASE_URL is invalid', () => {
      process.env.DATABASE_URL = 'not-a-valid-url';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DB_POOL_MAX is out of range', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_MAX = '0'; // below minimum
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DB_POOL_MAX is above maximum', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_MAX = '101'; // above maximum
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when timeout values are below minimum', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_IDLE_TIMEOUT_MS = '999'; // below minimum of 1000
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when timeout values are not valid numbers', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_MAX = 'not-a-number';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DB_POOL_IDLE_TIMEOUT_MS is not a valid number', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_IDLE_TIMEOUT_MS = 'invalid';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DB_POOL_CONNECTION_TIMEOUT_MS is not a valid number', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_CONNECTION_TIMEOUT_MS = 'invalid';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DB_STATEMENT_TIMEOUT_MS is not a valid number', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_STATEMENT_TIMEOUT_MS = 'invalid';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DB_LOCK_TIMEOUT_MS is not a valid number', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_LOCK_TIMEOUT_MS = 'invalid';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when DB_IDLE_IN_TRANSACTION_TIMEOUT_MS is not a valid number', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS = 'invalid';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });

    it('should throw error when timeout values are negative', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_IDLE_TIMEOUT_MS = '-1000';
      expect(() => validateDbEnv()).toThrow('Database environment validation failed');
    });
  });

  describe('getDbEnv', () => {
    it('should return cached environment after first validation', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      
      const env1 = getDbEnv();
      const env2 = getDbEnv();
      
      expect(env1).toBe(env2); // Same reference (cached)
    });

    it('should call validateDbEnv if not cached', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      
      const env = getDbEnv();
      expect(env.DATABASE_URL).toBe('postgresql://user:password@localhost:5432/testdb');
    });
  });

  describe('getDatabaseConfig', () => {
    it('should return properly structured database configuration', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      process.env.DB_POOL_MAX = '15';
      process.env.DB_POOL_IDLE_TIMEOUT_MS = '25000';
      process.env.DB_POOL_CONNECTION_TIMEOUT_MS = '4000';
      process.env.DB_STATEMENT_TIMEOUT_MS = '35000';
      process.env.DB_LOCK_TIMEOUT_MS = '6000';
      process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS = '70000';

      const config = getDatabaseConfig();
      
      expect(config).toEqual({
        connectionString: 'postgresql://user:password@localhost:5432/testdb',
        pool: {
          max: 15,
          idleTimeoutMillis: 25000,
          connectionTimeoutMillis: 4000,
        },
        timeouts: {
          statementTimeout: 35000,
          lockTimeout: 6000,
          idleInTransactionSessionTimeout: 70000,
        },
      });
    });

    it('should use default values when not specified', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';

      const config = getDatabaseConfig();
      
      expect(config.pool.max).toBe(20);
      expect(config.pool.idleTimeoutMillis).toBe(30000);
      expect(config.pool.connectionTimeoutMillis).toBe(5000);
      expect(config.timeouts.statementTimeout).toBe(30000);
      expect(config.timeouts.lockTimeout).toBe(5000);
      expect(config.timeouts.idleInTransactionSessionTimeout).toBe(60000);
    });
  });

  describe('resetDbEnv', () => {
    it('should clear cached environment', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
      
      const env1 = getDbEnv();
      resetDbEnv();
      const env2 = getDbEnv();
      
      expect(env1).not.toBe(env2); // Different references after reset
    });
  });
});
