# SpaFlow Development Tasks

## Task 1: CSRF Secret Validation
- [x] SEC-001 | Status: COMPLETED | Priority: HIGH

### Related Files
`artifacts/api-server/src/lib/env.ts`, `artifacts/api-server/src/app.ts`, `.env.example`

### Definition of Done
CSRF_SECRET validated in envSchema, documented in .env.example, fails fast on missing value, tested with multi-instance deployment.

### Out of Scope
Distributed CSRF token storage, custom CSRF implementations

### Rules to Follow
Validate all security-related environment variables, provide clear error messages, document generation commands, fail fast on startup.

### Advanced Coding Pattern
Security-first environment validation with Zod schema

### Anti-Patterns
Runtime fallback secrets, missing validation, silent failures

### Imports/Exports
```typescript
z.string().min(32, 'CSRF_SECRET must be at least 32 characters')
```

### Depends On
None

### Blocks
None

### Subtasks
#### SEC-001.1
**Target**: `artifacts/api-server/src/lib/env.ts`
Add CSRF_SECRET to envSchema with min 32 character validation, optional with default generation warning.

#### SEC-001.2
**Target**: `.env.example`
Add CSRF_SECRET documentation with generation command: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

#### SEC-001.3
**Target**: `artifacts/api-server/src/app.ts:33`
Remove fallback to csrfTokens.secretSync(), require validated env variable.

#### SEC-001.4
**Target**: Manual verification
Test startup with missing CSRF_SECRET, verify error message, test with valid secret.

---

## Task 2: Type Safety Enhancement
- [x] TYPE-001 | Status: COMPLETED | Priority: HIGH

### Related Files
`artifacts/api-server/src/middleware/rateLimit.ts`, `artifacts/api-server/src/lib/auth.ts`

### Definition of Done
AuthRequest interface defined and exported, rateLimit middleware uses typed Request, test files updated to use proper types, no remaining `any` usage in production code.

### Out of Scope
Express type definition modifications, third-party library type fixes

### Rules to Follow
Define proper TypeScript interfaces, avoid type assertions, use type guards, leverage TypeScript strict mode.

### Advanced Coding Pattern
Module augmentation for Express Request with proper typing

### Anti-Patterns
Type assertions with `as any`, loose typing, bypassing type checker

### Imports/Exports
```typescript
export interface AuthRequest extends Request { user?: AuthPayload }
```

### Depends On
None

### Blocks
None

### Subtasks
#### TYPE-001.1
**Target**: `artifacts/api-server/src/lib/auth.ts`
Ensure AuthRequest interface is exported, add proper JSDoc documentation.

#### TYPE-001.2
**Target**: `artifacts/api-server/src/middleware/rateLimit.ts`
Replace `(req as any).user` with proper type cast to AuthRequest in keyGenerator functions.

#### TYPE-001.3
**Target**: `artifacts/api-server/src/middleware/rateLimit.ts`
Define local AuthRequest interface if import not feasible, document type safety approach.

#### TYPE-001.4
**Target**: `artifacts/api-server/src/lib/auth.test.ts`
Update test mocks to use proper AuthRequest interface instead of `any`.

---

## Task 3: Sentry Version Alignment
- [x] DEPS-002 | Status: COMPLETED | Priority: MEDIUM

### Related Files
`artifacts/api-server/package.json`

### Definition of Done
Sentry packages aligned to same major version (v10.x), compatibility tested, no runtime errors, documentation updated.

### Completion Note
**CORRECTION APPLIED**: @sentry/tracing was removed (not upgraded) because the package was discontinued in Sentry SDK v8.0.0. Tracing functionality is now built directly into @sentry/node. All Sentry imports in the codebase use @sentry/node only. TypeScript compilation successful.

### Out of Scope
Downgrading to older major versions, custom Sentry builds

### Rules to Follow
Align major versions for related packages, test after upgrade, check breaking changes in changelog, update lockfile.

### Advanced Coding Pattern
Dependency version alignment strategy with peer dependency management

### Anti-Patterns
Major version mismatches, untested upgrades, ignoring changelog

### Imports/Exports
```json
"@sentry/node": "^10.53.1", "@sentry/tracing": "^10.53.1"
```

### Depends On
None

### Blocks
None

### Subtasks
#### DEPS-002.1
**Target**: `artifacts/api-server/package.json`
Update @sentry/tracing from ^7.120.4 to ^10.53.1 to match @sentry/node version.

#### DEPS-002.2
**Target**: `artifacts/api-server/src/lib/sentry.ts`
Review Sentry imports, update if package structure changed in v10, verify Tracing import compatibility.

#### DEPS-002.3
**Target**: Manual verification
Run pnpm install, test Sentry initialization, verify error tracking works, check performance monitoring.

---

## Task 4: Configuration Completeness
- [x] CONFIG-002 | Status: COMPLETED | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/lib/env.ts`, `artifacts/api-server/src/lib/sms.ts`, `.env.example`

### Definition of Done
TWILIO_PHONE_NUMBER added to envSchema, documented in .env.example, validated at startup, SMS functionality tested.

### Out of Scope
Multiple SMS provider support, dynamic phone number configuration

### Rules to Follow
Validate all used environment variables, document required format, provide validation error messages, fail fast on missing values.

### Advanced Coding Pattern
Exhaustive environment validation with Zod schema

### Anti-Patterns
Using undefined variables, silent failures, missing documentation

### Imports/Exports
```typescript
TWILIO_PHONE_NUMBER: z.string().optional()
```

### Depends On
None

### Blocks
None

### Subtasks
#### CONFIG-002.1
**Target**: `artifacts/api-server/src/lib/env.ts`
Add TWILIO_PHONE_NUMBER to envSchema as optional string with validation for phone format.

#### CONFIG-002.2
**Target**: `.env.example`
Add TWILIO_PHONE_NUMBER documentation with format requirements and Twilio console reference.

#### CONFIG-002.3
**Target**: `artifacts/api-server/src/lib/sms.ts:6`
Update to use validated TWILIO_PHONE_NUMBER from env instead of direct process.env access.

#### CONFIG-002.4
**Target**: Manual verification
Test SMS sending with valid phone number, test startup with missing phone number, verify graceful degradation.

---

## Task 5: Magic Number Elimination
- [x] QUAL-002 | Status: COMPLETED | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/dashboard.ts`, `artifacts/api-server/src/lib/constants.ts`

