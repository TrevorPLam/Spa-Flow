# Repository Task List

## Task Format Legend
- [ ] Incomplete
- [x] Complete
- [~] In Progress
- [!] Blocked

---

## [ ] TASK-001: Consolidate Duplicate Middleware Directories
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/middleware/`
- `artifacts/api-server/src/middlewares/`
- `artifacts/api-server/src/app.ts`

### Definition of Done
- Single middleware directory exists
- All imports updated to use consolidated path
- All middleware tests pass
- No broken references in codebase

### Out of Scope
- Middleware logic refactoring
- Adding new middleware
- Changing middleware behavior

### Rules to Follow
- Preserve existing middleware functionality
- Maintain backward compatibility
- Update all import statements
- Run full test suite after changes

### Advanced Coding Pattern
- Use absolute imports from consolidated location
- Ensure middleware order preserved in app.ts
- Document directory structure decision

### Anti-Patterns
- Copy-pasting files instead of moving
- Breaking existing import paths without updating
- Leaving empty directories

### Imports/Exports
- Update imports in `app.ts` lines 20-21
- Update imports in any route files using middleware

### Depends On
- None

### Blocks
- TASK-002 (TypeScript strict mode)

---

### Subtasks

#### TASK-001-A: Audit Middleware Directory Usage
**Target:** `artifacts/api-server/src/`
**Action:** Search codebase for all imports from both `middleware/` and `middlewares/` directories, catalog each usage with file path and line number to ensure complete migration coverage.

#### TASK-001-B: Determine Canonical Directory Name
**Target:** `artifacts/api-server/src/`
**Action:** Decide between `middleware/` or `middlewares/` based on existing usage patterns and team conventions, then document decision in codebase architecture documentation.

#### TASK-001-C: Move Files to Canonical Directory
**Target:** `artifacts/api-server/src/`
**Action:** Move all middleware files from non-canonical directory to canonical directory using git mv to preserve history, ensuring no files are lost in migration.

#### TASK-001-D: Update Import Statements
**Target:** `artifacts/api-server/src/app.ts`
**Action:** Update all import statements in app.ts and route files to use canonical directory path, verify no broken imports remain.

#### TASK-001-E: Remove Empty Directory
**Target:** `artifacts/api-server/src/`
**Action:** Delete now-empty non-canonical middleware directory after verifying all files successfully moved and imports updated.

#### TASK-001-F: Verify Middleware Functionality
**Target:** `artifacts/api-server/src/`
**Action:** Run full test suite to ensure all middleware functions correctly after consolidation, specifically test requestIdMiddleware and correlationIdMiddleware.

---

## [ ] TASK-002: Enable TypeScript Strict Mode
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `tsconfig.base.json`
- `artifacts/api-server/tsconfig.json`
- `artifacts/mockup-sandbox/tsconfig.json`
- `artifacts/spaflow/tsconfig.json`
- `lib/db/tsconfig.json`
- `scripts/tsconfig.json`

### Definition of Done
- noImplicitOverride enabled in base config
- strictFunctionTypes enabled in base config
- noUnusedLocals enabled in base config
- All TypeScript compilation errors resolved
- Full test suite passes

### Out of Scope
- Changing existing code logic
- Adding new type definitions
- Refactoring for type safety beyond strict mode fixes

### Rules to Follow
- Fix type errors incrementally
- Use proper type guards instead of any
- Remove unused imports and variables
- Maintain backward compatibility where possible

### Advanced Coding Pattern
- Use discriminated unions for type narrowing
- Implement proper type guards
- Use readonly arrays for immutable data
- Leverage utility types (Pick, Omit, Partial)

### Anti-Patterns
- Using type assertions to bypass errors
- Disabling strict mode locally
- Adding @ts-ignore without justification
- Using any instead of proper types

### Imports/Exports
- No changes to imports/exports expected
- May need to add type imports

### Depends On
- TASK-001 (Consolidate middleware directories)

### Blocks
- None

---

### Subtasks

#### TASK-002-A: Enable noImplicitOverride
**Target:** `tsconfig.base.json`
**Action:** Change line 9 from `"noImplicitOverride": false` to `"noImplicitOverride": true`, then compile entire codebase to identify methods missing override keyword.

#### TASK-002-B: Enable strictFunctionTypes
**Target:** `tsconfig.base.json`
**Action:** Change line 15 from `"strictFunctionTypes": false` to `"strictFunctionTypes": true`, compile and fix any function type compatibility errors.

#### TASK-002-C: Enable noUnusedLocals
**Target:** `tsconfig.base.json`
**Action:** Change line 11 from `"noUnusedLocals": false` to `"noUnusedLocals": true`, compile and remove all unused local variables and imports.

#### TASK-002-D: Fix Override Errors
**Target:** `artifacts/api-server/src/`
**Action:** Add override keyword to all method overrides identified by noImplicitOverride compilation errors, starting with service classes and middleware.

#### TASK-002-E: Fix Function Type Errors
**Target:** `artifacts/api-server/src/`
**Action:** Refactor function types to satisfy strictFunctionTypes, using proper type annotations and generic constraints where needed.

#### TASK-002-F: Remove Unused Code
**Target:** All TypeScript files
**Action:** Remove all unused local variables, imports, and parameters identified by noUnusedLocals compilation, ensuring no dead code remains.

#### TASK-002-G: Verify Type Safety
**Target:** Root directory
**Action:** Run pnpm run typecheck to ensure all TypeScript compilation errors resolved across entire monorepo.

---

## [ ] TASK-011: Fix Bcrypt Rounds Inconsistency
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/lib/constants.ts`
- `artifacts/api-server/src/lib/auth.ts`
- `artifacts/api-server/src/services/passwordReset.ts`
- All test files using bcrypt

### Definition of Done
- All bcrypt.hash calls use BCRYPT_ROUNDS constant
- BCRYPT_ROUNDS consistently set to 12 across codebase
- All tests updated to use BCRYPT_ROUNDS constant
- No hardcoded bcrypt cost factors remain

### Out of Scope
- Changing the actual bcrypt cost factor value
- Modifying bcrypt implementation

### Rules to Follow
- Use BCRYPT_ROUNDS constant everywhere
- Update test files to use constant
- Verify password hashing still works correctly

### Advanced Coding Pattern
- Single source of truth for security parameters
- Constant propagation for consistency

### Anti-Patterns
- Hardcoded magic numbers for security
- Inconsistent security parameters

### Imports/Exports
- Import BCRYPT_ROUNDS from lib/constants.ts

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-011-A: Update auth.ts
**Target:** `artifacts/api-server/src/lib/auth.ts`
**Action:** Replace hardcoded `10` with `BCRYPT_ROUNDS` constant on lines 21 and 289, import constant from lib/constants.ts.

#### TASK-011-B: Update passwordReset.ts
**Target:** `artifacts/api-server/src/services/passwordReset.ts`
**Action:** Replace hardcoded `10` with `BCRYPT_ROUNDS` constant on lines 58 and 155, import constant from lib/constants.ts.

#### TASK-011-C: Update Test Files
**Target:** `artifacts/api-server/src/**/*.test.ts`
**Action:** Replace all hardcoded `10` with `BCRYPT_ROUNDS` constant in test files, import constant from lib/constants.ts.

#### TASK-011-D: Verify Consistency
**Target:** `artifacts/api-server/src/`
**Action:** Search for all bcrypt.hash calls to ensure none use hardcoded values, all use BCRYPT_ROUNDS constant.

#### TASK-011-E: Test Password Functionality
**Target:** `artifacts/api-server/`
**Action:** Run authentication tests to ensure password hashing and verification still work correctly with consistent bcrypt rounds.

---

## [ ] TASK-012: Remove Hardcoded Default Passwords in Seed Script
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `scripts/src/seed.ts`
- `.env.example`

### Definition of Done
- Hardcoded passwords removed from seed.ts
- ADMIN_PASSWORD environment variable required
- Staff password also uses environment variable
- Clear error message if passwords not set

### Out of Scope
- Changing password requirements
- Modifying seed script logic

### Rules to Follow
- Require environment variables for all passwords
- Fail fast with clear error if not set
- Document required environment variables

### Advanced Coding Pattern
- Fail-fast validation
- Environment-based configuration

### Anti-Patterns
- Hardcoded credentials
- Weak default passwords
- Silent fallbacks

### Imports/Exports
- No import/export changes

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-012-A: Add Staff Password Environment Variable
**Target:** `scripts/src/seed.ts` and `.env.example`
**Action:** Add STAFF_PASSWORD environment variable to .env.example with documentation, update seed.ts to use it.

#### TASK-012-B: Remove Hardcoded Admin Password
**Target:** `scripts/src/seed.ts`
**Action:** Remove fallback value `"SpaFlow2024!"`, require ADMIN_PASSWORD to be set, add validation with clear error message.

#### TASK-012-C: Remove Hardcoded Staff Password
**Target:** `scripts/src/seed.ts`
**Action:** Remove hardcoded `"Staff2024!"`, require STAFF_PASSWORD to be set, add validation with clear error message.

#### TASK-012-D: Add Password Validation
**Target:** `scripts/src/seed.ts`
**Action:** Add validation at script start to check both ADMIN_PASSWORD and STAFF_PASSWORD are set, exit with error if missing.

#### TASK-012-E: Update Documentation
**Target:** `.env.example` and README
**Action:** Document that ADMIN_PASSWORD and STAFF_PASSWORD are required for seed script, add instructions for generating secure passwords.

#### TASK-012-F: Test Seed Script
**Target:** `scripts/src/seed.ts`
**Action:** Test seed script with passwords set, test without passwords to verify error handling works correctly.

---

## [ ] TASK-013: Use Centralized Environment Variable Validation
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `lib/db/src/index.ts`
- `artifacts/api-server/src/lib/env.ts`

### Definition of Done
- lib/db/src/index.ts uses getEnv() from env.ts
- All database config validated through Zod schema
- No direct process.env access for database configuration
- Consistent validation across codebase

### Out of Scope
- Changing database configuration values
- Modifying env.ts schema structure

### Rules to Follow
- Use centralized env.ts for all environment access
- Maintain backward compatibility
- Add missing variables to envSchema if needed

### Advanced Coding Pattern
- Centralized configuration management
- Single source of truth for environment validation

### Anti-Patterns
- Direct process.env access
- Scattered environment variable validation
- Duplicate validation logic

### Imports/Exports
- Import getEnv from @workspace/api-server/src/lib/env.ts

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-013-A: Add Database Config to env.ts
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Add DB_POOL_MAX, DB_POOL_IDLE_TIMEOUT_MS, DB_POOL_CONNECTION_TIMEOUT_MS, DB_STATEMENT_TIMEOUT_MS, DB_LOCK_TIMEOUT_MS, DB_IDLE_IN_TRANSACTION_TIMEOUT_MS to envSchema with proper validation.

#### TASK-013-B: Create Database Config Getter
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Create getDatabaseConfig() function that returns validated database configuration object with all pool and timeout settings.

#### TASK-013-C: Update lib/db/src/index.ts
**Target:** `lib/db/src/index.ts`
**Action:** Replace all direct process.env access with getDatabaseConfig() from env.ts, add import statement.

#### TASK-013-D: Test Database Connection
**Target:** `lib/db/src/index.ts`
**Action:** Test database connection with new configuration approach, ensure all timeout and pool settings work correctly.

#### TASK-013-E: Verify Validation
**Target:** `lib/db/src/index.ts`
**Action:** Test with invalid environment values to ensure Zod validation catches errors before database connection attempt.

---

## [ ] TASK-003: Implement Email Service Integration
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/services/passwordReset.ts`
- `artifacts/api-server/src/lib/sms.ts`
- `artifacts/api-server/src/lib/env.ts`

### Definition of Done
- Email service configured and integrated
- Password reset emails sent in production
- Password reset confirmation emails sent
- Email templates defined
- Email sending tested end-to-end

### Out of Scope
- Email marketing campaigns
- Email list management
- Rich HTML email templates

### Rules to Follow
- Use environment variables for email configuration
- Fail gracefully if email service unavailable
- Log email send attempts and failures
- Use transactional email service (SendGrid, Mailgun, etc.)

### Advanced Coding Pattern
- Dependency injection for email service
- Circuit breaker pattern for email service calls
- Template pattern for email generation
- Observer pattern for email events

### Anti-Patterns
- Hardcoding email credentials
- Synchronous email sending in request handlers
- Not logging email failures
- Exposing sensitive data in email content

### Imports/Exports
- Add email service package to dependencies
- Export email service from services directory

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-003-A: Select Email Provider
**Target:** Documentation
**Action:** Research and select transactional email provider (SendGrid, Mailgun, AWS SES), document decision with cost, reliability, and feature comparison.

#### TASK-003-B: Add Email Configuration
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Add EMAIL_FROM_ADDRESS, EMAIL_PROVIDER, EMAIL_API_KEY to envSchema with proper validation, update getEnv function to return email config.

#### TASK-003-C: Create Email Service Module
**Target:** `artifacts/api-server/src/services/email.ts`
**Action:** Implement EmailService class with sendPasswordReset and sendPasswordResetConfirmation methods, using selected provider SDK, with error handling and logging.

#### TASK-003-D: Design Email Templates
**Target:** `artifacts/api-server/src/services/email-templates.ts`
**Action:** Create template functions for password reset email with reset link and confirmation email, using plain text and simple HTML, with proper branding.

#### TASK-003-E: Integrate Email Service
**Target:** `artifacts/api-server/src/services/passwordReset.ts`
**Action:** Replace TODO comments at lines 78-79 and 188 with calls to EmailService, passing appropriate parameters and handling errors gracefully.

#### TASK-003-F: Add Email Tests
**Target:** `artifacts/api-server/src/services/email.test.ts`
**Action:** Write unit tests for EmailService mocking provider SDK, test template generation, test error handling, test rate limiting.

#### TASK-003-G: Test Email Integration
**Target:** `artifacts/api-server/src/routes/auth.passwordReset.test.ts`
**Action:** Add integration tests for password reset flow with email service mocked, verify email service called with correct parameters.

---

## [ ] TASK-004: Replace Console Statements with Logger
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/lib/env.ts`
- `artifacts/api-server/src/lib/logger.ts`

