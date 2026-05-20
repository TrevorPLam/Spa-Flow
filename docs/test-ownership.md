# Test Ownership Tracking

This file tracks ownership of tests to enable automatic flakiness detection and quarantine workflows.

## Purpose
Following 2026 best practices for flaky test management:
- Each test should have a named owner (not "the team")
- Owners are responsible for fixing flaky tests within deadlines
- Automated detection system references this file for ownership assignment

## Format
| Test ID | File Path | Owner | Team | Notes |
|---------|-----------|-------|------|-------|
| (test name) | (file path) | (owner name) | (team name) | (optional notes) |

## Test Ownership

### API Server Tests

| Test ID | File Path | Owner | Team | Notes |
|---------|-----------|-------|------|-------|
| auth > login flow | artifacts/api-server/src/routes/auth.test.ts | @maintainer | backend | Critical authentication path |
| auth > password reset | artifacts/api-server/src/routes/auth.test.ts | @maintainer | backend | Email-dependent test |
| auth > account lockout | artifacts/api-server/src/lib/auth.test.ts | @maintainer | backend | Rate limiting test |

### Frontend Unit Tests

| Test ID | File Path | Owner | Team | Notes |
|---------|-----------|-------|------|-------|
| AuthContext > login | artifacts/spaflow/src/contexts/AuthContext.test.tsx | @maintainer | frontend | Authentication context |
| AuthContext > logout | artifacts/spaflow/src/contexts/AuthContext.test.tsx | @maintainer | frontend | Authentication context |

### E2E Tests

| Test ID | File Path | Owner | Team | Notes |
|---------|-----------|-------|------|-------|
| auth.spec.ts > login flow | artifacts/spaflow/tests/e2e/auth.spec.ts | @maintainer | qa | Critical user journey |
| auth.spec.ts > password reset | artifacts/spaflow/tests/e2e/auth.spec.ts | @maintainer | qa | Email-dependent test |
| auth.spec.ts > account lockout | artifacts/spaflow/tests/e2e/auth.spec.ts | @maintainer | qa | Rate limiting test |

## Adding New Tests

When adding new tests:
1. Add an entry to this file with a named owner
2. Use specific owner names (GitHub username preferred), not "the team"
3. Assign to appropriate team (backend, frontend, qa)
4. Include any relevant notes about test dependencies

## Flakiness Quarantine Process

When a test is quarantined:
1. Automated detection system identifies flaky test (>5% failure rate)
2. System references this file to identify owner
3. Owner is assigned 7-day deadline to fix
4. Owner should investigate root cause and stabilize test
5. Once fixed, remove quarantine comment and tag

## Deadlines

- Standard fix deadline: 7 days from quarantine
- Critical tests: 3 days from quarantine
- Extensions must be documented in Notes column

## Maintenance

- Keep this file updated as tests are added/removed
- Update ownership when team members change responsibilities
- Review quarterly to ensure accuracy
