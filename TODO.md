# SpaFlow Development Tasks

## Task 1: Transaction Integrity
- [x] BUG-001 | Status: COMPLETED | Priority: CRITICAL

### Related Files
`artifacts/api-server/src/routes/lockers.ts`, `artifacts/api-server/src/routes/rooms.ts`, `artifacts/api-server/src/routes/checkin.ts`, `artifacts/api-server/src/routes/clients.ts`

### Definition of Done
Multi-step operations atomic with rollback on failure: locker release, room release with waitlist, check-in with SELECT FOR UPDATE, membership addition, client update.

### Out of Scope
Distributed transactions, event sourcing

### Rules to Follow
Wrap multi-table ops in transactions, use SELECT FOR UPDATE for race conditions, ensure atomicity, log transaction failures.

### Advanced Coding Pattern
Transaction boundary at service layer with retry logic

### Anti-Patterns
Individual inserts without transaction, race conditions, silent failures

### Subtasks
#### BUG-001.1
**Target**: `artifacts/api-server/src/routes/lockers.ts:197-252`
Wrap session update and locker status update in transaction.

#### BUG-001.2
**Target**: `artifacts/api-server/src/routes/rooms.ts:198-260`
Wrap room release and assignNextWaitlistEntry in transaction.

#### BUG-001.3
**Target**: `artifacts/api-server/src/routes/checkin.ts:56-69`
Use SELECT FOR UPDATE for locker availability check.

#### BUG-001.4
**Target**: `artifacts/api-server/src/routes/clients.ts:345-356`
Wrap membership insert and client status update in transaction.

#### BUG-001.5
**Target**: `artifacts/api-server/src/routes/clients.ts:261-282`
Wrap client update and cache invalidation in transaction.

#### BUG-001.6
**Target**: Manual verification
Test concurrent resource assignment, rollback, edge cases.

---

## Task 2: Security Middleware
- [x] SEC-006 | Status: COMPLETED | Priority: CRITICAL

### Related Files
`artifacts/api-server/src/app.ts`

### Definition of Done
Helmet configured, body size limited to 1MB, CSP/HSTS headers set, CSRF protection added, security headers tested.

### Out of Scope
Custom security policies, WAF integration

### Rules to Follow
Use helmet, limit body size, configure CSP, enable HSTS in production, add CSRF for cookie auth.

### Advanced Coding Pattern
Security middleware composition

### Anti-Patterns
Missing headers, unlimited body, permissive CSP, no CSRF

### Subtasks
#### SEC-006.1
**Target**: `artifacts/api-server/src/app.ts`
Install and configure helmet middleware.

#### SEC-006.2
**Target**: `artifacts/api-server/src/app.ts:52`
Add body size limit to express.json middleware.

#### SEC-006.3
**Target**: `artifacts/api-server/src/app.ts`
Configure CSP, HSTS, X-Frame-Options via helmet.

#### SEC-006.4
**Target**: `artifacts/api-server/src/app.ts`
Add CSRF protection middleware for cookie-based auth.

#### SEC-006.5
**Target**: Manual verification
Verify headers via browser dev tools.

---

## Task 3: Rate Limiting Coverage
- [x] SEC-004 | Status: COMPLETED | Priority: CRITICAL

### Related Files
`artifacts/api-server/src/routes/clients.ts`, `artifacts/api-server/src/routes/users.ts`, `artifacts/api-server/src/routes/products.ts`, `artifacts/api-server/src/routes/audit.ts`

### Definition of Done
Rate limiters on all sensitive endpoints: PATCH/POST clients, all user endpoints, product mutations, audit logs.

### Out of Scope
Distributed rate limiting, Redis-based rate limiting

### Rules to Follow
Use user-based limiting for auth endpoints, include rate limit info in headers, log violations, consistent patterns.

### Advanced Coding Pattern
Middleware composition with endpoint-specific limiters

### Anti-Patterns
Missing rate limiting on sensitive endpoints, inconsistent configurations

### Subtasks
#### SEC-004.1
**Target**: `artifacts/api-server/src/routes/clients.ts:223`
Add apiLimiter to PATCH /clients/:id.