### Definition of Done
- Bootstrap logger uses proper logging
- All console.log/error replaced with logger calls
- Logs properly formatted in production
- No console statements in production code paths

### Out of Scope
- Changing log levels
- Modifying log format
- Adding new log statements

### Rules to Follow
- Use existing logger instance where available
- Create logger instance early in initialization
- Preserve log messages and context
- Maintain log levels (error, info, warn)

### Advanced Coding Pattern
- Lazy initialization pattern for logger
- Singleton pattern for logger instance
- Dependency injection for logger
- Decorator pattern for logging middleware

### Anti-Patterns
- Creating multiple logger instances
- Using console.log in production
- Not logging errors properly
- Losing log context in refactoring

### Imports/Exports
- Import logger from lib/logger.ts
- Export bootstrap logger if needed elsewhere

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-004-A: Create Bootstrap Logger Factory
**Target:** `artifacts/api-server/src/lib/logger.ts`
**Action:** Add createBootstrapLogger function that returns pino instance with minimal config for use before full logger initialization, ensuring early logs are captured.

#### TASK-004-B: Replace Console in env.ts
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Replace bootstrapLogger object with createBootstrapLogger() call, update all uses of bootstrapLogger to use returned logger instance.

#### TASK-004-C: Audit for Console Statements
**Target:** `artifacts/api-server/src/`
**Action:** Search entire codebase for console.log, console.error, console.warn outside test files, catalog each location with file path and line number.

#### TASK-004-D: Replace Console in Production Code
**Target:** All non-test source files
**Action:** Replace each console statement with appropriate logger call (logger.info, logger.error, logger.warn), preserving original log level and message.

#### TASK-004-E: Verify Log Output
**Target:** `artifacts/api-server/src/`
**Action:** Run application and verify logs appear correctly in both development and production modes, ensure no console output remains in production code paths.

#### TASK-004-F: Update Test Assertions
**Target:** Test files
**Action:** Update any test assertions that check for console output to check for logger output instead, ensuring tests still validate logging behavior.

---

## [ ] TASK-005: Replace Any Types with Proper Types
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/test/contract-validator.ts`
- Various test files

### Definition of Done
- All any types replaced with proper types
- Type safety improved without breaking functionality
- Tests still pass after type changes
- No type assertions needed

### Out of Scope
- Changing test mocks that intentionally use any
- Refactoring entire type system
- Adding new type definitions

### Rules to Follow
- Use specific types over any
- Create type aliases for complex types
- Use generics where appropriate
- Maintain test functionality

### Advanced Coding Pattern
- Type guards for runtime type checking
- Discriminated unions for variant types
- Utility types for type transformations
- Branded types for domain primitives

### Anti-Patterns
- Using type assertions to bypass type system
- Creating overly complex type definitions
- Using any for convenience
- Losing type information in transformations

### Imports/Exports
- Import types from appropriate modules
- Export new type definitions

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-005-A: Define API Specification Type
**Target:** `artifacts/api-server/src/test/contract-validator.ts`
**Action:** Create proper TypeScript interface for OpenAPI specification object based on @apidevtools/swagger-parser types, replace any at line 7.

#### TASK-005-B: Audit Test Files for Any Types
**Target:** `artifacts/api-server/src/**/*.test.ts`
**Action:** Search all test files for any type usage, catalog each location with context and reason for any usage (mock data, test helpers, etc.).

#### TASK-005-C: Replace Any in Test Helpers
**Target:** `artifacts/api-server/src/test/`
**Action:** Replace any types in test helper functions with proper types, using Partial<T> or specific interfaces for mock data.

#### TASK-005-D: Replace Any in Test Assertions
**Target:** `artifacts/api-server/src/**/*.test.ts`
**Action:** Replace any types in test assertions with proper types, using expect.any() from Vitest where appropriate for matcher flexibility.

#### TASK-005-E: Verify Type Safety
**Target:** Root directory
**Action:** Run TypeScript compiler to ensure no any types remain in production code, verify all type errors resolved.

---

## [ ] TASK-014: Replace Hardcoded Localhost URLs with Environment Variables
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/spaflow/tests/e2e/*.spec.ts`
- `playwright.config.ts`
- `artifacts/spaflow/vite.config.ts`
- `artifacts/api-server/src/lib/cache.ts`
- `.env.example`

### Definition of Done
- All localhost URLs replaced with environment variables
- API_BASE_URL environment variable added
- VITE_API_URL environment variable added
- REDIS_URL properly configured (already has env var)
- Test configs use environment variables

### Out of Scope
- Changing URL structure
- Modifying test logic

### Rules to Follow
- Use environment variables for all URLs
- Provide sensible defaults for development
- Document all URL configuration options

### Advanced Coding Pattern
- Environment-based configuration
- Flexible deployment targeting

### Anti-Patterns
- Hardcoded environment-specific values
- Assumptions about deployment environment

### Imports/Exports
- No import/export changes

### Depends On
- TASK-013 (Use centralized environment variable validation)

### Blocks
- None

---

### Subtasks

#### TASK-014-A: Add API URL Environment Variables
**Target:** `.env.example`
**Action:** Add API_BASE_URL and VITE_API_URL to .env.example with documentation, set defaults to localhost for development.

#### TASK-014-B: Update E2E Test Files
**Target:** `artifacts/spaflow/tests/e2e/*.spec.ts`
**Action:** Replace all hardcoded `http://localhost:5000` with process.env.API_BASE_URL or environment variable from config.

#### TASK-014-C: Update Playwright Config
**Target:** `playwright.config.ts`
**Action:** Replace hardcoded localhost URLs with environment variables, add fallback to localhost for development.

#### TASK-014-D: Update Vite Config
**Target:** `artifacts/spaflow/vite.config.ts`
**Action:** Replace hardcoded proxy target with environment variable, add fallback to localhost for development.

#### TASK-014-E: Update Redis Cache Config
**Target:** `artifacts/api-server/src/lib/cache.ts`
**Action:** Remove hardcoded `redis://localhost:6379` fallback, rely entirely on REDIS_URL from env.ts with proper validation.

#### TASK-014-F: Test Configuration
**Target:** Root directory
**Action:** Test application with default localhost values, then test with custom URLs to verify environment variables work correctly.

---

## [ ] TASK-015: Replace Type Assertions with Proper Type Guards
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/checkin.ts`
- `artifacts/api-server/src/routes/rooms.ts`
- Other files with `as` type assertions

### Definition of Done
- All unsafe type assertions replaced with proper type guards
- Runtime validation added where needed
- Type safety improved without breaking functionality
- Tests still pass after changes

### Out of Scope
- Removing all type assertions (some are necessary)
- Changing core type system

### Rules to Follow
- Use type guards over assertions where possible
- Add runtime validation for critical paths
- Maintain backward compatibility

### Advanced Coding Pattern
- Type guards for runtime type checking
- Discriminated unions for variant types
- Runtime validation with Zod

### Anti-Patterns
- Using `as` to bypass type system without validation
- Assuming data structure without checking
- Unsafe type casting

### Imports/Exports
- Import zod for runtime validation if needed

### Depends On
- TASK-002 (TypeScript strict mode)
- TASK-005 (Replace any types with proper types)

### Blocks
- None

---

### Subtasks

#### TASK-015-A: Audit Type Assertions
**Target:** `artifacts/api-server/src/`
**Action:** Search for all `as` type assertions, catalog each location with context and assess whether assertion is safe or needs guard.

#### TASK-015-B: Replace Assertions in lockers.ts
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Replace type assertions on lines 133 and similar with proper type guards or runtime validation.

#### TASK-015-C: Replace Assertions in checkin.ts
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** Replace type assertions on lines 65, 71 and similar with proper type guards or runtime validation.

#### TASK-015-D: Replace Assertions in rooms.ts
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Replace type assertions on lines 97, 356 and similar with proper type guards or runtime validation.

#### TASK-015-E: Add Runtime Validation
**Target:** `artifacts/api-server/src/`
**Action:** For critical paths where type assertions were necessary, add Zod schema validation at runtime to ensure data integrity.

#### TASK-015-F: Verify Type Safety
**Target:** Root directory
**Action:** Run TypeScript compiler and test suite to ensure all changes maintain type safety and functionality.

---

## [ ] TASK-016: Add Proper Error Responses to All Catch Blocks
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/rooms.ts`
- Other route files with incomplete error handling

### Definition of Done
- All catch blocks return appropriate error responses
- No catch blocks just re-throw without logging
- Consistent error response format
- Errors logged with context

### Out of Scope
- Changing error response format (covered by TASK-007)
- Adding new error types

### Rules to Follow
- Every catch block must return error response or re-throw with logging
- Use appropriate HTTP status codes
- Log errors with context
- Sanitize error messages for users

### Advanced Coding Pattern
- Error boundary pattern
- Consistent error handling middleware

### Anti-Patterns
- Silent error swallowing
- Re-throwing without logging
- Missing error responses

### Imports/Exports
- Import logTransactionError from lib/logger.ts

### Depends On
- TASK-004 (Replace console statements with logger)
- TASK-007 (Standardize error handling)

### Blocks
- None

---

### Subtasks

#### TASK-016-A: Audit Catch Blocks
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review all catch blocks in route files, identify those that only re-throw without proper error response or logging.

#### TASK-016-B: Fix clients.ts Catch Blocks
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Update catch block at line 374 to return appropriate error response with logging using logTransactionError.

#### TASK-016-C: Fix lockers.ts Catch Blocks
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Update catch blocks at lines 243, 319, 371 to return appropriate error responses with logging using logTransactionError.

#### TASK-016-D: Fix rooms.ts Catch Blocks
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Update catch blocks at lines 176, 251, 308, 342 to return appropriate error responses with logging using logTransactionError.

#### TASK-016-E: Fix Other Route Files
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review and fix catch blocks in checkin.ts, users.ts, and other route files with incomplete error handling.

#### TASK-016-F: Verify Error Handling
**Target:** `artifacts/api-server/src/routes/`
**Action:** Run test suite and manually test error scenarios to ensure all catch blocks return proper error responses.

---

## [ ] TASK-017: Add Error Handling to Dynamic Imports
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/auth.ts`

### Definition of Done
- Dynamic imports wrapped in try-catch
- Proper error handling if module fails to load
- Appropriate error response to client
- Error logged with context

### Out of Scope
- Removing dynamic imports
- Changing import structure

### Rules to Follow
- All dynamic imports must have error handling
- Fail gracefully if module unavailable
- Log errors with context
- Return user-friendly error messages

### Advanced Coding Pattern
- Error boundary for dynamic imports
- Graceful degradation pattern

### Anti-Patterns
- Dynamic imports without error handling
- Assuming modules always load successfully

### Imports/Exports
- Import logger from lib/logger.ts

### Depends On
- TASK-004 (Replace console statements with logger)
- TASK-007 (Standardize error handling)

### Blocks
- None

---

### Subtasks

#### TASK-017-A: Identify Dynamic Imports
**Target:** `artifacts/api-server/src/`
**Action:** Search for all dynamic imports using `await import()`, catalog each location.

#### TASK-017-B: Add Error Handling to auth.ts
**Target:** `artifacts/api-server/src/routes/auth.ts`
**Action:** Wrap dynamic import on lines 254-255 in try-catch, add error logging and return appropriate error response if import fails.

#### TASK-017-C: Test Dynamic Import Failure
**Target:** `artifacts/api-server/src/routes/auth.ts`
**Action:** Simulate module load failure to test error handling, verify proper error response returned to client.

#### TASK-017-D: Document Dynamic Import Pattern
**Target:** Documentation
**Action:** Document standard pattern for dynamic imports with error handling for future reference.

---

## [ ] TASK-006: Clean Up Build External Dependencies
**Status:** Pending
**Priority**: Medium

### Related File Paths
- `artifacts/api-server/build.mjs`

### Definition of Done
- External dependencies list reduced to only necessary packages
- Build still works correctly
- No runtime errors from missing externals
- Build time not significantly impacted

### Out of Scope
- Removing actually needed externals
- Changing build configuration structure
- Adding new external dependencies

### Rules to Follow
- Test build after each removal
- Keep packages that use native modules
- Keep packages with dynamic requires
- Document removal decisions

### Advanced Coding Pattern
- Incremental removal with testing
- A/B testing build performance
- Dependency graph analysis

### Anti-Patterns
- Removing packages without testing
- Keeping packages just in case
- Not documenting removals
- Breaking existing builds

### Imports/Exports
- No import/export changes

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-006-A: Audit External Dependencies
**Target:** `artifacts/api-server/build.mjs`
**Action:** Research each package in external list to determine if actually used in codebase, categorize as: definitely used, possibly used, definitely not used.

#### TASK-006-B: Test Baseline Build
**Target:** `artifacts/api-server/`
**Action:** Run pnpm run build to establish baseline build time and success status, document results for comparison after cleanup.

#### TASK-006-C: Remove Definitely Unused Packages
**Target:** `artifacts/api-server/build.mjs`
**Action:** Remove packages from external list that are definitely not used (tensorflow, azure, google-cloud, etc.), test build after each batch removal.

#### TASK-006-D: Test Possibly Unused Packages
**Target:** `artifacts/api-server/build.mjs`
**Action:** For packages possibly unused, attempt removal and test build, restore if build fails, document which packages are actually needed.

#### TASK-006-E: Document Required Externals
**Target:** `artifacts/api-server/build.mjs`
**Action:** Add comments to external list explaining why each remaining package is external (native modules, dynamic requires, etc.), maintain for future reference.

#### TASK-006-F: Verify Build Performance
**Target:** `artifacts/api-server/`
**Action:** Run pnpm run build multiple times to measure build time after cleanup, compare to baseline, ensure no significant performance degradation.

---

## [ ] TASK-018: Fix Frontend Error Handling
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/spaflow/src/pages/sessions.tsx`
- `artifacts/spaflow/src/pages/login.tsx`
- `artifacts/spaflow/src/pages/password-reset-request.tsx`
- `artifacts/spaflow/src/pages/password-reset-confirm.tsx`
- `artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
- All catch blocks log errors with context
- User-friendly error messages displayed
- Error states properly managed
- No silent error swallowing

### Out of Scope
- Changing error UI components
- Adding new error types

### Rules to Follow
- Log errors with context using toast notifications
- Provide actionable error messages to users
- Maintain loading states during error recovery
- Preserve error information for debugging

### Advanced Coding Pattern
- Error boundary pattern for React components
- Error aggregation for multiple failures
- Retry logic for transient errors

### Anti-Patterns
- Silent catch blocks
- Generic error messages
- Exposing stack traces to users
- Not updating UI on errors

### Imports/Exports
- Import useToast from hooks/use-toast
- No new imports needed

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-018-A: Fix sessions.ts Error Handling
**Target:** `artifacts/spaflow/src/pages/sessions.tsx`
**Action:** Update catch blocks at lines 37, 61, 88 to log errors with context using toast, provide user-friendly error messages.

#### TASK-018-B: Fix login.ts Error Handling
**Target:** `artifacts/spaflow/src/pages/login.tsx`
**Action:** Update catch block at line 36 to log error details with toast, provide more specific error messages for different failure scenarios.

#### TASK-018-C: Fix Password Reset Pages Error Handling
**Target:** `artifacts/spaflow/src/pages/password-reset-request.tsx`, `password-reset-confirm.tsx`
**Action:** Update catch blocks to log errors with context, provide actionable error messages, handle network errors specifically.

#### TASK-018-D: Fix checkin.ts Error Handling
**Target:** `artifacts/spaflow/src/pages/checkin.tsx`
**Action:** Replace console.error at lines 72-75 with toast notifications, log errors with context, handle API errors gracefully.

#### TASK-018-E: Verify Error Handling
**Target:** `artifacts/spaflow/src/pages/`
**Action:** Test all pages with error scenarios, verify errors are logged and displayed to users appropriately.

---

## [ ] TASK-020: Add Confirmation Dialogs for Destructive Actions
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/spaflow/src/pages/lockers.tsx`
- `artifacts/spaflow/src/pages/rooms.tsx`
- `artifacts/spaflow/src/pages/waitlist.tsx`
- `artifacts/spaflow/src/pages/users.tsx`
- `artifacts/spaflow/src/components/ui/dialog.tsx`

