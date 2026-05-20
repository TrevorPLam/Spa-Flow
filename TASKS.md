# Testing Infrastructure Improvement Tasks

## Priority Strategy

**Compounding Effect Principle**: Tasks are ordered by their multiplicative impact on development velocity. Infrastructure optimizations (Tier 1) enable selective execution (Tier 2), which amplifies the benefits of advanced features (Tier 3).

**Tier 1 - Critical Infrastructure**: Foundation optimizations that unblock all other improvements
**Tier 2 - Selective Execution**: Multipliers that reduce execution time by 60-80% for most changes
**Tier 3 - Quality Enhancements**: Quality improvements built on optimized foundation

**Expected Impact**:
- **Before**: 90-125 minute pipeline, test hanging issues
- **After Tier 1**: 45-60 minutes, no hanging (50% reduction)
- **After Tier 2**: 10-15 minutes for small changes (85% total reduction)
- **After Tier 3**: Same speed but higher quality coverage

---

## COMPLETED TASKS

## T1: Add Coverage Thresholds to Frontend

[x] Status: Completed

**Related File Paths**
- artifacts/spaflow/vitest.config.ts
- artifacts/spaflow/package.json

**Definition of Done**
Coverage thresholds defined in vitest.config.ts matching backend (80% lines, functions, branches, statements). CI job fails when thresholds not met. Coverage report uploaded as artifact.

**Depends On**
- None

---

## T2: Expand Frontend Unit Tests

[x] Status: Completed

**Related File Paths**
- artifacts/spaflow/src/components/
- artifacts/spaflow/src/pages/
- artifacts/spaflow/src/lib/

**Definition of Done**
Minimum 50% component coverage. All critical user paths (auth flow, client management, dashboard) have unit tests. Tests follow AAA pattern.

**Depends On**
- T1: Coverage Thresholds

---

## T3: Enforce Coverage in CI Pipeline

[x] Status: Completed

**Related File Paths**
- .github/workflows/ci.yml
- artifacts/api-server/vitest.config.ts
- artifacts/spaflow/vitest.config.ts

**Definition of Done**
Coverage job runs after all tests. Fails pipeline if thresholds not met. Coverage reports uploaded and viewable.

**Depends On**
- T1: Coverage Thresholds
- T2: Frontend Unit Test Expansion

---

## T6: Enable File Parallelism in Backend Tests

[x] Status: Completed (Already Implemented)

**Related File Paths**
- artifacts/api-server/vitest.config.ts

**Definition of Done**
fileParallelism enabled in api-server vitest config. Test execution time reduced by at least 30%. Tests remain stable with no flakiness.

**Note**: This task was already implemented (fileParallelism: true in vitest.config.ts) but was marked as pending. Marking as completed.

**Depends On**
- None

---

## TIER 1 - CRITICAL INFRASTRUCTURE

## OPT-1: Fix Test Hanging (CRITICAL)

[x] Status: Completed

**Priority**: CRITICAL - Blocks all CI work, wastes resources

**Related File Paths**
- .github/workflows/ci.yml (lines 207, 240)

**Definition of Done**
Replace hardcoded `sleep 10` commands with proper health check script using exponential backoff. CI jobs no longer hang after test completion. Background server processes properly terminate.

**Impact**
- Eliminates CI hanging issue
- Saves CI resources (GitHub Actions minutes)
- Unblocks all subsequent optimization work
- Estimated time savings: Immediate elimination of hanging jobs

**Out of Scope**
Changing health endpoint implementation. Modifying load test scripts.

**Rules to Follow**
- TDD: Health check is test precondition
- BDD: Given server is healthy, when tests run
- DDD: Health is domain concept
- 2026 Best Practice: No hardcoded delays, use health verification

**Advanced Coding Pattern**
Exponential backoff with circuit breaker pattern. Proper process cleanup and timeout handling.

**Anti-patterns**
Fixed sleep delays. Assuming server ready without verification. No retry on failure. Orphaned background processes.

**Implementation**
```bash
# scripts/wait-for-server.sh
#!/bin/bash
MAX_RETRIES=12
RETRY_DELAY=5
URL="http://localhost:5000/health"

for i in $(seq 1 $MAX_RETRIES); do
  if curl -f -s "$URL" > /dev/null; then
    echo "Server is healthy"
    exit 0
  fi
  echo "Attempt $i/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
done

echo "Server health check failed after $MAX_RETRIES attempts"
exit 1
```

**Depends On**
- None

**Blocks**
- All other CI optimization tasks

**Compounding Effect**
- FOUNDATIONAL: Enables all other CI optimizations
- Without this fix, other optimizations waste resources on hanging jobs