#### SEC-004.2
**Target**: `artifacts/api-server/src/routes/clients.ts:318`
Add apiLimiter to POST /clients/:id/memberships.

#### SEC-004.3
**Target**: `artifacts/api-server/src/routes/users.ts`
Add apiLimiter to GET, POST, PATCH, DELETE /users.

#### SEC-004.4
**Target**: `artifacts/api-server/src/routes/products.ts`
Add apiLimiter to POST, PATCH, DELETE /products.

#### SEC-004.5
**Target**: `artifacts/api-server/src/routes/audit.ts:9`
Add apiLimiter to GET /audit-logs.

---

## Task 4: Credential Security
- [x] SEC-015 | Status: COMPLETED | Priority: CRITICAL

### Related Files
`artifacts/api-server/src/routes/health.ts`

### Definition of Done
Twilio credentials removed from inline health check, credentials fetched from secure config, no credential exposure in logs.

### Out of Scope
Credential rotation system, secret management service

### Rules to Follow
Never inline credentials, fetch from environment, avoid logging sensitive data, use secure credential storage.

### Advanced Coding Pattern
Credential injection pattern with environment-based config

### Anti-Patterns
Inline credentials, credential logging, hardcoded secrets

### Subtasks
#### SEC-015.1
**Target**: `artifacts/api-server/src/routes/health.ts:95`
Extract Twilio credentials to environment variables, remove inline Basic Auth construction.

#### SEC-015.2
**Target**: `artifacts/api-server/src/routes/health.ts`
Add credential validation before health check execution.

#### SEC-015.3
**Target**: Manual verification
Verify credentials not exposed in logs or responses.

---

## Task 5: Database Schema
- [x] DB-001 | Status: COMPLETED | Priority: HIGH

### Related Files
`lib/db/src/schema/audit_logs.ts`, `lib/db/src/schema/memberships.ts`

### Definition of Done
Indexes on audit_logs (userId, action, createdAt), foreign key on memberships.transactionId, migration generated and applied.

### Out of Scope
Full-text search indexes, partial indexes

### Rules to Follow
Index columns used in WHERE/ORDER BY, add foreign key constraints, test index performance.

### Advanced Coding Pattern
Query analysis to determine optimal indexes

### Anti-Patterns
Over-indexing, missing indexes on filtered columns, orphaned foreign keys

### Subtasks
#### DB-001.1
**Target**: `lib/db/src/schema/audit_logs.ts`
Add index on userId column.

#### DB-001.2
**Target**: `lib/db/src/schema/audit_logs.ts`
Add index on action column.

#### DB-001.3
**Target**: `lib/db/src/schema/audit_logs.ts`
Add index on createdAt column.

#### DB-001.4
**Target**: `lib/db/src/schema/memberships.ts:15`
Add foreign key constraint to transactions table with ON DELETE SET NULL.

#### DB-001.5
**Target**: `lib/db/`
Generate migration using Drizzle Kit, apply to database.

---

## Task 6: Environment Validation
- [x] CONFIG-001 | Status: COMPLETED | Priority: HIGH

### Related Files
`artifacts/api-server/src/lib/env.ts`, `.env.example`

### Definition of Done
ALLOWED_ORIGINS, REDIS_URL, SQUARE_*, TWILIO_*, LOG_LEVEL in envSchema, all vars documented in .env.example, validation tested.

### Out of Scope
Secret management service, runtime configuration reload

### Rules to Follow
Validate all required variables, provide defaults for optional, fail fast on missing, document all variables.

### Advanced Coding Pattern
Environment variable validation with Zod schema at entry point

### Anti-Patterns
Using undefined variables, missing documentation, silent failures

### Subtasks
#### CONFIG-001.1
**Target**: `artifacts/api-server/src/lib/env.ts`
Add ALLOWED_ORIGINS, REDIS_URL, SQUARE_*, TWILIO_*, LOG_LEVEL to envSchema.

#### CONFIG-001.2
**Target**: `.env.example`
Add missing Twilio configuration and LOG_LEVEL with documentation.