### Definition of Done
- Confirmation dialog added before resource release
- Confirmation dialog added before waitlist removal
- Confirmation dialog added before user deletion
- All destructive actions require explicit confirmation
- Confirmation messages clearly describe action consequences

### Out of Scope
- Adding confirmation for non-destructive actions
- Changing dialog component library

### Rules to Follow
- Use shadcn/ui AlertDialog component
- Provide clear action descriptions in confirmation text
- Use destructive button styling for confirm action
- Maintain consistent confirmation pattern across app

### Advanced Coding Pattern
- Confirmation dialog hook for reusability
- Consistent confirmation text patterns
- Action-specific confirmation messages

### Anti-Patterns
- Silent destructive actions
- Generic confirmation messages
- Inconsistent confirmation patterns
- Missing confirmation for critical actions

### Imports/Exports
- Import AlertDialog from components/ui/dialog

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-020-A: Create Confirmation Dialog Hook
**Target:** `artifacts/spaflow/src/hooks/use-confirmation.ts`
**Action:** Create reusable hook for confirmation dialogs with AlertDialog component, supporting custom title, description, and confirm button styling.

#### TASK-020-B: Add Release Confirmation to Lockers
**Target:** `artifacts/spaflow/src/pages/lockers.tsx`
**Action:** Wrap release action in confirmation dialog, include resource name and client info in confirmation message.

#### TASK-020-C: Add Release Confirmation to Rooms
**Target:** `artifacts/spaflow/src/pages/rooms.tsx`
**Action:** Wrap release action in confirmation dialog, include room name and waitlist assignment warning in confirmation message.

#### TASK-020-D: Add Removal Confirmation to Waitlist
**Target:** `artifacts/spaflow/src/pages/waitlist.tsx`
**Action:** Wrap remove action in confirmation dialog, include client name and position in confirmation message.

#### TASK-020-E: Add Deletion Confirmation to Users
**Target:** `artifacts/spaflow/src/pages/users.tsx`
**Action:** Wrap delete action in confirmation dialog, include user email and warning about access revocation in confirmation message.

#### TASK-020-F: Test Confirmation Dialogs
**Target:** All affected pages
**Action:** Test all confirmation dialogs to ensure they appear correctly, prevent accidental actions, and provide clear information.

---

## [ ] TASK-021: Add Transaction Date Range Filter
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/spaflow/src/pages/transactions.tsx`
- `artifacts/api-server/src/routes/transactions.ts`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Date range picker added to transactions page
- Backend API supports date range filtering
- Date range filter added to audit logs page
- Date parsing and validation implemented
- Export functionality with date range

### Out of Scope
- Changing transaction data structure
- Adding other advanced filters

### Rules to Follow
- Use date-fns for date manipulation
- Provide sensible default date ranges
- Validate date ranges (start <= end)
- Maintain pagination with date filters

### Advanced Coding Pattern
- Date range hook for reusability
- Consistent date formatting across app
- Debounced date range changes

### Anti-Patterns
- Hardcoded date formats
- Invalid date ranges
- Performance issues with large date ranges

### Imports/Exports
- Import date-fns utilities
- Update OpenAPI spec for date range params

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-021-A: Add Date Range to OpenAPI Spec
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add startDate and endDate query parameters to transactions and audit-logs endpoints with proper validation and documentation.

#### TASK-021-B: Update Transactions API
**Target:** `artifacts/api-server/src/routes/transactions.ts`
**Action:** Add date range filtering logic using gte/lte operators on createdAt field, validate date range validity.

#### TASK-021-C: Update Audit Logs API
**Target:** `artifacts/api-server/src/routes/audit.ts`
**Action:** Add date range filtering logic using gte/lte operators on createdAt field, validate date range validity.

#### TASK-021-D: Create Date Range Picker Component
**Target:** `artifacts/spaflow/src/components/ui/date-range-picker.tsx`
**Action:** Create reusable date range picker component using shadcn/ui calendar popover, with preset ranges (today, week, month).

#### TASK-021-E: Add Date Filter to Transactions Page
**Target:** `artifacts/spaflow/src/pages/transactions.tsx`
**Action:** Integrate date range picker, filter transactions by date range, reset pagination on date change.

#### TASK-021-F: Add Date Filter to Audit Logs Page
**Target:** `artifacts/spaflow/src/pages/audit-logs.tsx`
**Action:** Integrate date range picker, filter audit logs by date range, reset pagination on date change.

#### TASK-021-G: Test Date Filtering
**Target:** Transactions and audit logs pages
**Action:** Test date range filtering with various ranges, verify pagination works correctly, test invalid date ranges.

---

## [ ] TASK-022: Implement Revenue Reports
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/spaflow/src/pages/reports.tsx` (new)
- `artifacts/api-server/src/routes/reports.ts` (new)
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Reports page created (manager only)
- Daily/weekly/monthly revenue breakdown
- Revenue by service type
- Trend analysis charts
- Export to CSV functionality
- Date range selection

### Out of Scope
- Real-time analytics dashboard
- Predictive revenue forecasting

### Rules to Follow
- Use chart library (recharts recommended)
- Cache report queries
- Role-based access (manager only)
- Consistent date range handling

### Advanced Coding Pattern
- Report aggregation queries
- Chart data transformation
- CSV export utility

### Anti-Patterns
- N+1 query patterns
- Missing data aggregation
- Inefficient report queries

### Imports/Exports
- Create reports route and page
- Update OpenAPI spec for report endpoints

### Depends On
- TASK-021 (Transaction date range filter)

### Blocks
- None

---

### Subtasks

#### TASK-022-A: Design Report API Endpoints
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Define endpoints for revenue by date range, revenue by service type, utilization stats, with proper pagination and filtering.

#### TASK-022-B: Implement Reports API
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Create report endpoints with aggregation queries, date range filtering, and efficient data transformation.

#### TASK-022-C: Create Reports Page
**Target:** `artifacts/spaflow/src/pages/reports.tsx`
**Action:** Create manager-only reports page with date range picker, revenue charts, service breakdown, and export functionality.

#### TASK-022-D: Add Revenue Charts
**Target:** `artifacts/spaflow/src/pages/reports.tsx`
**Action:** Implement line charts for revenue trends, bar charts for service breakdown, using recharts library.

#### TASK-022-E: Add CSV Export
**Target:** `artifacts/spaflow/src/pages/reports.tsx`
**Action:** Implement CSV export functionality for report data, including proper headers and formatting.

#### TASK-022-F: Test Reports
**Target:** Reports page and API
**Action:** Test report generation with various date ranges, verify chart accuracy, test CSV export format.

---

## [ ] TASK-023: Implement Utilization Reports
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/spaflow/src/pages/reports.tsx`
- `artifacts/api-server/src/routes/reports.ts`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Locker utilization rates over time
- Room utilization rates over time
- Peak hours identification
- Capacity planning insights
- Heatmap visualization

### Out of Scope
- Real-time utilization monitoring
- Automated capacity recommendations

### Rules to Follow
- Use rental session data for calculations
- Calculate utilization percentage
- Identify peak hours statistically
- Consistent time zone handling

### Advanced Coding Pattern
- Time series aggregation
- Statistical analysis for peak detection
- Heatmap data transformation

### Anti-Patterns
- Inaccurate utilization calculations
- Missing time zone handling
- Inefficient aggregation queries

### Imports/Exports
- Extend reports API with utilization endpoints
- Add utilization charts to reports page

### Depends On
- TASK-022 (Revenue reports)

### Blocks
- None

---

### Subtasks

#### TASK-023-A: Add Utilization Endpoints to API
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add endpoints for locker utilization, room utilization, peak hours analysis, with time series aggregation.

#### TASK-023-B: Implement Utilization Calculations
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Calculate utilization rates based on rental sessions, account for total capacity and time periods.

#### TASK-023-C: Add Utilization Charts
**Target:** `artifacts/spaflow/src/pages/reports.tsx`
**Action:** Add utilization trend charts, heatmap visualization for peak hours, using recharts library.

#### TASK-023-D: Test Utilization Reports
**Target:** Reports page and API
**Action:** Test utilization calculations with known data, verify peak hour detection, test heatmap visualization.

---

## [ ] TASK-024: Add Low Stock Alerts
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/spaflow/src/pages/products.tsx`
- `artifacts/api-server/src/routes/products.ts`
- `artifacts/api-server/src/lib/env.ts`

### Definition of Done
- Configurable stock threshold per product
- Low stock alerts on dashboard
- Automatic notification when threshold reached
- Bulk reorder functionality
- Threshold configuration UI

### Out of Scope
- Automatic supplier ordering
- Purchase order management

### Rules to Follow
- Threshold stored in product table
- Real-time stock monitoring
- Alert persistence
- Manager-only threshold configuration

### Advanced Coding Pattern
- Threshold-based alerting
- Real-time stock monitoring
- Bulk operations for reordering

### Anti-Patterns
- Hardcoded thresholds
- Missing alert persistence
- Inefficient stock queries

### Imports/Exports
- Add threshold field to product schema
- Update products API for threshold management

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-024-A: Add Threshold Field to Schema
**Target:** `lib/db/src/schema.ts`
**Action:** Add lowStockThreshold field to products table with default value, update Drizzle schema.

#### TASK-024-B: Update Products API
**Target:** `artifacts/api-server/src/routes/products.ts`
**Action:** Add threshold to product CRUD operations, add endpoint for low stock products query.

#### TASK-024-F: Add Low Stock Alert to Dashboard
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Display low stock products count and list, link to products page for reordering.

#### TASK-024-G: Add Bulk Reorder
**Target:** `artifacts/spaflow/src/pages/products.tsx`
**Action:** Add bulk update stock functionality for low stock products, with confirmation dialog.

#### TASK-024-H: Test Low Stock Alerts
**Target:** Products and dashboard
**Action:** Test threshold configuration, verify alerts appear on dashboard, test bulk reorder functionality.

---

## [ ] TASK-019: Fix AuthContext Token Refresh Race Condition
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/spaflow/src/contexts/AuthContext.tsx`

### Definition of Done
- Token refresh logic prevents race conditions
- Multiple concurrent 401 errors handled correctly
- No infinite refresh loops
- Proper error handling for refresh failures

### Out of Scope
- Changing token refresh flow architecture
- Modifying backend refresh endpoint

### Rules to Follow
- Implement refresh request deduplication
- Add rate limiting to refresh attempts
- Handle concurrent 401 responses correctly
- Log refresh failures for debugging

### Advanced Coding Pattern
- Request deduplication pattern
- Mutex/lock pattern for concurrent operations
- Exponential backoff for retries

### Anti-Patterns
- Multiple simultaneous refresh requests
- Infinite retry loops
- Not handling concurrent 401s
- Silent refresh failures

### Imports/Exports
- No new imports needed

### Depends On
- TASK-018 (Fix frontend error handling)

### Blocks
- None

---

### Subtasks

#### TASK-019-A: Implement Refresh Request Deduplication
**Target:** `artifacts/spaflow/src/contexts/AuthContext.tsx`
**Action:** Add in-flight refresh request tracking to prevent multiple simultaneous refresh attempts when multiple 401s occur concurrently.

#### TASK-019-B: Add Refresh Rate Limiting
**Target:** `artifacts/spaflow/src/contexts/AuthContext.tsx`
**Action:** Implement rate limiting on refresh attempts to prevent spamming refresh endpoint during network issues.

#### TASK-019-C: Fix Global Fetch Override Race Condition
**Target:** `artifacts/spaflow/src/contexts/AuthContext.tsx`
**Action:** Refactor global fetch override to handle concurrent 401 responses correctly, ensure only one refresh attempt per refresh token expiry.

#### TASK-019-D: Add Refresh Error Logging
**Target:** `artifacts/spaflow/src/contexts/AuthContext.tsx`
**Action:** Log refresh failures with context, distinguish between network errors and auth errors, provide better debugging information.

#### TASK-019-E: Test Token Refresh Scenarios
**Target:** `artifacts/spaflow/tests/e2e/auth.spec.ts`
**Action:** Add E2E tests for concurrent 401 scenarios, network interruptions, and refresh token expiry to verify race condition fixes.

---

## [ ] TASK-020: Replace SQL SELECT * with Explicit Column Lists
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/routes/rooms.ts`
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/checkin.ts`

### Definition of Done
- All SELECT * queries replaced with explicit column lists
- Queries only fetch required data
- Performance improved
- Schema changes won't break queries

### Out of Scope
- Changing query logic
- Adding new columns to queries unnecessarily

### Rules to Follow
- List only required columns in SELECT statements
- Use explicit column names for clarity
- Maintain query functionality
- Test after each change

### Advanced Coding Pattern
- Explicit column selection pattern
- Query optimization pattern
- Schema evolution safety pattern

### Anti-Patterns
- SELECT * for convenience
- Over-fetching data
- Implicit column dependencies

### Imports/Exports
- No import/export changes

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-020-A: Replace SELECT * in rooms.ts
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Replace SELECT * at line 97 with explicit column list for rooms table, only include columns used in the query result.

#### TASK-020-B: Replace SELECT * in lockers.ts
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Replace SELECT * at line 131 with explicit column list for lockers table, only include columns used in the query result.

#### TASK-020-C: Replace SELECT * in checkin.ts
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** Replace SELECT * at lines 64 and 70 with explicit column lists for lockers and rooms tables, only include required columns.

#### TASK-020-D: Verify Query Functionality
**Target:** `artifacts/api-server/src/routes/`
**Action:** Run tests for rooms, lockers, and checkin routes to verify queries still work correctly after column list changes.

---

## [ ] TASK-021: Fix Frontend Type Assertions
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/spaflow/src/pages/waitlist.tsx`
- `artifacts/spaflow/src/pages/users.tsx`