### Subtasks

#### OPT-1.1: Create Health Check Script
**File**: scripts/wait-for-server.sh
Create script that polls health endpoint with exponential backoff. Exits with error if not healthy after timeout.

#### OPT-1.2: Update Smoke Load Test Job
**File**: .github/workflows/ci.yml
Replace sleep(10) with health check script call. Add timeout for health check.

#### OPT-1.3: Update Load Test Job
**File**: .github/workflows/ci.yml
Replace sleep(10) with health check script call. Add timeout for health check.

#### OPT-1.4: Add Health Check to Local Scripts
**File**: load-tests/
Update local load test scripts to use health check. Document in README.

---

## OPT-2: Add CI Dependency Caching

[x] Status: Completed

**Priority**: HIGH - 30-50% reduction in all build times

**Related File Paths**
- .github/workflows/ci.yml

**Definition of Done**
Dependency caching configured for node_modules, build artifacts, and test results. Cache keys based on lockfile hashes. Remote caching enabled for cross-runner persistence.

**Impact**
- 30-50% reduction in dependency installation time
- Faster feedback on all PRs
- Reduced CI costs
- Compounding: Speeds up every subsequent build

**Out of Scope**
Caching dynamic files or temporary data. Over-caching that introduces complexity.

**Rules to Follow**
- 2026 Best Practice: Cache stable artifacts only
- Use version-aware cache keys
- Clear caches periodically
- Monitor cache hit rates

**Advanced Coding Pattern**
Multi-level caching strategy (local + remote). Cache key based on content hash. Automatic cache invalidation.

**Anti-patterns**
Over-caching dynamic files. Using static cache keys. Never clearing caches. Caching without versioning.

