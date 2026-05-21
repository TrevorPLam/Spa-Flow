---
name: resource-management
description: Managing locker and room inventory with assignment, release, renewal, and extension operations
---

# Resource Management (Lockers & Rooms)

This skill covers managing locker and room inventory in the Spa-Flow repository with assignment, release, renewal, and extension operations.

## Key Concepts

### Resource Status Management
- `available` - Resource available for assignment
- `occupied` - Resource currently in use
- `reserved` - Resource reserved for waitlist
- Status transitions tracked in database
- Real-time status updates

### Assignment Flow with Payment Processing
- Process payment via Square SDK
- Assign resource to client
- Create rental session record
- Update resource status to 'occupied'
- Set session expiration time
- Invalidate cache

### Release Flow with Session Completion
- Release resource from client
- Update resource status to 'available'
- Complete rental session
- Auto-check waitlist for assignment
- Invalidate cache
- Log audit event

### Renewal Flow (+6 Hours, New Payment)
- Process payment for renewal
- Extend session by 6 hours
- Update session expiration
- Keep resource assignment
- Invalidate cache
- Log audit event

### Extension Flow (+2 Hours, Surcharge)
- Process payment for extension
- Extend session by 2 hours
- Apply surcharge fee
- Update session expiration
- Keep resource assignment
- Invalidate cache

### Occupancy Tracking and Reporting
- Track available/occupied counts
- Real-time occupancy data
- Cached for performance
- Dashboard integration
- Historical occupancy data

### SELECT FOR UPDATE for Atomic Operations
- Prevents race conditions
- Locks rows during assignment
- Only intentional raw SQL in codebase
- Located in `lib/db/src/rooms.ts`
- Ensures consistent state

### Dynamic Pricing Calculation
- Base price for initial assignment
- Renewal price for 6-hour extension
- Extension price with surcharge for 2-hour extension
- Tax calculation
- Configurable pricing tiers

### Real-Time Status Updates
- Status changes immediately reflected
- Cache invalidation on changes
- WebSocket support (future)
- Real-time dashboard updates
- Occupancy metrics

## Key Files
- `artifacts/api-server/src/routes/lockers.ts` - Locker operations
- `artifacts/api-server/src/routes/rooms.ts` - Room operations
- `artifacts/api-server/src/routes/pricing.ts` - Pricing calculation

## References
- `README.md` - Resource management features
- `ANALYSIS.md` - Resource schema

## Common Tasks

### Assigning a Resource
```typescript
await db.transaction(async (tx) => {
  // Process payment
  const payment = await processPayment(amount);
  
  // Assign resource
  await tx.update(lockers)
    .set({ status: 'occupied', clientId, rentalSessionId })
    .where(eq(lockers.id, lockerId));
  
  // Create rental session
  await tx.insert(rentalSessions).values({
    clientId,
    lockerId,
    status: 'active',
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
  });
  
  // Invalidate cache
  await invalidateCache('lockers', lockerId);
});
```

### Releasing a Resource
```typescript
await db.transaction(async (tx) => {
  // Release resource
  await tx.update(lockers)
    .set({ status: 'available', clientId: null, rentalSessionId: null })
    .where(eq(lockers.id, lockerId));
  
  // Complete session
  await tx.update(rentalSessions)
    .set({ status: 'completed' })
    .where(eq(rentalSessions.id, sessionId));
  
  // Invalidate cache
  await invalidateCache('lockers', lockerId);
  
  // Check waitlist
  await checkWaitlistForAssignment();
});
```

### Renewing a Resource
```typescript
await db.transaction(async (tx) => {
  // Process payment
  const payment = await processPayment(renewalPrice);
  
  // Extend session
  await tx.update(rentalSessions)
    .set({ expiresAt: new Date(expiresAt.getTime() + 6 * 60 * 60 * 1000) })
    .where(eq(rentalSessions.id, sessionId));
  
  // Invalidate cache
  await invalidateCache('lockers', lockerId);
});
```

## Best Practices
- Always use transactions for mutations
- Invalidate cache after changes
- Use SELECT FOR UPDATE for critical sections
- Process payment before assignment
- Log audit events for all mutations
