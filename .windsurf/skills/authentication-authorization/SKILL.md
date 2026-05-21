---
name: authentication-authorization
description: JWT-based authentication with refresh token rotation, timing-safe login, account lockout, and role-based access control
---

# Authentication & Authorization

This skill covers JWT-based authentication and authorization in the Spa-Flow repository with refresh token rotation, timing-safe login, account lockout, and role-based access control.

## Key Concepts

### JWT Access Token
- 15-minute expiration for security
- HttpOnly cookie storage (XSS protection)
- Signed with HS256 algorithm
- Contains userId and type ('access')
- Stored in environment variable: `JWT_SECRET` (minimum 32 characters)

### Refresh Token Rotation
- 7-day expiry for refresh tokens
- Rotation on every use (new token issued, old invalidated)
- Prevents token reuse attacks
- bcrypt hashed before storage
- Stored in `refresh_tokens` table
- Automatic rotation via AuthContext on frontend

### Timing-Safe Login
- Prevents user enumeration attacks
- Constant-time password comparison
- Same response time for valid/invalid credentials
- No early returns on failed login

### Account Lockout
- 5 failed login attempts trigger lockout
- 15-minute lockout duration
- Configurable via environment variables
- Tracks failed attempts in database
- MANAGER can unlock locked accounts

### Password Hashing
- bcryptjs 2.4.3 for password hashing
- Minimum 15 characters (NIST SP 800-63B Rev 4)
- Never store plaintext passwords
- Salt rounds: 10 (default)

### CSRF Protection
- Double-submit cookie pattern
- CSRF secret stored in environment (32-byte base64)
- SameSite=strict for cookies
- `/healthz` endpoints are exempt
- Validates CSRF token on state-changing requests

### Session Management
- Device tracking with user agent
- Session creation timestamps
- Active session listing
- Revoke all sessions or specific session
- Session revocation on logout

### Role-Based Access Control
- Two roles: STAFF and MANAGER
- STAFF: Standard operations
- MANAGER: Staff management, audit logs, reports
- Role stored in `users` table
- Authorization middleware checks role
- Return 403 Forbidden for unauthorized

### Audit Logging
- All auth events logged to `audit_logs`
- Includes userId, action, resource, ip, correlationId
- Login, logout, password reset events
- MANAGER-only audit log viewing

### Password Reset Flow
- Request reset via email (Resend)
- Token stored in `password_reset_tokens`
- 1-hour expiry for reset tokens
- Single-use tokens
- Email sent from configured address

### Session Revocation
- Revoke all sessions except current
- Revoke specific session by ID
- Automatic revocation on password change
- Manual revocation by user

## 2026 Best Practices

### Token Rotation Strategy
Based on 2026 token rotation best practices:

**Basic Refresh Token Rotation**
```typescript
// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Login: Generate both tokens
const accessToken = jwt.sign(
  { userId: user.id, type: 'access' },
  process.env.JWT_SECRET,
  { expiresIn: ACCESS_TOKEN_EXPIRY }
);

const refreshToken = jwt.sign(
  { userId: user.id, type: 'refresh', tokenId: crypto.randomUUID() },
  process.env.JWT_SECRET,
  { expiresIn: REFRESH_TOKEN_EXPIRY }
);

// Refresh: Invalidate old, issue new
refreshTokenStore.delete(oldRefreshToken);
const newRefreshToken = jwt.sign(/* ... */);
```

**Token Reuse Detection**
- Detect if refresh token is used twice
- Indicates potential token theft
- Invalidate all user sessions on reuse
- Force re-authentication

**Client-Side Rotation**
- Handle rotation errors gracefully
- Retry failed refresh attempts
- Clear tokens on rotation failure
- Redirect to login on failure

### Security Best Practices
- Short access token lifetime (15 min)
- Refresh token rotation on every use
- HttpOnly cookies for token storage
- SameSite=strict for CSRF protection
- Timing-safe operations
- NIST-compliant password requirements

## Key Files
- `artifacts/api-server/src/routes/auth.ts` - Auth endpoints
- `artifacts/api-server/src/lib/auth.ts` - Auth utilities
- `artifacts/spaflow/src/contexts/AuthContext.tsx` - Frontend auth context with JWT refresh
- `docs/auth-architecture.md` - Auth architecture docs

## References
- `AGENTS.md` - Security rules, auth modification guidelines
- `docs/security-posture.md` - Full threat model

## Common Tasks

### Implementing Auth in a Route
```typescript
import { authenticate } from '../lib/auth';

router.get('/protected', authenticate, (req, res) => {
  // req.user is available
});
```

### Adding Role-Based Access
```typescript
import { authorize } from '../lib/auth';

router.get('/manager-only', authenticate, authorize('MANAGER'), (req, res) => {
  // Only MANAGER role can access
});
```

### Password Reset Flow
1. User requests reset via email
2. Generate reset token (1-hour expiry)
3. Send email with reset link
4. User clicks link, enters new password
5. Validate token, update password
6. Invalidate all user sessions
7. Log audit event

## Security Considerations
- Never log JWT tokens
- Never expose refresh tokens to client JavaScript
- Always use HttpOnly cookies
- Validate CSRF on state-changing requests
- Implement rate limiting on auth endpoints
- Monitor for brute force attacks