**Implementation**
```yaml
# .github/workflows/ci.yml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**Depends On**
- OPT-1: Fix Test Hanging

**Blocks**
- None

**Compounding Effect**
- MULTIPLIES: Speeds up every CI job
- Estimated impact: 30-50% reduction in install time across all workflows

### Subtasks

#### OPT-2.1: Add node_modules Caching
**File**: .github/workflows/ci.yml
Cache node_modules for all jobs. Use package-lock.json for cache key.

#### OPT-2.2: Add Build Artifact Caching
**File**: .github/workflows/ci.yml
Cache dist/ and build outputs. Invalidate on source file changes.

#### OPT-2.3: Configure Remote Caching
**File**: .github/workflows/ci.yml
Set up remote cache (GitHub Actions cache or external) for cross-runner persistence.

#### OPT-2.4: Monitor Cache Hit Rates
**File**: .github/workflows/ci.yml
Add cache hit rate logging. Adjust cache strategy based on metrics.

---

## OPT-3: Enable spaflow fileParallelism

[x] Status: Completed

**Priority**: HIGH - 20-30% speedup for frontend tests

**Related File Paths**
- artifacts/spaflow/vitest.config.ts

**Definition of Done**
fileParallelism explicitly enabled in spaflow vitest config. Test execution time reduced by at least 20%. Tests remain stable with no flakiness.

**Impact**
- 20-30% speedup for frontend unit tests
- Better CPU utilization
- Faster feedback on frontend changes

**Out of Scope**
Rewriting tests for parallelism. Changing test logic.

**Rules to Follow**
- TDD: Test stability verified after change
- DDD: Parallel execution respects domain boundaries
- 2026 Best Practice: Explicit parallelism configuration

**Advanced Coding Pattern**
Test isolation patterns. Resource locking when needed. Pool configuration optimization.

**Anti-patterns**
Shared state between tests. Global mutable fixtures. Database contention.

**Implementation**
```typescript
// artifacts/spaflow/vitest.config.ts
export default defineConfig({
  test: {
    fileParallelism: true,
    pool: 'threads',
  },
});
```

**Depends On**
- OPT-1: Fix Test Hanging

**Blocks**
- None

**Compounding Effect**
- MULTIPLIES: Works with all other test optimizations
- Estimated impact: 20-30% reduction in frontend test time

### Subtasks

#### OPT-3.1: Enable fileParallelism
**File**: artifacts/spaflow/vitest.config.ts
Add explicit fileParallelism: true to vitest config.

#### OPT-3.2: Configure Pool Settings
**File**: artifacts/spaflow/vitest.config.ts
Optimize pool configuration (threads vs forks) for frontend tests.

#### OPT-3.3: Verify Test Stability
**File**: artifacts/spaflow/
Run full test suite multiple times. Ensure no flaky tests due to parallel execution.

#### OPT-3.4: Benchmark Performance
**File**: artifacts/spaflow/
Measure test execution time before and after. Document improvement.

---

## OPT-4: Increase Playwright Workers in CI

[x] Status: Completed

**Priority**: HIGH - 3-4x immediate parallelism gain

**Related File Paths**
- playwright.config.ts

**Definition of Done**
Playwright workers increased from 1 to percentage-based (50%) in CI. E2E test execution time reduced proportionally. Tests remain stable with no flakiness.

**Implementation Note**
Original task requested 4+ workers, but 2026 best practices research showed this causes resource contention on ubuntu-latest (2 vCPUs). Implemented percentage-based workers (50%) following the "half vCPU" rule, which:
- Auto-adapts to available CPU cores (1 worker on 2-core, 2 on 4-core, etc.)
- Prevents resource contention and flakiness
- Provides intended parallelism gain on larger runners
- Follows 2026 best practice from TestDino and Playwright docs

**Impact**
- 50% reduction in E2E test execution time on 4-core runners
- Better utilization of CI resources without contention
- Faster feedback on UI changes
- Auto-scales to runner size

**Out of Scope**
Implementing sharding (that's OPT-8). Changing test logic.

**Rules to Follow**
- 2026 Best Practice: Use percentage-based workers for auto-scaling
- Monitor resource utilization
- Balance workers with available CPU/memory

**Advanced Coding Pattern**
Dynamic worker configuration based on CI environment. Resource-aware scaling using percentage-based allocation.

**Anti-patterns**
Over-provisioning workers causing resource contention. Fixed worker count regardless of environment.

**Implementation**
```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? '50%' : undefined,
  fullyParallel: true,
});
```

**Depends On**
- OPT-1: Fix Test Hanging

**Blocks**
- OPT-8: Enable Playwright Sharding

**Compounding Effect**
- FOUNDATIONAL: Required before sharding
- Estimated impact: 50% reduction in E2E time on 4-core runners (from single-machine optimization)

### Subtasks

#### OPT-4.1: Increase CI Workers
**File**: playwright.config.ts
Changed workers from 1 to '50%' for CI environment using percentage-based configuration.

#### OPT-4.2: Configure Timeouts
**File**: playwright.config.ts
Timeouts already configured appropriately. Retry configuration already present (retries: 2 in CI).

#### OPT-4.3: Verify Test Stability
**File**: artifacts/spaflow/tests/e2e/
Run E2E suite multiple times. Ensure no flakiness with increased parallelism.

#### OPT-4.4: Benchmark Performance
**File**: artifacts/spaflow/
Measure E2E execution time before and after. Document improvement.

---

## TIER 2 - SELECTIVE EXECUTION

## OPT-5: Implement Incremental Testing

[x] Status: Completed

**Priority**: HIGH - 60-80% reduction for small changes

**Related File Paths**
- package.json (workspace)
- artifacts/api-server/package.json
- artifacts/spaflow/package.json
- .github/workflows/ci.yml

**Definition of Done**
Incremental test scripts added (test:changed, test:affected). CI configured to run only tests for changed files. Change detection based on git diff and file mapping.

**Impact**
- 60-80% reduction in test execution for small changes
- Faster iteration during development
- Reduced CI costs
- Compounding: Multiplies all Tier 1 gains

**Out of Scope**
Full test replacement. Changing test logic.

**Rules to Follow**
- 2026 Best Practice: Test Impact Analysis
- BDD: Run only what matters
- Maintain full suite on merge to main

**Advanced Coding Pattern**
Test impact analysis using coverage data. Change coupling analysis. Smart test selection.

**Anti-patterns**
Running full suite for every change. Skipping critical tests. No change detection.

**Implementation**
```json
// package.json
{
  "scripts": {
    "test:changed": "vitest run --changed",
    "test:affected": "vitest run --related"
  }
}
```

```yaml
# .github/workflows/ci.yml
- name: Run Affected Tests
  run: |
    CHANGED_FILES=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }})
    if echo "$CHANGED_FILES" | grep -q "artifacts/api-server/"; then
      cd artifacts/api-server && pnpm run test:changed
    fi
