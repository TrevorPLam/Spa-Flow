# Testing Strategy

## Overview

This document describes the testing strategy for the Spa-Flow monorepo, including incremental testing, test selection criteria, and CI execution patterns.

## Test Selection Strategy

### Incremental Testing

Incremental testing reduces CI execution time by running only tests relevant to changed code. This is implemented using:

- **Vitest `--changed` flag**: Runs tests only against changed files
- **pnpm filtering**: Uses `--filter "...[origin/main]"` to select packages changed since main branch
- **Change detection**: CI jobs detect which packages changed and conditionally run tests

### When to Use Incremental vs Full Test Suite

| Scenario | Test Execution | Rationale |
|----------|---------------|-----------|
| Pull Request (small changes) | Incremental tests for changed packages | Fast feedback, 60-80% time reduction |
| Pull Request (large changes) | Full test suite | Ensures no regressions across all packages |
| Merge to main | Full test suite | Validates complete system before production |
| Scheduled runs | Full test suite | Ensures system health over time |
| Manual workflow dispatch | Full test suite | User explicitly wants full validation |

### CI Test Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        CI Pipeline                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Security Scan  │
                    │   CodeQL        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Type Check    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      Build      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Smoke Tests │ │   Contract  │ │  Component  │
    │   (always)  │ │  (filtered) │ │  (filtered) │
    └─────────────┘ └─────────────┘ └─────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Coverage Report│
                    │   (filtered)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    E2E Tests    │
                    │  (filtered or  │
                    │   main only)   │
                    └─────────────────┘
```

## Test Categories

### Smoke Tests
- **Purpose**: Quick validation of critical paths
- **Execution**: Runs on every commit
- **Duration**: < 1 minute
- **Command**: `pnpm -r --if-present run test:fast`
- **Coverage**: Critical user paths (auth flow, basic API health)

### Unit Tests
- **Purpose**: Test individual components and functions in isolation
- **Execution**: Incremental based on package changes
- **Command**: `vitest run` or `vitest run --changed`
- **Coverage**: Component logic, utility functions, services

### Contract Tests
- **Purpose**: Validate API contracts and integration points
- **Execution**: Filtered based on api-server changes
- **Command**: `pnpm --filter "@workspace/api-server" --filter "...[origin/main]" run test`
- **Coverage**: API routes, client integration, check-in flow

### Component Tests
- **Purpose**: Test frontend components with React Testing Library
- **Execution**: Filtered based on spaflow changes
- **Command**: `pnpm -r --filter "...[origin/main]" --if-present run test`
- **Coverage**: UI components, hooks, user interactions

### E2E Tests
- **Purpose**: Test complete user journeys across the application
- **Execution**: 
  - PRs: Only if spaflow changed
  - Main branch: Always run
- **Command**: `pnpm run test:e2e`
- **Coverage**: Critical user journeys, visual regression

### Coverage Tests
- **Purpose**: Measure code coverage and ensure thresholds are met
- **Execution**: Filtered based on package changes
- **Command**: `pnpm run test:coverage:ci`
- **Thresholds**: 80% lines, functions, branches, statements

## Local Development

### Running All Tests
```bash
# Run all tests in workspace
pnpm -r run test

# Run tests for specific package
cd artifacts/api-server && pnpm run test
cd artifacts/spaflow && pnpm run test
```

### Running Incremental Tests
```bash
# Run tests only for changed packages (workspace level)
pnpm run test:changed

# Run tests for affected packages and their dependents
pnpm run test:affected

# Run tests only for changed files in a package
cd artifacts/api-server && pnpm run test:changed
cd artifacts/spaflow && pnpm run test:changed
```

### Running Smoke Tests
```bash
# Quick smoke tests without coverage
pnpm -r --if-present run test:fast
```

### Running Tests with Coverage
```bash
# Run coverage for all packages
pnpm -r run test:coverage

# Run coverage for specific package
cd artifacts/api-server && pnpm run test:coverage
cd artifacts/spaflow && pnpm run test:coverage
```

## Monorepo Filtering

### pnpm Filter Syntax

The workspace uses pnpm's powerful filtering to run tests only for affected packages:

```bash
# Select packages changed since origin/main
pnpm -r --filter "...[origin/main]" run test

# Select packages changed since origin/main and their dependents
pnpm -r --filter "...[origin/main]..." run test

# Select specific package
pnpm --filter "@workspace/api-server" run test

# Select package and its dependencies
pnpm --filter "@workspace/api-server..." run test
```

### CI Integration

The CI workflow uses pnpm filtering in multiple jobs:

1. **Contract Tests**: `pnpm --filter "@workspace/api-server" --filter "...[origin/main]"`
2. **Component Tests**: `pnpm -r --filter "...[origin/main]" --if-present run test`
3. **Coverage**: Conditional execution based on change detection

## Best Practices

### For Developers
1. **Run incremental tests locally** before pushing: `pnpm run test:changed`
2. **Run smoke tests** for quick validation: `pnpm -r run test:fast`
3. **Run full test suite** before merging to main: `pnpm -r run test`
4. **Check coverage** locally: `pnpm -r run test:coverage`

### For CI/CD
1. **Smoke tests** on every commit for fast feedback
2. **Incremental tests** on PRs for quick iteration
3. **Full test suite** on merge to main for production readiness
4. **Change detection** to skip unnecessary test runs

### Test Organization
1. **Tag tests** by category (smoke, regression, integration) - see OPT-6
2. **Organize test files** by feature/domain
3. **Use descriptive test names** that explain what is being tested
4. **Follow AAA pattern** (Arrange, Act, Assert)

## Performance Impact

### Expected Time Savings

| Scenario | Before | After | Reduction |
|----------|--------|-------|-----------|
| Small PR (1 package) | 45-60 min | 10-15 min | 75-80% |
| Medium PR (2 packages) | 45-60 min | 15-20 min | 65-70% |
| Large PR (all packages) | 45-60 min | 45-60 min | 0% |
| Merge to main | 45-60 min | 45-60 min | 0% |

### Compounding Effects

Incremental testing compounds with other optimizations:
- **OPT-2 (Dependency Caching)**: 30-50% reduction in install time
- **OPT-3 (fileParallelism)**: 20-30% reduction in test execution time
- **OPT-4 (Playwright Workers)**: 50% reduction in E2E time
- **OPT-5 (Incremental Testing)**: 60-80% reduction for small changes

**Combined impact**: 85-90% total reduction for typical PRs

## Future Enhancements

### Test Tagging (OPT-6)
- Implement test tags (@smoke, @regression, @integration, @e2e, @slow, @flaky)
- Enable selective execution by test category
- Run @smoke tests on every commit, @regression on merge

### Advanced Change Detection
- Use coverage data for test impact analysis
- Implement smart test selection based on code changes
- Add dependency graph analysis for cross-package changes

### Flakiness Detection (OPT-9)
- Implement automatic retry with flakiness detection
- Quarantine flaky tests with ownership tracking
- Add flakiness metrics dashboard

## References

- [Vitest CLI Documentation](https://vitest.dev/guide/cli)
- [pnpm Filtering Documentation](https://pnpm.io/filtering)
- [TASKS.md - OPT-5: Implement Incremental Testing](../TASKS.md)