### Definition of Done
Hardcoded locker/room totals replaced with constants imports, constants.ts verified as single source of truth, dashboard displays correct totals.

### Out of Scope
Dynamic resource counting from database, runtime configuration

### Rules to Follow
Import constants from shared file, use named constants for all magic numbers, verify consistency across codebase.

### Advanced Coding Pattern
Single source of truth pattern for configuration constants

### Anti-Patterns
Hardcoded values scattered across files, magic numbers, duplication

### Imports/Exports
```typescript
import { LOCKER_TOTAL, ROOM_TOTAL } from '../lib/constants'
```

### Depends On
None

### Blocks
None

### Subtasks
#### QUAL-002.1
**Target**: `artifacts/api-server/src/routes/dashboard.ts:23,26`
Import LOCKER_TOTAL and ROOM_TOTAL from constants.ts, replace hardcoded 167 and 38.

#### QUAL-002.2
**Target**: `artifacts/api-server/src/lib/constants.ts`
Verify LOCKER_TOTAL and ROOM_TOTAL are exported and match actual database counts.

#### QUAL-002.3
**Target**: Manual verification
Test dashboard endpoint, verify occupancy calculations use constants, check for other hardcoded totals.

---

## Task 6: Race Condition Consistency
- [x] BUG-002 | Status: COMPLETED | Priority: HIGH

### Related Files
`artifacts/api-server/src/routes/lockers.ts`, `artifacts/api-server/src/routes/rooms.ts`

### Definition of Done
Locker assignment uses SELECT FOR UPDATE, both resource assignments have consistent race condition prevention, concurrent assignment tested.

### Out of Scope
Distributed locking, optimistic concurrency control

### Rules to Follow
Use SELECT FOR UPDATE for all resource assignments, test concurrent access, ensure transaction boundaries, log race condition detection.

### Advanced Coding Pattern
Pessimistic locking with SELECT FOR UPDATE for resource allocation

### Anti-Patterns
Inconsistent locking strategies, race conditions, lost updates

### Imports/Exports
```typescript
await db.execute(sql`SELECT * FROM lockers WHERE id = ${id} FOR UPDATE`)
```

### Depends On
None

### Blocks
None

### Subtasks
#### BUG-002.1
**Target**: `artifacts/api-server/src/routes/lockers.ts:89`
Add SELECT FOR UPDATE to locker availability check before assignment, similar to rooms.ts implementation.

#### BUG-002.2
**Target**: `artifacts/api-server/src/routes/lockers.ts:136`
Wrap locker assignment transaction with proper SELECT FOR UPDATE on lockers table.

#### BUG-002.3
**Target**: Manual verification
Test concurrent locker assignments, verify no double-booking, test rollback on failure.

---