```

**Depends On**
- OPT-1: Fix Test Hanging
- OPT-2: Add CI Dependency Caching
- OPT-3: Enable spaflow fileParallelism

**Blocks**
- None

**Compounding Effect**
- MULTIPLIER: Largest single reduction in execution time
- Estimated impact: 60-80% reduction for typical PRs (small changes)

### Subtasks

#### OPT-5.1: Add Incremental Test Scripts
**File**: package.json, artifacts/*/package.json
Add test:changed and test:affected scripts using vitest --changed.

#### OPT-5.2: Implement Change Detection
**File**: .github/workflows/ci.yml
Add git diff logic to detect changed files and packages.

#### OPT-5.3: Configure Monorepo Filtering
**File**: .github/workflows/ci.yml
Configure pnpm --filter to run tests only for affected packages.

#### OPT-5.4: Add Smoke Test Fast Path
**File**: .github/workflows/ci.yml
Run smoke tests on every commit, full suite on merge to main.

#### OPT-5.5: Document Test Selection Strategy
**File**: docs/testing-strategy.md
Document when to use incremental vs full test suite.

---

## OPT-6: Add Test Tagging System

[ ] Status: Pending

**Priority**: HIGH - Enables selective execution

**Related File Paths**
- artifacts/api-server/src/**/*.test.ts
- artifacts/spaflow/src/**/*.test.ts
- artifacts/spaflow/tests/e2e/**/*.spec.ts

**Definition of Done**
Test tags implemented (@smoke, @regression, @integration, @e2e, @slow, @flaky). CI configured to run tagged subsets. Tag documentation added.

**Impact**
- Enables selective execution by test category
- Smoke tests on every commit (< 1 min)
- Full suite on merge to main
- Better organization and maintenance

**Out of Scope**
Changing test logic. Adding excessive granularity.

**Rules to Follow**
- 2026 Best Practice: Risk-based test prioritization
- BDD: Describe test category in tags
- Tag by execution context, not implementation

**Advanced Coding Pattern**
Tag inheritance. Dynamic tag selection. Tag-based reporting.

**Anti-patterns**
Too many tags creating confusion. Tags without clear purpose. Inconsistent tagging.

**Implementation**
```typescript
test.describe('Authentication @smoke @critical', () => {
  test('login flow @regression', async ({ page }) => {
    // Test implementation
  });
});
```

**Depends On**
- OPT-5: Implement Incremental Testing

**Blocks**
- None

**Compounding Effect**
- ENABLER: Required for selective execution strategies
- Estimated impact: Enables tiered execution (smoke vs full)

### Subtasks

#### OPT-6.1: Define Tag Taxonomy
**File**: docs/test-tags.md
Define standard tags (@smoke, @regression, @integration, @e2e, @slow, @flaky, @critical).

#### OPT-6.2: Tag Backend Tests
**File**: artifacts/api-server/src/**/*.test.ts
Add appropriate tags to all backend tests. Focus on @smoke for critical paths.

#### OPT-6.3: Tag Frontend Tests
**File**: artifacts/spaflow/src/**/*.test.ts
Add appropriate tags to all frontend unit tests.

#### OPT-6.4: Tag E2E Tests
**File**: artifacts/spaflow/tests/e2e/**/*.spec.ts
Add appropriate tags to E2E tests. Mark @smoke for critical user journeys.

#### OPT-6.5: Configure Tag-Based Execution
**File**: .github/workflows/ci.yml
Add jobs to run @smoke tests on every commit, @regression on merge.

#### OPT-6.6: Document Tag Usage
**File**: docs/test-tags.md
Document when to use each tag and execution strategy.

---

## OPT-7: Implement Monorepo-Aware Testing

[ ] Status: Pending

**Priority**: MEDIUM - Only test affected packages

**Related File Paths**
- .github/workflows/ci.yml
- pnpm-workspace.yaml

**Definition of Done**
CI configured to detect affected packages and run tests only for those packages. pnpm --filter used for package-level filtering. Test execution time proportional to change scope.

**Impact**
- Only test packages that changed
- Reduced monorepo testing overhead
- Faster feedback for focused changes

**Out of Scope**
Changing package structure. Modifying workspace configuration.

**Rules to Follow**
- 2026 Best Practice: Monorepo-aware CI
- DDD: Test at package boundaries
- Optimize for common change patterns

**Advanced Coding Pattern**
Affected package detection using git. Dependency graph analysis. Smart package filtering.

**Anti-patterns**
Testing all packages for every change. Overly complex filtering logic.

**Implementation**
```yaml
# .github/workflows/ci.yml
- name: Detect affected packages
  id: detect
  run: |
    CHANGED=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }})
    if echo "$CHANGED" | grep -q "packages/api/"; then
      echo "api=true" >> $GITHUB_OUTPUT
    fi

- name: Test API
  if: steps.detect.outputs.api == 'true'
  run: pnpm --filter @workspace/api-server test
