# Test Tags Taxonomy

This document defines the standard test tags used across the Spa-Flow project for selective test execution and organization.

## Tag Definitions

### @smoke
**Purpose:** Critical functionality tests that verify the application is fundamentally working.

**When to Use:**
- Tests that cover critical user paths (login, dashboard load, client creation)
- Tests that verify core API endpoints are responding
- Tests that should run on every commit to ensure basic functionality

**Execution Context:** Runs on every commit in CI, should complete in < 1 minute.

**Examples:**
- Login flow works
- Dashboard loads
- API health endpoint responds
- Client can be created

---

### @regression
**Purpose:** Tests that ensure new changes don't break existing functionality.

**When to Use:**
- Tests that cover previously fixed bugs
- Tests for stable features that shouldn't regress
- Comprehensive test coverage for core functionality

**Execution Context:** Runs on merge to main branch.

**Examples:**
- Password reset flow
- Session management
- Client CRUD operations
- Transaction processing

---

### @critical
**Purpose:** High-priority tests that must pass for the application to be considered stable.

**When to Use:**
- Tests for business-critical features
- Tests that block users from using the application if broken
- Tests covering security-sensitive operations

**Execution Context:** Runs on every commit and blocks deployment if failed.

**Examples:**
- Authentication and authorization
- Payment processing
- Data integrity operations
- Security checks

---

### @integration
**Purpose:** Tests that verify integration between multiple components or services.

**When to Use:**
- Tests that interact with the database
- Tests that verify API client-backend communication
- Tests that cross service boundaries

**Execution Context:** Runs on merge to main branch.

**Examples:**
- Database query tests
- API endpoint integration tests
- Service-to-service communication

---

### @e2e
**Purpose:** End-to-end tests that verify complete user workflows.

**When to Use:**
- Tests that simulate real user journeys
- Tests that span multiple pages and interactions
- Tests that verify the application from the user's perspective

**Execution Context:** Runs on merge to main branch, can be sharded for parallel execution.

**Examples:**
- Complete client onboarding flow
- Full checkout process
- Multi-step user workflows

---

### @slow
**Purpose:** Tests that take longer to execute due to complexity or external dependencies.

**When to Use:**
- Tests that involve heavy computation
- Tests that require external service calls
- Tests with complex setup/teardown

**Execution Context:** Runs on nightly schedule or on-demand.

**Examples:**
- Large dataset operations
- Complex report generation
- Performance benchmarking tests

---

### @flaky
**Purpose:** Tests that are known to be unstable and may fail intermittently.

**When to Use:**
- Tests with timing issues
- Tests that depend on external factors (network timing, race conditions)
- Tests that are being debugged for stability issues

**Execution Context:** Runs with additional retries, results tracked separately.

**Examples:**
- Tests with race conditions
- Tests dependent on precise timing
- Tests with external service dependencies

**Note:** This tag should be used sparingly and removed once the test is stabilized.

---

## Tag Configuration

### Vitest Tags Configuration

Tags are defined in the vitest.config.ts files for both backend and frontend:

```typescript
// artifacts/api-server/vitest.config.ts
export default defineConfig({
  test: {
    tags: [
      {
        name: 'smoke',
        description: 'Critical functionality tests that verify basic application health',
      },
      {
        name: 'regression',
        description: 'Tests that ensure new changes don\'t break existing functionality',
      },
      {
        name: 'critical',
        description: 'High-priority tests that must pass for application stability',
      },
      {
        name: 'integration',
        description: 'Tests that verify integration between components or services',
      },
      {
        name: 'slow',
        description: 'Tests that take longer to execute',
        timeout: 60_000,
      },
      {
        name: 'flaky',
        description: 'Tests that are known to be unstable',
        retry: process.env.CI ? 3 : 0,
        timeout: 30_000,
        priority: 1,
      },
    ],
  },
});
```

### Playwright Tags Configuration

Playwright uses the `tag` option in test details:

```typescript
test('login flow', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
  // test implementation
});
```

Tags can also be applied to entire describe blocks:

```typescript
test.describe('Authentication', { tag: ['@smoke', '@critical'] }, () => {
  test('login works', async ({ page }) => {
    // inherits @smoke and @critical tags
  });
});
```

---

## Execution Strategies

### CI Pipeline Tag-Based Execution

#### On Every Commit (Pull Request)
- Run `@smoke` tests only
- Run `@critical` tests only
- Expected duration: < 1 minute

#### On Merge to Main
- Run all tests (no tag filter)
- Includes `@regression`, `@integration`, `@e2e`
- Expected duration: 10-15 minutes

#### Nightly Schedule
- Run `@slow` tests
- Run full test suite with extended timeouts
- Expected duration: 30-60 minutes

### Local Development

#### Quick Feedback
```bash
# Run only smoke tests
pnpm run test -- --tags-filter=smoke

# Run smoke and critical tests
pnpm run test -- --tags-filter="smoke and critical"
```

#### Full Suite
```bash
# Run all tests
pnpm run test
```

#### Debugging Flaky Tests
```bash
# Run only flaky tests with retries
pnpm run test -- --tags-filter=flaky
```

### Playwright E2E Tests

```bash
# Run only smoke E2E tests
npx playwright test --grep "@smoke"

# Run smoke and critical E2E tests
npx playwright test --grep "(?=.*@smoke)(?=.*@critical)"

# Exclude flaky tests
npx playwright test --grep "@smoke" --grep-invert "@flaky"
```

---

## Tag Usage Guidelines

### Do's
- Use tags consistently across the codebase
- Document new tags in this file
- Apply tags at the describe block level when appropriate
- Use multiple tags for complex filtering (e.g., `@smoke @critical`)
- Remove `@flaky` tag once the test is stabilized

### Don'ts
- Create custom tags without team consensus
- Use too many tags on a single test (max 3-4 recommended)
- Tag every test (only tag when it adds value)
- Use tags as a substitute for good test organization
- Ignore `@flaky` tags - they indicate tests that need attention

---

## Tag Priority and Inheritance

### Vitest Tag Priority
Tags with defined `priority` override tags without priority. Lower priority number = higher precedence.

```typescript
test('flaky database test', { tags: ['flaky', 'db'] })
// Result: timeout: 30_000, retry: 3 (flaky has priority: 1)
```

### Tag Inheritance
Tags defined on describe blocks are inherited by all tests within:

```typescript
describe('Authentication', { tags: ['@smoke'] }, () => {
  test('login', () => {
    // Has @smoke tag inherited from describe
  });
  
  test('logout', { tags: ['@regression'] }, () => {
    // Has both @smoke (inherited) and @regression
  });
});
```

---

## Monitoring and Maintenance

### Tag Usage Metrics
Track tag usage to ensure effectiveness:
- Number of tests per tag
- Execution time per tag category
- Flaky test rate for `@flaky` tagged tests
- Failure rate per tag category

### Regular Reviews
- Quarterly review of tag taxonomy
- Remove unused tags
- Consolidate duplicate tags
- Update documentation for new use cases

---

## References

- [Vitest Test Tags Documentation](https://vitest.dev/guide/test-tags)
- [Playwright Test Tagging Guide](https://www.browserstack.com/guide/playwright-tags)
- [TestDino: Grouping Playwright Tests](https://testdino.com/blog/grouping-playwright-tests)