## Task 7: Error Handling Improvement
- [x] ERR-001 | Status: COMPLETED | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/rooms.ts`, `artifacts/api-server/src/lib/audit.ts`

### Definition of Done
Waitlist assignment errors logged with context, retry mechanism implemented or documented, audit failures properly handled, no silent catches.

### Out of Scope
Automatic retry with exponential backoff, circuit breaker pattern

### Rules to Follow
Log all errors with context, avoid silent catches, provide meaningful error messages, handle audit log failures gracefully.

### Advanced Coding Pattern
Error boundary pattern with context logging and graceful degradation

### Anti-Patterns
Silent error swallowing, missing error context, no logging

### Imports/Exports
```typescript
logger.error({ err, roomId }, 'Failed to assign waitlist entry')
```

### Depends On
None

### Blocks
None

### Subtasks
#### ERR-001.1
**Target**: `artifacts/api-server/src/routes/rooms.ts:229-234`
Remove silent catch in waitlist assignment, log error with context, add retry or alert mechanism.

#### ERR-001.2
**Target**: `artifacts/api-server/src/lib/audit.ts`
Add structured error logging with request context for audit log failures.

#### ERR-001.3
**Target**: Manual verification
Test waitlist assignment failure scenarios, verify errors are logged, test audit failure handling.

---

## Task 8: Waitlist Schema Integrity
- [x] DB-002 | Status: COMPLETED | Priority: MEDIUM

### Related Files
`lib/db/src/schema/waitlist.ts`, `lib/db/drizzle/`

### Definition of Done
Unique constraint added on (status, position) combination, migration generated and applied, duplicate position prevention tested.

### Completion Note
**SCHEMA CHANGE COMPLETED**: Unique constraint `unique_waitlist_status_position` added to waitlist schema on (status, position) combination. Migration generation requires DATABASE_URL to be set - run `pnpm migrate:generate` from lib/db directory when database is available, then apply with `pnpm migrate:apply`. The schema change prevents duplicate positions within the same status at the database level, eliminating race condition vulnerabilities in the application-level position assignment logic.

### Out of Scope
Automatic position renumbering, position gaps management

### Rules to Follow
Add database constraints for data integrity, generate migration for schema changes, test constraint enforcement, document schema changes.

### Advanced Coding Pattern
Database-level integrity constraints with unique composite keys

### Anti-Patterns
Application-only validation, missing constraints, data inconsistency

### Imports/Exports
```typescript
.unique('unique_waitlist_status_position')
```

### Depends On
DEVOPS-002 (DevOps Foundation)

### Blocks
None

### Subtasks
#### DB-002.1
**Target**: `lib/db/src/schema/waitlist.ts`
Add unique constraint on (status, position) to prevent duplicate positions within same status.

#### DB-002.2
**Target**: `lib/db/drizzle/`
Generate migration using drizzle-kit generate for schema change.

#### DB-002.3
**Target**: Manual verification
Apply migration to database, test duplicate position prevention, verify constraint works.

---

## Task 9: Frontend Tax Rate Fix
- [x] FEAT-001 | Status: COMPLETED | Priority: MEDIUM

### Related Files
`artifacts/spaflow/src/pages/checkin.tsx`, `artifacts/api-server/src/routes/config.ts` (new)

### Definition of Done
Tax rate fetched from API or environment variable, no hardcoded fallback, frontend displays correct rate, backend rate source documented.

### Out of Scope
Dynamic tax rate by location, tax rate calculation engine

### Rules to Follow
Fetch configuration from API, provide environment fallback with validation, ensure frontend-backend consistency, document rate source.

### Advanced Coding Pattern
Configuration fetch pattern with environment fallback

### Anti-Patterns
Hardcoded values, inconsistent configuration sources, magic numbers

### Imports/Exports
```typescript
const taxRate = import.meta.env.VITE_TAX_RATE ? parseFloat(import.meta.env.VITE_TAX_RATE) : await fetchTaxRate()
```

### Depends On
None

### Blocks
None

### Subtasks
#### FEAT-001.1
**Target**: `artifacts/api-server/src/routes/config.ts` (new)
Create config endpoint to return tax rate and other frontend configuration values.

#### FEAT-001.2
**Target**: `artifacts/spaflow/src/pages/checkin.tsx:445`
Replace hardcoded 0.08875 fallback with API call or validated environment variable.

#### FEAT-001.3
**Target**: Manual verification
Test tax rate display, verify API returns correct rate, test environment variable fallback.

---

## Task 10: Logging Consistency
- [ ] OPS-001 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/lib/sentry.ts`, `artifacts/api-server/src/lib/env.ts`

### Definition of Done
All console.log/error replaced with logger instance, structured logging maintained, startup messages use logger, no console statements in production code.

### Out of Scope
Custom logging infrastructure, log aggregation setup

### Rules to Follow
Use configured logger instance, maintain structured logging, preserve log levels, avoid console statements.

### Advanced Coding Pattern
Centralized logging with pino structured logging

### Anti-Patterns
Mixed logging approaches, console statements in production, unstructured logs

### Imports/Exports
```typescript
logger.info('Sentry initialized successfully')
```

### Depends On
None

### Blocks
None

### Subtasks
#### OPS-001.1
**Target**: `artifacts/api-server/src/lib/sentry.ts:21,61`
Replace console.log with logger.info for Sentry initialization messages.

#### OPS-001.2
**Target**: `artifacts/api-server/src/lib/env.ts:61,63,65,69`
Replace console.error with logger.error for environment validation messages.

#### OPS-001.3
**Target**: Manual verification
Test startup logs, verify structured logging, check log output format.

---

## Task 11: Environment Variable Validation Consistency
- [ ] ENV-001 | Status: PENDING | Priority: HIGH

### Related Files
`artifacts/api-server/src/lib/auth.ts`, `artifacts/api-server/src/lib/square.ts`, `artifacts/api-server/src/lib/sms.ts`, `artifacts/api-server/src/lib/pricing.ts`, `artifacts/api-server/src/lib/encryption.ts`, `artifacts/api-server/src/routes/health.ts`, `lib/db/drizzle.config.ts`

### Definition of Done
All direct process.env access replaced with getEnv() calls, environment variables validated through Zod schema, consistent error handling across all modules.

### Out of Scope
Dynamic environment variable loading, runtime environment switching

### Rules to Follow
Use centralized env.ts for all environment access, validate at startup, provide clear error messages, avoid direct process.env access.

### Advanced Coding Pattern
Centralized environment variable management with Zod validation

### Anti-Patterns
Direct process.env access, bypassing validation, inconsistent error handling

### Imports/Exports
```typescript
import { getEnv } from './env'
const env = getEnv()
```

### Depends On
None

### Blocks
None

### Subtasks
#### ENV-001.1
**Target**: `artifacts/api-server/src/lib/auth.ts:7,41`
Replace process.env.JWT_SECRET and process.env.NODE_ENV with getEnv() calls.

#### ENV-001.2
**Target**: `artifacts/api-server/src/lib/square.ts:24-25`
Replace process.env.SQUARE_ACCESS_TOKEN and process.env.SQUARE_ENVIRONMENT with getEnv() calls.

#### ENV-001.3
**Target**: `artifacts/api-server/src/lib/sms.ts:4-6`
Replace process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, and process.env.TWILIO_PHONE_NUMBER with getEnv() calls.

#### ENV-001.4
**Target**: `artifacts/api-server/src/lib/pricing.ts:92`
Replace process.env.TAX_RATE with getEnv() call.

#### ENV-001.5
**Target**: `artifacts/api-server/src/lib/encryption.ts:9`
Replace process.env.ENCRYPTION_KEY with getEnv() call.

#### ENV-001.6
**Target**: `artifacts/api-server/src/routes/health.ts:33-34`
Replace process.env.SQUARE_ACCESS_TOKEN and process.env.SQUARE_ENVIRONMENT with getEnv() calls.

