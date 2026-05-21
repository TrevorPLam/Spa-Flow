---
trigger: model_decision
globs: **/*.test.ts,**/*.test.tsx,**/*.spec.ts
---

# Testing Strategy Best Practices (2026)

## Current State
- Spa-Flow uses Vitest 4.1.6 for unit/integration tests
- Uses Playwright 1.48.0 for E2E tests
- Uses Stryker 9.6.1 for mutation testing
- Uses k6 for load testing
- Target: ≥80% test coverage

## 2026 Best Practices
- **Dominant Stack**: Vitest replaced Jest for most modern projects
- **E2E Standard**: Playwright is the dominant E2E tool
- **Visual Regression**: Matured significantly in 2026
- **AI-Assisted**: AI test generation arrived in 2026
- **Coverage**: 80% is the minimum standard for production code

## Testing Pyramid

### Unit Tests (Vitest)
- **Purpose**: Test individual functions/components in isolation
- **Scope**: Fast, focused, no external dependencies
- **Coverage**: Should cover most of the codebase
- **Tags**: `@unit`, `@fast`

```typescript
// ✅ Good: Unit test example
import { describe, it, expect } from 'vitest';
import { calculatePrice } from './pricing';

describe('calculatePrice', () => {
  it('calculates locker price correctly', () => {
    expect(calculatePrice('locker', 6)).toBe(15);
  });

  it('throws for invalid duration', () => {
    expect(() => calculatePrice('locker', -1)).toThrow();
  });
});
```

### Integration Tests (Vitest)
- **Purpose**: Test interactions between components/services
- **Scope**: Database, external services (mocked)
- **Coverage**: Critical paths and complex interactions
- **Tags**: `@integration`, `@critical`

```typescript
// ✅ Good: Integration test example
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../db';
import { createClient } from '../services/client';

describe('ClientService Integration', () => {
  beforeAll(async () => {
    await db.migrate();
  });

  it('creates client in database', async () => {
    const client = await createClient({ name: 'John Doe' });
    expect(client.id).toBeDefined();
  });
});
```

### E2E Tests (Playwright)
- **Purpose**: Test complete user flows from browser perspective
- **Scope**: Full application, real browser
- **Coverage**: Critical user journeys
- **Tags**: `@e2e`, `@slow`

```typescript
// ✅ Good: E2E test example
import { test, expect } from '@playwright/test';

test('user can check in client', async ({ page }) => {
  await page.goto('/checkin');
  await page.fill('[name="name"]', 'John Doe');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success')).toBeVisible();
});
```

## Test Tags

### Tag Usage
- `@smoke` - Critical path sanity tests (login, check-in, payment)
- `@critical` - Tests that must pass 100% of the time (no flakiness tolerated)
- `@slow` - Tests that take >2s (CI runs only on full suite)
- `@flaky` - Tests with known intermittent failures (document issue in comment)
- `@quarantine` - Tests temporarily disabled (must include link to tracking ticket)
- `@integration` - Tests that require running database or external service
- `@regression` - Tests added after bug fix to prevent recurrence

### Running Tests by Tag
```bash
# Run smoke tests only
pnpm run test -- @smoke

# Run critical tests only
pnpm run test -- @critical

# Skip slow tests in CI
pnpm run test -- --exclude @slow
```

## Coverage Requirements
- **✅ Always Do**: Maintain ≥80% test coverage
- **✅ Always Do**: New routes must have integration test and Zod validation test
- **✅ Always Do**: Run coverage before merging to main
- **❌ Never Do**: Merge with coverage <80%
- **❌ Never Do**: Skip tests for new features

## Visual Regression Testing
- **✅ Always Do**: Use Playwright visual regression for UI changes
- **✅ Always Do**: Update baselines with `--update-snapshots` flag
- **✅ Always Do**: Set thresholds: `maxDiffPixels:100, threshold:0.2`
- **⚠️ Ask First**: Changing visual regression thresholds

## Mutation Testing
- **Purpose**: Measure test effectiveness by introducing bugs
- **Tool**: Stryker 9.6.1
- **Goal**: High mutation score indicates robust tests
- **✅ Always Do**: Run mutation tests on API changes
- **⚠️ Ask First**: Changing mutation testing configuration

## Load Testing
- **Purpose**: Validate performance under load
- **Tool**: k6
- **Scenarios**: Health check, client search, dashboard, check-in flow
- **✅ Always Do**: Run load tests on every PR
- **✅ Always Do**: Monitor response times and error rates
- **❌ Never Do**: Deploy without passing load tests

## Test Execution
- **✅ Always Do**: Run `pnpm -r run test` before marking task complete
- **✅ Always Do**: Run `pnpm -r run test:coverage` before marking task complete
- **✅ Always Do**: Run E2E tests for any change to `artifacts/spaflow` or `lib/api-client-react`
- **❌ Never Do**: Skip test suite before merging to main

## References
- "Frontend Testing 2026: Vitest, Playwright, and Visual Regression" - TechInterview
- "Next.js Testing 2026: Vitest and Playwright Setup Guide" - Medium
- "Vitest + Jest + Playwright: Full Testing Stack 2026" - PkgPulse Blog