### Definition of Done
- All unsafe type assertions replaced with proper type guards
- Runtime validation added where needed
- Type safety improved
- No runtime errors from type mismatches

### Out of Scope
- Changing component logic
- Adding new type definitions

### Rules to Follow
- Use type guards over assertions
- Add runtime validation for critical paths
- Maintain backward compatibility
- Test after changes

### Advanced Coding Pattern
- Type guard pattern
- Runtime validation with Zod
- Discriminated unions for variant types

### Anti-Patterns
- Using `as` without validation
- Assuming data structure
- Unsafe type casting

### Imports/Exports
- Import zod for runtime validation if needed

### Depends On
- TASK-015 (Replace type assertions with proper type guards - api-server)

### Blocks
- None

---

### Subtasks

#### TASK-021-A: Fix Type Assertions in waitlist.tsx
**Target:** `artifacts/spaflow/src/pages/waitlist.tsx`
**Action:** Replace type assertions at lines 63 and 168 with proper type guards or runtime validation using Zod schemas.

#### TASK-021-B: Fix Type Assertions in users.tsx
**Target:** `artifacts/spaflow/src/pages/users.tsx`
**Action:** Replace type assertion at line 59 with proper type guard, validate role field is one of allowed values.

#### TASK-021-C: Verify Type Safety
**Target:** `artifacts/spaflow/src/pages/`
**Action:** Run TypeScript compiler to ensure no type errors remain, test pages with various data scenarios.

---

## [ ] TASK-022: Fix Load Test URL Configuration
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `load-tests/smoke.js`
- `load-tests/checkin-flow.js`
- `load-tests/health-check.js`
- `load-tests/client-search.js`
- `load-tests/dashboard.js`

### Definition of Done
- All load tests use correct API base path (/api/v1)
- Consistent URL configuration across all load tests
- Load tests work with current API server
- Documentation updated

### Out of Scope
- Changing load test logic
- Modifying API server routing

### Rules to Follow
- Use /api/v1 prefix for all API endpoints
- Keep BASE_URL configuration consistent
- Test load tests after changes
- Update documentation

### Advanced Coding Pattern
- Centralized configuration pattern
- Environment-based URL configuration
- Consistent endpoint pattern

### Anti-Patterns
- Hardcoded URL paths
- Inconsistent API prefixes
- Missing /api/v1 prefix

### Imports/Exports
- No import/export changes

### Depends On
- TASK-014 (Replace hardcoded localhost URLs)

### Blocks
- None

---

### Subtasks

#### TASK-022-A: Update smoke.js URL Configuration
**Target:** `load-tests/smoke.js`
**Action:** Update API endpoint URLs at lines 16, 24, 31 to use /api/v1 prefix, ensure BASE_URL is configured correctly.

#### TASK-022-B: Update checkin-flow.js URL Configuration
**Target:** `load-tests/checkin-flow.js`
**Action:** Update API endpoint URLs at lines 20, 27, 34 to use /api/v1 prefix, verify all endpoints correct.

#### TASK-022-C: Update Other Load Test Files
**Target:** `load-tests/health-check.js`, `client-search.js`, `dashboard.js`
**Action:** Review and update all load test files to use consistent /api/v1 prefix, fix any missing prefixes.

#### TASK-022-D: Update Load Test Documentation
**Target:** `load-tests/README.md`
**Action:** Update documentation to reflect correct API base path (/api/v1), update example commands if needed.

#### TASK-022-E: Test Load Tests
**Target:** `load-tests/`
**Action:** Run all load tests to verify they work with corrected URL configuration, ensure all tests pass.

---

## [ ] TASK-023: Add Environment Variable Validation to lib/db
**Status:** Pending
**Priority:** High

### Related File Paths
- `lib/db/src/index.ts`
- `lib/db/drizzle.config.ts`
- `artifacts/api-server/src/lib/env.ts`

### Definition of Done
- lib/db uses centralized env.ts for configuration
- All database config validated through Zod schema
- No direct process.env access in lib/db
- Consistent validation across codebase

### Out of Scope
- Changing database configuration values
- Modifying env.ts schema structure

### Rules to Follow
- Use centralized env.ts for all environment access
- Maintain backward compatibility
- Add missing variables to envSchema if needed
- Test database connection after changes

### Advanced Coding Pattern
- Centralized configuration management
- Single source of truth for environment validation
- Dependency injection for configuration

### Anti-Patterns
- Direct process.env access
- Scattered environment variable validation
- Duplicate validation logic

### Imports/Exports
- Import getDatabaseConfig from @workspace/api-server/src/lib/env.ts

### Depends On
- TASK-013 (Use centralized environment variable validation)

### Blocks
- None

---

### Subtasks

#### TASK-023-A: Add Database Config to env.ts
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Add DB_POOL_MAX, DB_POOL_IDLE_TIMEOUT_MS, DB_POOL_CONNECTION_TIMEOUT_MS, DB_STATEMENT_TIMEOUT_MS, DB_LOCK_TIMEOUT_MS, DB_IDLE_IN_TRANSACTION_TIMEOUT_MS to envSchema with proper validation.

#### TASK-023-B: Create Database Config Getter
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Create getDatabaseConfig() function that returns validated database configuration object with all pool and timeout settings.

#### TASK-023-C: Update lib/db/src/index.ts
**Target:** `lib/db/src/index.ts`
**Action:** Replace all direct process.env access with getDatabaseConfig() from env.ts, add import statement, remove dotenv config (handled by env.ts).

#### TASK-023-D: Update lib/db/drizzle.config.ts
**Target:** `lib/db/drizzle.config.ts`
**Action:** Replace process.env.DATABASE_URL with centralized configuration, use getDatabaseConfig() or DATABASE_URL from env.ts.

#### TASK-023-E: Test Database Connection
**Target:** `lib/db/src/index.ts`
**Action:** Test database connection with new configuration approach, ensure all timeout and pool settings work correctly.

---

## [ ] TASK-024: Complete Staff Password Environment Variable
**Status:** Pending
**Priority:** High

### Related File Paths
- `scripts/src/seed.ts`
- `.env.example`

### Definition of Done
- Staff password uses environment variable
- STAFF_PASSWORD added to .env.example
- No hardcoded passwords in seed.ts
- Clear error if passwords not set

### Out of Scope
- Changing password requirements
- Modifying seed script logic

### Rules to Follow
- Require STAFF_PASSWORD environment variable
- Fail fast with clear error if not set
- Document required environment variables
- Maintain consistency with admin password

### Advanced Coding Pattern
- Fail-fast validation
- Environment-based configuration
- Consistent security practices

### Anti-Patterns
- Hardcoded credentials
- Weak default passwords
- Silent fallbacks

### Imports/Exports
- No import/export changes

### Depends On
- TASK-012 (Remove hardcoded default passwords in seed script)

### Blocks
- None

---

### Subtasks

#### TASK-024-A: Add STAFF_PASSWORD to .env.example
**Target:** `.env.example`
**Action:** Add STAFF_PASSWORD environment variable with documentation and instructions for generating secure password.

#### TASK-024-B: Remove Hardcoded Staff Password
**Target:** `scripts/src/seed.ts`
**Action:** Remove hardcoded `"Staff2024!"` at line 42, require STAFF_PASSWORD to be set, add validation with clear error message.

#### TASK-024-C: Update Password Validation
**Target:** `scripts/src/seed.ts`
**Action:** Extend existing password validation to check both ADMIN_PASSWORD and STAFF_PASSWORD are set, exit with error if either missing.

#### TASK-024-D: Test Seed Script
**Target:** `scripts/src/seed.ts`
**Action:** Test seed script with both passwords set, test without passwords to verify error handling works correctly.

---

## [ ] TASK-025: Add Test Coverage for Library Packages
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `lib/db/src/`
- `lib/api-client-react/src/`
- `lib/api-spec/`
- `lib/api-zod/src/`

### Definition of Done
- Test files added for all library packages
- Critical functions have unit tests
- Test coverage documented
- Tests run in CI/CD

### Out of Scope
- 100% test coverage
- Integration tests for libraries
- Performance tests

### Rules to Follow
- Test critical paths and public APIs
- Use appropriate test frameworks
- Mock external dependencies
- Maintain test readability

### Advanced Coding Pattern
- Unit testing pattern
- Mock pattern for external dependencies
- Test fixture pattern

### Anti-Patterns
- Testing implementation details
- Brittle tests
- No test isolation

### Imports/Exports
- Add test dependencies to package.json files

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-025-A: Add Tests for lib/db
**Target:** `lib/db/src/`
**Action:** Create test file for database connection, schema validation, and common query patterns, test pool configuration and error handling.

#### TASK-025-B: Add Tests for lib/api-client-react
**Target:** `lib/api-client-react/src/`
**Action:** Create tests for custom-fetch error handling, base URL configuration, auth token getter functionality.

#### TASK-025-C: Add Tests for lib/api-zod
**Target:** `lib/api-zod/src/`
**Action:** Create tests for generated Zod schemas, validate schema correctness, test type inference.

#### TASK-025-D: Add Test Scripts to Library Packages
**Target:** `lib/db/package.json`, `lib/api-client-react/package.json`, `lib/api-zod/package.json`
**Action:** Add test scripts to library package.json files, ensure tests can run with pnpm test.

#### TASK-025-E: Add Library Tests to CI/CD
**Target:** `.github/workflows/ci.yml`
**Action:** Add test step for library packages in CI workflow, ensure library tests run on every PR.

---

