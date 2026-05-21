---
name: client-management
description: Managing client profiles with PII encryption, membership tracking, rental history, and transaction history
---

# Client Management

This skill covers managing client profiles in the Spa-Flow repository with PII encryption, membership tracking, rental history, and transaction history.

## Key Concepts

### Client Profile Creation and Updates
- Create client profiles with basic information
- Update client information
- PII fields encrypted on storage
- Membership status tracking
- Auto-generated member IDs

### PII Encryption
- PII fields: date of birth (dob), address, document number
- AES-256-GCM envelope encryption
- KEK stored in environment variable
- DEKs stored alongside ciphertext
- MANAGER-only decryption with audit log

### Membership Status Management
- `none` - No membership
- `one_time` - One-time membership (24 hours)
- `six_month` - Six-month membership (180 days)
- Membership expiration tracking
- Auto-expiration via background job

### Auto-Generated Member IDs
- Format: SPF-{nanoid(8)}
- Generated on client creation
- Unique identifier for clients
- Used in search and lookups
- Never reused

### Search by Name, Email, Phone, Member ID
- Fuzzy search on name
- Exact match on email
- Exact match on phone
- Exact match on member ID
- Cached search results (1 min TTL)

### Rental History Tracking
- All locker rentals recorded
- All room rentals recorded
- Session timestamps
- Payment information
- Status transitions

### Transaction History Tracking
- All payments recorded
- Square payment IDs
- Transaction types (rental, membership, product)
- Amounts and tax
- Timestamps

### MANAGER-Only PII Decryption
- Only MANAGER role can decrypt PII
- Audit log entry on decryption
- Requires explicit authorization
- Logged with user ID and correlation ID
- Time-limited access

### Cache Invalidation After Mutations
- Invalidate client search cache
- Invalidate client details cache
- Invalidate dashboard cache
- Prevents stale data serving
- Required after create/update/delete

### Redis Caching for Search Results
- Search results cached for 1 minute
- Client details cached for 5 minutes
- Reduces database load
- Improved response times
- Automatic invalidation

## Key Files
- `artifacts/api-server/src/routes/clients.ts` - Client endpoints
- `artifacts/spaflow/src/pages/clients.tsx` - Client UI
- `artifacts/spaflow/src/pages/users.tsx` - User management

## References
- `README.md` - Client management features
- TODO.md TASK-021 - Type assertion fixes in client pages

## Common Tasks

### Creating a Client
```typescript
await db.insert(clients).values({
  name,
  email,
  phone,
  dob: await encryptPII(dob),
  address: await encryptPII(address),
  documentNumber: await encryptPII(documentNumber),
  memberId: `SPF-${nanoid(8)}`,
  membershipStatus: 'none',
});
```

### Searching Clients
```typescript
const cached = await cacheGet(`client:search:${query}`);
if (cached) return cached;

const clients = await db.query.clients.findMany({
  where: or(
    ilike(clients.name, `%${query}%`),
    eq(clients.email, query),
    eq(clients.phone, query),
    eq(clients.memberId, query)
  )
});

await cacheSet(`client:search:${query}`, clients, 60);
return clients;
```

### Decrypting PII (MANAGER Only)
```typescript
// Audit log entry created automatically
const decryptedDob = await decryptPII(client.dob);
const decryptedAddress = await decryptPII(client.address);
```

### Adding Membership
```typescript
await db.insert(memberships).values({
  clientId,
  type: 'six_month',
  expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
});

await db.update(clients)
  .set({ membershipStatus: 'six_month' })
  .where(eq(clients.id, clientId));
```

## Best Practices
- Always encrypt PII before storage
- Use search cache for performance
- Invalidate cache after mutations
- Log audit events for PII access
- Use auto-generated member IDs
