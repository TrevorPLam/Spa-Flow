---
trigger: glob
globs: artifacts/api-server/src/**/*.ts
---

# Express 5 Error Handling Best Practices (2026)

## Current State
- Spa-Flow uses Express.js 5.2.1
- Route handlers use async/await patterns

## 2026 Best Practices
- **Critical**: Express 5 auto-handles async errors - no need for try-catch in most cases
- Route handlers returning rejected Promises automatically call `next(error)`
- Simplifies error handling significantly compared to Express 4

## Error Handling Patterns

### Route Handlers (Express 5)
```typescript
// ✅ Good: Express 5 auto-handles async errors
app.get('/api/users', async (req, res) => {
  const users = await getUsers(); // If this throws, Express 5 catches it
  res.json(users);
});

// ❌ Bad: Unnecessary try-catch (Express 5 handles this)
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    next(error); // Not needed in Express 5
  }
});
```

### When to Use Try-Catch
```typescript
// ✅ Good: Try-catch for database transactions (need rollback)
app.post('/api/users', async (req, res, next) => {
  try {
    await db.transaction(async (tx) => {
      const user = await tx.insert(users).values(req.body);
      // If this throws, transaction auto-rolls back
      await tx.insert(profiles).values({ userId: user.id });
    });
    res.json({ success: true });
  } catch (error) {
    // Custom error handling for transaction-specific errors
    if (error instanceof ConstraintViolationError) {
      res.status(409).json({ error: 'User already exists' });
    } else {
      next(error);
    }
  }
});

// ✅ Good: Try-catch for specific error scenarios
app.post('/api/upload', async (req, res, next) => {
  try {
    const file = await processUpload(req.file);
    res.json({ url: file.url });
  } catch (error) {
    if (error instanceof FileTooLargeError) {
      res.status(413).json({ error: 'File too large' });
    } else {
      next(error);
    }
  }
});
```

### Error Middleware (Must Be Last)
```typescript
// ✅ Good: Error middleware registered last
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(routes);
// ... all other middleware
app.use(errorHandler); // Must be last

// ❌ Bad: Error middleware registered early
app.use(errorHandler); // Won't catch errors from routes defined after
app.use(routes);
```

## Error Handling Requirements
- **✅ Always Do**: Let Express 5 handle async errors automatically
- **✅ Always Do**: Use try-catch only for:
  - Database transactions (need rollback)
  - Specific error scenarios (custom error responses)
  - Non-async operations that might throw
- **✅ Always Do**: Register error middleware last
- **✅ Always Do**: Log errors with request context
- **✅ Always Do**: Return appropriate HTTP status codes
- **✅ Always Do**: Sanitize error messages for users (don't leak internals)
- **❌ Never Do**: Wrap entire route handlers in try-catch (unnecessary in Express 5)
- **❌ Never Do**: Throw errors without catching (Express 5 catches, but better to be explicit)

## Error Response Format
```typescript
// ✅ Good: Structured error response
res.status(400).json({
  error: 'Validation error',
  details: validationErrors,
  requestId: req.id
});

// ❌ Bad: Leaking internal errors
res.status(500).json({
  error: error.message, // May leak sensitive info
  stack: error.stack   // Never expose stack traces
});
```

## Logging
- **✅ Always Do**: Log errors with correlation ID
- **✅ Always Do**: Log error context (user ID, request ID, IP address)
- **✅ Always Do**: Use structured logging (Pino)
- **❌ Never Do**: Log PII in error messages
- **❌ Never Do**: Log stack traces in production (use Sentry for this)

## References
- Express.js Error Handling Guide (2026)
- "Error Handling in Express 5" - Medium (2026)
- "Express Error Handling Patterns" - Better Stack Community