## [ ] TASK-026: Add Environment Variable Validation to Mockup-Sandbox
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/mockup-sandbox/vite.config.ts`
- `artifacts/mockup-sandbox/package.json`

### Definition of Done
- Environment variables validated with Zod
- Clear error messages for invalid values
- Validation at runtime
- Type-safe environment access

### Out of Scope
- Changing environment variable names
- Adding new environment variables

### Rules to Follow
- Use Zod for validation
- Provide clear error messages
- Validate at startup
- Maintain backward compatibility

### Advanced Coding Pattern
- Runtime validation pattern
- Type-safe environment access
- Fail-fast validation

### Anti-Patterns
- String manipulation for validation
- Silent failures
- Late validation

### Imports/Exports
- Add zod to dependencies
- Create env.ts file

### Depends On
- TASK-013 (Use centralized environment variable validation)

### Blocks
- None

---

### Subtasks

#### TASK-026-A: Create env.ts for Mockup-Sandbox
**Target:** `artifacts/mockup-sandbox/src/env.ts`
**Action:** Create env.ts with Zod schema for PORT and BASE_PATH environment variables, add validation and type-safe getters.

#### TASK-026-B: Update vite.config.ts to Use env.ts
**Target:** `artifacts/mockup-sandbox/vite.config.ts`
**Action:** Replace direct process.env access with validated getters from env.ts, remove manual validation logic.

#### TASK-026-C: Test Environment Variable Validation
**Target:** `artifacts/mockup-sandbox/`
**Action:** Test with valid and invalid environment values, ensure validation catches errors and provides clear messages.

---

## [ ] TASK-027: Update Documentation Placeholders
**Status:** Pending
**Priority:** Low

### Related File Paths
- `docs/mutation-testing.md`
- `docs/security.md`

### Definition of Done
- All placeholder values replaced with actual values or removed
- Unresolved issues addressed or documented as known issues
- Documentation is actionable
- No TODO/FIXME comments in docs

### Out of Scope
- Adding new documentation sections
- Rewriting documentation structure

### Rules to Follow
- Replace placeholder GHSA IDs with actual IDs or remove
- Document known issues clearly
- Keep documentation accurate
- Update with current status

### Advanced Coding Pattern
- Documentation maintenance pattern
- Known issue tracking pattern

### Anti-Patterns
- Leaving placeholder values
- Outdated documentation
- Unresolved TODOs in docs

### Imports/Exports
- No import/export changes

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-027-A: Update security.md Placeholders
**Target:** `docs/security.md`
**Action:** Replace placeholder GHSA-xxxx-xxxx-xxxx at line 101 with actual GHSA IDs or remove if not applicable, add note if no specific GHSA IDs to track.

#### TASK-027-B: Update mutation-testing.md Issues
**Target:** `docs/mutation-testing.md`
**Action**: Review and update line 67 about Vitest runner debugging, either resolve the issue or document as known limitation with workaround.

#### TASK-027-C: Review All Documentation for Placeholders
**Target:** `docs/`
**Action:** Search all documentation files for TODO, FIXME, placeholder values, and unresolved issues, update or remove as appropriate.

---

## [ ] TASK-007: Standardize Error Handling
**Status:** Pending
**Priority**: Medium

### Related File Paths
- All route files in `artifacts/api-server/src/routes/`
- `artifacts/api-server/src/lib/logger.ts`

### Definition of Done
- Consistent error handling pattern across all routes
- All errors logged with context
- User-friendly error messages
- Proper HTTP status codes

### Out of Scope
- Changing error response format
- Adding new error types
- Changing error logging format

### Rules to Follow
- Use try-catch for all async operations
- Log errors with request context
- Return appropriate HTTP status codes
- Sanitize error messages for users

### Advanced Coding Pattern
- Error boundary pattern
- Error aggregation pattern
- Error classification pattern
- Error recovery pattern

### Anti-Patterns
- Silent error swallowing
- Exposing stack traces to users
- Inconsistent error logging
- Wrong HTTP status codes

### Imports/Exports
- Import logTransactionError from lib/logger.ts
- Import error types as needed

### Depends On
- TASK-004 (Replace console statements)

### Blocks
- None

---

### Subtasks

#### TASK-007-A: Define Error Handling Pattern
**Target:** Documentation
**Action:** Document standard error handling pattern for routes: try-catch around route handlers, log with context using logTransactionError, return appropriate HTTP status with user-friendly message.

#### TASK-007-B: Audit Route Error Handling
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review each route file for error handling inconsistencies, catalog routes missing try-catch, routes with inconsistent logging, routes with wrong status codes.

#### TASK-007-C: Apply Pattern to Auth Routes
**Target:** `artifacts/api-server/src/routes/auth.ts`
**Action:** Refactor auth.ts to use standard error handling pattern, ensure all async operations wrapped in try-catch, errors logged with context, proper status codes returned.

#### TASK-007-D: Apply Pattern to Client Routes
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Refactor clients.ts to use standard error handling pattern, update existing error handling to match defined pattern, test all client endpoints.

#### TASK-007-E: Apply Pattern to Resource Routes
**Target:** `artifacts/api-server/src/routes/lockers.ts`, `rooms.ts`
**Action:** Refactor lockers.ts and rooms.ts to use standard error handling pattern, ensure consistent error responses across resource endpoints.

#### TASK-007-F: Apply Pattern to Check-in Routes
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** Refactor checkin.ts to use standard error handling pattern, ensure transaction errors properly logged and handled, test check-in flow.

#### TASK-007-G: Verify Error Handling Consistency
**Target:** `artifacts/api-server/src/routes/`
**Action:** Run test suite to verify all routes handle errors correctly, manually test error scenarios, ensure consistent error responses across API.

---

## [ ] TASK-018: Standardize API Response Format
**Status:** Pending
**Priority:** Medium

### Related File Paths
- All route files in `artifacts/api-server/src/routes/`

### Definition of Done
- Consistent error response format across all endpoints
- Consistent success response format across similar endpoints
- Standard error response structure documented
- All endpoints follow documented format

### Out of Scope
- Changing existing response structures significantly
- Breaking API contracts

### Rules to Follow
- Use consistent error response structure
- Use consistent success response structure for similar operations
- Document response format in API spec
- Maintain backward compatibility where possible

### Advanced Coding Pattern
- Response formatter utility
- Standardized error response factory

### Anti-Patterns
- Inconsistent error response formats
- Different structures for similar operations
- Undocumented response formats

### Imports/Exports
- Create and export response formatters from lib/

### Depends On
- TASK-007 (Standardize error handling)

### Blocks
- None

---

### Subtasks

#### TASK-018-A: Audit Response Formats
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review all route files to catalog different response formats, identify inconsistencies in error and success responses.

#### TASK-018-B: Define Standard Response Format
**Target:** Documentation
**Action:** Document standard error response format and success response format for different operation types (CRUD, auth, etc.).

#### TASK-018-D: Create Response Formatters
**Target:** `artifacts/api-server/src/lib/response-formatters.ts`
**Action:** Create utility functions for standard error responses and success responses to ensure consistency.

#### TASK-018-E: Update Routes to Use Formatters
**Target:** `artifacts/api-server/src/routes/`
**Action:** Update routes to use response formatter functions instead of manual response construction.

#### TASK-018-F: Update API Documentation
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Update OpenAPI spec to reflect standardized response formats.

#### TASK-018-G: Verify Response Consistency
**Target:** `artifacts/api-server/src/routes/`
**Action:** Run contract tests to verify all endpoints match documented response formats.

---

## [ ] TASK-019: Move Additional Magic Numbers to Constants
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/lib/auth.ts`
- `artifacts/api-server/src/lib/constants.ts`
- `artifacts/api-server/src/lib/env.ts`

### Definition of Done
- Magic numbers in app.ts moved to constants or env
- Magic numbers in auth.ts moved to constants or env
- All magic numbers documented
- Constants file organized by category

### Out of Scope
- Magic numbers already covered by TASK-010
- Changing timeout values

### Rules to Follow
- Move timeout values to env.ts for configurability
- Move fixed values to constants.ts
- Document rationale for each constant
- Use descriptive constant names

### Advanced Coding Pattern
- Configuration categorization
- Constants organization by domain

### Anti-Patterns
- Magic numbers without explanation
- Scattered configuration values
- Undocumented constants

### Imports/Exports
- Import constants from lib/constants.ts
- Import env values from lib/env.ts

### Depends On
- TASK-010 (Make magic numbers configurable)
- TASK-013 (Use centralized environment variable validation)

### Blocks
- None

---

### Subtasks

#### TASK-019-A: Identify Additional Magic Numbers
**Target:** `artifacts/api-server/src/`
**Action:** Search for magic numbers not covered by TASK-010, particularly in app.ts and auth.ts (timeouts, cookie ages, etc.).

#### TASK-019-B: Move Request Timeout to env.ts
**Target:** `artifacts/api-server/src/lib/env.ts` and `app.ts`
**Action:** Add REQUEST_TIMEOUT_MS to envSchema with validation, update app.ts to use env value instead of hardcoded '30s'.

#### TASK-019-C: Move Cookie Max Ages to constants.ts
**Target:** `artifacts/api-server/src/lib/constants.ts` and `auth.ts`
**Action:** Add COOKIE_MAX_AGE_MS and CSRF_COOKIE_MAX_AGE_MS to constants.ts, update auth.ts to use constants.

#### TASK-019-D: Move CSRF Expiration to constants.ts
**Target:** `artifacts/api-server/src/lib/constants.ts` and `app.ts`
**Action:** Add CSRF_COOKIE_MAX_AGE_MS to constants.ts, update app.ts to use constant instead of hardcoded 3600000.

#### TASK-019-E: Organize Constants File
**Target:** `artifacts/api-server/src/lib/constants.ts`
**Action:** Organize constants by category (timeouts, counts, pricing, etc.) with clear section comments.

#### TASK-019-F: Update .env.example
**Target:** `.env.example`
**Action:** Add REQUEST_TIMEOUT_MS to .env.example with documentation and default value.

---

