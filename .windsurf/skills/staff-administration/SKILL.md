---
name: staff-administration
description: Managing staff users with role-based access control, account unlocking, and session management
---

# Staff Administration

This skill covers managing staff users in the Spa-Flow repository with role-based access control, account unlocking, and session management.

## Key Concepts

### Staff User CRUD Operations (MANAGER Only)
- Create staff users (MANAGER only)
- Update staff users (MANAGER only)
- Delete staff users (MANAGER only)
- List staff users (MANAGER only)
- Role assignment (MANAGER only)

### Role Assignment
- Two roles: STAFF and MANAGER
- STAFF: Standard operations
- MANAGER: Staff management, audit logs, reports
- Role stored in `users` table
- Authorization middleware checks role

### Account Unlock for Locked Users
- MANAGER can unlock locked accounts
- Clears failed login attempts
- Resets lockout timestamp
- Audit log entry for unlock
- User notified of unlock

### Session Viewing and Revocation
- List active sessions for current user
- Revoke all sessions except current
- Revoke specific session by ID
- Session tracking with device info
- Last login timestamps

### Audit Log Viewing (MANAGER Only)
- MANAGER-only access to audit logs
- Filter by action, user, resource
- Pagination support
- Correlation ID tracking
- IP address logging

### Staff Authentication Flow
- JWT-based authentication
- 15-minute access token
- Refresh token rotation
- Timing-safe login
- Account lockout on failures

### Failed Login Attempt Tracking
- Tracks failed attempts per user
- Locks after 5 failed attempts
- 15-minute lockout duration
- Configurable via environment variables
- Reset on successful login or unlock

### Account Lockout Management
- Automatic lockout after threshold
- Configurable threshold and duration
- MANAGER can unlock accounts
- Audit log for lockout events
- User notified of lockout

## Key Files
- `artifacts/api-server/src/routes/users.ts` - Staff endpoints
- `artifacts/api-server/src/routes/audit.ts` - Audit log endpoints
- `artifacts/spaflow/src/pages/users.tsx` - Staff UI

## References
- `README.md` - Staff administration features
- `AGENTS.md` - MANAGER-only endpoints

## Common Tasks

### Creating a Staff User (MANAGER Only)
```typescript
await db.insert(users).values({
  email,
  passwordHash: await bcrypt.hash(password, 10),
  role: 'STAFF',
  failedLoginAttempts: 0,
  lockedUntil: null,
});
```

### Unlocking a User Account (MANAGER Only)
```typescript
await db.update(users)
  .set({
    failedLoginAttempts: 0,
    lockedUntil: null
  })
  .where(eq(users.id, userId));

// Audit log entry created automatically
```

### Revoking All Sessions
```typescript
await db.delete(refreshTokens)
  .where(eq(refreshTokens.userId, userId));
```

### Viewing Audit Logs (MANAGER Only)
```typescript
const logs = await db.query.auditLogs.findMany({
  where: and(
    userId ? eq(auditLogs.userId, userId) : undefined,
    action ? eq(auditLogs.action, action) : undefined
  ),
  orderBy: desc(auditLogs.createdAt),
  limit: 50,
  offset: (page - 1) * 50
});
```

## Best Practices
- Always use role-based access control
- Log all staff management actions
- Use timing-safe login operations
- Implement account lockout
- MANAGER-only for sensitive operations
