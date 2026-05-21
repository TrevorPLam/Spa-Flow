---
name: error-handling-observability
description: Implementing structured logging, error tracking, and observability across the application
---

# Error Handling & Observability

This skill covers implementing structured logging, error tracking, and observability in the Spa-Flow repository.

## Key Concepts

### Pino Structured Logging
- Pino 9.14.0 for structured logging
- JSON log format for machine parsing
- Log levels: info, warn, error
- Contextual logging with correlation IDs
- Request/response logging
- Performance logging

### Sentry Error Tracking
- Sentry 10.53.1 for error tracking
- Environment variable: `SENTRY_DSN`
- Context capture: user, request, correlation ID
- Error grouping and alerting
- Performance monitoring
- Release tracking

### Request Correlation ID Tracking
- Unique ID per request
- Propagated across services
- Included in all logs
- Traces request lifecycle
- Debugging and troubleshooting
- Audit trail correlation

### Global Error Handler
- Express 5 auto-error handling
- Catches unhandled errors
- Logs error with context
- Returns user-friendly error messages
- Sanitizes error details
- Prevents information leakage

### Transaction Error Logging Pattern
- Log transaction start
- Log transaction success/failure
- Include correlation ID
- Include user context
- Include timing information
- Structured error data

### Error Response Formatting
- Consistent error response format
- Sanitized error messages
- HTTP status code selection
- Error codes for client handling
- User-friendly messages
- Debug info in development only

### User-Friendly Error Messages
- Sanitize internal errors
- Generic messages for security
- Specific messages for validation
- Actionable error messages
- Localized messages (future)
- Avoid technical jargon

### HTTP Status Code Selection
- 400: Bad request (validation)
- 401: Unauthorized (auth)
- 403: Forbidden (authorization)
- 404: Not found
- 409: Conflict (duplicate)
- 422: Unprocessable entity
- 500: Internal server error

### Error Context Capture
- User ID and email
- Request details
- Correlation ID
- Stack traces (development)
- Relevant data
- Timestamp

### Log Level Usage
- `info`: Normal operations
- `warn`: Deprecated usage, potential issues
- `error`: Errors that need attention
- Fatal errors should alert
- Consistent level usage
- Avoid over-logging

## Key Files
- `artifacts/api-server/src/lib/logger.ts` - Logging utilities
- `artifacts/api-server/src/lib/response-formatters.ts` - Error formatters
- `artifacts/api-server/src/app.ts` - Global error handler
- `docs/error-handling.md` - Error handling strategy

## References
- `AGENTS.md` - Error handling rules
- TODO.md TASK-007 - Error handling standardization

## Common Tasks

### Structured Logging
```typescript
import logger from '../lib/logger';

logger.info('User logged in', { 
  userId, 
  email, 
  correlationId 
});

logger.error('Payment failed', { 
  error: error.message, 
  userId, 
  correlationId 
});
```

### Sentry Error Reporting
```typescript
import * as Sentry from '@sentry/node';

Sentry.captureException(error, {
  user: { id: userId, email },
  tags: { correlationId },
  extra: { context: additionalContext }
});
```

### Error Response Format
```typescript
import { errorResponse } from '../lib/response-formatters';

res.status(400).json(errorResponse(
  'Validation failed',
  'INVALID_INPUT',
  { field: 'email', message: 'Invalid email format' }
));
```

### Correlation ID Middleware
```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});
```

## Best Practices
- Always use correlation IDs
- Log at appropriate levels
- Sanitize error messages
- Capture relevant context
- Use structured logging
- Monitor error rates
- Set up alerts for critical errors
