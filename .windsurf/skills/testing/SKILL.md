---
name: testing
description: Multi-layer testing strategy including unit/integration tests (Vitest), E2E tests (Playwright), mutation testing (Stryker), and load testing (k6)
---

# Testing (Vitest, Playwright, Stryker, k6)

This skill covers the multi-layer testing strategy in the Spa-Flow repository including unit/integration tests (Vitest), E2E tests (Playwright), mutation testing (Stryker), and load testing (k6).

## Key Concepts

### Vitest Patterns
- Vitest 4.1.6 for unit/integration tests
- Fast test execution with Vite
- React Testing Library for component tests
- Test fixtures in `lib/test-utils/`
- Mock external dependencies
- Coverage threshold: 80% minimum

### Test Tagging Conventions
Use these tags on Vitest tests to control CI execution:
- `@smoke` - Critical path sanity tests (login, check-in, payment)
- `@critical` - Tests that must pass 100% of the time (no flakiness)
- `@slow` - Tests taking >2s (CI runs only on full suite)
- `@flaky` - Tests with known intermittent failures (document issue)
- `@quarantine` - Temporarily disabled tests (include tracking ticket)
- `@integration` - Tests requiring database or external service
- `@regression` - Tests added after bug fix to prevent recurrence

### Playwright E2E Tests
- Playwright 1.48.0 for E2E testing
- Chromium, Firefox, WebKit browsers
- Visual regression testing
- E2E tests in `artifacts/spaflow/e2e/*.spec.ts`
- Required for any change to `artifacts/spaflow` or `lib/api-client-react`
- Optional for backend-only changes

### Visual Regression Testing
- Playwright visual regression
- Screenshot comparison
- Cross-browser visual testing
- Detects UI layout changes
- Configured in playwright.config.ts

### Mutation Testing
- Stryker 9.6.1 for backend mutation testing
- Configured in `artifacts/api-server/stryker.conf.js`
- Tests test quality by mutating code
- Detects untested code paths
- Run with `cd artifacts/api-server && pnpm run test:mutation`

### k6 Load Testing
- Load testing scenarios in `load-tests/*.js`
- Smoke tests (quick validation)
- Health check tests
- Client search load tests
- Dashboard load tests
- Check-in flow load tests
- Run with `pnpm run test:load:all`

### Test Fixtures and Shared Utilities
- Shared test utilities in `lib/test-utils/`
- Database test fixtures
- API test helpers
- Mock factories
- Test data generators

### Incremental Testing
- `pnpm run test:changed` - Only changed packages since main
- `pnpm run test:affected` - Changed packages + dependents
- Faster feedback for large codebases
- Uses pnpm --filter

### Coverage Threshold
- 80% minimum coverage required
- Enforced in CI pipeline
- Run with `pnpm -r run test:coverage`
- Coverage reports in `coverage/` directories

### Flaky Test Detection
- Detect flaky tests with scripts
- `scripts/detect-flaky-vitest.ts` for Vitest
- `scripts/detect-flaky-playwright.ts` for Playwright
- Generate flakiness dashboard
- Document known flaky tests with @flaky tag

### Test Ownership Guidelines
- Each test should have clear ownership
- Document test purpose
- Update tests when code changes
- Remove @quarantine tags when fixed

## 2026 Best Practices

### Modern Testing Stack
Based on 2026 testing best practices:

**Vitest + Playwright Combination**
- Vitest for unit/integration tests (fast, type-safe)
- Playwright for E2E tests (real browser automation)
- Vitest for Server Actions and Zod schemas
- Playwright for async components and auth flows
- This combination is fast, type-safe, and easy to debug

**Stryker Mutation Testing**
- Pair coverage with mutation testing before trusting numbers
- Stryker doesn't work with Vitest browser mode
- Use Stryker if stack supports it (standard Vitest in Node mode, Jest, Mocha)
- AI agents can help when Stryker doesn't work

**k6 Load Testing**
- Use k6-jslib-testing for Playwright-compatible assertions
- Functional tests in k6 with familiar API
- Performance metrics interpretation
- Load test URL configuration (/api/v1 prefix)

### Testing Pyramid vs Trophy
- Prefer testing pyramid (more unit tests, fewer E2E)
- Unit tests: Fast, isolated, cheap
- Integration tests: Medium speed, test interactions
- E2E tests: Slow, expensive, but critical for user flows
- AI-augmented testing for test generation

### Test Data Management
- Use factories for test data generation
- Isolate test data between tests
- Clean up after tests
- Use test databases, not production data

## Key Files
- `artifacts/api-server/src/**/*.test.ts` - Backend tests
- `artifacts/spaflow/src/**/*.test.ts` - Frontend tests
- `artifacts/spaflow/e2e/*.spec.ts` - E2E tests
- `artifacts/api-server/stryker.conf.js` - Mutation testing config
- `load-tests/*.js` - k6 scenarios
- `lib/test-utils/` - Shared test utilities
- `scripts/detect-flaky-*.ts` - Flaky test detection scripts

## References
- `AGENTS.md` - Test tagging conventions
- `docs/testing-strategy.md` - Testing strategy
- `docs/monorepo-testing.md` - Monorepo testing approach
- `docs/test-ownership.md` - Test ownership guidelines
- `docs/mutation-testing.md` - Mutation testing details

## Common Tasks

### Running Tests
```bash
# All tests in workspace
pnpm -r run test

# Specific package
cd artifacts/api-server && pnpm run test

# With coverage
pnpm -r run test:coverage

# E2E tests
cd artifacts/spaflow && pnpm run test:e2e

# Load tests
pnpm run test:load:all

# Mutation tests
cd artifacts/api-server && pnpm run test:mutation
```

### Writing a Unit Test
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should return expected result', () => {
    expect(myFunction(input)).toEqual(expected);
  });
});
```

### Writing an E2E Test
```typescript
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Mocking API Calls
```typescript
import { vi } from 'vitest';
import { apiClient } from '../api-client';

vi.mock('../api-client');
```

## CI/CD Integration
- Smoke tests run on every push
- Contract tests filtered by api-server changes
- Component tests filtered by spaflow changes
- Coverage report (80% threshold)
- E2E tests filtered by spaflow changes
- Load tests for performance validation
- Mutation tests for backend quality
