# Error Handling Strategy

## Overview

This document describes the error handling strategy for the Spa-Flow API server, which uses Express 5.2.1 with TypeScript.

## Architecture

### Global Error Handler

The application uses a global error-handling middleware defined in `app.ts` (lines 259-268):

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  
  // Send error to Sentry if initialized
  if (isSentryInitialized()) {
    Sentry.captureException(err);
  }
  
  res.status(500).json({ error: "Internal server error" });
});
```

This middleware:
- Catches all unhandled errors from routes
- Logs errors with structured logging (Pino)
- Sends errors to Sentry for production monitoring
- Returns a generic 500 error message to avoid exposing sensitive information

### Express 5 Async Error Handling

**Important**: Express 5 automatically handles async errors. When an async route handler throws an error or a promise rejects, Express automatically passes it to the error-handling middleware.

**Do NOT wrap entire route handlers in try-catch blocks** - this is unnecessary in Express 5 and adds boilerplate.

### When to Use Try-Catch

Use try-catch only in these specific scenarios:

1. **Database Transactions**: When using `db.transaction()`, wrap the transaction logic in try-catch to handle transaction-specific errors
2. **Dynamic Imports**: When using `await import()`, wrap in try-catch to handle module load failures (see TASK-017)
3. **Specific Error Handling**: When you need to handle specific error types differently (e.g., validation errors vs. database errors)
4. **Non-Async Operations**: When performing synchronous operations that might throw

Example of proper transaction error handling:

```typescript
try {
  const result = await db.transaction(async (tx) => {
    // Transaction logic
  });
} catch (error) {
  logTransactionError("operation name", error, { context });
  throw error; // Re-throw to let global handler handle response
}
```

### Structured Logging

The application uses Pino for structured logging. Two logging utilities are available:

#### 1. logger (global instance)

Used for general logging:

```typescript
import { logger } from "../lib/logger";

logger.error({ err, context }, "Error message");
logger.info({ context }, "Info message");
logger.warn({ context }, "Warning message");
```

#### 2. logTransactionError (transaction-specific)

Used for database transaction errors with operation context:

```typescript
import { logTransactionError } from "../lib/logger";

logTransactionError("client update", error, { clientId: params.data.id });
```

This function logs:
- Error type as "transaction_error"
- Operation name
- Error details (name, message, stack)
- Additional context object

### Error Response Format

The application uses a consistent error response format:

```json
{
  "error": "Error message"
}
```

For authentication errors, use the custom error response helper:

```typescript
import { createAuthErrorResponse, AuthErrorCodes } from "../lib/authErrors";

res.status(401).json(createAuthErrorResponse(AuthErrorCodes.INVALID_CREDENTIALS));
```

### HTTP Status Codes

Use appropriate HTTP status codes:

- `400` - Bad Request (validation errors, invalid input)
- `401` - Unauthorized (authentication failures)
- `403` - Forbidden (authorization failures)
- `404` - Not Found (resource not found)
- `409` - Conflict (resource conflicts, duplicate data)
- `415` - Unsupported Media Type (invalid Content-Type)
- `500` - Internal Server Error (unexpected errors)
- `504` - Gateway Timeout (request timeout)

### Custom Error Classes

The application uses custom error classes for specific error types:

#### Authentication Errors

```typescript
import { createAuthErrorResponse, AuthErrorCodes } from "../lib/authErrors";

