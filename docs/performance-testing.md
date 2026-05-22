# Performance Testing Documentation

## Overview

This document describes the performance testing strategy, baselines, and targets for the SpaFlow API. Performance testing ensures the system can handle expected load and identifies regressions before they impact production.

## Performance Testing Tools

### k6 (Load Testing)
- **Purpose**: API load testing and stress testing
- **Location**: `load-tests/`
- **Scripts**:
  - `smoke.js` - Quick validation of critical endpoints
  - `health-check.js` - Health endpoint performance
  - `client-search.js` - Client search under load
  - `dashboard.js` - Dashboard endpoint under load
  - `checkin-flow.js` - Concurrent check-in simulation
  - `benchmark.js` - Comprehensive endpoint benchmarking
  - `peak-hours.js` - Peak hours stress testing

### pg_stat_statements (Query Analysis)
- **Purpose**: Database query performance analysis
- **Location**: `scripts/query-analysis.ts`
- **Usage**: Identifies slow queries, missing indexes, and cache hit rates

## Performance Baselines

### Critical Endpoints (Smoke Test)

| Endpoint | p95 Response Time | Error Rate | Load | Purpose |
|----------|-------------------|------------|------|---------|
| `/healthz/live` | < 200ms | < 1% | 5 VUs, 30s | Liveness check |
| `/healthz/ready` | < 200ms | < 1% | 5 VUs, 30s | Readiness check |
| `/clients` (limit=10) | < 200ms | < 1% | 5 VUs, 30s | Client list |

**Smoke Test Configuration**:
- Virtual Users: 5
- Duration: 30 seconds
- Thresholds: p95 < 200ms, error rate < 1%
- Runs on: Every PR (fast feedback)

### Health Check Test

| Endpoint | p95 Response Time | Error Rate | Load |
|----------|-------------------|------------|------|
| `/healthz/live` | < 100ms | < 1% | 10 VUs, 30s |

**Configuration**:
- Virtual Users: 10
- Duration: 30 seconds
- Thresholds: p95 < 100ms, error rate < 1%

### Client Search Test

| Endpoint | p95 Response Time | Error Rate | Load |
|----------|-------------------|------------|------|
| `/clients` (search) | < 300ms | < 1% | Ramp to 50 VUs, 90s |

**Configuration**:
- Stages: 0 → 50 VUs over 90s
- Thresholds: p95 < 300ms, error rate < 1%
- Purpose: Test client search with pagination

### Dashboard Test

| Endpoint | p95 Response Time | Error Rate | Load |
|----------|-------------------|------------|------|
| `/dashboard` | < 500ms | < 1% | Ramp to 30 VUs, 90s |

**Configuration**:
- Stages: 0 → 30 VUs over 90s
- Thresholds: p95 < 500ms, error rate < 1%
- Purpose: Test dashboard aggregation under load

### Check-in Flow Test

| Endpoint | p95 Response Time | Error Rate | Load |
|----------|-------------------|------------|------|
| `/pricing/calculate` | < 300ms | < 5% | 20 VUs, 60s |
| `/lockers` | < 500ms | < 5% | 20 VUs, 60s |
| `/rooms` | < 500ms | < 5% | 20 VUs, 60s |

**Configuration**:
- Stages: 0 → 20 VUs over 30s, sustain 60s
- Thresholds: p95 < 1500ms overall, error rate < 5%
- Purpose: Test row-level locking and resource contention
- Special: Tests concurrent check-in scenarios

### Peak Hours Stress Test

| Endpoint | p95 Response Time | Error Rate | Load |
|----------|-------------------|------------|------|
| `/dashboard` | < 800ms | < 10% | 100 VUs, 3m |
| `/clients` | < 500ms | < 10% | 100 VUs, 3m |
| `/lockers` | < 1000ms | < 10% | 100 VUs, 3m |
| `/rooms` | < 1000ms | < 10% | 100 VUs, 3m |
| `/healthz/live` | < 200ms | < 10% | 100 VUs, 3m |

**Configuration**:
- Stages: 0 → 100 VUs over 2m, sustain 3m
- Thresholds: p95 < 1000ms overall, error rate < 10%
- Purpose: Test system stability under peak traffic (~100 req/s)
- Traffic Mix: 40% dashboard, 30% clients, 20% lockers/rooms, 10% health

### Comprehensive Benchmark

| Endpoint Category | p95 Response Time | p99 Response Time |
|-------------------|-------------------|-------------------|
| Health endpoints | < 200ms | < 500ms |
| Client endpoints | < 300ms | < 1000ms |
| Resource endpoints | < 500ms | < 1000ms |
| Dashboard | < 500ms | < 1000ms |
| Transactions | < 300ms | < 1000ms |

**Configuration**:
- Stages: 0 → 20 VUs over 30s, sustain 2m
- Thresholds: p95 < 500ms, p99 < 1000ms, error rate < 1%
- Purpose: Benchmark all API endpoints

## Performance Targets

### Response Time Targets

| Priority | Endpoint | Target (p95) | Target (p99) |
|----------|----------|-------------|-------------|
| Critical | Health checks | 100ms | 200ms |
| Critical | Client search | 300ms | 500ms |
| High | Dashboard | 500ms | 1000ms |
| High | Resource availability | 500ms | 1000ms |
| Medium | Transactions | 300ms | 1000ms |
| Medium | Reports | 1000ms | 2000ms |

