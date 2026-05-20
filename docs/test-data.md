# Test Data Seeding

This document describes the test data seeding strategy for SpaFlow, including what data is seeded, how to use the seed scripts, and how to customize seed data for testing.

## Overview

Test data seeding provides a consistent baseline for integration and E2E tests. The seed scripts create deterministic test data that can be safely run multiple times (idempotent) and are separate from production reference data.

## Seed Data Structure

The test seed creates the following minimal dataset:

### Users (3 records)
- **manager@test.com** - Test Manager (MANAGER role)
- **staff1@test.com** - Test Staff 1 (STAFF role)
- **staff2@test.com** - Test Staff 2 (STAFF role)

### Clients (5 records)
- **Alice Johnson** (MEM001) - No membership
- **Bob Smith** (MEM002) - One-time membership, prefers morning appointments
- **Carol Williams** (MEM003) - Six-month membership
- **David Brown** (MEM004) - No membership, allergic to certain products
- **Eva Davis** (MEM005) - One-time membership

### Lockers (3 records)
- L1 - Available
- L2 - Available
- L3 - Available

### Rooms (2 records)
- R1 - Available
- R2 - Available

### Memberships (2 records)
- Bob Smith (MEM002) - One-time membership (expires in 30 days)
- Carol Williams (MEM003) - Six-month membership (expires in 180 days)

## Usage

### Running Seed Scripts

#### Seed Test Data (Local Development)
```bash
cd artifacts/api-server
pnpm run test:seed
```

#### Clean Up Test Data
```bash
cd artifacts/api-server
pnpm run test:seed:cleanup
```

#### Using Seed in Tests
Set the `TEST_SEED` environment variable to `true` before running tests:

```bash
TEST_SEED=true pnpm run test
```

This will automatically seed test data before tests run via the test setup in `src/test/setup.ts`.

## File Structure

```
artifacts/api-server/src/test/
├── seed-data.ts    # Seed data types and factory functions
└── seed.ts         # Seed and cleanup functions
```

### seed-data.ts

Defines TypeScript interfaces for seed data and provides:
- Factory functions for creating test data (createSeedUser, createSeedClient, etc.)
- Predefined seed data sets (SEED_USERS, SEED_CLIENTS, etc.)
- Dynamic membership generation based on client IDs

### seed.ts

Implements the seeding logic:
- `seedTestData()` - Seeds all test data in a transaction
- `cleanupTestData()` - Cleans up seeded data in reverse dependency order
- Idempotent operations using `onConflictDoNothing()`

## Customizing Seed Data

### Adding New Seed Data

1. Add the data to the appropriate array in `seed-data.ts`:
```typescript
export const SEED_USERS: TestUser[] = [
  // ... existing users
  {
    email: 'newuser@test.com',
    name: 'New User',
    passwordHash: '$2a$12$...',
    role: 'STAFF',
  },
];
```

2. Update the seeding logic in `seed.ts` if needed:
```typescript
for (const user of SEED_USERS) {
  await tx.insert(usersTable).values(user).onConflictDoNothing();
}
```

### Creating Custom Seed Data for Specific Tests

Use the factory functions in `seed-data.ts` to create custom data within tests:

```typescript
import { createSeedUser, createSeedClient } from './test/seed-data';

const customUser = createSeedUser({
  email: 'custom@test.com',
  name: 'Custom User',
  role: 'MANAGER',
});

const customClient = createSeedClient({
  name: 'Custom Client',
  membershipStatus: 'six_month',
});
```

## Best Practices

### Idempotency
All seed operations use `onConflictDoNothing()` to ensure the seed script can be run multiple times without errors.

### Minimal Data
The seed dataset is intentionally minimal to keep tests fast. Only seed data that is required for test scenarios.

### Transaction Safety
All seed operations run within a database transaction to ensure atomicity. If any part fails, the entire seed operation rolls back.

### Dependency Order
Data is seeded in dependency order (users → clients → lockers/rooms → memberships) and cleaned up in reverse order.

### Environment-Specific
Test seed data is separate from production reference data (see `scripts/src/seed.ts`). Never seed test data into production.

### Deterministic
Seed data uses fixed values (email addresses, names, IDs) to ensure tests are reproducible and predictable.

## Integration with Test Setup

The seed function is integrated into the test setup in `src/test/setup.ts`:

```typescript
export async function setupTestDatabase() {
  await cleanDatabase();
  
  if (process.env.TEST_SEED === 'true') {
    await seedTestData();
  }
}
```

Tests that require seeded data should set `TEST_SEED=true` in their environment or call `seedTestData()` directly in their setup.

## Troubleshooting

### Seed Fails with Foreign Key Violation
Ensure the database is clean before seeding by running `pnpm run test:seed:cleanup` first.

### Seed Data Not Found in Tests
Verify that `TEST_SEED=true` is set in the environment before running tests.

### Password Hash Issues
The seed data uses a placeholder password hash. For authentication tests, you may need to use a real bcrypt hash or mock the authentication service.

## Related Documentation

- [Test Organization](./test-organization.md) - How tests are organized in the codebase
- [Contract Testing](./contract-testing.md) - API contract testing strategy
- [Mutation Testing](./mutation-testing.md) - Mutation testing strategy