#### CONFIG-001.3
**Target**: Manual verification
Test startup with missing variables, invalid values, valid config.

---

## Task 7: Database Pool
- [ ] PERF-003.1 | Status: PENDING | Priority: HIGH

### Related Files
`lib/db/src/index.ts`

### Definition of Done
Pool max configured, idle timeout configured, connection timeout configured, query timeout configured, settings tested under load.

### Out of Scope
Connection pooling middleware, custom pool implementations

### Rules to Follow
Configure pool for production load, set appropriate query timeouts, monitor pool metrics, tune based on workload.

### Advanced Coding Pattern
Connection pooling with health checks

### Anti-Patterns
Default pool configuration, no query timeouts, unlimited connection growth

### Subtasks
#### PERF-003.1.1
**Target**: `lib/db/src/index.ts:13`
Configure pool with max, idleTimeoutMillis, connectionTimeoutMillis.

#### PERF-003.1.2
**Target**: `lib/db/src/index.ts`
Add statement_timeout configuration (30 seconds).

#### PERF-003.1.3
**Target**: Manual verification
Test pool behavior under concurrent load.

---

## Task 8: Error Sanitization
- [ ] SEC-005 | Status: PENDING | Priority: HIGH

### Related Files
`artifacts/api-server/src/lib/square.ts`

### Definition of Done
Square payment errors sanitized, sensitive info removed, user-friendly messages provided, error details logged server-side.

### Out of Scope
Custom error dashboard, error classification system

### Rules to Follow
Never expose raw API errors, sanitize before exposing, log full details server-side, provide generic messages to clients.

### Advanced Coding Pattern
Error boundary pattern with context enrichment

### Anti-Patterns
Exposing raw API errors, including sensitive data, no server-side logging

### Subtasks
#### SEC-005.1
**Target**: `artifacts/api-server/src/lib/square.ts:48`
Replace JSON.stringify(err) with sanitized error message, extract only safe details.

#### SEC-005.2
**Target**: Manual verification
Test payment failures, verify error messages sanitized.

---

## Task 9: Graceful Shutdown
- [ ] OPS-004 | Status: PENDING | Priority: HIGH

### Related Files
`artifacts/api-server/src/index.ts`

### Definition of Done
Graceful shutdown handler implemented, database connections closed, Redis connection closed, in-flight requests completed, logs flushed.

### Out of Scope
Zero-downtime deployments, blue-green deployments

### Rules to Follow
Handle SIGTERM/SIGINT, close connections gracefully, wait for in-flight requests, flush logs before exit.

### Advanced Coding Pattern
Graceful shutdown with connection draining

### Anti-Patterns
Immediate process exit, connection leaks, data loss during shutdown

### Subtasks
#### OPS-004.1
**Target**: `artifacts/api-server/src/index.ts`
Add SIGTERM/SIGINT signal handlers.

#### OPS-004.2
**Target**: `artifacts/api-server/src/index.ts`
Implement database connection pool shutdown.

#### OPS-004.3
**Target**: `artifacts/api-server/src/index.ts`
Implement Redis connection shutdown via closeCache().

#### OPS-004.4
**Target**: `artifacts/api-server/src/index.ts`
Add graceful timeout for in-flight requests.

#### OPS-004.5
**Target**: Manual verification
Test shutdown during active requests, verify connections closed.

---

## Task 10: DevOps Foundation
- [ ] DEVOPS-002 | Status: PENDING | Priority: HIGH

### Related Files
`lib/db/drizzle.config.ts`, `package.json`, `.github/workflows/`

### Definition of Done
Drizzle Kit configured, migration scripts in package.json, CI workflow created, initial migration generated, migration workflow documented.

### Out of Scope
Data migration scripts, schema branching

### Rules to Follow
Generate migrations via Drizzle Kit, review SQL before applying, test on copy of production, never modify applied migrations.

### Advanced Coding Pattern
Version-controlled schema evolution with rollback support

### Anti-Patterns
Manual schema changes, modifying applied migrations, no rollback capability

