# Database Index Strategy

## Overview
This document describes the database index strategy for SpaFlow, including existing indexes, their purpose, and recommendations for future optimizations.

## Existing Indexes

### clients Table
| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_clients_email` | email | Fast client lookup by email for authentication |
| `idx_clients_phone` | phone | Fast client lookup by phone number |
| `idx_clients_member_id` | member_id | Fast client lookup by membership ID |
| `idx_clients_created_at` | created_at | Time-based queries and sorting |

**Rationale:** Client search is a frequent operation, especially during check-in. Email and phone are primary search fields. Member ID is used for membership validation. Created_at supports date-range queries for reporting.

### rental_sessions Table
| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_rental_sessions_client_status` | client_id, status | Active session queries per client |
| `idx_rental_sessions_resource` | resource_type, resource_id, status | Resource availability checks |
| `idx_rental_sessions_client_id` | client_id | Foreign key performance for cascade delete |
| `idx_rental_sessions_status` | status | Filtering active sessions for cleanup jobs |

**Rationale:** Composite index on (client_id, status) optimizes the common query pattern of finding active sessions for a client. Resource composite index supports availability checks with row-level locking. Status index is critical for the 5-minute cron job that expires sessions.

### transactions Table
| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_transactions_client_created` | client_id, created_at | Client transaction history with date range |
| `idx_transactions_created_at` | created_at | Dashboard recent transactions display |
| `idx_transactions_client_id` | client_id | Foreign key performance for cascade delete |
| `idx_transactions_status` | status | Pending transaction queries |
| `idx_transactions_original_transaction` | original_transaction_id | Refund transaction lookups |

**Rationale:** Composite index on (client_id, created_at) supports the most common transaction query pattern. Created_at index powers the dashboard. Status index is needed for payment processing workflows.

## Index Performance Monitoring

### Using pg_stat_statements
Run the query analysis script to identify slow queries:
```bash
DATABASE_URL="postgresql://..." pnpm run query-analysis
```

This script will:
- Identify slow queries (total_time > 1s)
- Identify frequently called slow queries (calls > 100, mean_time > 10ms)
- Identify queries with low cache hit rate (< 80%)
- Suggest potential indexes based on query patterns

### Index Usage Statistics
Check index usage with:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Index Maintenance

### Reindexing
Indexes should be reindexed periodically to prevent bloat:
```sql
REINDEX INDEX idx_clients_email;
REINDEX INDEX idx_rental_sessions_client_status;
-- etc.
```

Or reindex all indexes in a table:
```sql
REINDEX TABLE clients;
REINDEX TABLE rental_sessions;
REINDEX TABLE transactions;
```

### Analyze Tables
Run ANALYZE after bulk data changes to update statistics:
```sql
ANALYZE clients;
ANALYZE rental_sessions;
ANALYZE transactions;
```

## Recommendations

### Current State
The existing indexes are comprehensive and well-designed for the current query patterns. No additional indexes are needed at this time.

### Future Considerations
If query analysis reveals performance issues, consider:

1. **Partial Indexes**: For queries that filter on a specific value
   ```sql
   CREATE INDEX idx_rental_sessions_active 
   ON rental_sessions(client_id, resource_id) 
   WHERE status = 'active';
   ```

2. **Covering Indexes**: To avoid table lookups
   ```sql
   CREATE INDEX idx_transactions_covering 
   ON transactions(client_id, created_at) 
   INCLUDE (amount, total, type);
   ```

3. **GIN Indexes**: For full-text search if implemented
   ```sql
   CREATE INDEX idx_clients_name_gin 
   ON clients USING gin(to_tsvector('english', name));
   ```

### Index Size Monitoring
Monitor index size to prevent bloat:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Performance Targets

Based on load testing baselines:
- Client search queries: < 300ms (p95)
- Dashboard queries: < 500ms (p95)
- Resource availability queries: < 500ms (p95)
- Transaction history queries: < 300ms (p95)

If queries exceed these targets, run the query analysis script to identify optimization opportunities.

## Related Documentation
- [Query Analysis Script](../scripts/query-analysis.ts)
- [Load Testing README](../load-tests/README.md)
- [Performance Testing Documentation](./performance-testing.md)