```

**Depends On**
- OPT-5: Implement Incremental Testing

**Blocks**
- None

**Compounding Effect**
- MULTIPLIER: Reduces monorepo testing overhead
- Estimated impact: 50-70% reduction for single-package changes

### Subtasks

#### OPT-7.1: Implement Package Detection
**File**: .github/workflows/ci.yml
Add logic to detect which packages changed based on git diff.

#### OPT-7.2: Configure Filtered Test Execution
**File**: .github/workflows/ci.yml
Use pnpm --filter to run tests only for affected packages.

#### OPT-7.3: Add Package-Level Caching
**File**: .github/workflows/ci.yml
Configure package-specific dependency caching.

#### OPT-7.4: Test Monorepo Filtering
**File**: .github/workflows/ci.yml
Verify that single-package changes only trigger that package's tests.

#### OPT-7.5: Document Monorepo Strategy
**File**: docs/monorepo-testing.md
Document monorepo testing strategy and package dependencies.

---

## OPT-8: Enable Playwright Sharding

[ ] Status: Pending

**Priority**: MEDIUM - 70-90% reduction in E2E time

**Related File Paths**
- .github/workflows/ci.yml
- playwright.config.ts

**Definition of Done**
Playwright sharding configured with CI matrix strategy. Tests split across 4-8 shards running in parallel. Runtime balancing implemented to prevent bottlenecks. Reports merged from all shards.

**Impact**
- 70-90% reduction in E2E test execution time
- Horizontal scaling across CI machines
- Linear scaling with shard count

**Out of Scope**
Changing test logic. Over-sharding causing resource waste.

**Rules to Follow**
- 2026 Best Practice: Sharding after single-machine optimization
- Balance shards by execution time, not count
- Isolate shared resources per shard

**Advanced Coding Pattern**
Runtime balancing based on historical data. Shard-specific databases. Dynamic shard allocation.

**Anti-patterns**
Uneven shard distribution. Shared resources between shards. Too many shards causing overhead.

**Implementation**
```yaml
# .github/workflows/ci.yml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}/4
```

**Depends On**
- OPT-4: Increase Playwright Workers in CI
- OPT-6: Add Test Tagging System

**Blocks**
- None

**Compounding Effect**
- MULTIPLIER: Scales E2E testing horizontally
- Estimated impact: 70-90% reduction in E2E time (from 60 min to 6-18 min)

### Subtasks

#### OPT-8.1: Configure Sharding in Playwright
**File**: playwright.config.ts
Ensure test files are organized for optimal sharding. Balance test counts.

#### OPT-8.2: Add CI Matrix Strategy
**File**: .github/workflows/ci.yml
Configure matrix strategy for 4-8 shards. Add shard configuration.

#### OPT-8.3: Implement Runtime Balancing
**File**: .github/workflows/ci.yml
Use historical execution times to balance shard load.

#### OPT-8.4: Configure Report Merging
**File**: .github/workflows/ci.yml
Merge test reports from all shards. Upload combined report.

#### OPT-8.5: Isolate Shard Resources
**File**: artifacts/spaflow/tests/e2e/
Ensure each shard uses isolated databases/resources. Add shard-specific configuration.

#### OPT-8.6: Benchmark Sharding Performance
**File**: artifacts/spaflow/
Measure E2E execution time with different shard counts. Document optimal configuration.

---

## TIER 3 - QUALITY ENHANCEMENTS

## T4: Remove Placeholder Tests

[ ] Status: Pending

**Priority**: MEDIUM - Eliminates false confidence

**Related File Paths**
- artifacts/api-server/src/lib/auth.test.ts

**Definition of Done**
All placeholder tests (expect(true).toBe(true)) removed or replaced with real implementations. No commented-out test code remains.

**Impact**
- Eliminates false confidence from placeholder tests
- Enables accurate test coverage metrics
- Reduces confusion for AI agents

**Out of Scope**
Adding new test scenarios beyond replacing placeholders.

**Depends On**
- OPT-1: Fix Test Hanging

**Blocks**
- None

### Subtasks

#### T4.1: Implement Lockout Integration Tests
**File**: artifacts/api-server/src/lib/auth.test.ts
Replace lockout flow placeholders (lines 738-773) with real integration tests using test database.

#### T4.2: Implement Refresh Token Tests
**File**: artifacts/api-server/src/lib/auth.test.ts
Replace refresh token placeholders (lines 783-846) with tests using database.

#### T4.3: Remove All Placeholders
**File**: artifacts/api-server/src/lib/auth.test.ts
Audit entire file for any remaining expect(true).toBe(true) or TODO comments.

---

## T5: Add Test Data Management to E2E

[ ] Status: Pending

**Priority**: MEDIUM - Enables reliable parallel execution

**Related File Paths**
- artifacts/spaflow/tests/e2e/
- artifacts/api-server/src/routes/

**Definition of Done**
E2E tests create and cleanup their own test data. No reliance on hardcoded users. Database state isolated between tests.

**Impact**
- Eliminates flaky tests from shared state
- Enables reliable parallel execution
- Required for OPT-8 (sharding)

**Depends On**
- OPT-1: Fix Test Hanging

**Blocks**
- OPT-8: Enable Playwright Sharding

### Subtasks

#### T5.1: Create Test Data Helpers
**File**: artifacts/spaflow/tests/e2e/helpers/test-data.ts
Create functions for createTestUser, createTestClient, cleanupTestData.

#### T5.2: Add Test User Creation Endpoint
**File**: artifacts/api-server/src/routes/users.test.ts
Add test-only endpoint for creating test users with known credentials.

#### T5.3: Refactor Auth E2E Tests
**File**: artifacts/spaflow/tests/e2e/auth.spec.ts
Replace hardcoded credentials with createTestUser. Add cleanup in afterEach.

#### T5.4: Refactor Lockout E2E Tests
**File**: artifacts/spaflow/tests/e2e/auth.spec.ts
Use createTestUser for lockout testing. Ensure user cleanup resets lockout state.

#### T5.5: Refactor Password Reset E2E Tests
**File**: artifacts/spaflow/tests/e2e/auth.spec.ts
Use createTestUser for password reset testing. Restore original password in cleanup.

---

## T7: Expand Mutation Testing Coverage

[ ] Status: Pending

**Priority**: MEDIUM - Improves test quality

**Related File Paths**
- artifacts/api-server/stryker.conf.js
- artifacts/api-server/src/routes/
- artifacts/api-server/src/middleware/

**Definition of Done**
Mutation testing covers routes and middleware in addition to auth and services. Mutation score maintained above 60% threshold.

**Impact**
- Identifies gaps in test coverage
- Improves test quality
- Catches subtle bugs

**Depends On**
- OPT-1: Fix Test Hanging

**Blocks**
- T8: Make Mutation Tests Block Builds

### Subtasks

#### T7.1: Add Routes to Mutation Targets
**File**: artifacts/api-server/stryker.conf.js
Add src/routes/**/*.ts to mutate array.

#### T7.2: Add Middleware to Mutation Targets
**File**: artifacts/api-server/stryker.conf.js
Add src/middleware/**/*.ts to mutate array.

#### T7.3: Improve Tests for Surviving Mutants
**File**: artifacts/api-server/src/routes/
Write tests to kill surviving mutations in routes.

#### T7.4: Improve Tests for Middleware Mutants
**File**: artifacts/api-server/src/middleware/
Write tests to kill surviving mutations in middleware.

#### T7.5: Adjust Exclusions
**File**: artifacts/api-server/stryker.conf.js
Review excludedMutations. Remove any masking real issues.

---

## T8: Make Mutation Tests Block Builds

[ ] Status: Pending

**Priority**: MEDIUM - Enforces quality gates

**Related File Paths**
- .github/workflows/ci.yml
- artifacts/api-server/stryker.conf.js

**Definition of Done**
Mutation tests fail CI when score below break threshold. Runs on every PR (not just weekly). Report uploaded for review.

**Impact**
- Enforces mutation testing quality gate
- Prevents regression in test quality
- Catches bugs earlier

**Depends On**
- T7: Expand Mutation Testing Coverage

**Blocks**
- None

### Subtasks

#### T8.1: Remove Schedule Trigger
**File**: .github/workflows/ci.yml
Remove schedule trigger from mutation-tests job.

#### T8.2: Remove Continue-On-Error
**File**: .github/workflows/ci.yml
Remove continue-on-error: true from mutation-tests job.

#### T8.3: Add to PR Workflow
**File**: .github/workflows/ci.yml
Make mutation-tests job run on pull_request in addition to push.

#### T8.4: Adjust Thresholds if Needed
**File**: artifacts/api-server/stryker.conf.js
Review current thresholds. Adjust to realistic baseline if consistently failing.

---

## OPT-9: Add Flakiness Detection and Quarantine

[ ] Status: Pending

**Priority**: MEDIUM - Improves pipeline reliability

**Related File Paths**
- .github/workflows/ci.yml
- playwright.config.ts

**Definition of Done**
Flakiness detection implemented. Flaky tests automatically quarantined. Ownership tracking with deadlines. Metrics dashboard for flakiness rate.

**Impact**
- Improved pipeline reliability
- Reduced wasted CI resources
- Better developer trust in tests

**Out of Scope**
Fixing all flaky tests (that's ongoing work). Manual flakiness tracking.

**Rules to Follow**
- 2026 Best Practice: Automatic quarantine with ownership
- Assign named owner, not "the team"
- Set deadlines for fixes

**Advanced Coding Pattern**
Retry-based detection. Bayesian analysis. Automatic quarantine with Jira integration.

**Anti-patterns**
Ignoring flaky tests. Manual quarantine without tracking. No ownership.

**Implementation**
```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

