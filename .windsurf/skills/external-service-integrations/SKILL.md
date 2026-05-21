---
name: external-service-integrations
description: Integrating with third-party services including Twilio (SMS), Redis (caching), Sentry (error tracking), and Resend (email)
---

# External Service Integrations

This skill covers integrating with third-party services in the Spa-Flow repository including Twilio (SMS), Redis (caching), Sentry (error tracking), and Resend (email).

## Key Concepts

### Twilio SMS Integration
- Twilio 6.0.2 for SMS notifications
- Waitlist notifications via SMS
- Environment variables:
  - `TWILIO_ACCOUNT_SID` - Twilio account SID
  - `TWILIO_AUTH_TOKEN` - Twilio auth token
  - `TWILIO_PHONE_NUMBER` - Twilio phone number
- Used in room assignment notifications
- Error handling for failed SMS
- Rate limiting for SMS sending

### Redis Caching
- Redis 5.12.1 for caching
- Environment variable: `REDIS_URL`
- Caching strategies:
  - Client search results (1 min TTL)
  - Client details (5 min TTL)
  - Dashboard data (5 min TTL)
  - Occupancy data (1 min TTL)
- Cache key patterns defined in `lib/cache.ts`
- Cache invalidation after resource mutations
- Graceful degradation when Redis unavailable

### Cache Key Patterns
- `client:search:{query}` - Search results
- `client:{id}` - Client details
- `dashboard:summary` - Dashboard data
- `lockers:occupancy` - Locker occupancy
- `rooms:occupancy` - Room occupancy
- Consistent naming convention
- Include relevant parameters in key

### TTL Configuration
- Search results: 1 minute
- Client details: 5 minutes
- Dashboard data: 5 minutes
- Occupancy data: 1 minute
- Configurable per cache type
- Balance between freshness and performance

### Cache Invalidation
- Invalidate after resource mutations
- Use cache helper functions
- Invalidate specific keys or patterns
- Prevents stale data serving
- Required for clients, lockers, rooms, transactions

### Sentry Error Tracking
- Sentry 10.53.1 for error tracking
- Environment variable: `SENTRY_DSN`
- Context capture: user, request, correlation ID
- Error grouping and alerting
- Performance monitoring
- Release tracking

### Resend Email Integration
- Resend for email sending
- Environment variables:
  - `RESEND_API_KEY` - Resend API key
  - `EMAIL_FROM_ADDRESS` - From email address
- Password reset emails
- Email templates
- Error handling for failed emails
- Rate limiting for email sending

### Service Health Checks
- Readiness probe checks all services
- Database connectivity
- Redis connectivity
- Square API health
- Twilio API health
- Service-specific timeout configuration

### Graceful Degradation
- Application works when services unavailable
- Fallback to database when Redis down
- Continue operation when SMS fails
- Log service failures
- Circuit breaker pattern for external APIs

### API Rate Limiting
- Respect external API rate limits
- Implement retry with exponential backoff
- Queue requests when rate limited
- Monitor rate limit usage
- Alert on rate limit breaches

### Service-Specific Configuration
- Each service has environment variables
- Sandbox vs production environments
- API version configuration
- Timeout configuration per service
- Retry configuration per service

## Key Files
- `artifacts/api-server/src/routes/rooms.ts` - Twilio SMS
- `artifacts/api-server/src/lib/cache.ts` - Redis helpers
- `artifacts/api-server/src/lib/logger.ts` - Sentry integration
- `artifacts/api-server/src/routes/auth.ts` - Resend email

## References
- `README.md` - Third-party service environment variables
- `.env.example` - Service configuration

## Common Tasks

### Sending SMS with Twilio
```typescript
import twilio from 'twilio';

const client = twilio(accountSid, authToken);
await client.messages.create({
  body: 'Your room is ready!',
  to: phoneNumber,
  from: twilioPhoneNumber
});
```

### Caching with Redis
```typescript
import { cacheGet, cacheSet } from '../lib/cache';

// Set cache
await cacheSet('client:123', clientData, 300); // 5 min TTL

// Get cache
const cached = await cacheGet('client:123');
if (cached) return cached;
```

### Invalidating Cache
```typescript
import { invalidateCache } from '../lib/cache';

await invalidateCache('client', clientId);
```

### Sending Email with Resend
```typescript
import { Resend } from 'resend';

const resend = new Resend(apiKey);
await resend.emails.send({
  from: fromAddress,
  to: userEmail,
  subject: 'Password Reset',
  html: emailTemplate
});
```

### Sentry Error Reporting
```typescript
import * as Sentry from '@sentry/node';

Sentry.captureException(error, {
  user: { id: userId },
  tags: { correlationId },
  extra: { context }
});
```

## Security Considerations
- Never log API keys or tokens
- Use environment variables for secrets
- Rotate API keys regularly
- Monitor for API abuse
- Implement IP whitelisting where applicable
