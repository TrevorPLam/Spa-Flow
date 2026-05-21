---
name: api-development
description: Building and maintaining REST API endpoints following OpenAPI 3.1.0 specification with Express.js middleware stack
---

# API Development (Express.js & OpenAPI)

This skill covers building and maintaining REST API endpoints in the Spa-Flow repository using Express.js with OpenAPI 3.1.0 specification.

## Key Concepts

### Route Handler Patterns
- All API routes live in `artifacts/api-server/src/routes/`
- Handlers must be **thin** - delegate business logic to `src/services/` or `src/lib/`
- Every route must be documented in the OpenAPI spec (`lib/api-spec/openapi.yaml`) **before** implementation
- After adding/modifying routes, regenerate the API client: `cd lib/api-spec && pnpm run codegen`

### 18-Layer Middleware Stack
The Express app has 18 middleware layers in `artifacts/api-server/src/app.ts`:
1. Request correlation ID generation
2. Request logging (Pino)
3. Body parsing (JSON)
4. URL encoding
5. Cookie parsing
6. CORS configuration
7. Helmet security headers
8. CSRF protection (double-submit pattern)
9. Rate limiting (general API)
10. Authentication middleware
11. Authorization middleware (role-based)
12. Request timeout
13. Response compression
14. Error handling (Express 5 auto-error handling)
15. Response formatting
16. Cache headers
17. Health check bypass
18. Route handlers

### CSRF Protection
- Double-submit cookie pattern implementation
- `/healthz` endpoints are CSRF-exempt
- CSRF secret stored in environment variable (32-byte base64)
- SameSite=strict for cookie security

### Rate Limiting Strategies
Different rate limits for different endpoints:
- **Login**: 5 attempts per 15 minutes
- **Check-in**: 10 attempts per 1 minute
- **General API**: 100 requests per 1 minute
- Configurable via environment variables

### Error Handling Patterns
- Express 5 auto-error handling catches thrown errors
- Use response formatters for consistent error responses
- Sanitize error messages (don't expose internal details)
- Log errors with correlation IDs
- Return appropriate HTTP status codes

### Request/Response Logging
- Pino structured logging for all requests
- Correlation ID tracking across request lifecycle
- Log user ID, email, IP address (for audit)
- Never log PII (dob, address, documentNumber)

### OpenAPI 3.1.0 as Single Source of Truth
- OpenAPI 3.1 adopted JSON Schema 2020-12
- Supports native JSON Schema validators
- Better polymorphism support with discriminators
- Webhooks documentation support
- Null types: `type: [string, null]` instead of `nullable: true`

### API Client Code Generation
- Orval generates type-safe React Query client from OpenAPI spec
- Configuration in `lib/api-spec/orval.config.ts`
- Generated client in `lib/api-client-react/` - **never edit by hand**
- Regenerate after API changes

### Zod Validation Schema Integration
- Zod schemas in `lib/api-zod/` for runtime validation
- Generated from OpenAPI spec
- Use for request/response validation
- Type-safe form validation on frontend

### Response Formatter Usage
- Use response formatters in `artifacts/api-server/src/lib/response-formatters.ts`
- Consistent response structure across all endpoints
- Standardized error format
- Success/error response helpers

### Authentication Middleware Integration
- JWT access token validation
- HttpOnly cookie storage
- 15-minute token expiry
- Automatic refresh via AuthContext on frontend

### Role-Based Access Control
- Two roles: STAFF and MANAGER
- MANAGER-only endpoints: users, audit-logs, reports
- Authorization middleware checks role
- Return 403 Forbidden for unauthorized access

## 2026 Best Practices

### OpenAPI 3.1 Updates
Based on 2026 REST API best practices:

**HTTP/3 Support**
- HTTP/3 is now standard with QUIC protocol
- Faster connections, better mobile performance
- Reduced latency with multiplexing
- Enable via Nginx configuration with `http3 on`

**Idempotency Keys**
- Prevent duplicate operations on retry
- Critical for payment and order APIs
- Store processed keys in Redis
- Return cached response on retry

**Modern API Design Patterns**
- Cursor-based pagination for large datasets
- Field selection for bandwidth optimization
- Standard filtering and sorting
- Rate limiting with standard headers

### Security Best Practices
- OAuth 2.1 and PKCE for external integrations
- API keys with scopes for third-party access
- Input validation with JSON Schema
- Always validate at the boundary

## Key Files
- `artifacts/api-server/src/app.ts` - Middleware stack
- `artifacts/api-server/src/routes/*.ts` - All route handlers
- `lib/api-spec/openapi.yaml` - API specification
- `artifacts/api-server/src/lib/response-formatters.ts` - Response utilities
- `artifacts/api-server/src/services/` - Business logic
- `artifacts/api-server/src/lib/` - Reusable utilities

## References
- `AGENTS.md` - Route handler rules, API workflow
- `docs/error-handling.md` - Error handling strategy
- `docs/contract-testing.md` - Contract testing approach
- `docs/api-changelog.md` - API version history

## Common Tasks

### Adding a New API Endpoint
1. Update `lib/api-spec/openapi.yaml` with new endpoint
2. Run `cd lib/api-spec && pnpm run codegen` to regenerate client
3. Add Zod schemas in `lib/api-zod/` if shapes changed
4. Implement thin route in `artifacts/api-server/src/routes/`
5. Delegate business logic to `src/services/` or `src/lib/`
6. Add integration test + Zod validation test
7. Run `pnpm -r run typecheck && pnpm run lint && pnpm -r run test:coverage`

### Modifying an Existing Endpoint
1. Update OpenAPI spec
2. Regenerate API client
3. Update route handler
4. Update tests
5. Run full test suite

### Error Response Format
Use response formatters for consistency:
```typescript
// Success response
res.json(successResponse(data, "Operation successful"));

// Error response
res.json(errorResponse("Error message", 400));
```

## API Versioning
- All endpoints prefixed with `/api/v1`
- Current API version: 1.0.0
- Breaking changes require version bump
- Document breaking changes in `docs/api-changelog.md`
