# Test Utilities Package

Shared test utilities for the Spa-Flow monorepo. This package provides common testing helpers, fixture factories, and custom assertions to reduce code duplication across packages.

## Installation

This package is part of the workspace and should be imported via workspace protocol:

```typescript
import { createTestUser, cleanDatabase } from '@workspace/test-utils';
```

## Usage

### Database Utilities

```typescript
import { cleanDatabase, setupTestDatabase } from '@workspace/test-utils';

// Clean all tables in dependency order
await cleanDatabase();

// Setup test database (cleans all tables)
await setupTestDatabase();
```

### Fixture Factories

```typescript
import { createTestUser, createTestClient, createTestLocker } from '@workspace/test-utils';

// Create test user fixture
const user = createTestUser({ email: 'custom@example.com' });

// Create test client fixture
const client = createTestClient({ name: 'Custom Client' });

// Create test locker fixture
const locker = createTestLocker({ status: 'maintenance' });
```

### Custom Assertions

```typescript
import { assertApiError, assertApiSuccess, assertRecordExists } from '@workspace/test-utils';

// Assert API error
assertApiError(response, 400, 'Invalid input');

// Assert API success
assertApiSuccess(response, 200);

// Assert record exists
assertRecordExists(user, 'User should exist');
```

## Architecture

- **database.ts**: Database cleanup and setup utilities
- **fixtures.ts**: Test data fixture factories
- **assertions.ts**: Custom test assertions
- **index.ts**: Main export file

## Best Practices

- Use fixture factories instead of hardcoded test data
- Clean database before each test to ensure isolation
- Use custom assertions for consistent error messages
- Keep fixtures simple and composable
