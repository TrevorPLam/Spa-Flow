---
trigger: glob
globs: artifacts/api-server/src/**/*auth*.ts
---

# JWT Authentication Best Practices (2026)

## Current State
- Spa-Flow uses JWT with jose 6.2.3
- Access token: HS256, 15 minutes, HttpOnly cookie
- Refresh token: bcrypt hashed, 7 days, rotation on every use
- Timing-safe login to prevent user enumeration

## 2026 Best Practices
- **Confirmed**: Current implementation aligns with 2026 best practices
- Refresh token rotation is explicitly recommended by Okta and Auth0
- Short-lived access tokens (15min) are standard
- HttpOnly cookies prevent XSS token theft
- Timing-safe login prevents user enumeration attacks

## Access Token Configuration
```typescript
// ✅ Good: Current configuration
{
  algorithm: 'HS256',
  expiresIn: '15m',
  issuer: 'spa-flow',
  audience: 'spa-flow-api'
}
```

### Access Token Requirements
- **✅ Always Do**: Use short expiration (15min or less)
- **✅ Always Do**: Use HttpOnly cookie (prevents XSS access)
- **✅ Always Do**: Use SameSite=strict (prevents CSRF)
- **✅ Always Do**: Use Secure flag in production (HTTPS only)
- **✅ Always Do**: Include issuer and audience claims
- **❌ Never Do**: Store access token in localStorage (vulnerable to XSS)
- **❌ Never Do**: Use long-lived access tokens (>1 hour)
- **❌ Never Do**: Expose access token in JavaScript

## Refresh Token Configuration
```typescript
// ✅ Good: Current configuration
{
  algorithm: 'bcrypt',
  expiresIn: '7d',
  rotation: true,  // Rotate on every use
  storage: 'database'  // Store in database, not localStorage
}
```

### Refresh Token Requirements
- **✅ Always Do**: Rotate refresh token on every use
- **✅ Always Do**: Store refresh tokens in database (not localStorage)
- **✅ Always Do**: Hash refresh tokens with bcrypt (never store plain)
- **✅ Always Do**: Implement refresh token family tracking (detect token reuse)
- **✅ Always Do**: Invalidate refresh token family on reuse attack detection
- **✅ Always Do**: Use absolute expiration (7 days max recommended)
- **❌ Never Do**: Store refresh tokens in localStorage
- **❌ Never Do**: Use non-rotating refresh tokens
- **❌ Never Do**: Store refresh tokens in plain text
- **❌ Never Do**: Use refresh tokens longer than 30 days

## Refresh Token Rotation
```typescript
// ✅ Good: Refresh token rotation
async function refreshToken(oldRefreshToken: string) {
  // Hash and verify old token
  const hashed = bcrypt.hash(oldRefreshToken, 10);
  const token = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.token, hashed)
  });
  
  if (!token) {
    throw new Error('Invalid refresh token');
  }
  
  // Detect reuse attack
  if (token.used) {
    // Invalidate entire token family
    await db.delete(refreshTokens).where(
      eq(refreshTokens.familyId, token.familyId)
    );
    throw new Error('Refresh token reused');
  }
  
  // Mark as used
  await db.update(refreshTokens)
    .set({ used: true })
    .where(eq(refreshTokens.id, token.id));
  
  // Generate new refresh token
  const newRefreshToken = generateRefreshToken();
  await db.insert(refreshTokens).values({
    token: bcrypt.hash(newRefreshToken, 10),
    familyId: token.familyId,
    userId: token.userId
  });
  
  // Generate new access token
  const accessToken = generateAccessToken(token.userId);
  
  return { accessToken, refreshToken: newRefreshToken };
}
```

## Timing-Safe Login
```typescript
// ✅ Good: Timing-safe login prevents user enumeration
async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });
  
  // Always hash password to prevent timing attacks
  const passwordMatch = user 
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
  
  if (!passwordMatch) {
    // Increment failed attempts (even if user doesn't exist)
    await incrementFailedAttempts(email);
    throw new Error('Invalid credentials');
  }
  
  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error('Account locked');
  }
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);
  
  return { accessToken, refreshToken };
}
```

## Account Lockout
- **✅ Always Do**: Lock account after 5 failed attempts
- **✅ Always Do**: Lock for 15 minutes (900000ms)
- **✅ Always Do**: Reset failed attempts on successful login
- **✅ Always Do**: Implement exponential backoff for repeated lockouts
- **❌ Never Do**: Reveal whether email exists in error messages

## JWT Secret Management
- **✅ Always Do**: Use minimum 32-character secret
- **✅ Always Do**: Rotate secrets regularly (every 90 days recommended)
- **✅ Always Do**: Use different secrets for dev/staging/production
- **✅ Always Do**: Store secrets in environment variables
- **❌ Never Do**: Commit secrets to repository
- **❌ Never Do**: Use weak secrets (password123, etc.)
- **❌ Never Do**: Share secrets across environments

## Token Storage
- **✅ Always Do**: Store access token in HttpOnly cookie
- **✅ Always Do**: Store refresh token in database (hashed)
- **✅ Always Do**: Use SameSite=strict for CSRF protection
- **❌ Never Do**: Store tokens in localStorage
- **❌ Never Do**: Store tokens in sessionStorage
- **❌ Never Do**: Expose tokens in JavaScript

## References
- Okta Refresh Token Documentation (2026)
- Auth0 Token Best Practices (2026)
- "Refresh Token Rotation: Best Practices for Developers" - Serverion
- OWASP JWT Cheat Sheet