### Imports/Exports
```bash
drizzle-kit generate
drizzle-kit migrate
drizzle-kit push
```

### Depends On
None

### Blocks
None

### Subtasks
#### DEVOPS-002.1
**Target**: `lib/db/drizzle.config.ts`
Configure Drizzle Kit with database connection, schema path, migration output directory, PostgreSQL dialect.

#### DEVOPS-002.2
**Target**: `package.json`
Add npm scripts: migrate:generate, migrate:apply, migrate:rollback.

#### DEVOPS-002.3
**Target**: `lib/db/drizzle/`
Generate initial migration using drizzle-kit generate, review generated SQL.

#### DEVOPS-002.4
**Target**: `.github/workflows/ci.yml`
Create CI workflow: install deps, type check, tests, build.

#### DEVOPS-002.5
**Target**: `docs/migrations.md`
Document migration process, commands, troubleshooting, rollback.

---

## Task 11: Health Monitoring
- [ ] OPS-005 | Status: PENDING | Priority: HIGH

### Related Files
`artifacts/api-server/src/routes/health.ts`, `artifacts/api-server/src/app.ts`

### Definition of Done
Redis health check added, request ID middleware added, all critical dependencies monitored, health checks tested.

### Out of Scope
Distributed tracing, APM integration

### Rules to Follow
Check all critical dependencies, use unique request IDs for tracing, monitor health check latency.

### Advanced Coding Pattern
Health check pattern with dependency monitoring

### Anti-Patterns
Missing dependency checks, no request tracing, silent health check failures

### Subtasks
#### OPS-005.1
**Target**: `artifacts/api-server/src/routes/health.ts`
Add Redis health check function.

#### OPS-005.2
**Target**: `artifacts/api-server/src/routes/health.ts`
Integrate Redis check into readiness probe.

#### OPS-005.3
**Target**: `artifacts/api-server/src/app.ts`
Add request ID generation middleware.

#### OPS-005.4
**Target**: Manual verification
Test health checks with dependency failures, verify request IDs in logs.

---

## Task 12: Code Quality
- [ ] QUAL-001 | Status: PENDING | Priority: MEDIUM

### Related Files
Multiple route files, `artifacts/api-server/src/lib/constants.ts` (new)

### Definition of Done
Magic numbers extracted to constants, transaction error handling standardized, response formatting standardized, redundant type guards removed.

### Out of Scope
Complete code rewrite, linting rules enforcement

### Rules to Follow
Extract magic numbers to named constants, use consistent error handling, standardize response formats, remove redundant code.

### Advanced Coding Pattern
Configuration-driven constants, centralized error handling

### Anti-Patterns
Hard-coded values, inconsistent error handling, redundant type checks

### Subtasks
#### QUAL-001.1
**Target**: `artifacts/api-server/src/lib/constants.ts` (new)
Create constants file with LOCKER_TOTAL (167), ROOM_TOTAL (38), SESSION_DURATION_HOURS (6), EXTENSION_DURATION_HOURS (2), pricing constants.

#### QUAL-001.2
**Target**: Multiple route files
Replace all magic numbers with constants from constants.ts.

#### QUAL-001.3
**Target**: `artifacts/api-server/src/routes/clients.ts:261-282, 345-356`
Add logTransactionError to client update and membership addition.

#### QUAL-001.4
**Target**: Multiple route files
Standardize DELETE endpoints to use res.sendStatus(204).

#### QUAL-001.5
**Target**: `artifacts/api-server/src/routes/checkin.ts:214-223`
Remove redundant type guards after transaction completion.

---

