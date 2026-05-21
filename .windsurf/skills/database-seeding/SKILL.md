---
name: database-seeding
description: Using scripts for database seeding, index verification, and quality checks
---

# Database Seeding & Utilities

This skill covers using scripts in the Spa-Flow repository for database seeding, index verification, and quality checks.

## Key Concepts

### Database Seeding with Initial Data
- Seed database with initial data
- Admin and staff user creation
- Sample clients for testing
- Sample lockers and rooms
- Sample products
- Environment variable validation

### Admin and Staff User Creation
- Create admin user with MANAGER role
- Create staff users with STAFF role
- Password from environment variable
- Email configuration
- Role assignment

### Environment Variable Validation for Seeding
- Validate required environment variables
- Fail-fast if missing variables
- Check database connection
- Validate Square configuration
- Check Twilio configuration

### Index Verification Scripts
- Verify database indexes exist
- Check index usage
- Identify missing indexes
- Performance optimization
- Query optimization insights

### Flaky Test Detection
- Detect flaky Vitest tests
- Detect flaky Playwright tests
- Run tests multiple times
- Identify intermittent failures
- Generate flakiness dashboard

### Flakiness Dashboard Generation
- Generate dashboard of flaky tests
- Visual representation of flakiness
- Test stability metrics
- Historical flakiness data
- Trend analysis

### Cascade Testing Utilities
- Test utilities for AI agent testing
- Mock data generation
- Test helpers
- Assertion utilities
- Test environment setup

### Script Execution Patterns
- Use pnpm for script execution
- Environment-specific scripts
- Error handling and logging
- Validation before execution
- Idempotent operations

## Key Files
- `scripts/src/seed.ts` - Database seeding
- `scripts/src/index-verification.ts` - Index verification
- `scripts/detect-flaky-vitest.ts` - Flaky Vitest test detection
- `scripts/detect-flaky-playwright.ts` - Flaky Playwright test detection
- `scripts/generate-flakiness-dashboard.ts` - Flakiness dashboard generation

## References
- `README.md` - Installation and seeding
- TODO.md TASK-024 - Staff password environment variable

## Common Tasks

### Running Database Seed
```bash
cd scripts
pnpm run seed
```

### Verifying Indexes
```bash
cd scripts
pnpm run verify-indexes
```

### Detecting Flaky Tests
```bash
cd scripts
pnpm run detect-flaky-vitest
pnpm run detect-flaky-playwright
```

### Generating Flakiness Dashboard
```bash
cd scripts
pnpm run generate-flakiness-dashboard
```

### Adding a New Script
1. Create script in `scripts/src/`
2. Add to package.json scripts
3. Make executable if needed
4. Add documentation
5. Test script execution

## Best Practices
- Validate environment before seeding
- Use idempotent operations
- Log script execution
- Handle errors gracefully
- Clean up test data
