---
name: cicd-pipeline
description: Understanding and working with the GitHub Actions CI/CD pipeline with 11 stages and caching strategies
---

# CI/CD Pipeline

This skill covers understanding and working with the GitHub Actions CI/CD pipeline in the Spa-Flow repository with 11 stages and caching strategies.

## Key Concepts

### CI Trigger Conditions
- Every push to main branch
- Every pull request to main branch
- Manual workflow dispatch
- Runs on Ubuntu latest

### 11-Stage Pipeline
1. **Security Scan** - pnpm audit (high/critical vulnerabilities block CI)
2. **CodeQL Analysis** - Static application security testing
3. **Type Check** - TypeScript compilation check
4. **Build** - Build all packages
5. **Smoke Tests** - Quick validation of critical paths
6. **Contract Tests** - API contract validation (filtered by api-server changes)
7. **Component Tests** - Frontend component tests (filtered by spaflow changes)
8. **Coverage Report** - Code coverage measurement (80% threshold)
9. **E2E Tests** - End-to-end tests with visual regression (filtered by spaflow changes)
10. **Load Tests** - Performance testing with k6
11. **Mutation Tests** - Mutation testing with Stryker

### Filtering Strategies
- Contract tests: Only run when api-server changes
- Component tests: Only run when spaflow changes
- E2E tests: Only run when spaflow or api-client-react changes
- Incremental testing with pnpm --filter
- Faster feedback for targeted changes

### Caching Strategy
- pnpm store cache for dependencies
- Build cache for compiled artifacts
- Vitest cache for test execution
- Playwright browser cache
- Stryker cache for mutation testing
- Reduces CI runtime significantly

### Coverage Threshold
- 80% minimum coverage required
- Enforced in CI pipeline
- Blocks merge if below threshold
- Per-package coverage measurement
- Coverage reports in coverage/ directories

### pnpm Audit Blocking
- High/critical vulnerabilities block CI
- Supply chain security measure
- 1-day minimum release age for packages
- Platform-specific dependency exclusions
- Only built dependencies restriction

### Incremental Testing
- `pnpm run test:changed` - Only changed packages since main
- `pnpm run test:affected` - Changed packages + dependents
- Uses pnpm --filter for workspace filtering
- Faster feedback for large codebases
- Reduces CI runtime

### Platform-Specific Dependency Exclusions
- Linux-only optimization in CI
- Excludes Windows/macOS-specific packages
- Reduces dependency installation time
- Configured in pnpm-workspace.yaml
- Supply chain security measure

### Supply Chain Security Measures
- pnpm audit for vulnerability scanning
- CodeQL static analysis
- 1-day minimum release age
- Lockfile enforcement
- Only built dependencies

## Key Files
- `.github/workflows/ci.yml` - CI/CD pipeline configuration
- `pnpm-workspace.yaml` - Supply chain security config

## References
- `README.md` - CI/CD pipeline overview
- `docs/testing-strategy.md` - CI test stages

## Common Tasks

### Running CI Stages Locally
```bash
# Security scan
pnpm audit

# Type check
pnpm -r run typecheck

# Build
pnpm -r run build

# Tests
pnpm -r run test

# Coverage
pnpm -r run test:coverage

# E2E tests
cd artifacts/spaflow && pnpm run test:e2e

# Load tests
pnpm run test:load:all

# Mutation tests
cd artifacts/api-server && pnpm run test:mutation
```

### Incremental Testing
```bash
# Test only changed packages
pnpm run test:changed

# Test changed packages and dependents
pnpm run test:affected
```

### Understanding CI Failures
- Check stage that failed
- Review logs for error details
- Security scan: Update vulnerable dependencies
- Type check: Fix TypeScript errors
- Tests: Fix failing tests
- Coverage: Add tests or increase coverage
- E2E: Check for flaky tests or UI changes

## Best Practices
- Keep CI runtime low with filtering
- Use caching effectively
- Fix security vulnerabilities promptly
- Maintain coverage above 80%
- Use incremental testing for faster feedback
- Monitor CI performance