## [ ] TASK-020: Audit Raw SQL for Injection Vulnerabilities
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/api-server/src/routes/rooms.ts`
- `artifacts/api-server/src/routes/waitlist.ts`
- Other files with raw SQL

### Definition of Done
- All raw SQL queries audited for injection vulnerabilities
- All queries use proper parameterization
- No user input directly concatenated into SQL
- Security audit documented

### Out of Scope
- Removing raw SQL (some is necessary for PostgreSQL features)
- Changing query logic

### Rules to Follow
- Use Drizzle's sql template for all raw SQL
- Never concatenate user input into SQL strings
- Use parameterized queries exclusively
- Document why raw SQL is necessary

### Advanced Coding Pattern
- Parameterized query pattern
- SQL injection prevention

### Anti-Patterns
- String concatenation in SQL
- Direct user input in queries
- Unvalidated input in SQL

### Imports/Exports
- No import/export changes

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-020-A: Identify Raw SQL Usage
**Target:** `artifacts/api-server/src/`
**Action:** Search for all sql template usage, catalog each location with context.

#### TASK-020-B: Audit Parameterization
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review each raw SQL query to ensure proper parameterization through Drizzle's sql template, no string concatenation.

#### TASK-020-C: Security Review
**Target:** `artifacts/api-server/src/routes/`
**Action:** Perform security review focusing on ANY() operator and array parameters, ensure no injection vectors.

#### TASK-020-D: Document Raw SQL Rationale
**Target:** Code comments
**Action:** Add comments explaining why raw SQL is necessary (e.g., FOR UPDATE, ANY() operator, specific PostgreSQL features).

#### TASK-020-E: Create SQL Security Guidelines
**Target:** Documentation
**Action:** Document guidelines for safe raw SQL usage in codebase for future reference.

---

## [ ] TASK-021: Add Existence Checks Before Database Operations
**Status:** Pending
**Priority:** Medium

### Related File Paths
- All route files in `artifacts/api-server/src/routes/`

### Definition of Done
- All update operations check if record exists first
- All delete operations check for dependencies
- Proper 404 errors returned for missing records
- Proper 409 errors for constraint violations

### Out of Scope
- Adding new validation logic
- Changing business logic

### Rules to Follow
- Check existence before update
- Check dependencies before delete
- Return appropriate HTTP status codes
- Handle constraint violations gracefully

### Advanced Coding Pattern
- Optimistic concurrency control
- Existence validation pattern

### Anti-Patterns
- Assuming records exist
- Silent failures on missing records
- 500 errors instead of 404s

### Imports/Exports
- No import/export changes

### Depends On
- TASK-007 (Standardize error handling)

### Blocks
- None

---

### Subtasks

#### TASK-021-A: Audit Update Operations
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review all update operations to identify those that don't check if record exists first.

#### TASK-021-B: Audit Delete Operations
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review all delete operations to identify those that don't check for dependencies or existence.

#### TASK-021-C: Add Existence Checks to Updates
**Target:** `artifacts/api-server/src/routes/`
**Action:** Add existence checks before update operations, return 404 if record doesn't exist.

#### TASK-021-D: Add Dependency Checks to Deletes
**Target:** `artifacts/api-server/src/routes/`
**Action:** Add dependency checks before delete operations, return 409 if dependencies exist.

#### TASK-021-E: Test Missing Record Handling
**Target:** `artifacts/api-server/src/routes/`
**Action:** Test update and delete operations with missing records to verify proper 404 responses.

#### TASK-021-F: Test Constraint Violation Handling
**Target:** `artifacts/api-server/src/routes/`
**Action:** Test delete operations with dependencies to verify proper 409 responses.

---

## [ ] TASK-008: Extract Common Middleware Logic
**Status:** Pending
**Priority**: Low

### Related File Paths
- `artifacts/api-server/src/middleware/correlationId.ts`
- `artifacts/api-server/src/middleware/requestId.ts`

### Definition of Done
- Common middleware logic extracted to shared utility
- Both middleware files use shared utility
- Functionality preserved
- Tests still pass

### Out of Scope
- Changing middleware behavior
- Adding new middleware
- Changing middleware order

### Rules to Follow
- Preserve existing functionality
- Maintain backward compatibility
- Keep middleware simple
- Document shared utility

### Advanced Coding Pattern
- Higher-order function pattern
- Factory pattern for middleware
- Composition pattern for middleware
- Strategy pattern for ID generation

### Anti-Patterns
- Over-engineering simple logic
- Breaking existing middleware
- Adding unnecessary abstraction
- Losing type safety

### Imports/Exports
- Export shared utility from middleware directory
- Import in both middleware files

### Depends On
- TASK-001 (Consolidate middleware directories)

### Blocks
- None

---

### Subtasks

#### TASK-008-A: Analyze Middleware Similarity
**Target:** `artifacts/api-server/src/middleware/`
**Action:** Compare correlationId.ts and requestId.ts line by line, identify common patterns: header extraction, UUID generation, header setting, next() call.

#### TASK-008-B: Design Shared Utility
**Target:** `artifacts/api-server/src/middleware/`
**Action:** Design createIdMiddleware function that takes header name and request property name as parameters, returns middleware function following identified common pattern.

#### TASK-008-C: Implement Shared Utility
**Target:** `artifacts/api-server/src/middleware/id-middleware.ts`
**Action:** Implement createIdMiddleware factory function with proper TypeScript types, header extraction, UUID generation, header setting, and next() call.

#### TASK-008-D: Refactor Correlation ID Middleware
**Target:** `artifacts/api-server/src/middleware/correlationId.ts`
**Action:** Rewrite correlationIdMiddleware to use createIdMiddleware('x-correlation-id', 'correlationId'), preserve existing functionality and type definitions.

#### TASK-008-E: Refactor Request ID Middleware
**Target:** `artifacts/api-server/src/middleware/requestId.ts`
**Action:** Rewrite requestIdMiddleware to use createIdMiddleware('x-request-id', 'requestId'), preserve existing functionality and type definitions.

#### TASK-008-F: Test Middleware Functionality
**Target:** `artifacts/api-server/src/middleware/*.test.ts`
**Action:** Run existing middleware tests to verify functionality preserved, test that both middleware still work correctly after refactoring.

---

## [ ] TASK-009: Add JSDoc Comments to Public APIs
**Status:** Pending
**Priority**: Low

### Related File Paths
- All service files in `artifacts/api-server/src/services/`
- All lib files in `artifacts/api-server/src/lib/`
- All middleware files

### Definition of Done
- All public functions have JSDoc comments
- All exported classes have JSDoc comments
- All exported interfaces have JSDoc comments
- Comments follow consistent format

### Out of Scope
- Internal functions
- Test files
- Type definitions (self-documenting)

### Rules to Follow
- Document purpose, parameters, return value
- Include usage examples for complex functions
- Document thrown errors
- Use consistent JSDoc tags

### Advanced Coding Pattern
- Documentation generation from JSDoc
- Type inference from JSDoc
- IDE integration for documentation

### Anti-Patterns
- Redundant comments repeating code
- Outdated comments
- Missing parameter documentation
- Inconsistent comment style

### Imports/Exports
- No import/export changes

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-009-A: Define JSDoc Standard
**Target:** Documentation
**Action:** Define JSDoc comment standard for codebase: required tags (@param, @returns, @throws), description format, example format, ordering of tags.

#### TASK-009-B: Document Service Classes
**Target:** `artifacts/api-server/src/services/`
**Action:** Add JSDoc comments to all service classes (AccountLockoutService, SessionService, PasswordResetTokenService, AuthAuditLogger), documenting purpose and public methods.

#### TASK-009-C: Document Service Methods
**Target:** `artifacts/api-server/src/services/`
**Action:** Add JSDoc comments to all public service methods, documenting parameters, return values, thrown errors, and usage examples where helpful.

#### TASK-009-D: Document Library Functions
**Target:** `artifacts/api-server/src/lib/`
**Action:** Add JSDoc comments to exported functions in lib files (auth.ts, encryption.ts, pricing.ts, etc.), documenting purpose and usage.

#### TASK-009-E: Document Middleware
**Target:** `artifacts/api-server/src/middleware/`
**Action:** Add JSDoc comments to middleware functions, documenting purpose, request modifications, and header modifications.

#### TASK-009-F: Verify Documentation
**Target:** `artifacts/api-server/src/`
**Action:** Run TypeScript compiler to ensure JSDoc comments don't introduce type errors, verify IDE shows documentation on hover for documented functions.

---

## [ ] TASK-010: Make Magic Numbers Configurable
**Status:** Pending
**Priority**: Low

### Related File Paths
- `artifacts/api-server/src/lib/constants.ts`
- `artifacts/api-server/src/lib/env.ts`

### Definition of Done
- Magic numbers moved to environment variables
- Constants file uses env values with defaults
- All uses of constants updated
- Documentation updated

### Out of Scope
- Changing default values
- Adding new configuration options
- Changing behavior of existing features

### Rules to Follow
- Provide sensible defaults
- Validate environment variables
- Document each configuration option
- Maintain backward compatibility

### Advanced Coding Pattern
- Configuration object pattern
- Environment variable validation pattern
- Default value pattern
- Configuration caching pattern

### Anti-Patterns
- Required environment variables without defaults
- Invalid default values
- Undocumented configuration
- Breaking changes without migration path

### Imports/Exports
- Import getEnv from lib/env.ts
- Export configuration from lib/constants.ts

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-010-A: Identify Magic Numbers
**Target:** `artifacts/api-server/src/lib/constants.ts`
**Action:** Identify which constants should be configurable (SESSION_DURATION_HOURS, EXTENSION_DURATION_HOURS, MEMBERSHIP costs, etc.), document rationale for each.

#### TASK-010-B: Add Environment Variables
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Add environment variables to envSchema for configurable constants (SESSION_DURATION_HOURS, EXTENSION_DURATION_HOURS, etc.) with proper validation and defaults.

#### TASK-010-C: Update Constants to Use Env
**Target:** `artifacts/api-server/src/lib/constants.ts`
**Action:** Refactor constants.ts to use getEnv() values instead of hardcoded numbers, providing fallback to original values if env vars not set.

#### TASK-010-D: Update .env.example
**Target:** `.env.example`
**Action:** Add new environment variables to .env.example with descriptions and default values, document purpose of each configuration option.

#### TASK-010-F: Test Configuration
**Target:** `artifacts/api-server/`
**Action:** Test application with default configuration, then test with custom environment values, verify behavior changes as expected without breaking functionality.

---

## [ ] TASK-022: Implement Proper Semantic Versioning
**Status:** Pending
**Priority:** Low

### Related File Paths
- All package.json files in workspace
- Root package.json
- .github/workflows/ci.yml (if exists)

### Definition of Done
- All packages have proper semantic version numbers
- Root package version reflects workspace version
- Version synchronization mechanism in place
- Release process documented

### Out of Scope
- Setting up automated releases
- Changing package structure

### Rules to Follow
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Keep workspace packages in sync
- Document version bumping process
- Use conventional commits for automated versioning

### Advanced Coding Pattern
- Semantic versioning
- Monorepo version synchronization
- Automated version bumping

### Anti-Patterns
- All packages at 0.0.0
- Inconsistent versions across workspace
- Manual version management

### Imports/Exports
- No import/export changes

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-022-A: Set Initial Versions
**Target:** All package.json files
**Action:** Set initial version to 1.0.0 for all packages, ensuring consistency across workspace.

#### TASK-022-B: Configure Changeset
**Target:** Root directory
**Action:** Install and configure @changesets/cli for automated version management across monorepo.

#### TASK-022-C: Document Version Bumping Process
**Target:** Documentation
**Action:** Document how to bump versions using changesets, explain semantic versioning rules for the project.

#### TASK-022-D: Configure CI for Versioning
**Target:** `.github/workflows/`
**Action:** Configure CI workflow to automatically version packages when changesets are merged to main branch.

#### TASK-022-E: Test Version Management
**Target:** Root directory
**Action:** Create test changeset, verify version bumping process works correctly.

---

## [ ] TASK-023: Replace Console Statements in Scripts with Logger
**Status:** Pending
**Priority:** Low

### Related File Paths
- `scripts/src/seed.ts`
- `scripts/src/verify-indexes.ts`
- `scripts/src/test-cascade.ts`
- Other script files

### Definition of Done
- All console.log replaced with logger calls
- All console.error replaced with logger.error
- Scripts use proper logging with levels
- Logs properly formatted

### Out of Scope
- Changing script logic
- Modifying script output format significantly

### Rules to Follow
- Use appropriate log levels (info, error, warn)
- Preserve existing log messages
- Use structured logging where helpful
- Maintain script functionality

### Advanced Coding Pattern
- Structured logging
- Log level management

### Anti-Patterns
- Console statements in production scripts
- Inconsistent logging
- Missing error logging

### Imports/Exports
- Import pino or create logger utility

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-023-A: Create Script Logger Utility
**Target:** `scripts/src/lib/logger.ts` or similar
**Action:** Create simple logger utility for scripts using pino or console with proper formatting.

#### TASK-023-B: Update seed.ts
**Target:** `scripts/src/seed.ts`
**Action:** Replace all console.log and console.error with logger calls, use appropriate log levels.

#### TASK-023-C: Update verify-indexes.ts
**Target:** `scripts/src/verify-indexes.ts`
**Action:** Replace all console.log and console.error with logger calls, use appropriate log levels.

#### TASK-023-D: Update test-cascade.ts
**Target:** `scripts/src/test-cascade.ts`
**Action:** Replace all console.log and console.error with logger calls, use appropriate log levels.

#### TASK-023-E: Update Other Scripts
**Target:** `scripts/src/`
**Action:** Replace console statements in any other script files with logger calls.

#### TASK-023-F: Test Script Output
**Target:** `scripts/src/`
**Action:** Run scripts to verify log output is properly formatted and contains all necessary information.

---

## [ ] TASK-024: Extract Common Route Handler Patterns
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/rooms.ts`
- `artifacts/api-server/src/routes/clients.ts`

### Definition of Done
- Common patterns extracted to utility functions
- Duplicate code reduced
- Functionality preserved
- Tests still pass

### Out of Scope
- Changing route logic
- Adding new abstractions

### Rules to Follow
- Extract truly common patterns
- Keep functions simple and focused
- Maintain backward compatibility
- Add JSDoc to utility functions

### Advanced Coding Pattern
- DRY principle
- Utility function extraction
- Higher-order functions

### Anti-Patterns
- Over-abstraction
- Creating complex utilities
- Breaking existing functionality

### Imports/Exports
- Export utilities from lib/route-utils.ts or similar

### Depends On
- TASK-008 (Extract common middleware logic)
- TASK-009 (Add JSDoc comments to public APIs)

### Blocks
- None

---

### Subtasks

#### TASK-024-A: Identify Common Patterns
**Target:** `artifacts/api-server/src/routes/`
**Action:** Compare lockers.ts and rooms.ts to identify common patterns in assign, release, renew, extend operations.

#### TASK-024-B: Design Utility Functions
**Target:** `artifacts/api-server/src/lib/route-utils.ts`
**Action:** Design utility functions for common patterns (e.g., resource assignment, release, pricing calculation).

#### TASK-024-C: Implement Resource Assignment Utility
**Target:** `artifacts/api-server/src/lib/route-utils.ts`
**Action:** Implement generic resource assignment function that can be used by both lockers and rooms.

#### TASK-024-D: Implement Resource Release Utility
**Target:** `artifacts/api-server/src/lib/route-utils.ts`
**Action:** Implement generic resource release function that can be used by both lockers and rooms.

#### TASK-024-E: Refactor lockers.ts
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Refactor lockers.ts to use extracted utility functions where applicable.

#### TASK-024-F: Refactor rooms.ts
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Refactor rooms.ts to use extracted utility functions where applicable.

#### TASK-024-G: Test Refactored Routes
**Target:** `artifacts/api-server/src/routes/`
**Action:** Run tests for lockers and rooms to verify functionality preserved after refactoring.

---

## [ ] TASK-025: Add JSDoc to Internal Helper Functions
**Status:** Pending
**Priority:** Low

### Related File Paths
- All lib files in `artifacts/api-server/src/lib/`
- All service files in `artifacts/api-server/src/services/`
- Complex internal functions

### Definition of Done
- Complex internal functions have JSDoc comments
- Helper functions documented
- Comments follow consistent format
- Documentation aids maintenance

### Out of Scope
- Trivial functions (self-documenting)
- Test files
- Type definitions

### Rules to Follow
- Document complex logic
- Document parameters and return values
- Include usage examples for complex functions
- Use consistent JSDoc format

### Advanced Coding Pattern
- Self-documenting code
- Comprehensive documentation

### Anti-Patterns
- Redundant comments
- Outdated documentation
- Missing documentation for complex logic

### Imports/Exports
- No import/export changes

### Depends On
- TASK-009 (Add JSDoc comments to public APIs)

### Blocks
- None

---

### Subtasks

#### TASK-025-A: Identify Complex Internal Functions
**Target:** `artifacts/api-server/src/lib/` and `services/`
**Action:** Identify internal functions with complex logic that would benefit from JSDoc documentation.

#### TASK-025-B: Document lib Functions
**Target:** `artifacts/api-server/src/lib/`
**Action:** Add JSDoc comments to complex internal functions in lib files (e.g., hashTokenForLogging, timingSafeLogin).

#### TASK-025-C: Document Service Functions
**Target:** `artifacts/api-server/src/services/`
**Action:** Add JSDoc comments to complex internal helper functions in service files.

#### TASK-025-D: Document Route Helpers
**Target:** `artifacts/api-server/src/routes/`
**Action:** Add JSDoc comments to helper functions in route files (e.g., formatLocker, formatRoom).

#### TASK-025-E: Verify Documentation
**Target:** `artifacts/api-server/src/`
**Action:** Verify JSDoc comments are accurate and helpful by checking IDE hover tooltips.

---

## [ ] TASK-026: Remove Test Route from Production Router
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/routes/test.ts`

### Definition of Done
- Test router not imported in production builds
- Test routes completely removed from production code
- Test functionality still available in test environment
- No security risk from test endpoints in production

### Out of Scope
- Removing test route functionality entirely
- Changing test route implementation

### Rules to Follow
- Use conditional imports based on NODE_ENV
- Or remove test router from main routes index entirely
- Ensure tests still work in development/test environments

### Advanced Coding Pattern
- Conditional module loading
- Environment-specific code paths
- Build-time code exclusion

### Anti-Patterns
- Relying solely on runtime middleware checks
- Leaving test code in production builds
- Environment-based security controls

### Imports/Exports
- Remove testRouter import from routes/index.ts

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-026-A: Evaluate Test Route Usage
**Target:** `artifacts/api-server/src/`
**Action:** Review all test files to determine if test route endpoints are actually used, or if tests can be refactored to not need them.

#### TASK-026-B: Remove Test Router from Main Router
**Target:** `artifacts/api-server/src/routes/index.ts`
**Action:** Remove testRouter import and mounting from main router index file.

#### TASK-026-C: Add Conditional Import (Alternative)
**Target:** `artifacts/api-server/src/routes/index.ts`
**Action:** If test routes are needed, add conditional import that only loads in test/development environment.

#### TASK-026-D: Verify Production Build
**Target:** `artifacts/api-server/`
**Action:** Build production version and verify test routes are not included in bundle.

#### TASK-026-E: Test Still Works in Development
**Target:** `artifacts/api-server/`
**Action:** Ensure tests still pass in development environment after changes.

---

## [ ] TASK-027: Replace CommonJS require() with ES Module Imports
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/services/session.ts`

### Definition of Done
- All require() calls replaced with ES module imports
- Consistent import style across codebase
- No CommonJS/ESM mixing
- Tests still pass after changes

### Out of Scope
- Changing module system entirely
- Refactoring all imports in codebase (only fix found instances)

### Rules to Follow
- Use ES module imports at top of file
- Maintain same functionality
- Update any related type definitions

### Advanced Coding Pattern
- Pure ES module architecture
- Consistent module system usage

### Anti-Patterns
- Mixing CommonJS and ESM
- Dynamic require() when static import would work

### Imports/Exports
- Add import statement at top of file
- Remove require() call

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-027-A: Replace require() in session.ts
**Target:** `artifacts/api-server/src/services/session.ts`
**Action:** Replace `const bcrypt = require("bcryptjs")` with `import bcrypt from "bcryptjs"` at top of file.

#### TASK-027-B: Verify Functionality
**Target:** `artifacts/api-server/src/services/session.test.ts`
**Action:** Run session service tests to ensure functionality unchanged after import change.

#### TASK-027-C: Search for Other require() Calls
**Target:** `artifacts/api-server/src/`
**Action:** Search for any other require() calls in production code and replace with ES imports.

---

## [ ] TASK-028: Use Centralized Env Validation in Drizzle Config
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `lib/db/drizzle.config.ts`
- `artifacts/api-server/src/lib/env.ts`

### Definition of Done
- Drizzle config uses getEnv() for environment access
- DATABASE_URL validated through centralized schema
- Consistent environment variable handling across codebase

### Out of Scope
- Changing Drizzle configuration structure
- Modifying env.ts schema

### Rules to Follow
- Use getEnv() from env.ts
- Maintain backward compatibility
- Add DATABASE_URL to envSchema if needed

### Advanced Coding Pattern
- Centralized configuration management
- Single source of truth for environment validation

### Anti-Patterns
- Direct process.env access
- Scattered environment variable validation

### Imports/Exports
- Import getEnv from @workspace/api-server/src/lib/env.ts

### Depends On
- TASK-013 (Use centralized environment variable validation)

### Blocks
- None

---

### Subtasks

#### TASK-028-A: Add DATABASE_URL to env.ts
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Add DATABASE_URL to envSchema with proper validation.

#### TASK-028-B: Update Drizzle Config
**Target:** `lib/db/drizzle.config.ts`
**Action:** Replace process.env.DATABASE_URL with getEnv().DATABASE_URL.

#### TASK-028-C: Test Drizzle Commands
**Target:** `lib/db/`
**Action:** Test drizzle-kit commands (push, generate, migrate) to ensure they work with new configuration.

---

## [ ] TASK-029: Replace Wildcard Schema Imports with Specific Imports
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/api-server/src/test/test-helpers.ts`
- `artifacts/api-server/src/test/setup.ts`
- `artifacts/api-server/src/test/seed.ts`
- `artifacts/api-server/src/routes/*.test.ts`

### Definition of Done
- Wildcard imports replaced with specific imports
- Only imported tables actually used
- Improved tree-shaking
- Tests still pass

### Out of Scope
- Changing all imports in codebase (focus on schema imports)
- Refactoring import structure

### Rules to Follow
- Import only tables actually used
- Maintain readability
- Group imports logically

### Advanced Coding Pattern
- Explicit dependency declaration
- Improved tree-shaking
- Clear dependency visibility

### Anti-Patterns
- Wildcard imports for unused code
- Importing entire modules when only using parts

### Imports/Exports
- Replace `import * as schema` with specific table imports

### Depends On
- TASK-002 (TypeScript strict mode)

### Blocks
- None

---

### Subtasks

#### TASK-029-A: Audit Wildcard Schema Imports
**Target:** `artifacts/api-server/src/`
**Action:** Search for all `import * as schema from '@workspace/db/schema'` and catalog actual usage.

#### TASK-029-B: Replace in Test Helpers
**Target:** `artifacts/api-server/src/test/test-helpers.ts`
**Action:** Replace wildcard import with specific table imports based on actual usage.

#### TASK-029-C: Replace in Test Setup
**Target:** `artifacts/api-server/src/test/setup.ts`
**Action:** Replace wildcard import with specific table imports based on actual usage.

#### TASK-029-D: Replace in Test Files
**Target:** `artifacts/api-server/src/routes/*.test.ts`
**Action:** Replace wildcard imports in route test files with specific table imports.

#### TASK-029-E: Verify Tests Still Pass
**Target:** `artifacts/api-server/`
**Action:** Run full test suite to ensure all tests still pass after import changes.

---

## [ ] TASK-030: Add Test Coverage for Missing Routes
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/routes/config.ts`
- `artifacts/api-server/src/routes/dashboard.ts`
- `artifacts/api-server/src/routes/test.ts`

### Definition of Done
- Test files created for config.ts
- Test files created for dashboard.ts
- Test files created for test.ts (if keeping it)
- Test coverage for all routes
- Tests follow existing test patterns

### Out of Scope
- Testing middleware (already tested)
- Testing lib files (already tested)

### Rules to Follow
- Follow existing test file patterns
- Use test helpers from test-helpers.ts
- Test both success and error cases
- Test authentication/authorization

### Advanced Coding Pattern
- Test-driven development
- Contract testing
- Integration testing

### Anti-Patterns
- Skipping error case testing
- Not testing authentication
- Inconsistent test patterns

### Imports/Exports
- Create new test files following naming convention

### Depends On
- TASK-026 (Remove test route from production - may affect test.ts testing)

### Blocks
- None

---

### Subtasks

#### TASK-030-A: Create config.test.ts
**Target:** `artifacts/api-server/src/routes/config.test.ts`
**Action:** Create test file for config route, test config endpoint returns correct values.

#### TASK-030-B: Create dashboard.test.ts
**Target:** `artifacts/api-server/src/routes/dashboard.test.ts`
**Action:** Create test file for dashboard route, test dashboard endpoint returns correct data.

#### TASK-030-C: Create test.test.ts (if keeping test route)
**Target:** `artifacts/api-server/src/routes/test.test.ts`
**Action:** Create test file for test route, test test-only endpoints work correctly in test environment.

#### TASK-030-D: Verify Test Coverage
**Target:** `artifacts/api-server/`
**Action:** Run test coverage report to ensure new tests increase coverage.

---

## [ ] TASK-031: Improve Error Handling in Catch Blocks
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/rooms.ts`
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/clients.ts`

### Definition of Done
- All catch blocks return appropriate error responses
- No catch blocks just log and re-throw without response
- Consistent error response format
- Errors logged with context

### Out of Scope
- Changing error response format (covered by TASK-007, TASK-018)
- Adding new error types

### Rules to Follow
- Every catch block must return error response
- Use appropriate HTTP status codes
- Log errors with context
- Sanitize error messages for users

### Advanced Coding Pattern
- Error boundary pattern
- Consistent error handling middleware

### Anti-Patterns
- Logging and re-throwing without response
- Missing error responses
- Silent error swallowing

### Imports/Exports
- Import logTransactionError from lib/logger.ts

### Depends On
- TASK-004 (Replace console statements with logger)
- TASK-007 (Standardize error handling)
- TASK-016 (Add proper error responses to all catch blocks)

### Blocks
- None

---

### Subtasks

#### TASK-031-A: Audit Catch Block Patterns
**Target:** `artifacts/api-server/src/routes/`
**Action:** Review all catch blocks to identify those that log and re-throw without returning error response.

#### TASK-031-B: Fix rooms.ts Catch Blocks
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Update catch blocks at lines 176-179, 251-254, 308-311, 342-345 to return error responses instead of re-throwing.

#### TASK-031-C: Fix lockers.ts Catch Blocks
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Update catch blocks at lines 243-246, 319-322, 371-374 to return error responses instead of re-throwing.

#### TASK-031-D: Fix clients.ts Catch Blocks
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Update catch block at line 374-377 to return error response instead of re-throwing.

#### TASK-031-E: Verify Error Handling
**Target:** `artifacts/api-server/src/routes/`
**Action:** Run test suite and manually test error scenarios to ensure all catch blocks return proper error responses.

---

## [ ] TASK-032: Add Current Locker Tracking to Waitlist
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `lib/db/src/schema/waitlist.ts`
- `artifacts/api-server/src/routes/waitlist.ts`
- `artifacts/spaflow/src/pages/waitlist.tsx`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Waitlist schema includes currentLockerId field
- Waitlist API returns current locker assignment
- Waitlist frontend displays current locker for each entry
- Waitlist add/update logic tracks current locker
- Database migration executed
- Tests updated and passing

### Out of Scope
- Changing waitlist priority algorithm
- Modifying waitlist confirmation flow
- Historical locker tracking

### Rules to Follow
- Add foreign key constraint to lockersTable
- Update waitlist add logic to check active locker
- Handle null currentLockerId gracefully
- Maintain backward compatibility with existing data

### Advanced Coding Pattern
- Domain-driven design: waitlist aggregate root
- Deep module: encapsulate waitlist business logic
- Event-driven: emit event when locker changes

### Anti-Patterns
- N+1 queries when fetching waitlist with locker info
- Inconsistent locker tracking state
- Missing foreign key constraints

### Imports/Exports
- Import lockersTable in waitlist schema
- Export updated waitlist schema types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-032-A: Add currentLockerId to Waitlist Schema
**Target:** `lib/db/src/schema/waitlist.ts`
**Action:** Add currentLockerId integer field with foreign key to lockersTable, set nullable, add index for queries.

#### TASK-032-B: Create Database Migration
**Target:** `lib/db/drizzle/`
**Action:** Generate and review migration script to add currentLockerId column to waitlist_entries table with foreign key constraint.

#### TASK-032-C: Update Waitlist API to Include Locker Info
**Target:** `artifacts/api-server/src/routes/waitlist.ts`
**Action:** Modify formatEntry and formatEntrySingle to fetch and return current locker name and ID for each waitlist entry.

#### TASK-032-D: Update Waitlist Add Logic to Track Current Locker
**Target:** `artifacts/api-server/src/routes/waitlist.ts`
**Action:** In POST /waitlist, query lockersTable for active locker assignment to client and set currentLockerId if found.

#### TASK-032-E: Update Waitlist Frontend to Display Current Locker
**Target:** `artifacts/spaflow/src/pages/waitlist.tsx`
**Action:** Add display of current locker assignment in waitlist entry card, show "Locker L#" badge if assigned.

#### TASK-032-F: Update OpenAPI Specification
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add currentLockerId and currentLockerName to WaitlistEntry schema definition.

#### TASK-032-G: Add Tests for Locker Tracking
**Target:** `artifacts/api-server/src/routes/waitlist.test.ts`
**Action:** Write tests for waitlist add with active locker, waitlist list includes locker info, waitlist update on locker change.

---

## [ ] TASK-033: Implement Room Quality Tiers with Range Pricing
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `lib/db/src/schema/rooms.ts`
- `artifacts/api-server/src/lib/pricing.ts`
- `artifacts/api-server/src/routes/checkin.ts`
- `artifacts/spaflow/src/pages/checkin.tsx`
- `scripts/src/seed.ts`

### Definition of Done
- Rooms schema includes quality tier field
- Pricing logic supports tier-based range pricing
- Check-in flow allows room tier selection
- Seed script assigns tiers to rooms
- Frontend displays tier information
- Tests updated and passing

### Out of Scope
- Dynamic pricing based on demand
- Room amenities tracking
- Tier upgrade/downgrade flows

### Rules to Follow
- Use enum for quality tiers (standard, premium, deluxe)
- Pricing ranges: standard $25-28, premium $29-32, deluxe $33-34 weekdays
- Weekend ranges: standard $28-31, premium $32-35, deluxe $36-37
- Default to standard tier for existing rooms
- Apply tier pricing consistently across all room operations

### Advanced Coding Pattern
- Strategy pattern for tier pricing calculation
- Value objects for price ranges
- Domain service for pricing rules

### Anti-Patterns
- Hardcoded tier prices in multiple locations
- Missing tier validation
- Inconsistent tier application

### Imports/Exports
- Export roomQualityTier enum
- Export tier pricing constants

### Depends On
- None

### Blocks
- TASK-034 (1824 special bundle)

---

### Subtasks

#### TASK-033-A: Add Quality Tier to Rooms Schema
**Target:** `lib/db/src/schema/rooms.ts`
**Action:** Add roomQualityTier enum (standard, premium, deluxe) and qualityTier field to roomsTable with default standard.

#### TASK-033-B: Create Database Migration for Room Tiers
**Target:** `lib/db/drizzle/`
**Action:** Generate migration to add quality_tier column to rooms table with enum constraint and default value.

#### TASK-033-C: Define Tier Pricing Constants
**Target:** `artifacts/api-server/src/lib/pricing.ts`
**Action:** Add tier pricing constants for weekday/weekend ranges, create getTierPrice function accepting tier and time parameters.

#### TASK-033-D: Update Pricing Logic to Use Tier Ranges
**Target:** `artifacts/api-server/src/lib/pricing.ts`
**Action:** Modify calculatePrice to accept roomTier parameter, use tier-based pricing instead of fixed room rates.

#### TASK-033-E: Update Check-in API to Accept Room Tier
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** Modify CheckInBody schema to include optional roomTier, pass tier to pricing calculation, validate tier matches assigned room.

#### TASK-033-F: Update Check-in Frontend for Tier Selection
**Target:** `artifacts/spaflow/src/pages/checkin.tsx`
**Action:** Add tier selection UI when room selected, display tier pricing, show tier badge on room options.

#### TASK-033-G: Update Seed Script with Room Tiers
**Target:** `scripts/src/seed.ts`
**Action:** Assign quality tiers to rooms during seeding (e.g., R1-R20 standard, R21-R30 premium, R31-R38 deluxe).

#### TASK-033-H: Update Renew/Extend for Tier Pricing
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Modify room renewal and extension endpoints to fetch room tier and apply tier-based pricing.

#### TASK-033-I: Add Tests for Tier Pricing
**Target:** `artifacts/api-server/src/lib/pricing.test.ts`
**Action:** Write tests for each tier pricing on weekday/weekend, verify tier selection affects price calculation.

---

## [ ] TASK-034: Bundle Membership Purchase in 1824 Special
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/routes/checkin.ts`
- `artifacts/api-server/src/lib/pricing.ts`
- `artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
- Check-in flow auto-purchases one-time membership for 18-24 non-members
- Pricing logic applies 1824 special after membership purchase
- Frontend displays bundled membership in pricing breakdown
- Transaction records membership purchase separately
- Tests updated and passing

### Out of Scope
- Changing 1824 special pricing rules
- Modifying membership types
- Special eligibility verification beyond age

### Rules to Follow
- Only apply when client age 18-24, non-member, purchasing locker
- Auto-select one-time membership type
- Apply special pricing after membership status becomes member
- Show clear pricing breakdown with membership cost
- Create separate transaction record for membership

### Advanced Coding Pattern
- Domain service for special pricing rules
- Transaction script for bundled purchase
- Specification pattern for special eligibility

### Anti-Patterns
- Hardcoding special logic in multiple places
- Missing transaction separation
- Unclear pricing breakdown

### Imports/Exports
- No new imports required

### Depends On
- TASK-033 (Room quality tiers)

### Blocks
- None

---

### Subtasks

#### TASK-034-A: Update Pricing Logic for Bundled 1824 Special
**Target:** `artifacts/api-server/src/lib/pricing.ts`
**Action:** Modify calculatePrice to accept membershipPurchase flag, return membership cost in pricing result when 1824 special eligible.

#### TASK-034-B: Update Check-in API to Bundle Membership
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** When client age 18-24, non-member, locker resource, auto-set membershipType to one_time, include membership in transaction.

#### TASK-034-C: Update Check-in Transaction Logic
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** Create separate transaction record for membership purchase when bundled, link to same squarePaymentId.

#### TASK-034-D: Update Check-in Frontend Pricing Display
**Target:** `artifacts/spaflow/src/pages/checkin.tsx`
**Action:** Show membership cost separately in pricing breakdown when 1824 special applied, display "1824 Special" badge.

#### TASK-034-E: Add Tests for Bundled 1824 Special
**Target:** `artifacts/api-server/src/routes/checkin.test.ts`
**Action:** Write test for 18-24 non-member check-in with locker, verify membership auto-purchased, verify special pricing applied.

---

## [ ] TASK-035: Implement Holiday and Special Event Pricing Logic
**Status:** Pending
**Priority:** High

### Related File Paths
- `lib/db/src/schema/special_events.ts`
- `artifacts/api-server/src/lib/pricing.ts`
- `artifacts/api-server/src/routes/config.ts`
- `artifacts/spaflow/src/pages/settings.tsx`

### Definition of Done
- Special events table created with date ranges and disable flags
- Pricing logic checks for active special events
- Specials disabled on holiday/special event dates
- Admin UI to manage special events
- Tests updated and passing

### Out of Scope
- Automatic holiday calendar integration
- Recurring special event patterns
- Event-specific pricing overrides

### Rules to Follow
- Special events table stores date range and disableSpecials flag
- Check current date against active special events
- Disable birthday, 1824, and other specials on event dates
- Provide admin UI for event CRUD operations
- Cache active events for performance

### Advanced Coding Pattern
- Temporal patterns for date range queries
- Specification pattern for special eligibility
- Caching strategy for event lookups

### Anti-Patterns
- Hardcoded holiday dates
- Missing timezone handling
- N+1 queries on every pricing calculation

### Imports/Exports
- Export special events schema
- Export isSpecialEventActive utility function

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-035-A: Create Special Events Schema
**Target:** `lib/db/src/schema/special_events.ts`
**Action:** Create specialEventsTable with id, name, startDate, endDate, disableSpecials boolean, createdAt fields.

#### TASK-035-B: Create Special Events Migration
**Target:** `lib/db/drizzle/`
**Action:** Generate migration to create special_events table with proper indexes on date ranges.

#### TASK-035-C: Add Special Event Check to Pricing Logic
**Target:** `artifacts/api-server/src/lib/pricing.ts`
**Action:** Add isSpecialEventActive function, modify calculatePrice to skip birthday and 1824 specials when event active.

#### TASK-035-D: Add Special Events API Endpoints
**Target:** `artifacts/api-server/src/routes/config.ts`
**Action:** Add GET/POST/PUT/DELETE endpoints for special events management, require manager role.

#### TASK-035-E: Create Special Events Admin UI
**Target:** `artifacts/spaflow/src/pages/settings.tsx`
**Action:** Add special events management section with date range picker, disable specials toggle, CRUD operations.

#### TASK-035-F: Add Special Events to Config API
**Target:** `artifacts/api-server/src/routes/config.ts`
**Action:** Add active special events to config endpoint response for frontend reference.

#### TASK-035-G: Add Tests for Special Event Logic
**Target:** `artifacts/api-server/src/lib/pricing.test.ts`
**Action:** Write tests for pricing on special event date, verify birthday special disabled, verify 1824 special disabled.

---

## [ ] TASK-036: Add Manager-Only Client PII Viewing
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/api-server/src/lib/encryption.ts`
- `artifacts/spaflow/src/pages/client-detail.tsx`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Manager-only endpoint to decrypt client PII
- Client detail page shows PII for managers
- Proper authentication and authorization
- Audit logging for PII access
- Tests updated and passing

### Out of Scope
- Editing encrypted PII
- PII export functionality
- Bulk PII decryption

### Rules to Follow
- Require MANAGER role for PII access
- Log all PII access attempts in audit logs
- Decrypt on-demand, never store decrypted data
- Show clear security warning in UI
- Rate limit PII access endpoint

### Advanced Coding Pattern
- Role-based access control
- Audit trail pattern
- Secure data handling

### Anti-Patterns
- Returning decrypted PII in standard client endpoints
- Missing audit logging
- Caching decrypted PII

### Imports/Exports
- Export decryptPiiForManager function
- Export PII access types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-036-A: Add PII Decryption Endpoint
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add GET /clients/:id/pii endpoint requiring MANAGER role, decrypt DOB/address/documentNumber, return in response.

#### TASK-036-B: Add Audit Logging for PII Access
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** In PII endpoint, log audit entry with action VIEW_PII, resourceType client, include accessed fields in description.

#### TASK-036-C: Add Rate Limiting to PII Endpoint
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Apply strict rate limiter to PII endpoint, limit to 10 requests per minute per user.

#### TASK-036-D: Update OpenAPI for PII Endpoint
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add /clients/{id}/pii endpoint definition with security requirement, response schema with decrypted fields.

#### TASK-036-E: Add PII View Modal to Client Detail
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Add "View Identification" button for managers, open modal with decrypted PII, show security warning.

#### TASK-036-F: Add PII Access to API Client
**Target:** `lib/api-client-react/src/`
**Action:** Generate or add useGetClientPii hook for PII endpoint access.

#### TASK-036-G: Add Tests for PII Access
**Target:** `artifacts/api-server/src/routes/clients.test.ts`
**Action:** Write tests for PII endpoint with manager role, verify 403 for staff role, verify audit log entry created.

---

## [ ] TASK-037: Add Membership Renewal Flow
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/spaflow/src/pages/client-detail.tsx`
- `artifacts/api-server/src/routes/checkin.ts`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Membership renewal API endpoint
- Client detail page shows renewal option
- Renewal creates new membership record
- Renewal processes payment via Square
- Transaction record created
- Tests updated and passing

### Out of Scope
- Membership upgrade/downgrade
- Proactive renewal reminders
- Membership pause functionality

### Rules to Follow
- Only allow renewal for expired memberships
- Require payment for renewal
- Create new membership record, don't update existing
- Set new expiration date based on membership type
- Update client membership status immediately

### Advanced Coding Pattern
- Domain service for membership lifecycle
- Transaction script for renewal process
- State machine for membership status

### Anti-Patterns
- Updating existing membership record
- Missing payment processing
- Incorrect expiration date calculation

### Imports/Exports
- Export renewal types
- Export membership renewal service

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-037-A: Add Membership Renewal Schema
**Target:** `lib/api-zod/src/`
**Action:** Add RenewMembershipBody schema with membershipType (one_time, six_month) and paymentToken fields.

#### TASK-037-B: Add Membership Renewal Endpoint
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add POST /clients/:id/memberships/renew endpoint, validate expired membership, process payment, create new membership record.

#### TASK-037-C: Update Client Membership Status on Renewal
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** In renewal endpoint, update client membershipStatus and membershipExpiresAt after successful payment.

#### TASK-037-D: Create Transaction for Renewal
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** In renewal endpoint, create transaction record with type membership, link to new membership record.

#### TASK-037-E: Add Renewal to OpenAPI Spec
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add POST /clients/{id}/memberships/renew endpoint with request/response schemas.

#### TASK-037-F: Add Renewal UI to Client Detail
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Show "Renew Membership" button for expired memberships, open modal with type selection and payment form.

#### TASK-037-G: Add Renewal to API Client
**Target:** `lib/api-client-react/src/`
**Action:** Generate or add useRenewMembership hook for renewal endpoint.

#### TASK-037-H: Add Tests for Membership Renewal
**Target:** `artifacts/api-server/src/routes/clients.test.ts`
**Action:** Write tests for renewal with expired membership, verify payment processed, verify new membership created, verify status updated.

---

## [ ] TASK-038: Enhance Pricing Rule Display in Check-in
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
- Pricing breakdown clearly shows applied rules
- Each rule has explanatory tooltip
- Special pricing prominently highlighted
- Membership cost separated if bundled
- Visual hierarchy in pricing display

### Out of Scope
- Changing pricing calculation logic
- Adding new pricing rules

### Rules to Follow
- Show rules in priority order
- Use color coding for special pricing
- Provide context for each rule
- Keep display concise but informative

### Advanced Coding Pattern
- Presentational component for pricing breakdown
- Tooltip component for rule explanations
- Badge component for special pricing

### Anti-Patterns
- Cluttered pricing display
- Missing rule explanations
- Inconsistent visual hierarchy

### Imports/Exports
- No new imports required

### Depends On
- TASK-034 (1824 special bundle)
- TASK-035 (Holiday pricing)

### Blocks
- None

---

### Subtasks

#### TASK-038-A: Create Pricing Breakdown Component
**Target:** `artifacts/spaflow/src/components/`
**Action:** Create PricingBreakdown component accepting subtotal, tax, total, appliedRules array, render structured breakdown.

#### TASK-038-B: Add Rule Explanations
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.tsx`
**Action:** Add tooltip or expandable section for each pricing rule with detailed explanation of why it was applied.

#### TASK-038-C: Highlight Special Pricing
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.tsx`
**Action:** Use distinct color/badge for birthday, 1824, and other special pricing rules to draw attention.

#### TASK-038-D: Separate Membership Cost
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.tsx`
**Action:** Show membership cost as separate line item when bundled, distinguish from rental cost.

#### TASK-038-E: Integrate Component into Check-in
**Target:** `artifacts/spaflow/src/pages/checkin.tsx`
**Action:** Replace existing pricing display with PricingBreakdown component in payment step.

#### TASK-038-F: Add Tests for Pricing Display
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.test.tsx`
**Action:** Write tests for component rendering with various rule combinations, verify tooltips work, verify special highlighting.

---

## [ ] TASK-039: Add Bulk Operations for Lockers and Rooms
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/rooms.ts`
- `artifacts/spaflow/src/pages/lockers.tsx`
- `artifacts/spaflow/src/pages/rooms.tsx`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Bulk release expired lockers/rooms endpoint
- Bulk release by status endpoint
- Frontend bulk action buttons
- Confirmation dialogs for bulk operations
- Audit logging for bulk actions
- Tests updated and passing

### Out of Scope
- Bulk assignment operations
- Bulk pricing changes
- Scheduled bulk operations

### Rules to Follow
- Require confirmation for bulk operations
- Log each individual action in audit
- Return summary of operations performed
- Rate limit bulk operations
- Validate all resources before bulk action

### Advanced Coding Pattern
- Command pattern for bulk operations
- Transaction script for atomic bulk actions
- Batch processing with error handling

### Anti-Patterns
- Silent failures in bulk operations
- Missing audit trail
- No confirmation prompts

### Imports/Exports
- Export bulk operation types
- Export bulk operation utilities

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-039-A: Add Bulk Release Schema
**Target:** `lib/api-zod/src/`
**Action:** Add BulkReleaseBody schema with resourceIds array and operation type (all_expired, by_status).

#### TASK-039-B: Add Bulk Release Endpoint for Lockers
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Add POST /lockers/bulk-release endpoint, validate IDs, release each in transaction, return summary.

#### TASK-039-C: Add Bulk Release Endpoint for Rooms
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Add POST /rooms/bulk-release endpoint, validate IDs, release each in transaction, return summary.

#### TASK-039-D: Add Audit Logging for Bulk Operations
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Log individual audit entries for each resource released in bulk operation, include bulk operation ID.

#### TASK-039-E: Add Bulk Endpoints to OpenAPI
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add bulk-release endpoints for lockers and rooms with request/response schemas.

#### TASK-039-F: Add Bulk Release UI to Lockers Page
**Target:** `artifacts/spaflow/src/pages/lockers.tsx`
**Action:** Add "Release All Expired" button, add multi-select for lockers, add confirmation dialog.

#### TASK-039-G: Add Bulk Release UI to Rooms Page
**Target:** `artifacts/spaflow/src/pages/rooms.tsx`
**Action:** Add "Release All Expired" button, add multi-select for rooms, add confirmation dialog.

#### TASK-039-H: Add Tests for Bulk Operations
**Target:** `artifacts/api-server/src/routes/lockers.test.ts`
**Action:** Write tests for bulk release expired, bulk release by selection, verify audit logs, verify error handling.

---

## [ ] TASK-040: Add Quick Action Buttons to Dashboard
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/spaflow/src/pages/dashboard.tsx`
- `artifacts/api-server/src/routes/dashboard.ts`

### Definition of Done
- Quick check-in button on dashboard
- Quick add to waitlist button
- Quick client search
- Quick locker release
- Navigation to relevant pages
- Tests updated and passing

### Out of Scope
- Full check-in flow on dashboard
- Complex operations on dashboard
- Dashboard state management

### Rules to Follow
- Quick actions navigate to dedicated pages
- Pre-fill relevant data when possible
- Keep dashboard uncluttered
- Use consistent button styling

### Advanced Coding Pattern
- Navigation component with pre-fill
- Action button component
- Context-aware navigation

### Anti-Patterns
- Implementing full flows on dashboard
- Too many quick actions
- Inconsistent navigation patterns

### Imports/Exports
- No new imports required

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-040-A: Add Quick Check-in Button
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add "New Check-in" button in header, navigate to /checkin with empty state.

#### TASK-040-B: Add Quick Waitlist Button
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add "Add to Waitlist" button, open small dialog with client search, navigate to waitlist on confirm.

#### TASK-040-C: Add Quick Client Search
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add client search input in header, show dropdown results, navigate to client detail on select.

#### TASK-040-D: Add Quick Release Button
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add "Release Resource" button, show dialog with locker/room selector, call release endpoint.

#### TASK-040-E: Style Quick Actions Consistently
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Use consistent button styling, icon placement, and layout for all quick action buttons.

#### TASK-040-F: Add Tests for Quick Actions
**Target:** `artifacts/spaflow/src/pages/dashboard.test.tsx`
**Action:** Write tests for each quick action button, verify navigation, verify pre-fill data, verify dialogs open.
