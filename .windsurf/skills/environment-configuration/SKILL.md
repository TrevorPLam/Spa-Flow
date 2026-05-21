---
name: environment-configuration
description: Managing environment variables with Zod validation and centralized configuration access
---

# Environment Configuration

This skill covers managing environment variables in the Spa-Flow repository with Zod validation and centralized configuration access.

## Key Concepts

### Centralized env.ts
- Single source of truth for environment access
- Located in `artifacts/api-server/src/lib/env.ts`
- Zod schema validation for all variables
- Fail-fast validation at startup
- Never use process.env directly

### Zod Schema Validation
- All environment variables validated at startup
- Type-safe access throughout codebase
- Clear error messages for invalid configuration
- Schema defined with z.object()
- Required and optional fields

### Fail-Fast Validation
- Application won't start with invalid config
- Clear error messages for missing/invalid variables
- Prevents runtime errors from bad configuration
- Validates before database connection
- Validates before server starts

### Environment-Specific Configs
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.staging` - Staging environment
- `.env.test` - Test environment
- `.env.example` - Template with all variables

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `DB_POOL_MAX` - Maximum connections (default: 20)
- `DB_POOL_IDLE_TIMEOUT_MS` - Idle connection timeout (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT_MS` - Connection acquisition timeout (default: 5000)
- `DB_STATEMENT_TIMEOUT_MS` - Statement timeout (default: 30000)
- `DB_LOCK_TIMEOUT_MS` - Lock timeout (default: 5000)
- `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` - Idle in transaction timeout (default: 60000)

### Security Configuration
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `JWT_EXPIRY` - Access token expiry (default: 15m)
- `ENCRYPTION_KEY` - Base64-encoded 32-byte encryption key
- `CSRF_SECRET` - Base64-encoded 32-byte CSRF secret
- `LOCKOUT_THRESHOLD` - Failed attempts before lockout (default: 5)
- `LOCKOUT_DURATION_MS` - Lockout duration (default: 900000)

### Application Configuration
- `PORT` - API server port (default: 5000)
- `VITE_PORT` - Frontend port (default: 5173)
- `TAX_RATE` - Tax rate (default: 0.08875)
- `BASE_PATH` - Base path for deployment (default: /)
- `NODE_ENV` - Environment (development/production)

### API Configuration
- `API_BASE_URL` - API base URL for backend
- `VITE_API_URL` - API base URL for frontend
- `REQUEST_TIMEOUT` - Request timeout (default: 30s)

### Payment Configuration
- `SQUARE_ACCESS_TOKEN` - Square access token
- `SQUARE_APPLICATION_ID` - Square application ID
- `SQUARE_LOCATION_ID` - Square location ID
- `SQUARE_ENVIRONMENT` - sandbox or production
- `SQUARE_API_VERSION` - API version (default: 2025-08-20)

### Third-Party Service Configuration
- `REDIS_URL` - Redis connection URL
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM_ADDRESS` - From email address
- `SENTRY_DSN` - Sentry DSN for error tracking

### Configuration Categorization
- Database: Connection and pool settings
- Security: JWT, encryption, CSRF secrets
- Application: Ports, paths, environment
- API: Base URLs and timeouts
- Payment: Square configuration
- Services: Redis, Twilio, Resend, Sentry

## Key Files
- `artifacts/api-server/src/lib/env.ts` - Centralized env validation
- `.env.example` - Environment variable template
- `.env.*` - Environment-specific configs

## References
- `AGENTS.md` - Environment variable access rules
- TODO.md TASK-023, TASK-024, TASK-026 - Env validation tasks

## Common Tasks

### Accessing Environment Variables
```typescript
import env from '../lib/env';

// Instead of process.env.DATABASE_URL
const dbUrl = env.DATABASE_URL;

// Type-safe access
const port = env.PORT;
const jwtSecret = env.JWT_SECRET;
```

### Adding New Environment Variable
1. Add to Zod schema in env.ts
2. Add to .env.example
3. Add to environment-specific .env files
4. Use in code via env object
5. Document in README if user-facing

### Validating Configuration
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.string().default('5000').transform(Number),
});

const env = envSchema.parse(process.env);
```

## Best Practices
- Never use process.env directly
- Always validate at startup
- Use type-safe access
- Document all variables in .env.example
- Keep secrets out of git
- Use environment-specific configs
