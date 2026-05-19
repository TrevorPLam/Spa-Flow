import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';
import { getEnv } from './env';

// Cache metrics
interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  evictions: number;
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  evictions: 0,
};

// Redis client singleton
let redisClient: RedisClientType | null = null;

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    const env = getEnv();
    const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis error');
      metrics.errors++;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting');
    });

    // Connect immediately
    redisClient.connect().catch((err) => {
      logger.error({ err }, 'Failed to connect to Redis');
      metrics.errors++;
    });
  }
  return redisClient;
}

/**
 * Generic cache get operation with type safety
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const raw = await client.get(key);
    if (!raw) {
      metrics.misses++;
      return null;
    }
    metrics.hits++;
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.error({ error, key }, 'Cache get error');
    metrics.errors++;
    // Return null on error to allow fallback to database
    // Distinguish from cache miss by logging as error, not miss
    return null;
  }
}

/**
 * Generic cache set operation with TTL support
 */
export async function cacheSet<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    if (options.ttl) {
      await client.setEx(key, options.ttl, serialized);
    } else {
      await client.set(key, serialized, { EX: 60 }); // Set default TTL to 1 minute
    }
  } catch (error) {
    logger.error({ error, key }, 'Cache set error');
    metrics.errors++;
    // Don't throw - allow application to continue without cache
  }
}

/**
 * Generic cache delete operation
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    logger.error({ error, key }, 'Cache delete error');
    metrics.errors++;
  }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      metrics.evictions += keys.length;
    }
  } catch (error) {
    logger.error({ error, pattern }, 'Cache delete pattern error');
    metrics.errors++;
  }
}

/**
 * Cache-aside pattern wrapper
 * Checks cache first, falls back to fetch function, populates cache on miss
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T | null>
): Promise<T | null> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  const result = await fetchFn();

  // Cache the result if not null
  if (result !== null) {
    await cacheSet(key, result, { ttl });
  }

  return result;
}

/**
 * Build consistent cache keys
 */
export function buildCacheKey(entity: string, entityId: string, ...subKeys: string[]): string {
  const parts = [entity, entityId, ...subKeys];
  return parts.join(':');
}

/**
 * Get cache metrics
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...metrics };
}

/**
 * Log cache statistics periodically
 */
export function logCacheStats(): void {
  const total = metrics.hits + metrics.misses;
  const hitRate = total > 0 ? ((metrics.hits / total) * 100).toFixed(2) : '0.00';
  
  logger.info({
    hits: metrics.hits,
    misses: metrics.misses,
    errors: metrics.errors,
    evictions: metrics.evictions,
    hitRate: `${hitRate}%`,
  }, 'Cache statistics');
  
  // Log warning if error rate is high
  if (metrics.errors > 0) {
    const errorRate = ((metrics.errors / (metrics.hits + metrics.misses + metrics.errors)) * 100).toFixed(2);
    logger.warn({ errorRate: `${errorRate}%` }, 'Cache error rate detected - check Redis connectivity');
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
