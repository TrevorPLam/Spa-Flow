---
name: security-encryption
description: Implementing security measures including envelope encryption for PII, CSRF protection, rate limiting, and audit logging
---

# Security & Encryption

This skill covers implementing security measures in the Spa-Flow repository including envelope encryption for PII, CSRF protection, rate limiting, and audit logging.

## Key Concepts

### Envelope Encryption for PII
- PII fields: date of birth (dob), address, document number
- AES-256-GCM encryption algorithm
- KEK (Key Encryption Key) stored in environment variable
- DEKs (Data Encryption Keys) stored alongside ciphertext
- Envelope encryption pattern for key rotation
- Never log or output PII fields in logs or console

### AES-256-GCM Encryption
- AEAD (Authenticated Encryption with Associated Data) algorithm
- Provides both encryption and authentication
- Modern standard for data encryption
- Used by OpenSSL, BitLocker, and modern VPNs
- GCM mode is faster and more secure than older CBC mode

### CSRF Protection
- Double-submit cookie pattern implementation
- CSRF secret stored in environment (32-byte base64)
- SameSite=strict for cookies
- Validates CSRF token on state-changing requests
- `/healthz` endpoints are CSRF-exempt
- CSRF token in cookie and request header

### Rate Limiting
- Login: 5 attempts per 15 minutes
- Check-in: 10 attempts per 1 minute
- General API: 100 requests per 1 minute
- Configurable via environment variables
- Different limits for different endpoints
- Prevents brute force and DoS attacks

### Helmet Middleware
- Security headers for HTTP responses
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options to prevent clickjacking
- X-Content-Type-Options nosniff
- X-XSS-Protection
- Configured in Express app middleware stack

### CORS Configuration
- Origin whitelist for cross-origin requests
- Blocks null origin in production
- Configurable allowed origins
- Credentials support for cookies
- Preflight request handling

### SQL Injection Prevention
- Drizzle ORM parameterized queries
- Never use raw SQL with string interpolation
- Only intentional raw SQL: SELECT FOR UPDATE in rooms.ts
- All other queries use Drizzle query builder
- Type-safe query construction

### Audit Logging
- All resource mutations logged to audit_logs
- Includes userId, action, resourceType, resourceId
- IP address and correlation ID tracking
- MANAGER-only audit log viewing
- Required for clients, lockers, rooms, transactions

### Supply Chain Security
- 1-day minimum release age for npm packages
- pnpm audit for vulnerability scanning
- High/critical vulnerabilities block CI
- Platform-specific dependency exclusions
- Only built dependencies restriction
- Lockfile enforcement

### CodeQL Static Analysis
- Runs in CI pipeline
- JavaScript/TypeScript analysis
- Detects security vulnerabilities
- Code quality checks
- Part of security scan stage

### PII Logging Restrictions
- Never log dob, address, or documentNumber
- Never output PII to console
- Sanitize logs before output
- Mask sensitive data in error messages
- Audit logs don't contain PII

### Cache Invalidation
- Invalidate cache after resource mutations
- Use cache helper functions in lib/cache.ts
- Invalidate relevant cache keys
- Prevents stale data serving
- Applies to clients, lockers, rooms, transactions

## 2026 Best Practices

### Envelope Encryption
Based on 2026 encryption best practices:

**AES-256-GCM Standard**
- Gold standard of modern encryption
- Widely praised for speed and strength
- GCM mode encrypts and authenticates data
- Replaces older AES-CBC mode
- Used in cloud KMS implementations

**Envelope Encryption Pattern**
- KEK protects DEKs
- DEKs protect actual data
- Allows key rotation without re-encrypting data
- DEKs stored alongside ciphertext
- KEK stored in secure environment

**Key Management**
- Rotate KEKs regularly
- Store KEKs in secure environment (AWS KMS, GCP KMS, or env var)
- Never hardcode keys
- Use 256-bit keys (32 bytes)
- Base64 encode for environment storage

### Security Headers
- HSTS with max-age
- X-Frame-Options: DENY or SAMEORIGIN
- X-Content-Type-Options: nosniff
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy

### Rate Limiting Best Practices
- Use Redis for distributed rate limiting
- Implement exponential backoff
- Rate limit by IP and user ID
- Different limits for different endpoints
- Log rate limit violations
- Whitelist trusted IPs

## Key Files
- `artifacts/api-server/src/lib/encryption.ts` - Encryption utilities
- `artifacts/api-server/src/lib/cache.ts` - Cache helpers
- `artifacts/api-server/src/app.ts` - Security middleware
- `docs/security-posture.md` - Full threat model
- `docs/security.md` - Security scanning process

## References
- `AGENTS.md` - Security boundaries, PII handling rules

## Common Tasks

### Encrypting PII
```typescript
import { encryptPII, decryptPII } from '../lib/encryption';

// Encrypt
const encrypted = await encryptPII(sensitiveData);

// Decrypt (MANAGER only)
const decrypted = await decryptPII(encrypted);
```

### Adding CSRF Protection
CSRF is already configured in the middleware stack. For new endpoints:
- Ensure CSRF middleware is applied before route
- Include CSRF token in request headers
- Validate CSRF token on state-changing requests

### Implementing Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
});
```

### Adding Audit Log Entry
```typescript
import { createAuditLog } from '../services/audit';

await createAuditLog({
  userId,
  action: 'create',
  resourceType: 'client',
  resourceId: clientId,
  ipAddress,
  correlationId,
});
```

### Invalidating Cache
```typescript
import { invalidateCache } from '../lib/cache';

await invalidateCache('client', clientId);
```

## Security Checklist
- [ ] PII fields encrypted with envelope encryption
- [ ] CSRF protection applied to state-changing endpoints
- [ ] Rate limiting configured appropriately
- [ ] Security headers configured via Helmet
- [ ] CORS origin whitelist configured
- [ ] SQL injection prevention (parameterized queries)
- [ ] Audit log entry for resource mutations
- [ ] Cache invalidated after mutations
- [ ] No PII in logs or console output
- [ ] Supply chain security measures in place