**Depends On**
- OPT-1: Fix Test Hanging
- OPT-4: Increase Playwright Workers in CI

**Blocks**
- None

**Compounding Effect**
- QUALITY: Improves reliability of all test execution
- Estimated impact: 25% reduction in flaky reruns, improved trust

### Subtasks

#### OPT-9.1: Configure Automatic Retries
**File**: playwright.config.ts
Add retry configuration for CI. Set max retries to 2-3.

#### OPT-9.2: Implement Flakiness Detection
**File**: .github/workflows/ci.yml
Add flakiness detection logic. Track test failure patterns.

#### OPT-9.3: Configure Quarantine System
**File**: .github/workflows/ci.yml
Implement automatic quarantine for flaky tests. Use tagging or separate suite.

#### OPT-9.4: Add Ownership Tracking
**File**: .github/workflows/ci.yml
Assign ownership for quarantined tests. Set fix deadlines.

#### OPT-9.5: Create Flakiness Dashboard
**File**: docs/flakiness-metrics.md
Track flakiness rate, quarantine duration, fix time trends.

#### OPT-9.6: Document Flakiness Workflow
**File**: docs/flakiness-management.md
Document flakiness detection, quarantine, and fix workflow.

---

## T10: Add Integration Tests for Frontend-Backend

[ ] Status: Pending