#### ENV-001.7
**Target**: `lib/db/drizzle.config.ts:4,12`
Replace process.env.DATABASE_URL with getEnv() call (may need to handle early initialization).

#### ENV-001.8
**Target**: Manual verification
Test startup with all environment variables, verify validation works, test with missing variables.

---

## Task 12: Missing Rate Limiting on Health Endpoints
- [ ] SEC-002 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/health.ts`, `artifacts/api-server/src/app.ts`

### Definition of Done
Health check endpoints have rate limiting, monitoring systems can still perform health checks, DoS protection in place.

### Out of Scope
Separate monitoring network, custom health check authentication

### Rules to Follow
Apply rate limiting to all public endpoints, allow higher limits for health checks, log rate limit violations.

### Advanced Coding Pattern
Rate limiting with path-specific configurations

### Anti-Patterns
Unlimited public endpoints, no rate limiting, missing monitoring

### Imports/Exports
```typescript
import { healthLimiter } from '../middleware/rateLimit'
router.get('/healthz/live', healthLimiter, ...)
```

### Depends On
None

### Blocks
None

### Subtasks
#### SEC-002.1
**Target**: `artifacts/api-server/src/middleware/rateLimit.ts`
Create healthLimiter with higher limits (e.g., 100 requests per minute) for monitoring systems.

#### SEC-002.2
**Target**: `artifacts/api-server/src/routes/health.ts`
Apply healthLimiter to /healthz/live and /healthz/ready endpoints.

#### SEC-002.3
**Target**: Manual verification
Test health checks with rate limiting, verify monitoring systems work, test rate limit enforcement.

---

## Task 13: CSRF Middleware Exemption for Health Endpoints
- [ ] SEC-003 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/app.ts`

### Definition of Done
Health endpoints exempt from CSRF middleware, monitoring systems can perform health checks without CSRF tokens, CSRF still enforced on protected routes.

### Out of Scope
Custom CSRF exemption logic, role-based CSRF bypass

### Rules to Follow
Exclude health endpoints from CSRF protection, maintain CSRF on authenticated routes, document exemption rationale.

### Advanced Coding Pattern
Conditional middleware application based on route path

### Anti-Patterns
Global CSRF on all routes, no exemption for health checks, monitoring failures

### Imports/Exports
```typescript
app.use((req, res, next) => {
  if (req.path.startsWith('/healthz')) return next()
  csrfMiddleware(req, res, next)
})
```

### Depends On
SEC-001 (CSRF Secret Validation)

### Blocks
None