## Task 13: Performance Optimization
- [ ] PERF-003.2 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/products.ts`, `artifacts/api-server/src/lib/cache.ts`

### Definition of Done
Products endpoint pagination implemented, cache miss/error tracking improved, product cache invalidation added, cache metrics accurate.

### Out of Scope
Full page caching, CDN integration

### Rules to Follow
Add pagination to list endpoints, improve cache monitoring, invalidate cache on mutations, distinguish miss from error.

### Advanced Coding Pattern
Pagination with cursor-based navigation, cache metrics

### Anti-Patterns
Unpaginated list endpoints, cache errors conflated with misses, stale cache data

### Subtasks
#### PERF-003.2.1
**Target**: `artifacts/api-server/src/routes/products.ts:22-24`
Add pagination with page and limit query parameters.

#### PERF-003.2.2
**Target**: `artifacts/api-server/src/lib/cache.ts:80-85`
Distinguish between cache miss and cache error for monitoring.

#### PERF-003.2.3
**Target**: `artifacts/api-server/src/routes/products.ts`
Invalidate products cache on updates and deletions.

---

## Task 14: Frontend UX
- [ ] FEAT-003 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/spaflow/src/App.tsx`, `artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
React Error Boundary added, loading states for protected routes, inline validation errors in forms, hardcoded tax rate removed.

### Out of Scope
Complete UI redesign, mobile app development

### Rules to Follow
Handle errors gracefully, show loading indicators, provide clear validation feedback, fetch config from API.

### Advanced Coding Pattern
Error boundary pattern, loading skeletons, form validation

### Anti-Patterns
Blank screens during loading, silent errors, poor validation feedback

### Subtasks
#### FEAT-003.1
**Target**: `artifacts/spaflow/src/App.tsx`
Add React Error Boundary to catch runtime errors gracefully.

#### FEAT-003.2
**Target**: `artifacts/spaflow/src/App.tsx:31-36`
Return loading component instead of null during auth loading.

#### FEAT-003.3
**Target**: `artifacts/spaflow/src/pages/checkin.tsx`
Add inline validation error messages.

#### FEAT-003.4
**Target**: `artifacts/spaflow/src/pages/checkin.tsx:433`
Replace hardcoded "Tax (8.875%)" with value from API or environment.

---

## Task 15: Error Tracking
- [ ] OPS-002 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/app.ts`, `artifacts/api-server/src/lib/sentry.ts`

### Definition of Done
Sentry integration configured, error context captured (user, request, tags), performance monitoring enabled, source maps uploaded, error alerts configured.

### Out of Scope
Custom error dashboard, real user monitoring

### Rules to Follow
Capture stack traces and context, tag errors by route and user, filter noise, set appropriate alerting, protect sensitive data.

### Advanced Coding Pattern
Error boundary pattern with context enrichment

### Anti-Patterns
Capturing PII in errors, no error context, over-alerting

### Imports/Exports
```typescript
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
```

### Depends On
OPS-005 (Health Checks)

### Subtasks
#### OPS-002.1
**Target**: `artifacts/api-server/package.json`
Add @sentry/node and @sentry/tracing to dependencies.

#### OPS-002.2
**Target**: `artifacts/api-server/src/lib/sentry.ts`
Create Sentry initialization module with DSN, environment, release, performance monitoring.

#### OPS-002.3
**Target**: `artifacts/api-server/src/lib/sentry.ts`
Configure user context from JWT, add request context, add custom tags, filter sensitive data.

#### OPS-002.4
**Target**: `artifacts/api-server/src/app.ts`
Add Sentry request handler and error handler middleware.

#### OPS-002.5
**Target**: Sentry dashboard
Configure error alerting rules, notification channels.

#### OPS-002.6
**Target**: Build process
Configure source map upload to Sentry, enable source map generation.

---

