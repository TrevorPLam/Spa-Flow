---
name: caching-strategy
description: Implementing Redis caching for performance optimization with proper cache invalidation strategies
---

# Caching Strategy

This skill covers implementing Redis caching for performance optimization in the Spa-Flow repository with proper cache invalidation strategies.

## Key Concepts

### Cache Key Patterns
- `client:search:{query}` - Client search results
- `client:{id}` - Individual client details
- `dashboard:summary` - Dashboard summary data
- `lockers:occupancy` - Locker occupancy data
- `rooms:occupancy` - Room occupancy data
- Consistent naming convention
- Include relevant parameters in key

### TTL Configuration
- Search results: 1 minute (fast-changing data)
- Client details: 5 minutes (moderately changing)
- Dashboard data: 5 minutes (aggregated data)
- Occupancy data: 1 minute (real-time status)
- Configurable per cache type
- Balance between freshness and performance

### Cache Invalidation After Mutations
- Invalidate cache after resource modifications
- Required for clients, lockers, rooms, transactions
- Use cache helper functions in `lib/cache.ts`
- Invalidate specific keys or patterns
- Prevents serving stale data

### Cache Helper Functions
- `cacheGet(key)` - Retrieve from cache
- `cacheSet(key, value, ttl)` - Store in cache
- `cacheDelete(key)` - Delete specific key
- `cacheDeletePattern(pattern)` - Delete by pattern
- `invalidateCache(resourceType, resourceId)` - High-level invalidation

### Cache Statistics Logging
- Log cache hit/miss rates
- Track cache key usage
- Monitor cache memory usage
- Log every hour via background job
- Identify cache optimization opportunities

### Cache Miss Handling
- Fallback to database query
- Populate cache on miss
- Handle cache unavailability gracefully
- Continue operation when Redis down
- Log cache failures

### Redis Connection Configuration
- Environment variable: `REDIS_URL`
- Connection pooling
- Automatic reconnection
- Timeout configuration
- Error handling

### Cache Warming Strategies
- Pre-populate frequently accessed data
- Warm cache on application startup
- Warm cache after deployments
- Identify hot paths from metrics
- Schedule periodic cache warming

### Cache Invalidation for Specific Resources
- **Clients**: Invalidate on create, update, delete
- **Lockers**: Invalidate on assign, release, renew, extend
- **Rooms**: Invalidate on assign, release, renew, extend
- **Transactions**: Invalidate on create (affects dashboard)

## Key Files
- `artifacts/api-server/src/lib/cache.ts` - Cache helpers
- `artifacts/api-server/src/routes/clients.ts` - Client search caching
- `artifacts/api-server/src/routes/dashboard.ts` - Dashboard caching

## References
- `AGENTS.md` - Cache invalidation rules

## Common Tasks

### Using Cache Helpers
```typescript
import { cacheGet, cacheSet, invalidateCache } from '../lib/cache';

// Get from cache
const cached = await cacheGet(`client:${clientId}`);
if (cached) return cached;

// Fallback to database
const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });

// Set cache
await cacheSet(`client:${clientId}`, client, 300); // 5 min TTL
```

### Invalidating Cache
```typescript
import { invalidateCache } from '../lib/cache';

// After mutation
await invalidateCache('client', clientId);
```

### Cache Miss Pattern
```typescript
async function getClientWithCache(id: string) {
  const cached = await cacheGet(`client:${id}`);
  if (cached) return cached;

  const client = await db.query.clients.findFirst({ where: eq(clients.id, id) });
  if (client) {
    await cacheSet(`client:${id}`, client, 300);
  }
  return client;
}
```

### Pattern Deletion
```typescript
import { cacheDeletePattern } from '../lib/cache';

// Invalidate all client search caches
await cacheDeletePattern('client:search:*');
```

## Best Practices
- Always invalidate after mutations
- Use appropriate TTL for data freshness
- Handle cache failures gracefully
- Monitor cache hit/miss rates
- Use consistent key patterns
- Never cache sensitive data
- Log cache statistics regularly