### Subtasks
#### SEC-003.1
**Target**: `artifacts/api-server/src/app.ts:144-145`
Modify CSRF middleware to exclude /healthz/* paths.

#### SEC-003.2
**Target**: Manual verification
Test health checks without CSRF token, verify CSRF still enforced on protected routes, test monitoring integration.

---

## Task 14: Silent Error Handling in Encryption Module
- [ ] ERR-002 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/lib/encryption.ts`

### Definition of Done
Empty catch block in maybeDecrypt replaced with error logging, decryption failures properly tracked, debugging information available.

### Out of Scope
Automatic retry on decryption failure, key rotation on decryption errors

### Rules to Follow
Log all errors with context, avoid silent catches, provide debugging information, handle errors gracefully.

### Advanced Coding Pattern
Error logging with context and graceful degradation

### Anti-Patterns
Silent error swallowing, empty catch blocks, missing error context

### Imports/Exports
```typescript
} catch (err) {
  logger.error({ err }, 'Decryption failed')
  return null
}
```

### Depends On
OPS-001 (Logging Consistency)

### Blocks
None

### Subtasks
#### ERR-002.1
**Target**: `artifacts/api-server/src/lib/encryption.ts:66`
Add error logging to empty catch block in maybeDecrypt function.

#### ERR-002.2
**Target**: Manual verification
Test decryption failure scenarios, verify errors are logged, test graceful degradation.

---

## Task 15: Missing Frontend Environment Variable Documentation
- [x] ENV-002 | Status: COMPLETED | Priority: MEDIUM

### Related Files
`.env.example`, `artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
VITE_SQUARE_LOCATION_ID documented in .env.example, format requirements specified, Square console reference provided.

### Completion Note
**DOCUMENTATION ADDED**: VITE_SQUARE_LOCATION_ID added to .env.example with comprehensive documentation including format requirements (short generated string of letters and numbers, e.g., 3Z4V4WHQK64X9) and Square console reference (Developer Dashboard → Your Application → Locations). The variable is now properly documented alongside other Square configuration variables, matching the documentation pattern used for TWILIO_PHONE_NUMBER.

### Out of Scope
Multiple Square location support, dynamic location configuration

### Rules to Follow
Document all frontend environment variables, provide format requirements, include external service references.

### Advanced Coding Pattern
Comprehensive environment variable documentation

### Anti-Patterns
Missing documentation, undocumented variables, unclear format requirements

### Imports/Exports
```bash
VITE_SQUARE_LOCATION_ID=your_square_location_id
```

### Depends On
None

### Blocks
None

### Subtasks
#### ENV-002.1
**Target**: `.env.example`
Add VITE_SQUARE_LOCATION_ID documentation with Square console reference and format requirements.

#### ENV-002.2
**Target**: Manual verification
Verify documentation matches code usage, test with documented variable, check for other missing variables.

---

## Task 16: Missing Request Timeout Configuration
- [ ] PERF-001 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/app.ts`

### Definition of Done
Request timeout configured on Express app, slow requests terminated gracefully, timeout value documented.

### Out of Scope
Per-route timeout configuration, custom timeout handling

### Rules to Follow
Set reasonable timeout (e.g., 30s), handle timeout errors gracefully, document timeout value, log timeout events.

### Advanced Coding Pattern
Express timeout middleware with error handling

### Anti-Patterns
Unlimited request time, no timeout configuration, hanging requests

### Imports/Exports
```typescript
app.use(timeout('30s'))
```

### Depends On
None

### Blocks
None

### Subtasks
#### PERF-001.1
**Target**: `artifacts/api-server/src/app.ts`
Add express timeout middleware with 30 second timeout.

#### PERF-001.2
**Target**: Manual verification
Test slow requests, verify timeout enforcement, test timeout error handling.

---

## Task 17: Missing Graceful Shutdown Handler
- [ ] OPS-002 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/index.ts`

### Definition of Done
Graceful shutdown handler for SIGTERM/SIGINT, database connections closed, Redis connection closed, in-flight requests allowed to complete.

### Out of Scope
Zero-downtime deployments, custom signal handling

### Rules to Follow
Handle SIGTERM and SIGINT, close connections gracefully, wait for in-flight requests, log shutdown process.

### Advanced Coding Pattern
Graceful shutdown with connection cleanup and request draining

### Anti-Patterns
Abrupt shutdown, connection leaks, request abortion

### Imports/Exports
```typescript
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
```

### Depends On
None

### Blocks
None

### Subtasks
#### OPS-002.1
**Target**: `artifacts/api-server/src/index.ts`
Add graceful shutdown handler for SIGTERM and SIGINT signals.

#### OPS-002.2
**Target**: Manual verification
Test graceful shutdown, verify connections closed, verify requests complete.

---

## Task 18: Magic Numbers in Transactions Route
- [ ] QUAL-003 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/routes/transactions.ts`, `artifacts/api-server/src/lib/constants.ts`

### Definition of Done
Hardcoded pagination limit replaced with DEFAULT_PAGE_SIZE constant, consistent pagination across endpoints.

### Out of Scope
Per-endpoint pagination limits, dynamic pagination

### Rules to Follow
Use constants for all magic numbers, import from shared file, verify consistency.

### Advanced Coding Pattern
Single source of truth for configuration constants

### Anti-Patterns
Hardcoded values, magic numbers, duplication

### Imports/Exports
```typescript
import { DEFAULT_PAGE_SIZE } from '../lib/constants'
```

### Depends On
QUAL-002 (Magic Number Elimination)

### Blocks
None

### Subtasks
#### QUAL-003.1
**Target**: `artifacts/api-server/src/routes/transactions.ts:18,23`
Import DEFAULT_PAGE_SIZE from constants.ts, replace hardcoded 20.

#### QUAL-003.2
**Target**: Manual verification
Test pagination, verify constant usage, check for other hardcoded limits.

---

## Task 19: Missing Test Coverage for Critical Routes
- [ ] TEST-002 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/waitlist.ts`, `artifacts/api-server/src/routes/transactions.ts`, `artifacts/api-server/src/routes/products.ts`, `artifacts/api-server/src/routes/users.ts`, `artifacts/api-server/src/routes/audit.ts`

### Definition of Done
Test files created for untested routes, critical business logic covered, test coverage improved.

### Out of Scope
100% test coverage, integration tests, E2E tests

### Rules to Follow
Test happy path, test error cases, test edge cases, use proper mocking, follow existing test patterns.

### Advanced Coding Pattern
Comprehensive unit testing with Vitest

### Anti-Patterns
Untested critical code, missing error case tests, poor test coverage

### Imports/Exports
```typescript
import { describe, it, expect } from 'vitest'
```

### Depends On
None

### Blocks
None

### Subtasks
#### TEST-002.1
**Target**: `artifacts/api-server/src/routes/waitlist.test.ts` (new)
Create test file for waitlist routes covering CRUD operations and assignment logic.

#### TEST-002.2
**Target**: `artifacts/api-server/src/routes/transactions.test.ts` (new)
Create test file for transactions routes covering listing and filtering.

#### TEST-002.3
**Target**: `artifacts/api-server/src/routes/products.test.ts` (new)
Create test file for products routes covering CRUD operations.

#### TEST-002.4
**Target**: `artifacts/api-server/src/routes/users.test.ts` (new)
Create test file for users routes covering CRUD operations and role-based access.

#### TEST-002.5
**Target**: `artifacts/api-server/src/routes/audit.ts` (new)
Create test file for audit logs routes covering listing and filtering.

#### TEST-002.6
**Target**: Manual verification
Run all tests, verify coverage improvement, check test quality.

---

## Task 20: SQUARE_API_VERSION Format Validation
- [ ] ENV-003 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/lib/env.ts`

### Definition of Done
SQUARE_API_VERSION validated with regex for YYYY-MM-DD format, clear error message on invalid format.

### Out of Scope
Multiple API version support, dynamic version selection

### Rules to Follow
Validate format with regex, provide clear error messages, document expected format.

### Advanced Coding Pattern
Regex validation with Zod schema

### Anti-Patterns
String-only validation, no format checking, unclear error messages

### Imports/Exports
```typescript
SQUARE_API_VERSION: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'SQUARE_API_VERSION must be in YYYY-MM-DD format')
```

### Depends On
None

### Blocks
None

### Subtasks
#### ENV-003.1
**Target**: `artifacts/api-server/src/lib/env.ts:38`
Add regex validation to SQUARE_API_VERSION for YYYY-MM-DD format.

#### ENV-003.2
**Target**: Manual verification
Test with valid format, test with invalid format, verify error message.

---

## Task 21: Permissive CORS Fallback
- [ ] SEC-004 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/app.ts`

### Definition of Done
CORS callback evaluated for security, no-origin requests either blocked or explicitly allowed, CORS policy documented.

### Out of Scope
Dynamic CORS configuration, per-route CORS

### Rules to Follow
Evaluate security implications, document CORS policy, consider blocking no-origin requests, test CORS behavior.

### Advanced Coding Pattern
Secure CORS configuration with explicit allowlist

### Anti-Patterns
Overly permissive CORS, undocumented policy, security bypass

### Imports/Exports
```typescript
if (!origin) return callback(new Error('Origin required'), false)
```

### Depends On
None

### Blocks
None

### Subtasks
#### SEC-004.1
**Target**: `artifacts/api-server/src/app.ts:128`
Evaluate no-origin callback, decide on blocking or allowing, update implementation.

#### SEC-004.2
**Target**: Manual verification
Test CORS with valid origins, test CORS with no origin, verify security posture.

---

## Task 22: Database Connection Pool Configuration
- [ ] DB-003 | Status: PENDING | Priority: MEDIUM

### Related Files
`lib/db/src/index.ts` (implied)

### Definition of Done
Connection pool configured with appropriate limits, connection timeout set, idle timeout configured, settings documented.

### Out of Scope
Dynamic pool sizing, custom pool monitoring

### Rules to Follow
Configure max connections based on expected load, set connection timeout, configure idle timeout, document settings.

### Advanced Coding Pattern
Connection pool optimization for production workloads

### Anti-Patterns
Default pool settings, no configuration, connection exhaustion

### Imports/Exports
```typescript
max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000
```

### Depends On
None

### Blocks
None

### Subtasks
#### DB-003.1
**Target**: `lib/db/src/index.ts`
Configure connection pool with appropriate max connections, timeouts, and other settings.

#### DB-003.2
**Target**: Manual verification
Test under load, verify pool behavior, monitor connection usage.

---

## Task 23: Test Environment Variable Handling
- [ ] TEST-001 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/lib/auth.test.ts`, `artifacts/api-server/src/lib/encryption.test.ts`, `artifacts/api-server/src/lib/pricing.test.ts`

### Definition of Done
Test files use proper environment variable mocking, no direct process.env modification, proper cleanup between tests.

### Out of Scope
Test environment setup scripts, CI/CD test environment configuration

### Rules to Follow
Use vi.stubEnv() or similar for mocking, ensure proper cleanup, avoid test interference.

### Advanced Coding Pattern
Test isolation with proper environment mocking

### Anti-Patterns
Direct process.env modification, test interference, flaky tests

### Imports/Exports
```typescript
vi.stubEnv('JWT_SECRET', 'test-secret')
vi.unstubAllEnvs()
```

### Depends On
None

### Blocks
None

### Subtasks
#### TEST-001.1
**Target**: `artifacts/api-server/src/lib/auth.test.ts`
Replace direct process.env modification with vi.stubEnv().

#### TEST-001.2
**Target**: `artifacts/api-server/src/lib/encryption.test.ts`
Replace direct process.env modification with vi.stubEnv().

#### TEST-001.3
**Target**: `artifacts/api-server/src/lib/pricing.test.ts`
Replace direct process.env modification with vi.stubEnv().

#### TEST-001.4
**Target**: Manual verification
Run tests in parallel, verify no interference, check test stability.

---

## Task 24: Inconsistent Square Configuration Check
- [ ] FRONT-001 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
Both VITE_SQUARE_APPLICATION_ID and VITE_SQUARE_LOCATION_ID validated before enabling Square features, consistent configuration checks.

### Out of Scope
Multiple Square location support, dynamic configuration loading

### Rules to Follow
Validate all required configuration before enabling features, provide clear error messages, consistent checks.

### Advanced Coding Pattern
Configuration validation before feature enablement

### Anti-Patterns
Partial configuration checks, inconsistent validation, runtime errors

### Imports/Exports
```typescript
const isSquareConfigured = !!import.meta.env.VITE_SQUARE_APPLICATION_ID && !!import.meta.env.VITE_SQUARE_LOCATION_ID
```

### Depends On
ENV-002 (Missing Frontend Environment Variable Documentation)

### Blocks
None

### Subtasks
#### FRONT-001.1
**Target**: `artifacts/spaflow/src/pages/checkin.tsx:457,460,469,483`
Add validation for both VITE_SQUARE_APPLICATION_ID and VITE_SQUARE_LOCATION_ID.

#### FRONT-001.2
**Target**: Manual verification
Test with complete configuration, test with missing configuration, verify error messages.

---

## Task 25: Missing Transaction Timeout Configuration
- [ ] ARCH-001 | Status: PENDING | Priority: LOW

### Related Files
Database transaction usage throughout codebase

### Definition of Done
Transaction timeout configured or documented, long-running transactions prevented, timeout behavior tested.

### Out of Scope
Per-transaction timeout configuration, custom timeout handling

### Rules to Follow
Configure transaction timeout, document timeout value, handle timeout errors, test timeout behavior.

### Advanced Coding Pattern
Transaction timeout configuration for database operations

### Anti-Patterns
Unlimited transaction time, no timeout, hanging transactions

### Imports/Exports
```typescript
statement_timeout: 30000
```

### Depends On
DB-003 (Database Connection Pool Configuration)

### Blocks
None

### Subtasks
#### ARCH-001.1
**Target**: Database client configuration
Configure transaction timeout in database client or connection string.

#### ARCH-001.2
**Target**: Manual verification
Test transaction timeout, verify timeout error handling, monitor transaction duration.

---

## Task 26: Missing Content-Type Validation
- [ ] SEC-005 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/app.ts`

### Definition of Done
Content-Type validation middleware added if needed, API compliance verified, documentation updated.

### Out of Scope
Custom Content-Type handling, per-route validation

### Rules to Follow
Evaluate if strict Content-Type validation is needed, add middleware if required, document API contract.

### Advanced Coding Pattern
Content-Type validation middleware

### Anti-Patterns
Accepting incorrect Content-Type, loose API compliance

### Imports/Exports
```typescript
app.use((req, res, next) => {
  if (req.body && !req.is('application/json')) return res.status(415).json({ error: 'Unsupported Media Type' })
  next()
})
```

### Depends On
None

### Blocks
None

### Subtasks
#### SEC-005.1
**Target**: `artifacts/api-server/src/app.ts`
Evaluate need for Content-Type validation, add middleware if required.

#### SEC-005.2
**Target**: Manual verification
Test with correct Content-Type, test with incorrect Content-Type, verify API behavior.

---

## Task 27: Cache Metrics Persistence
- [ ] PERF-002 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/lib/cache.ts`

### Definition of Done
Cache metrics persistence strategy evaluated and documented, or accepted as in-memory limitation, monitoring integration considered.

### Out of Scope
External metrics storage, custom metrics aggregation

### Rules to Follow
Evaluate persistence requirements, document current limitation, consider monitoring integration, accept trade-offs.

### Advanced Coding Pattern
Metrics persistence strategy evaluation

### Anti-Patterns
Undocumented limitations, missing monitoring, untracked metrics

### Imports/Exports
```typescript
// Documented as in-memory limitation, lost on restart
```

### Depends On
None

### Blocks
None

### Subtasks
#### PERF-002.1
**Target**: `artifacts/api-server/src/lib/cache.ts`
Add documentation comment about in-memory metrics limitation.

#### PERF-002.2
**Target**: Manual verification
Document metrics limitation, consider monitoring integration, evaluate persistence needs.

---

## Task 28: CSRF_SECRET Missing from env.ts Schema
- [ ] SEC-006 | Status: PENDING | Priority: HIGH

### Related Files
`artifacts/api-server/src/lib/env.ts`, `artifacts/api-server/src/app.ts`

### Definition of Done
CSRF_SECRET added to envSchema with min 32 character validation, app.ts updated to use validated env variable instead of fallback.

### Out of Scope
Distributed CSRF token storage, custom CSRF implementations

### Rules to Follow
Validate all security-related environment variables, provide clear error messages, fail fast on startup.

### Advanced Coding Pattern
Security-first environment validation with Zod schema

### Anti-Patterns
Runtime fallback secrets, missing validation, silent failures

### Imports/Exports
```typescript
CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters')
```

### Depends On
SEC-001 (CSRF Secret Validation)

### Blocks
None

### Subtasks
#### SEC-006.1
**Target**: `artifacts/api-server/src/lib/env.ts`
Add CSRF_SECRET to envSchema with min 32 character validation.

#### SEC-006.2
**Target**: `artifacts/api-server/src/app.ts:33`
Update to use validated CSRF_SECRET from env instead of fallback to csrfTokens.secretSync().

#### SEC-006.3
**Target**: Manual verification
Test startup with missing CSRF_SECRET, verify error message, test with valid secret.

---

## Task 29: TWILIO_PHONE_NUMBER Missing from env.ts Schema
- [ ] ENV-004 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/lib/env.ts`, `artifacts/api-server/src/lib/sms.ts`

### Definition of Done
TWILIO_PHONE_NUMBER added to envSchema as optional string with validation for phone format, sms.ts updated to use validated env variable.

### Out of Scope
Multiple SMS provider support, dynamic phone number configuration

### Rules to Follow
Validate all used environment variables, document required format, provide validation error messages.

### Advanced Coding Pattern
Exhaustive environment validation with Zod schema

### Anti-Patterns
Using undefined variables, silent failures, missing documentation

### Imports/Exports
```typescript
TWILIO_PHONE_NUMBER: z.string().optional()
```

### Depends On
CONFIG-002 (Configuration Completeness)

### Blocks
None

### Subtasks
#### ENV-004.1
**Target**: `artifacts/api-server/src/lib/env.ts`
Add TWILIO_PHONE_NUMBER to envSchema as optional string with validation for phone format.

#### ENV-004.2
**Target**: `artifacts/api-server/src/lib/sms.ts:6`
Update to use validated TWILIO_PHONE_NUMBER from env instead of direct process.env access.

#### ENV-004.3
**Target**: Manual verification
Test SMS sending with valid phone number, test startup with missing phone number.

---

## Task 30: Silent Error Handling in Waitlist Assignment
- [ ] ERR-003 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/rooms.ts`

### Definition of Done
Silent catch block in waitlist assignment replaced with error logging, audit failures properly handled, no silent catches.

### Out of Scope
Automatic retry with exponential backoff, circuit breaker pattern

### Rules to Follow
Log all errors with context, avoid silent catches, provide meaningful error messages.

### Advanced Coding Pattern
Error boundary pattern with context logging

### Anti-Patterns
Silent error swallowing, missing error context, no logging

### Imports/Exports
```typescript
} catch (err) {
  logger.error({ err, roomId }, 'Failed to assign waitlist entry')
}
```

### Depends On
OPS-001 (Logging Consistency)

### Blocks
None

### Subtasks
#### ERR-003.1
**Target**: `artifacts/api-server/src/routes/rooms.ts:230-234`
Remove silent catch in waitlist assignment, log error with context.

#### ERR-003.2
**Target**: Manual verification
Test waitlist assignment failure scenarios, verify errors are logged.

---

## Task 31: Database Foreign Key Constraint Inconsistency
- [ ] DB-004 | Status: PENDING | Priority: MEDIUM

### Related Files
`lib/db/src/schema/lockers.ts`, `lib/db/src/schema/rooms.ts`, `lib/db/drizzle/0000_good_dagger.sql`

### Definition of Done
Foreign key constraints reviewed and documented, migration generated if changes needed, data integrity verified.

### Out of Scope
Redesigning entire foreign key structure, complex cascade chains

### Rules to Follow
Document foreign key behavior, ensure consistent cascade strategies, test deletion scenarios.

### Advanced Coding Pattern
Database constraint documentation and consistency review

### Anti-Patterns
Inconsistent cascade strategies, undocumented constraints, data integrity risks

### Imports/Exports
```typescript
.references(() => rentalSessionsTable.id, { onDelete: "cascade" })
```

### Depends On
None

### Blocks
None

### Subtasks
#### DB-004.1
**Target**: `lib/db/src/schema/lockers.ts`, `lib/db/src/schema/rooms.ts`
Review foreign key constraints on session_id, consider changing from RESTRICT to CASCADE.

#### DB-004.2
**Target**: Manual verification
Test deletion scenarios, verify no orphaned records, document current behavior.

---

## Task 32: Unsafe parseInt in products.ts
- [ ] VALID-001 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/products.ts`

### Definition of Done
parseInt operations replaced with Zod schema validation or proper error handling, NaN values prevented.

### Out of Scope
Global validation middleware for all routes

### Rules to Follow
Validate input before type conversion, handle invalid values gracefully, use schema validation.

### Advanced Coding Pattern
Schema-based input validation with Zod

### Anti-Patterns
Unsafe type conversions, missing validation, NaN propagation

### Imports/Exports
```typescript
const { page, limit } = ListProductsQueryParams.safeParse(req.query).data
```

### Depends On
None

### Blocks
None

### Subtasks
#### VALID-001.1
**Target**: `artifacts/api-server/src/routes/products.ts:24-25`
Replace direct parseInt with Zod schema validation from query params.

#### VALID-001.2
**Target**: Manual verification
Test with invalid page/limit values, verify proper error handling.

---

## Task 33: Missing Test Coverage for Critical Routes
- [ ] TEST-003 | Status: PENDING | Priority: MEDIUM

### Related Files
`artifacts/api-server/src/routes/checkin.ts`, `artifacts/api-server/src/routes/pricing.ts`

### Definition of Done
Test files created for checkin and pricing routes, critical business logic covered, test coverage improved.

### Out of Scope
100% test coverage, integration tests, E2E tests

### Rules to Follow
Test happy path, test error cases, test edge cases, use proper mocking, follow existing test patterns.

### Advanced Coding Pattern
Comprehensive unit testing with Vitest

### Anti-Patterns
Untested critical code, missing error case tests, poor test coverage

### Imports/Exports
```typescript
import { describe, it, expect } from 'vitest'
```

### Depends On
TEST-002 (Missing Test Coverage for Critical Routes)

### Blocks
None

### Subtasks
#### TEST-003.1
**Target**: `artifacts/api-server/src/routes/checkin.test.ts` (new)
Create test file for checkin route covering complete check-in flow with products and membership.

#### TEST-003.2
**Target**: `artifacts/api-server/src/routes/pricing.test.ts` (new)
Create test file for pricing route covering all pricing rules and edge cases.

#### TEST-003.3
**Target**: Manual verification
Run all tests, verify coverage improvement, check test quality.

---

## Task 34: Missing VITE_SQUARE_LOCATION_ID Documentation
- [ ] ENV-005 | Status: PENDING | Priority: LOW

### Related Files
`.env.example`, `artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
VITE_SQUARE_LOCATION_ID documented in .env.example, format requirements specified, Square console reference provided.

### Out of Scope
Multiple Square location support, dynamic location configuration

### Rules to Follow
Document all frontend environment variables, provide format requirements, include external service references.

### Advanced Coding Pattern
Comprehensive environment variable documentation

### Anti-Patterns
Missing documentation, undocumented variables, unclear format requirements

### Imports/Exports
```bash
VITE_SQUARE_LOCATION_ID=your_square_location_id
```

### Depends On
ENV-002 (Missing Frontend Environment Variable Documentation)

### Blocks
None

### Subtasks
#### ENV-005.1
**Target**: `.env.example`
Add VITE_SQUARE_LOCATION_ID documentation with Square console reference and format requirements.

#### ENV-005.2
**Target**: Manual verification
Verify documentation matches code usage, test with documented variable.

---

## Task 35: Raw SQL Usage Review
- [ ] DB-005 | Status: PENDING | Priority: LOW

### Related Files
`artifacts/api-server/src/routes/rooms.ts`, `artifacts/api-server/src/routes/checkin.ts`, `artifacts/api-server/src/routes/waitlist.ts`

### Definition of Done
Raw SQL usage reviewed for safety, replaced with Drizzle ORM queries where feasible, documented where raw SQL is necessary.

### Out of Scope
Rewriting all raw SQL to ORM queries, performance-critical queries

### Rules to Follow
Prefer ORM queries for safety, document raw SQL rationale, ensure parameterized queries.

### Advanced Coding Pattern
Safe raw SQL usage with Drizzle sql template

### Anti-Patterns
Unsafe SQL construction, missing parameterization, undocumented raw SQL

### Imports/Exports
```typescript
// Document rationale for raw SQL: FOR UPDATE requires raw SQL
await db.execute(sql`SELECT * FROM rooms WHERE id = ${id} FOR UPDATE`)
```

### Depends On
None

### Blocks
None

### Subtasks
#### DB-005.1
**Target**: `artifacts/api-server/src/routes/rooms.ts`, `artifacts/api-server/src/routes/checkin.ts`
Review raw SQL usage, replace with ORM queries where possible without losing functionality.

#### DB-005.2
**Target**: Manual verification
Test all affected routes, verify functionality unchanged, document raw SQL rationale.
