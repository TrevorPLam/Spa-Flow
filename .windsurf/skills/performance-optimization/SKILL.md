---
name: performance-optimization
description: Optimizing database queries, connection pooling, caching, and request handling for performance
---

# Performance Optimization

This skill covers optimizing database queries, connection pooling, caching, and request handling for performance in the Spa-Flow repository.

## Key Concepts

### Database Connection Pooling Configuration
- `DB_POOL_MAX`: Maximum connections (default: 20)
- `DB_POOL_IDLE_TIMEOUT_MS`: Idle connection timeout (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT_MS`: Connection acquisition timeout (default: 5000)
- Configured in lib/db/src/index.ts
- Balance between performance and resource usage

### Query Optimization with Proper Indexes
- Add indexes for WHERE, JOIN, and ORDER BY columns
- Composite indexes for multi-column queries
- Index selectivity considerations
- Monitor index usage
- Remove unused indexes

### Composite Index Strategies
- Index order matters for multi-column queries
- Leading column should be most selective
- Cover indexes for frequently accessed columns
- Partial indexes for filtered data
- Expression indexes for computed values

### N+1 Query Prevention
- Use joins instead of separate queries
- Use Drizzle relations for related data
- Batch queries when possible
- Use select specific columns
- Monitor query patterns

### Redis Caching for Hot Paths
- Cache frequently accessed data
- Client search results (1 min TTL)
- Client details (5 min TTL)
- Dashboard data (5 min TTL)
- Occupancy data (1 min TTL)
- Invalidate cache on mutations

### Cache Hit/Miss Monitoring
- Log cache statistics hourly
- Monitor hit/miss ratios
- Identify cache optimization opportunities
- Adjust TTL based on patterns
- Monitor cache memory usage

### Connection Timeout Configuration
- `DB_STATEMENT_TIMEOUT_MS`: Statement timeout (default: 30000)
- `DB_LOCK_TIMEOUT_MS`: Lock timeout (default: 5000)
- `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS`: Idle in transaction timeout (default: 60000)
- Prevents long-running queries
- Prevents deadlocks

### Statement Timeout Configuration
- Prevents runaway queries
- Configurable per query type
- Set appropriate limits
- Monitor timeout occurrences
- Optimize slow queries

### Lock Timeout Configuration
- Prevents deadlocks
- Configurable lock timeout
- Retry on lock timeout
- Monitor lock contention
- Optimize transaction patterns

### Request Timeout Middleware
- `REQUEST_TIMEOUT`: Request timeout (default: 30s)
- Configured in Express middleware
- Prevents hanging requests
- Returns 504 Gateway Timeout
- Appropriate timeout per endpoint

### Batch Operations
- Batch database inserts/updates
- Use Drizzle batch operations
- Reduce round trips
- Transaction for atomicity
- Monitor batch size

## Key Files
- `lib/db/src/index.ts` - Connection pooling
- `lib/db/src/schema/*.ts` - Index definitions
- `artifacts/api-server/src/lib/cache.ts` - Caching

## References
- `ANALYSIS.md` - Database connection setup

## Common Tasks

### Adding an Index
```typescript
export const posts = pgTable('posts', {
  // columns...
}, (table) => ({
  authorIdx: index('author_idx').on(table.authorId),
  statusIdx: index('status_idx').on(table.status),
  compositeIdx: index('composite_idx').on(table.authorId, table.status),
}));
```

### Preventing N+1 Queries
```typescript
// BAD: N+1 queries
const clients = await db.select().from(clients);
for (const client of clients) {
  const memberships = await db.select().from(memberships).where(eq(memberships.clientId, client.id));
}

// GOOD: Single query with join
const clientsWithMemberships = await db.query.clients.findMany({
  with: {
    memberships: true
  }
});
```

### Caching Hot Path Data
```typescript
import { cacheGet, cacheSet } from '../lib/cache';

const cached = await cacheGet('dashboard:summary');
if (cached) return cached;

const data = await fetchDashboardData();
await cacheSet('dashboard:summary', data, 300);
return data;
```

## Best Practices
- Monitor query performance
- Add indexes strategically
- Use caching for hot paths
- Configure appropriate timeouts
- Batch operations when possible
- Monitor cache hit/miss ratios
