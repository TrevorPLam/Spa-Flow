# Spa-Flow

A spa management system with client tracking, resource booking (lockers and rooms), membership management, payment processing, and staff administration.

## Badges

[![CI Build](https://github.com/TrevorPLam/Spa-Flow/actions/workflows/ci.yml/badge.svg)](https://github.com/TrevorPLam/Spa-Flow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Frontend Pages](#frontend-pages)
- [Installation](#installation)
- [Development](#development)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [Documentation](#documentation)
- [License](#license)

## Architecture

This is a monorepo using pnpm workspaces with the following packages:

- `artifacts/api-server` - Backend API server (Express.js with TypeScript)
- `artifacts/spaflow` - Frontend React application (React 19 with Vite)
- `artifacts/mockup-sandbox` - Isolated mockup and component sandbox
- `lib/api-client-react` - React API client generated from OpenAPI spec
- `lib/api-spec` - OpenAPI 3.1.0 specification
- `lib/api-zod` - Zod validation schemas
- `lib/db` - Database schema and utilities (Drizzle ORM with PostgreSQL)
- `lib/test-utils` - Shared testing utilities
- `scripts` - Utility scripts (database seeding, index verification, flakiness tooling)
- `load-tests` - k6 performance and smoke-test scenarios

## Technology Stack

### Backend
- **Framework**: Express.js 5.2.1
- **Language**: TypeScript 5.9.3
- **Database**: PostgreSQL with Drizzle ORM 0.45.2
- **Caching**: Redis 5.12.1
- **Authentication**: JWT (jose 6.2.3) with refresh token rotation
- **Password Hashing**: bcryptjs 2.4.3
- **Payment Processing**: Square SDK 44.0.1
- **SMS**: Twilio 6.0.2
- **Email**: Resend
- **Logging**: Pino 9.14.0
- **Error Tracking**: Sentry 10.53.1
- **Security**: Helmet 8.1.0, CORS 2.8.6, CSRF 3.1.0, express-rate-limit 8.5.2

### Frontend
- **Framework**: React 19.1.0 with React DOM 19.1.0
- **Build Tool**: Vite 7.3.2
- **Routing**: Wouter 3.3.5
- **State Management**: TanStack Query 5.90.21
- **UI Components**: Radix UI (comprehensive component library)
- **Styling**: TailwindCSS 4.1.14
- **Icons**: Lucide React 0.545.0
- **Forms**: React Hook Form 7.55.0
- **Payment**: react-square-web-payments-sdk 3.3.0
- **Charts**: Recharts 2.15.2
- **Animations**: Framer Motion 12.23.24

### Testing
- **Unit Testing**: Vitest 4.1.6
- **E2E Testing**: Playwright 1.48.0 with visual regression
- **Mutation Testing**: Stryker 9.6.1
- **Load Testing**: k6
- **Coverage**: Vitest Coverage v8 4.1.6

## Key Features

| Category | Features |
|----------|----------|
| **Authentication & Authorization** | JWT-based authentication with 15-minute access tokens, refresh token rotation, timing-safe login, account lockout (5 attempts), password reset via email, session management with device identification, role-based access control (STAFF, MANAGER), CSRF protection, audit logging |
| **Client Management** | Client profile creation and management, search by name/email/phone/member ID, membership tracking (none, one_time, six_month), encrypted PII fields (DOB, address, document number) with envelope encryption, rental history, transaction history |
| **Resource Management** | Lockers: assign, release, renew (6 hours), extend (2 hours); Rooms: assign, release, renew (6 hours), extend (2 hours); real-time occupancy tracking (available, occupied, reserved); dynamic pricing engine; automatic session expiration (every 5 minutes) |
| **Waitlist System** | Automatic waitlist when rooms are fully occupied, position-based queue management, 15-minute confirmation window for room assignments, automatic reassignment on expiration, SMS notifications via Twilio |
| **Product Inventory** | Product catalog with categories, stock tracking, price management, product sales integration with transactions |
| **Payment Processing** | Square Web Payments SDK integration, support for locker rentals, room rentals, memberships, and products, idempotency keys for duplicate charge prevention, tax calculation (configurable, default 8.875%), transaction history with Square payment IDs |
| **Staff Administration** | Staff user management (MANAGER role only), user creation/update/deletion, role assignment (STAFF, MANAGER), audit log viewing (MANAGER role only), session management and revocation |
| **Background Jobs** | Rental session expiration (every 5 minutes), waitlist assignment expiration (every 5 minutes), cache statistics logging (every hour) |

## Database Schema

### Core Tables
- **users**: Staff users with authentication and lockout tracking
- **clients**: Client profiles with membership and encrypted PII
- **memberships**: Client membership purchases and expiration
- **lockers**: Locker inventory and assignment status
- **rooms**: Private room inventory and assignment status
- **rental_sessions**: Rental session tracking with status
- **waitlist_entries**: Waitlist queue for room availability
- **products**: Product inventory and pricing
- **transactions**: Transaction history with Square integration
- **audit_logs**: Comprehensive audit trail
- **refresh_tokens**: JWT refresh token storage
- **password_reset_tokens**: Password reset flow tokens

### Key Relationships
- Clients have many memberships, rental sessions, transactions, and waitlist entries
- Lockers and rooms reference clients and rental sessions
- Rental sessions cascade delete when clients are deleted
- Lockers and rooms restrict deletion when sessions are active

## API Endpoints

All API endpoints are mounted under `/api/v1`.

### Health
- `GET /healthz/live` - Liveness probe
- `GET /healthz/ready` - Readiness probe (checks database, Square, Twilio, Redis, secrets)

### Authentication
- `POST /auth/login` - Staff login with rate limiting (5 attempts/15 minutes)
- `POST /auth/logout` - Staff logout
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/password-reset/request` - Request password reset via email
- `POST /auth/password-reset/confirm` - Confirm password reset with token
- `GET /auth/sessions` - List active sessions for current user
- `DELETE /auth/sessions` - Revoke all sessions except current
- `DELETE /auth/sessions/:id` - Revoke specific session

### Clients
- `GET /clients` - List clients with search, membership filter, pagination
- `POST /clients` - Create client profile
- `GET /clients/:id` - Get client profile
- `PATCH /clients/:id` - Update client profile
- `DELETE /clients/:id` - Delete client
- `POST /clients/:id/memberships` - Add membership to client
- `GET /clients/:id/rentals` - Get client rental history
- `GET /clients/:id/transactions` - Get client transaction history

### Lockers
- `GET /lockers` - List all lockers with status filter
- `GET /lockers/occupancy` - Get locker occupancy summary
- `POST /lockers/:id/assign` - Assign locker to client
- `POST /lockers/:id/release` - Release locker
- `POST /lockers/:id/renew` - Renew locker for 6 hours
- `POST /lockers/:id/extend` - Extend locker by 2 hours

### Rooms
- `GET /rooms` - List all rooms with status filter
- `GET /rooms/occupancy` - Get room occupancy summary
- `POST /rooms/:id/assign` - Assign room to client
- `POST /rooms/:id/release` - Release room
- `POST /rooms/:id/renew` - Renew room for 6 hours
- `POST /rooms/:id/extend` - Extend room by 2 hours

### Pricing
- `POST /pricing/calculate` - Calculate price for rental

### Check-in
- `POST /checkin` - Full check-in flow (process payment and assign resource)

### Waitlist
- `GET /waitlist` - List waitlist entries
- `POST /waitlist` - Add client to waitlist
- `DELETE /waitlist/:id` - Remove from waitlist
- `POST /waitlist/:id/confirm` - Confirm room assignment from waitlist

### Products
- `GET /products` - List all products
- `POST /products` - Create product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /products/low-stock` - List products with low stock

### Transactions
- `GET /transactions` - List transactions with client filter and pagination

### Dashboard
- `GET /dashboard` - Get dashboard summary

### Reports (MANAGER only)
- `GET /reports/revenue` - Get revenue report by date range with time granularity
- `GET /reports/revenue-by-type` - Get revenue breakdown by service type
- `GET /reports/utilization/lockers` - Get locker utilization rates over time
- `GET /reports/utilization/rooms` - Get room utilization rates over time
- `GET /reports/utilization/peak-hours` - Get peak hours analysis for rentals

### Users (MANAGER only)
- `GET /users` - List staff users
- `POST /users` - Create staff user
- `PATCH /users/:id` - Update staff user
- `DELETE /users/:id` - Delete staff user
- `POST /users/:id/unlock` - Unlock locked user account

### Audit Logs (MANAGER only)
- `GET /audit-logs` - List audit logs with action, user, and pagination filters

### API Documentation
- Interactive API documentation available at `/api-docs` (Swagger UI)

## Frontend Pages

- `/` - Redirects to `/dashboard`
- `/login` - Staff login
- `/dashboard` - Dashboard with summary statistics
- `/checkin` - Check-in flow for clients
- `/clients` - Client list with search
- `/clients/new` - Create new client
- `/clients/:id` - Client detail view
- `/lockers` - Locker management
- `/rooms` - Room management
- `/waitlist` - Waitlist management
- `/products` - Product inventory
- `/transactions` - Transaction history
- `/reports` - Reports and analytics
- `/users` - Staff user management (MANAGER only)
- `/audit-logs` - Audit log viewing (MANAGER only)
- `/sessions` - Session management

## Installation

### Quick Start

Get up and running (requires Node.js 22, pnpm 9, PostgreSQL, Redis):

```bash
# Install dependencies
pnpm install

# Configure environment (copy .env.example to .env and fill in required values)
cp .env.example .env

# Run database migrations and seed
cd lib/db && pnpm run push
cd ../../scripts && pnpm run seed

# Start API server (port 5000)
cd ../artifacts/api-server && pnpm run dev

# In another terminal, start frontend (port 5173)
cd ../spaflow && pnpm run dev
```

Visit http://localhost:5173 to access the application.

### Prerequisites
- Node.js (see catalog in pnpm-workspace.yaml)
- pnpm (see packageManager in package.json)
- PostgreSQL database
- Redis server (optional, for caching)

### Detailed Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Configure environment variables (see .env.example for full list)
# Required: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, CSRF_SECRET
# Optional (for payment processing): SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, VITE_SQUARE_APPLICATION_ID, VITE_SQUARE_LOCATION_ID
# Optional (for additional features): REDIS_URL (caching), TWILIO_* (SMS), RESEND_API_KEY (email), SENTRY_* (error tracking)

# Run database migrations
cd lib/db
pnpm run push

# Seed database with initial data (admin and staff users)
cd ../../scripts
pnpm run seed
```

## Development

### Start API Server
```bash
cd artifacts/api-server
pnpm run dev
```
Server runs on port 5000 (configurable via PORT env var). The dev script builds the project first, then starts the built server.

### Start Frontend
```bash
cd artifacts/spaflow
pnpm run dev
```
Frontend runs on port 5173 (configured via `PORT` in the dev script); the Vite proxy targets `VITE_API_URL`.

### Regenerate API Client
After modifying the OpenAPI spec:
```bash
cd lib/api-spec
pnpm run codegen
```

## Testing

### Run All Tests
```bash
# Run all tests in workspace (only packages with test scripts)
pnpm -r --if-present run test

# Run tests for specific package
cd artifacts/api-server && pnpm run test
cd artifacts/spaflow && pnpm run test
```

### Run Tests with Coverage
```bash
# Run coverage for all packages (only packages with test:coverage scripts)
pnpm -r --if-present run test:coverage

# Run coverage for specific package
cd artifacts/api-server && pnpm run test:coverage
cd artifacts/spaflow && pnpm run test:coverage
```

### Run Incremental Tests (Changed Files Only)
```bash
# Run tests only for changed packages
pnpm run test:changed

# Run tests for affected packages and their dependents
pnpm run test:affected
```

### Run E2E Tests
```bash
cd artifacts/spaflow
pnpm run test:e2e
```

### Run Load Tests
```bash
# Smoke tests (quick validation)
pnpm run test:load:smoke

# Specific load tests
pnpm run test:load:health
pnpm run test:load:clients
pnpm run test:load:dashboard
pnpm run test:load:checkin

# All load tests
pnpm run test:load:all
```

### Run Mutation Tests
```bash
cd artifacts/api-server
pnpm run test:mutation
```

## CI/CD Pipeline

The CI pipeline runs on:
- Every push to main branch
- Every pull request to main branch
- Manual workflow dispatch

### Pipeline Stages
1. **Security Scan** - pnpm audit (high/critical vulnerabilities block CI)
2. **CodeQL Analysis** - Static application security testing
3. **Type Check** - TypeScript compilation check
4. **Build** - Build all packages
5. **Smoke Tests** - Quick validation of critical paths
6. **Contract Tests** - API contract validation (filtered by changed packages)
7. **Component Tests** - Component tests (filtered by changed packages)
8. **Performance Tests** - API and frontend performance benchmarks
9. **Coverage Report** - Code coverage measurement (filtered by changed packages)
10. **E2E Tests** - End-to-end tests with visual regression (filtered by spaflow changes)
11. **E2E Report Merge** - Merge sharded E2E test reports
12. **Smoke Load Tests** - Quick load validation with k6
13. **Load Tests** - Performance testing with k6
14. **Mutation Tests** - Mutation testing with Stryker
15. **Flakiness Detection** - Detect flaky tests across test suites

### Caching Strategy
- pnpm store cache for dependencies
- Build cache for compiled artifacts
- Vitest cache for test execution
- Playwright browser cache
- Stryker cache for mutation testing

## Security

### Authentication Security
- JWT access tokens with 15-minute expiration
- Refresh token rotation on each use
- HttpOnly cookies for access token storage (XSS protection)
- SameSite=strict for CSRF protection
- Timing-safe login to prevent user enumeration
- Account lockout after failed attempts
- NIST SP 800-63B Rev 4 password requirements (minimum 15 characters)

### Data Security
- Envelope encryption for PII fields (date of birth, address, document number)
- Database connection pooling with configurable limits
- SQL injection prevention via parameterized queries (Drizzle ORM)
- CORS configuration with allowed origins
- CSRF protection with double-submit pattern
- Helmet middleware for security headers

### Supply Chain Security
- pnpm audit with high/critical severity threshold
- 1-day minimum release age for npm packages (supply-chain attack defense)
- CodeQL static analysis for JavaScript/TypeScript
- Platform-specific dependency exclusion (Linux-only optimization)

### Audit Logging
- All authentication events logged
- Resource modifications tracked
- Correlation IDs for request tracing
- IP address and email logging
- MANAGER-only audit log viewing

## Environment Variables

See `.env.example` for the complete list of environment variables. The authoritative runtime schema is defined in `artifacts/api-server/src/lib/env.ts`, and the frontend also consumes `VITE_*` values from `.env.example`.

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `DB_POOL_MAX` - Maximum connections (default: 20)
- `DB_POOL_IDLE_TIMEOUT_MS` - Idle connection timeout (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT_MS` - Connection acquisition timeout (default: 5000)
- `DB_STATEMENT_TIMEOUT_MS` - Statement timeout (default: 30000)
- `DB_LOCK_TIMEOUT_MS` - Lock timeout (default: 5000)
- `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` - Idle in-transaction timeout (default: 60000)

### Security
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `JWT_EXPIRY` - Access token expiry (default: 15m)
- `ENCRYPTION_KEY` - Base64-encoded 32-byte encryption key
- `CSRF_SECRET` - Base64-encoded 32-byte CSRF secret
- `LOCKOUT_THRESHOLD` - Failed attempts before lockout (default: 5)
- `LOCKOUT_DURATION_MS` - Lockout duration (default: 900000)

### Application
- `PORT` - API server port (default: 5000)
- `VITE_PORT` - Frontend port (default: 5173)
- `TAX_RATE` - Tax rate (default: 0.08875)
- `BASE_PATH` - Base path for deployment (default: /)
- `NODE_ENV` - Environment (development/production)

### API
- `API_BASE_URL` - API base URL for backend
- `VITE_API_URL` - API base URL for frontend

### Square Payment
- `SQUARE_ACCESS_TOKEN` - Square access token used by the backend
- `SQUARE_LOCATION_ID` - Square location ID used by the backend
- `SQUARE_ENVIRONMENT` - sandbox or production
- `SQUARE_API_VERSION` - API version (default: 2025-08-20)
- `VITE_SQUARE_APPLICATION_ID` - Square application ID used by the frontend
- `VITE_SQUARE_LOCATION_ID` - Square location ID used by the frontend

### Third-Party Services
- `REDIS_URL` - Redis connection URL
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM_ADDRESS` - From email address
- `SENTRY_DSN` - Sentry DSN for error tracking

## Documentation

Detailed documentation is available in the `docs/` directory:

- `auth-architecture.md` - Authentication architecture and security decisions
- `testing-strategy.md` - Testing strategy and incremental testing approach
- `monorepo-testing.md` - Monorepo testing approach
- `test-ownership.md` - Test ownership guidelines
- `test-tags.md` - Test tagging strategy
- `api-changelog.md` - API version history and breaking changes
- `security.md` - Security scanning and vulnerability remediation process
- `contract-testing.md` - Contract testing approach
- `mutation-testing.md` - Mutation testing with Stryker
- `test-data.md` - Test data management strategy
- `visual-testing.md` - Visual regression testing with Playwright
- `migrations.md` - Database migration strategy
- `error-handling.md` - Error handling strategy
- `ai-testing-research.md` - AI-assisted testing research
- `ai-testing-evaluation.md` - AI testing tool evaluation
- `ui-ux-analysis.md` - UI/UX analysis and improvements

## Contributing

We welcome contributions. Please follow the repository guidance in `AGENTS.md`, keep `README.md` and `ANALYSIS.md` accurate when behavior changes, and update any affected docs alongside code changes.

## License

MIT
