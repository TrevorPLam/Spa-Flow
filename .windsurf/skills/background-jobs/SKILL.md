---
name: background-jobs
description: Implementing cron jobs for session expiration, waitlist management, and cache statistics
---

# Background Jobs & Scheduling

This skill covers implementing cron jobs in the Spa-Flow repository for session expiration, waitlist management, and cache statistics.

## Key Concepts

### Cron Job Configuration
- Runs every 5 minutes for sessions/waitlist
- Runs every hour for cache statistics
- Configured in `artifacts/api-server/src/jobs/cron.ts`
- Uses node-cron for scheduling
- Runs in background process

### Rental Session Expiration
- Checks for expired rental sessions
- Updates session status to 'expired'
- Releases associated lockers/rooms
- Sets resource status to 'available'
- Logs expiration events
- Runs every 5 minutes

### Waitlist Assignment Expiration
- Checks for expired waitlist assignments
- Updates assignment status to 'expired'
- Automatic room reassignment on expiration
- Moves next waitlist entry to assigned
- SMS notification for new assignment
- Runs every 5 minutes

### Automatic Room Reassignment
- On waitlist confirmation expiration
- Assigns room to next waitlist entry
- 15-minute confirmation window
- SMS notification via Twilio
- Updates waitlist position
- Atomic operations with SELECT FOR UPDATE

### Cache Statistics Logging
- Logs cache hit/miss rates
- Tracks cache memory usage
- Monitors key count
- Runs every hour
- Identifies optimization opportunities
- Logs to structured logger

### Job Failure Handling
- Catch and log job errors
- Continue other jobs on failure
- Alert on repeated failures
- Job-specific error handling
- Correlation ID for tracing
- Audit log for job failures

### Atomic Operations with SELECT FOR UPDATE
- Prevents race conditions
- Locks rows during update
- Used in waitlist reassignment
- Used in session expiration
- Only intentional raw SQL in codebase
- Located in `lib/db/src/rooms.ts`

### Job Scheduling Patterns
- Cron expressions for timing
- Timezone configuration
- Job overlap prevention
- Job timeout handling
- Graceful shutdown support

## Key Files
- `artifacts/api-server/src/jobs/cron.ts` - Cron job definitions
- `artifacts/api-server/src/routes/rooms.ts` - Waitlist assignment logic

## References
- `AGENTS.md` - Background job rules

## Common Tasks

### Setting Up a Cron Job
```typescript
import cron from 'node-cron';

cron.schedule('*/5 * * * *', async () => {
  try {
    await expireRentalSessions();
  } catch (error) {
    logger.error('Job failed', { error, correlationId });
  }
});
```

### Expiring Rental Sessions
```typescript
async function expireRentalSessions() {
  const expiredSessions = await db.query.rentalSessions.findMany({
    where: and(
      eq(rentalSessions.status, 'active'),
      lt(rentalSessions.expiresAt, new Date())
    )
  });

  for (const session of expiredSessions) {
    await db.update(rentalSessions)
      .set({ status: 'expired' })
      .where(eq(rentalSessions.id, session.id));
    
    // Release associated resource
    await releaseResource(session);
  }
}
```

### Waitlist Reassignment
```typescript
async function reassignWaitlist() {
  const nextEntry = await db.query.waitlistEntries.findFirst({
    where: eq(waitlistEntries.status, 'waiting'),
    orderBy: asc(waitlistEntries.position)
  });

  if (nextEntry) {
    await assignRoomToWaitlist(nextEntry);
    await sendSMSNotification(nextEntry);
  }
}
```

### Atomic Operation with SELECT FOR UPDATE
```typescript
// This is the only intentional raw SQL in the codebase
const result = await db.execute(sql`
  SELECT * FROM rooms 
  WHERE id = ${roomId} 
  FOR UPDATE
`);
```

## Best Practices
- Handle errors gracefully
- Log all job executions
- Use atomic operations for consistency
- Implement job timeouts
- Monitor job health
- Use SELECT FOR UPDATE for critical sections
