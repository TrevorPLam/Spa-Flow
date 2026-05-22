# Test Environment Setup

## Overview

The Spa-Flow test environment uses environment-specific configuration files to isolate test execution from development and production environments.

## Environment Files

- `.env` - Development environment (default)
- `.env.test` - Test environment (used when `NODE_ENV=test`)
- `.env.example` - Template for required environment variables

## Environment Loading

All environment loading is centralized in the following files:

1. **lib/db/src/env.ts** - Database environment configuration
2. **artifacts/api-server/src/index.ts** - API server environment configuration
3. **artifacts/spaflow/vite.config.ts** - Frontend environment configuration
4. **artifacts/mockup-sandbox/src/env.ts** - Mockup sandbox environment configuration

Each file uses the same pattern:

```typescript
// Load environment-specific .env file based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(projectRoot, envFile) });
```

## Test Database Configuration

The test environment uses a dedicated Neon PostgreSQL database:

```env
DATABASE_URL=postgresql://neondb_owner:npg_rP9UF8bkoCiH@ep-fancy-butterfly-aqv3s5jv.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Database Pool Settings (Test)

- `DB_POOL_MAX=5` - Reduced pool size for test isolation
- `DB_POOL_IDLE_TIMEOUT_MS=10000` - Shorter idle timeout
- `DB_POOL_CONNECTION_TIMEOUT_MS=5000` - Faster connection timeout
- `DB_STATEMENT_TIMEOUT_MS=30000` - 30 second statement timeout
- `DB_LOCK_TIMEOUT_MS=5000` - 5 second lock timeout
- `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS=60000` - 60 second idle transaction timeout

## Security Secrets (Test Values)

Test environment uses placeholder secrets (32 characters minimum):

```env
ENCRYPTION_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
CSRF_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

**⚠️ Important:** These are test-only values and must never be used in production.

## Running Tests

### Run All Tests

```bash
cd artifacts/api-server
pnpm test
```

### Run Specific Test File

```bash
cd artifacts/api-server
pnpm test src/routes/clients.test.ts
```

### Run Tests with Coverage

```bash
cd artifacts/api-server
pnpm test:coverage
```

## Test Setup

Test setup is handled in `artifacts/api-server/src/test/setup.ts`:

1. Sets `NODE_ENV=test`
2. Sets required security secrets
3. Sets `DATABASE_URL` (with fallback to localhost)
4. Provides `setupTestDatabase()` and `cleanDatabase()` utilities
5. Re-exports fixture factories from `@workspace/test-utils`

## Test Isolation

Tests use the following isolation mechanisms:

1. **Environment isolation:** Each test file loads `.env.test` via `NODE_ENV=test`
2. **Database isolation:** `cleanDatabase()` resets all tables before each test
3. **Environment cache reset:** `resetEnv()` clears cached environment variables

## Pre-existing Test Failures

As of 2026-05-21, there are 251 pre-existing test failures unrelated to environment configuration. These failures are documented in separate TODO tasks and should be addressed individually.

## Environment Variable Priority

1. Explicit `process.env` assignments in code (highest priority)
2. `.env.test` (when `NODE_ENV=test`)
3. `.env` (development default)
4. System environment variables (lowest priority)

## Adding New Environment Variables

When adding a new environment variable:

1. Add to validation schema in `artifacts/api-server/src/lib/env.ts`
2. Add to `lib/db/src/env.ts` if database-related
3. Document in `.env.example`
4. Add to `.env.test` with test-appropriate value
5. Add to `.env.development` if needed for local development
6. Add to `.env.production` and `.env.staging` if needed for deployment

## Troubleshooting

### DATABASE_URL Error

If you see "Database environment validation failed: DATABASE_URL: Invalid input":

1. Verify `.env.test` exists and contains `DATABASE_URL`
2. Verify `NODE_ENV=test` is set before running tests
3. Check that environment loading code uses the correct file

### Missing Environment Variables

If you see validation errors for other variables:

1. Check `.env.test` for the missing variable
2. Verify the variable is in the validation schema
3. Ensure the value meets validation requirements (e.g., minimum length)

### Test Database Connection Issues

If tests fail to connect to the database:

1. Verify the `DATABASE_URL` in `.env.test` is valid
2. Check network connectivity to the database
3. Verify database credentials are correct
4. Ensure the database exists and is accessible