**Priority**: LOW - Improves API client reliability

**Related File Paths**
- artifacts/spaflow/src/test/
- lib/api-client-react/src/

**Definition of Done**
Integration tests verify API client with real backend responses. Test error handling, loading states, data transformation. Mock server for consistent responses.

**Depends On**
- T2: Frontend Unit Test Expansion

**Blocks**
- None

### Subtasks

#### T10.1: Setup MSW
**File**: artifacts/spaflow/src/test/mocks/server.ts
Install and configure MSW. Create request handlers for all API endpoints.

#### T10.2: Test Auth API Hooks
**File**: artifacts/spaflow/src/test/integration/auth.test.ts
Write tests for useLogin, useLogout, useGetMe.

#### T10.3: Test Client API Hooks
**File**: artifacts/spaflow/src/test/integration/clients.test.ts
Write tests for useGetClients, useCreateClient, useUpdateClient.

#### T10.4: Test Dashboard API Hooks
**File**: artifacts/spaflow/src/test/integration/dashboard.test.ts
Write tests for dashboard API hooks.

#### T10.5: Test Error Handling
**File**: artifacts/spaflow/src/test/integration/errors.test.ts
Write tests for network errors, server errors, validation errors.

---

## T11: Add Contract Testing

[ ] Status: Pending

**Priority**: LOW - Ensures API contract compliance

**Related File Paths**
- lib/api-spec/openapi.yaml
- artifacts/api-server/src/routes/
- lib/api-zod/src/

**Definition of Done**
OpenAPI contract validated against implementation. Tests verify response schemas match spec. Contract tests run in CI.

**Depends On**
- None

**Blocks**
- None

### Subtasks

#### T11.1: Install Contract Testing Tool
**File**: artifacts/api-server/package.json
Install @apidevtools/swagger-parser for OpenAPI validation.

#### T11.2: Create Contract Test Suite
**File**: artifacts/api-server/src/test/contract.test.ts
Create tests validating each endpoint response against OpenAPI schema.

#### T11.3: Add Contract Tests to CI
**File**: .github/workflows/ci.yml
Add contract-tests job after typecheck.

#### T11.4: Validate Zod Schemas
**File**: lib/api-zod/src/
Create tests verifying Zod schemas match OpenAPI definitions.

---

## T12: Add Accessibility Testing

[ ] Status: Pending

**Priority**: LOW - Ensures accessibility compliance

**Related File Paths**
- artifacts/spaflow/tests/e2e/
- playwright.config.ts

**Definition of Done**
E2E tests include accessibility checks. Axe-core integrated with Playwright. Critical accessibility violations fail tests.

**Depends On**
- None

**Blocks**
- None

### Subtasks

#### T12.1: Install Axe Playwright
**File**: artifacts/spaflow/package.json
Install @axe-core/playwright package.

#### T12.2: Configure Axe in Playwright
**File**: artifacts/spaflow/playwright.config.ts
Add axe configuration to Playwright config.

