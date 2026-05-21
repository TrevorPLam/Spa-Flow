---
trigger: glob
globs: artifacts/api-server/src/**/*.ts
---

# Redis Cache Invalidation Best Practices (2026)

## Current State
- Spa-Flow uses Redis 5.12.1 for caching
- Cache keys defined in `lib/cache.ts`
- Cache invalidated after mutating clients, lockers, rooms, transactions

## 2026 Best Practices
- **Critical Shift**: Event-driven invalidation is preferred over TTL-based
- Passive TTL-based invalidation is insufficient for real-time applications
- Tag-based invalidation for complex dependencies
- Cache-aside pattern is standard

## Invalidation Strategies

### Event-Driven Invalidation (Preferred)
```typescript
// ✅ Good: Event-driven invalidation
async function updateClient(clientId: string, data: ClientUpdate) {
  const client = await db.update(clients).set(data).where(eq(clients.id, clientId));
  
  // Immediately invalidate cache
  await redis.del(`client:${clientId}`);
  await redis.del('clients:search:*');
  await redis.del('dashboard:summary');
  
  return client;
}
```

### TTL-Based Invalidation (Passive)
```typescript
// ⚠️ Acceptable: TTL for rarely-changing data
await redis.set('config:features', JSON.stringify(features), { ex: 3600 });
```

### Tag-Based Invalidation (Complex Dependencies)
```typescript
// ✅ Good: Tag-based for complex invalidation
async function setCacheWithTags(key: string, value: any, tags: string[]) {
  await redis.set(key, JSON.stringify(value));
  for (const tag of tags) {
    await redis.sadd(`tag:${tag}`, key);
  }
}

async function invalidateByTag(tag: string) {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(`tag:${tag}`);
}
```

## Cache-Aside Pattern
```typescript
// ✅ Good: Cache-aside pattern
async function getClient(clientId: string) {
  const cacheKey = `client:${clientId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - fetch from database
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId)
  });
  
  // Populate cache
  if (client) {
    await redis.set(cacheKey, JSON.stringify(client), { ex: 300 });
  }
  
  return client;
}
```

## Cache Key Design
- **✅ Always Do**: Use hierarchical keys with colons
- **✅ Always Do**: Include resource type and identifier
- **✅ Always Do**: Use consistent naming conventions
- **❌ Never Do**: Use hardcoded keys throughout codebase

```typescript
// ✅ Good: Hierarchical keys
`client:${clientId}`
`clients:search:${query}`
`dashboard:summary`
`lockers:occupancy`

// ❌ Bad: Flat keys
`client123`
`search_results`
`dashboard_data`
```

## Invalidation Requirements
- **✅ Always Do**: Invalidate cache after mutating clients, lockers, rooms, or transactions
- **✅ Always Do**: Use cache helper functions in `lib/cache.ts`
- **✅ Always Do**: Invalidate dependent caches (e.g., dashboard when client changes)
- **✅ Always Do**: Use event-driven invalidation for real-time consistency
- **❌ Never Do**: Rely solely on TTL for frequently-changing data
- **❌ Never Do**: Forget to invalidate cache after mutations

## Cache Coherence
- **✅ Always Do**: Invalidate before or immediately after database update
- **✅ Always Do**: Use transactions for cache + database updates when possible
- **✅ Always Do**: Handle cache failures gracefully (never block on cache)
- **❌ Never Do**: Allow stale data to persist after database update

## Performance Considerations
- **✅ Always Do**: Use pipeline for multiple cache operations
- **✅ Always Do**: Set appropriate TTL (balance consistency and performance)
- **✅ Always Do**: Monitor cache hit rates
- **❌ Never Do**: Cache large objects without pagination
- **❌ Never Do**: Cache sensitive data without encryption

## Redis Configuration
- **✅ Always Do**: Configure max memory with eviction policy
- **✅ Always Do**: Use appropriate eviction policy (allkeys-lru is common)
- **✅ Always Do**: Monitor Redis memory usage
- **❌ Never Do**: Let Redis run out of memory

## References
- "How to Implement Smart Cache Invalidation with Redis" - OneUptime (March 2026)
- "How to Invalidate Redis Cache on Database Updates" - OneUptime (March 2026)
- Redis.io Cache Invalidation Glossary