### Throughput Targets

| Scenario | Target Throughput | Notes |
|----------|-------------------|-------|
| Normal operations | 50 req/s | Typical business hours |
| Peak hours | 100 req/s | Maximum expected load |
| Stress test | 150 req/s | Breaking point identification |

### Error Rate Targets

| Scenario | Max Error Rate | Notes |
|----------|----------------|-------|
| Smoke tests | 1% | Critical endpoints must be reliable |
| Load tests | 1% | Normal operations |
| Stress tests | 10% | Allow higher errors under extreme load |
| Check-in flow | 5% | Complex multi-step operations |

## Running Performance Tests

### Locally

```bash
# Ensure API server is running
cd artifacts/api-server
pnpm run dev

# In another terminal, run specific tests
pnpm run test:load:smoke
pnpm run test:load:health
pnpm run test:load:clients
pnpm run test:load:dashboard
pnpm run test:load:checkin

# Run all load tests
pnpm run test:load:all

# Run benchmark
k6 run load-tests/benchmark.js

# Run peak hours stress test
k6 run load-tests/peak-hours.js
```

### With Custom API URL

```bash
API_BASE_URL=http://localhost:5000/api/v1 k6 run load-tests/smoke.js
```

### Database Query Analysis

```bash
DATABASE_URL="postgresql://user:pass@host/db" pnpm run query-analysis
```

## Performance Regression Detection

### CI/CD Integration

Performance tests run in CI pipeline:
- **Smoke tests**: Every PR (fast feedback)
- **Load tests**: Every PR (full validation)
- **Performance regression check**: Compares against baseline

### Regression Thresholds

Performance regression is detected when:
- p95 response time degrades by > 20%
- Error rate increases by > 2%
- Throughput decreases by > 15%

### Baseline Management

Performance baselines are stored in `.performance-baseline.json` and cached in CI. Baselines are updated:
- After major performance improvements
- After infrastructure changes
- Manually when baselines are outdated

## Performance Optimization Strategy

### Database Optimization

1. **Query Analysis**: Run `query-analysis.ts` to identify slow queries
2. **Index Review**: Check `docs/database-indexes.md` for index strategy
3. **Cache Hit Rate**: Monitor pg_stat_statements cache hit rates
4. **Connection Pooling**: Ensure adequate connection pool size

### Application Optimization

1. **N+1 Queries**: Identify and fix with query analysis
2. **Caching**: Implement Redis caching for hot paths
3. **Pagination**: Ensure all list endpoints use pagination
4. **Lazy Loading**: Use lazy loading for non-critical data

### Infrastructure Optimization

1. **Horizontal Scaling**: Add API server instances under load
2. **Database Scaling**: Consider read replicas for reporting queries
3. **CDN**: Use CDN for static assets
4. **Load Balancing**: Ensure proper load balancer configuration

## Troubleshooting Performance Issues

### Slow Response Times

1. Run `query-analysis.ts` to identify slow queries
2. Check database connection pool utilization
3. Review cache hit rates
4. Check for memory leaks or resource exhaustion
5. Review application logs for errors

### High Error Rates

1. Check API server logs for error patterns
2. Verify database connectivity
3. Check Redis connection (if caching enabled)
4. Verify environment variables
5. Check rate limiting configuration

### Low Throughput

1. Check CPU and memory utilization
2. Review database connection pool limits
3. Check for network bottlenecks
4. Review application thread pool configuration
5. Consider horizontal scaling

## Performance Monitoring in Production

### Metrics to Monitor

- **Response Times**: p50, p95, p99 latency
- **Error Rates**: HTTP 4xx/5xx rates
- **Throughput**: Requests per second
- **Database**: Query times, connection pool utilization
- **Cache**: Hit rates, memory usage
- **System**: CPU, memory, disk I/O

### Alerting Thresholds

- **Critical**: p95 > 2s for 5 minutes
- **Warning**: p95 > 1s for 10 minutes
- **Critical**: Error rate > 5% for 5 minutes
- **Warning**: Error rate > 2% for 10 minutes

## Related Documentation

- [Database Index Strategy](./database-indexes.md)
- [Load Testing README](../load-tests/README.md)
- [API Specification](../lib/api-spec/openapi.yaml)
- [Architecture Documentation](./architecture.md)

## Performance Testing Best Practices

1. **Test Realistic Scenarios**: Simulate actual user behavior, not artificial load
2. **Use Production-like Data**: Test with realistic data volumes and distributions
3. **Monitor System Resources**: Track CPU, memory, disk, and network during tests
4. **Test Incrementally**: Start with low load and increase gradually
5. **Document Baselines**: Record performance baselines for regression detection
6. **Test Regularly**: Run performance tests regularly, not just before releases
7. **Analyze Results**: Don't just run tests - analyze and act on results
8. **Consider Variability**: Performance can vary; run multiple iterations

## Performance Testing Schedule

- **Smoke tests**: Every PR (automated)
- **Load tests**: Every PR (automated)
- **Peak hours test**: Weekly (manual or scheduled)
- **Benchmark**: Monthly (manual)
- **Query analysis**: Monthly (manual)
- **Full performance audit**: Quarterly (manual)
