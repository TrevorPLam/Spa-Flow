# Testing Infrastructure Optimizations

This document outlines the optimizations made to AI-proof the testing infrastructure for faster task execution.

## Changes Made

### 1. Enabled File Parallelism
**File**: `artifacts/api-server/vitest.config.ts`
- Changed `fileParallelism: false` to `fileParallelism: true`
- Allows test files to run in parallel, significantly reducing test execution time

### 2. Fast Test Command
**File**: `artifacts/api-server/package.json`
- Added `test:fast` script: `vitest run --no-coverage`
- Runs tests without coverage collection for quick validation
- Use this command for AI-assisted development: `pnpm test:fast`

### 3. Environment Cache Reset
**File**: `artifacts/api-server/src/lib/env.ts`
- Added `resetEnv()` function to clear cached environment variables
- Prevents environment state pollution between parallel tests
- Call this in test setup when using `vi.stubEnv()`

### 4. Test Isolation
**File**: `artifacts/api-server/src/test/setup.ts`
- Added `resetEnv()` call to `cleanDatabase()` function
- Ensures fresh environment validation for each test
- Database cleanup already uses transactions for isolation

## Usage Guidelines

### For AI-Assisted Development
Use the fast test command to quickly verify changes:
```bash
cd artifacts/api-server
pnpm test:fast
```

### For Full Test Suite with Coverage
Use the regular test command when ready:
```bash
cd artifacts/api-server
pnpm test
```

### For Mutation Testing
Only run mutation testing when explicitly needed (slow):
```bash
cd artifacts/api-server
pnpm test:mutation
```

## Test Isolation Best Practices

When writing tests that modify environment variables:
1. Use `vi.stubEnv()` in your test
2. Call `resetEnv()` in `beforeEach` or `afterEach` if needed
3. The `cleanDatabase()` function already calls `resetEnv()` automatically

## Parallel Execution Notes

With `fileParallelism: true`:
- Test files run in parallel
- Each test file gets its own worker thread
- Database transactions ensure data isolation
- `resetEnv()` ensures environment isolation

## Performance Impact

Expected improvements:
- **Before**: ~30-40 seconds for full test suite (serial execution)
- **After**: ~10-15 seconds for full test suite (parallel execution)
- **Fast mode**: ~5-8 seconds without coverage

## Troubleshooting

If tests fail with parallel execution:
1. Check for shared state issues (global variables, singletons)
2. Ensure database operations use transactions
3. Call `resetEnv()` if modifying environment variables
4. Temporarily disable parallelism: set `fileParallelism: false` in vitest.config.ts
