---
name: waitlist-management
description: Managing the room waitlist system with automatic assignment, SMS notifications, and confirmation windows
---

# Waitlist Management

This skill covers managing the room waitlist system in the Spa-Flow repository with automatic assignment, SMS notifications, and confirmation windows.

## Key Concepts

### Waitlist Entry Creation
- Add client to waitlist when rooms are fully occupied
- Auto-generated position based on queue
- Status transitions: waiting -> assigned -> confirmed -> expired
- Stores client ID, timestamp, position
- Triggers automatic room assignment when available

### 15-Minute Confirmation Window
- 15-minute window to confirm room assignment
- Countdown starts on assignment
- Automatic expiration on timeout
- Reassignment to next waitlist entry
- SMS notification on assignment

### Automatic Room Assignment on Availability
- Background job checks every 5 minutes
- Assigns room when available
- Updates waitlist status to 'assigned'
- Sends SMS notification via Twilio
- Starts confirmation window

### SMS Notification via Twilio
- Twilio 6.0.2 integration
- Notifies client of room assignment
- Includes confirmation deadline
- Configurable message template
- Error handling for failed SMS

### Position-Based Queue Management
- First-in-first-out queue
- Auto-generated position numbers
- Position updates on reassignment
- Display position to clients
- Fair queue management

### Waitlist Status Transitions
- `waiting` - Initial state, waiting for room
- `assigned` - Room assigned, awaiting confirmation
- `confirmed` - Client confirmed, room reserved
- `expired` - Confirmation window expired, reassigned
- Atomic status updates with SELECT FOR UPDATE

### Automatic Reassignment on Expiration
- Background job checks expired assignments
- Reassigns room to next waitlist entry
- Updates previous entry to 'expired'
- Notifies new assignment via SMS
- Maintains queue integrity

### Atomic Operations with SELECT FOR UPDATE
- Prevents race conditions
- Locks rows during update
- Only intentional raw SQL in codebase
- Located in `lib/db/src/rooms.ts`
- Ensures consistent state

### Waitlist Integration with Room Release
- Auto-check waitlist on room release
- Immediate assignment if waitlist exists
- Bypasses 5-minute job for faster response
- Maintains queue order
- SMS notification on assignment

## Key Files
- `artifacts/api-server/src/routes/waitlist.ts` - Waitlist endpoints
- `artifacts/api-server/src/routes/rooms.ts` - Waitlist assignment logic

## References
- `README.md` - Waitlist feature overview
- `ANALYSIS.md` - Waitlist schema

## Common Tasks

### Adding Client to Waitlist
```typescript
await db.insert(waitlistEntries).values({
  clientId,
  position: nextPosition,
  status: 'waiting',
  createdAt: new Date(),
});
```

### Assigning Room from Waitlist
```typescript
const nextEntry = await db.query.waitlistEntries.findFirst({
  where: eq(waitlistEntries.status, 'waiting'),
  orderBy: asc(waitlistEntries.position)
});

if (nextEntry) {
  await assignRoom(nextEntry.clientId, roomId);
  await sendSMSNotification(nextEntry);
  await db.update(waitlistEntries)
    .set({ status: 'assigned' })
    .where(eq(waitlistEntries.id, nextEntry.id));
}
```

### Confirming Waitlist Assignment
```typescript
await db.update(waitlistEntries)
  .set({ status: 'confirmed' })
  .where(eq(waitlistEntries.id, entryId));
```

### Expiring Waitlist Assignment
```typescript
await db.update(waitlistEntries)
  .set({ status: 'expired' })
  .where(and(
    eq(waitlistEntries.status, 'assigned'),
    lt(waitlistEntries.assignedAt, expirationThreshold)
  ));
```

## Best Practices
- Always use atomic operations
- Send SMS notifications promptly
- Monitor waitlist queue length
- Handle SMS failures gracefully
- Maintain queue integrity