// Available error codes:
// - INVALID_CREDENTIALS
// - ACCOUNT_LOCKED
// - INVALID_TOKEN
// - TOKEN_EXPIRED
// - INTERNAL_SERVER_ERROR
```

#### Business Logic Errors

For business logic errors (e.g., locker not available), throw errors with specific messages and handle them in route handlers:

```typescript
if (!locker) {
  throw new Error("LOCKER_NOT_FOUND");
}
```

Then catch and handle:

```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof Error && error.message === "LOCKER_NOT_FOUND") {
    res.status(404).json({ error: "Locker not found" });
    return;
  }
  logTransactionError("operation", error, context);
  throw error;
}
```

## Route Error Handling Patterns

### Pattern 1: Simple Route (No Try-Catch Needed)

For simple routes without transactions or special error handling:

```typescript
router.get("/clients", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Route logic - Express 5 auto-handles async errors
  const clients = await db.select().from(clientsTable);
  res.json(clients);
});
```

### Pattern 2: Database Transaction

For routes using database transactions:

```typescript
router.post("/clients/:id", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let client;
  try {
    client = await db.transaction(async (tx) => {
      const [updated] = await tx.update(clientsTable)
        .set(parsed.data)
        .where(eq(clientsTable.id, params.data.id))
        .returning();
      if (!updated) {
        throw new Error("Client not found");
      }
      return updated;
    });
  } catch (error) {
    logTransactionError("client update", error, { clientId: params.data.id });
    throw error; // Re-throw for global handler
  }

  res.json(client);
});
```

### Pattern 3: Business Logic Error Handling

For routes with business logic error conditions:

```typescript
router.post("/lockers/:id/assign", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = AssignLockerParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let session;
  try {
    session = await db.transaction(async (tx) => {
      // Transaction logic
      if (!locker) {
        throw new Error("LOCKER_NOT_FOUND");
      }
      if (locker.status !== "available") {
        throw new Error("LOCKER_NOT_AVAILABLE");
      }
      // ... more logic
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "LOCKER_NOT_FOUND") {
        res.status(404).json({ error: "Locker not found" });
        return;
      }
      if (error.message === "LOCKER_NOT_AVAILABLE") {
        res.status(409).json({ error: "Locker is not available" });
        return;
      }
    }
    logTransactionError("locker assignment", error, { lockerId: params.data.id });
    throw error;
  }

  res.json(session);
});
```

### Pattern 4: Authentication Routes

Authentication routes use custom error responses:

```typescript
router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const loginResult = await timingSafeLogin(email, password);

  if (!loginResult.success) {
    res.status(401).json(createAuthErrorResponse(AuthErrorCodes.INVALID_CREDENTIALS));
    return;
  }

  // ... success logic
});
```

## Best Practices

1. **Use Express 5 auto-error handling**: Don't wrap entire route handlers in try-catch
2. **Use try-catch for transactions**: Wrap `db.transaction()` calls in try-catch
3. **Log transaction errors**: Use `logTransactionError` for database operations
4. **Use appropriate status codes**: Match HTTP status codes to error types
5. **Sanitize error messages**: Don't expose stack traces or sensitive data to clients
6. **Use custom error classes**: Create specific error classes for different error types
7. **Re-throw after logging**: After logging transaction errors, re-throw to let global handler respond
8. **Validate input early**: Validate request parameters/body before processing
9. **Use Zod for validation**: Leverage Zod schemas for request validation
10. **Handle specific errors**: Catch specific error types for custom responses

## Anti-Patterns

1. **Wrapping entire routes in try-catch**: Unnecessary in Express 5
2. **Silent error swallowing**: Always log or re-throw errors
3. **Exposing stack traces**: Never send stack traces to clients
4. **Inconsistent error formats**: Use consistent `{ error: "message" }` format
5. **Wrong status codes**: Use appropriate HTTP status codes
6. **Missing context in logs**: Always include relevant context when logging errors
7. **Not re-throwing after logging**: Re-throw errors after logging to let global handler respond

## Testing Error Handling

When testing error scenarios:

1. Test validation errors with invalid input
2. Test authentication errors with invalid credentials
3. Test authorization errors with insufficient permissions
4. Test not found errors with non-existent resources
5. Test conflict errors with duplicate data
6. Test transaction errors with database failures
7. Verify error responses have correct status codes
8. Verify error messages are user-friendly
9. Verify errors are logged with context
10. Verify stack traces are not exposed to clients

## References

- [Express.js Error Handling Guide](https://expressjs.com/en/guide/error-handling/)
- [Better Stack: Express Error Handling Patterns](https://betterstack.com/community/guides/scaling-nodejs/error-handling-express/)
- [Pino Documentation](https://getpino.io/)
- [Sentry Documentation](https://docs.sentry.io/)
