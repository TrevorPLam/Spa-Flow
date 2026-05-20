import { z } from 'zod';

// Simple bootstrap logger to avoid circular dependency with logger.ts
// logger.ts imports from env.ts, so env.ts cannot use the main logger
const bootstrapLogger = {
  error: (...args: unknown[]) => console.error(...args),
  info: (...args: unknown[]) => console.log(...args),
};

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Security - Secrets (minimum 32 characters for cryptographic security)
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),

  // Application config
  TAX_RATE: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0).max(1)),
  PORT: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(65535)),
  VITE_PORT: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(65535)),
  BASE_PATH: z.string().default('/'),

  // CORS Configuration
  // Comma-separated list of allowed origins (e.g., "http://localhost:5173,https://example.com")
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Redis Configuration
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),

  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Twilio (optional for health checks)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{6,14}$/, 'TWILIO_PHONE_NUMBER must be in E.164 format (e.g., +14155552671)').optional(),

  // Square (optional for health checks)
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  SQUARE_API_VERSION: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'SQUARE_API_VERSION must be in YYYY-MM-DD format').default('2025-08-20'),

  // Sentry (optional for error tracking)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default(process.env.NODE_ENV || 'development'),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Account Lockout Configuration
  LOCKOUT_THRESHOLD: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(20)).default(5),
  LOCKOUT_DURATION_MS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(60000)).default(900000), // 15 minutes default

  // Authentication Configuration
  // JWT_EXPIRY: Access token expiration time (e.g., "15m", "1h")
  // Recommended: 15 minutes per JWT security best practices
  JWT_EXPIRY: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRY must be in format like "15m", "1h", "1d"').default('15m'),
  // COOKIE_NAME: Name of the HTTP-only cookie for session token
  COOKIE_NAME: z.string().min(1).max(100).default('spaflow_session'),
  // REFRESH_TOKEN_EXPIRY_DAYS: Number of days refresh tokens are valid
  // Recommended: 7-14 days per security best practices
  REFRESH_TOKEN_EXPIRY_DAYS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(30)).default(7),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    bootstrapLogger.error('❌ Environment validation failed:');
    result.error.issues.forEach((issue) => {
      bootstrapLogger.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    bootstrapLogger.error('\nApplication will not start without valid environment variables.');
    process.exit(1);
  }

  bootstrapLogger.info('✅ Environment validation passed');
  validatedEnv = result.data;
  return validatedEnv;
}

export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}

// Helper function to get Twilio credentials with validation
export function getTwilioCredentials(): { accountSid: string | undefined; authToken: string | undefined } {
  const env = getEnv();
  return {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
  };
}

// Helper function to get Twilio Basic Auth header
export function getTwilioAuthHeader(): string | undefined {
  const { accountSid, authToken } = getTwilioCredentials();
  if (!accountSid || !authToken) {
    return undefined;
  }
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}
