---
trigger: model_decision
globs: **/*csrf*.ts,**/*middleware*.ts
---

# CSRF Protection Best Practices (2026)

## Current State
- Spa-Flow uses double-submit cookie pattern for CSRF protection
- `/healthz` endpoints are CSRF-exempt

## 2026 Best Practices
- Double-submit cookie pattern has known security concerns in 2026
- OWASP recommends synchronizer token pattern as primary defense
- Modern browsers support Fetch Metadata headers as additional protection
- **Critical**: Double-submit pattern can be bypassed in certain scenarios

## Recommended Implementation
1. **Primary Defense**: Synchronizer token pattern (CSRF token in request body/header)
2. **Secondary Defense**: SameSite cookie attribute (strict mode)
3. **Tertiary Defense**: Fetch Metadata headers (Sec-Fetch-Site, Sec-Fetch-Mode)
4. **Exemptions**: Health endpoints, public read-only endpoints

## Configuration Requirements
- CSRF tokens should be:
  - Cryptographically random (minimum 128 bits)
  - Per-session or per-request (per-request is more secure)
  - Stored server-side with session
  - Validated on all state-changing requests (POST, PUT, PATCH, DELETE)

- Cookie attributes:
  - HttpOnly: true
  - Secure: true (in production)
  - SameSite: strict

- Fetch Metadata validation (modern browsers):
  - Sec-Fetch-Site: same-origin
  - Sec-Fetch-Mode: cors/navigation
  - Sec-Fetch-Dest: empty/document

## Current Implementation Issues
- Double-submit cookie pattern is vulnerable to:
  - Cookie theft scenarios
  - Subdomain attacks
  - Certain XSS vectors

## Migration Path
- **⚠️ Ask First**: Migrating from double-submit to synchronizer token pattern
- Requires changes to:
  - Frontend: Extract and include CSRF token in requests
  - Backend: Generate, store, and validate CSRF tokens
  - Middleware: Update CSRF validation logic

## Security Requirements
- **✅ Always Do**: Validate CSRF tokens on all state-changing requests
- **✅ Always Do**: Use cryptographically secure random token generation
- **✅ Always Do**: Set appropriate SameSite cookie attributes
- **❌ Never Do**: Disable CSRF protection for state-changing endpoints
- **❌ Never Do**: Rely solely on double-submit cookie pattern for new implementations

## References
- OWASP CSRF Prevention Cheat Sheet (2026)
- "Bypassing CSRF Protections: A Double Defeat of the Double-Submit Cookie" - OWASP