## Task 16: E2E Testing
- [ ] TEST-003 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/spaflow/src/pages/`, `playwright.config.ts`

### Definition of Done
Playwright configured, check-in flow test, authentication flow test, client management test, resource management test.

### Out of Scope
Mobile-specific testing, accessibility testing

### Rules to Follow
Test critical user journeys, use page object model, test across browsers, keep tests maintainable, use test data fixtures.

### Advanced Coding Pattern
Page object model, test data factories, visual regression

### Anti-Patterns
Brittle selectors, testing implementation details, slow test suites

### Imports/Exports
```typescript
import { test, expect } from '@playwright/test';
import { CheckInPage } from './pages/CheckInPage';
```

### Depends On
TEST-002 (Integration Tests)

### Subtasks
#### TEST-003.1
**Target**: `playwright.config.ts`, `artifacts/spaflow/package.json`
Install Playwright, configure browsers, add E2E test script, set up CI integration.

#### TEST-003.2
**Target**: `tests/e2e/pages/`
Create page objects for CheckInPage, LoginPage, DashboardPage, ClientsPage, LockersPage, RoomsPage.

#### TEST-003.3
**Target**: `tests/e2e/auth.spec.ts`
Write authentication E2E test: login, logout, session persistence, redirect, unauthorized access.

#### TEST-003.4
**Target**: `tests/e2e/checkin.spec.ts`
Write check-in E2E test: client search, resource selection, membership, payment, success.

#### TEST-003.5
**Target**: `tests/e2e/clients.spec.ts`
Write client management E2E test: creation, search, editing, PII encryption, membership, deletion.

#### TEST-003.6
**Target**: `tests/e2e/resources.spec.ts`
Write resource management E2E test: assignment, release, renewal, extension, waitlist.

---

## Task 17: Load Testing
- [ ] PERF-004 | Status: PENDING | Priority: MEDIUM

### Related Files
Load test scripts (new)

### Definition of Done
Load testing configured (k6 or Artillery), critical endpoints load tested, performance baselines established, load tests integrated with CI.

### Out of Scope
Stress testing to failure, chaos engineering

### Rules to Follow
Test realistic load patterns, monitor resource usage, establish baselines, detect regressions.

### Advanced Coding Pattern
Load testing as code, performance monitoring

### Anti-Patterns
No load testing, load testing in production, no baselines

### Subtasks
#### PERF-004.1
**Target**: Load test configuration
Set up k6 or Artillery, configure test scenarios.

#### PERF-004.2
**Target**: Load test scripts
Create load tests for check-in, client search, dashboard, critical endpoints.

#### PERF-004.3
**Target**: Manual verification
Run load tests, establish baselines, document expected response times and throughput.

#### PERF-004.4
**Target`: CI pipeline
Add load tests to CI pipeline, run on schedule or before deployments.

---

## Task 18: API Design
- [ ] API-001 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/index.ts`, `lib/api-spec/openapi.yaml`

### Definition of Done
API versioning implemented (/api/v1), OpenAPI documentation generated, API documentation accessible, breaking changes documented.

### Out of Scope
Multiple API versions simultaneously, API gateway

### Rules to Follow
Version API endpoints, generate documentation from code, document breaking changes, use semantic versioning.

### Advanced Coding Pattern
API versioning with automated documentation generation

### Anti-Patterns
No API versioning, manual documentation, undocumented breaking changes

### Subtasks
#### API-001.1
**Target**: `artifacts/api-server/src/routes/index.ts`
Mount all routes under /api/v1 prefix.

#### API-001.2
**Target**: `lib/api-spec/openapi.yaml`
Integrate automatic OpenAPI documentation generation.

#### API-001.3
**Target**: `artifacts/api-server/src/routes/`
Add endpoint to serve OpenAPI documentation.

---

## Task 19: Square API Configuration
- [ ] DEPS-001 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/lib/square.ts`, `artifacts/api-server/src/routes/health.ts`

### Definition of Done
Square API version updated to latest stable, version configurable via environment variable, version documented in .env.example, tested.

### Out of Scope
Multiple payment provider support, payment abstraction layer

### Rules to Follow
Use latest stable API version, make version configurable, document requirements, test before deploying.

### Advanced Coding Pattern
Configuration-driven API versioning

### Anti-Patterns
Hardcoded outdated versions, undocumented changes

### Subtasks
#### DEPS-001.1
**Target**: `artifacts/api-server/src/lib/square.ts:33`, `artifacts/api-server/src/routes/health.ts:52`
Update Square-Version header to latest stable version.

#### DEPS-001.2
**Target**: `artifacts/api-server/src/lib/env.ts`, `.env.example`
Add SQUARE_API_VERSION to envSchema and .env.example, use in square.ts and health.ts.

#### DEPS-001.3
**Target**: Manual verification
Test Square integration with updated API version.