#### T12.3: Add A11y to Auth Flow
**File**: artifacts/spaflow/tests/e2e/auth.spec.ts
Add accessibility checks to login page tests.

#### T12.4: Add A11y to Client Management
**File**: artifacts/spaflow/tests/e2e/clients.spec.ts
Add accessibility checks to client list and form tests.

#### T12.5: Add A11y to Dashboard
**File**: artifacts/spaflow/tests/e2e/dashboard.spec.ts
Add accessibility checks to dashboard tests.

---

## T13: Add Performance Regression Testing

[ ] Status: Pending

**Priority**: LOW - Ensures performance doesn't degrade

**Related File Paths**
- artifacts/spaflow/tests/e2e/
- playwright.config.ts
- artifacts/api-server/src/routes/

**Definition of Done**
Performance metrics tracked over time. Regression tests fail when metrics degrade beyond threshold. Baseline established.

**Depends On**
- None

**Blocks**
- None

### Subtasks

#### T13.1: Establish Performance Baseline
**File**: artifacts/spaflow/tests/e2e/performance.spec.ts
Create tests measuring key metrics (LCP, CLS, FID, TTFB).

#### T13.2: Add API Response Time Tests
**File**: artifacts/api-server/src/test/performance.test.ts
Create tests measuring endpoint response times.

#### T13.3: Configure Performance Budgets
**File**: playwright.config.ts
Add performance thresholds to Playwright config.

#### T13.4: Track Metrics Over Time
**File**: .github/workflows/ci.yml
Add step to upload performance metrics as artifact.

---

## T14: Create Shared Test Utilities Package

[ ] Status: Pending

**Priority**: LOW - Reduces code duplication

**Related File Paths**
- lib/test-utils/
- artifacts/api-server/src/test/
- artifacts/spaflow/src/test/

**Definition of Done**
Shared workspace package for common test utilities. Reduces duplication across artifacts. Versioned and documented.

**Depends On**
- None

**Blocks**
- T15: Add Tests for Library Packages

### Subtasks

#### T14.1: Create Test Utils Package
**File**: lib/test-utils/package.json
Create new workspace package. Add TypeScript config.

#### T14.2: Extract Database Utilities
**File**: lib/test-utils/src/database.ts
Move database cleanup, setup, transaction helpers from api-server.

#### T14.3: Extract Fixture Factories
**File**: lib/test-utils/src/fixtures.ts
Move createTestClient, createTestUser, etc.

#### T14.4: Extract Custom Assertions
**File**: lib/test-utils/src/assertions.ts
Create reusable assertions for common test needs.

#### T14.5: Update Artifacts to Use Shared Utils
**File**: artifacts/api-server/src/test/setup.ts
Refactor to import from @workspace/test-utils.

#### T14.6: Document Test Utils
**File**: lib/test-utils/README.md
Document all utilities with examples.

---

## T15: Add Tests for Library Packages

[ ] Status: Pending

**Priority**: LOW - Ensures library quality

**Related File Paths**
- lib/api-client-react/src/
- lib/api-zod/src/
- lib/db/src/

**Definition of Done**
All library packages have test suites. Coverage thresholds enforced. Tests validate public API.

**Depends On**
- T14: Shared Test Utilities

**Blocks**
- None

### Subtasks

#### T15.1: Test API Client React
**File**: lib/api-client-react/src/
Write tests for all React Query hooks.

#### T15.2: Test API Zod Schemas
**File**: lib/api-zod/src/
Write tests for all Zod schemas.

#### T15.3: Test Database Schema
**File**: lib/db/src/
Write tests for schema definitions.

#### T15.4: Add Coverage Thresholds
**File**: lib/*/package.json
Add test:coverage script to each library.

#### T15.5: Add Library Tests to CI
**File**: .github/workflows/ci.yml
Add library-tests job after typecheck.

---

## Summary Statistics

**Total Tasks**: 24 (6 completed, 18 pending)

**By Tier**:
- Tier 1 (Critical Infrastructure): 4 tasks
- Tier 2 (Selective Execution): 4 tasks
- Tier 3 (Quality Enhancements): 10 tasks
- Completed: 6 tasks

**Estimated Completion Time**:
- Tier 1: 1-2 weeks (highest priority)
- Tier 2: 2-3 weeks (builds on Tier 1)
- Tier 3: 4-6 weeks (can run in parallel after Tier 1+2)

**Expected Impact**:
- After Tier 1: 50% reduction in CI time, no hanging
- After Tier 2: 85% total reduction for typical changes
- After Tier 3: Same speed, higher quality coverage
