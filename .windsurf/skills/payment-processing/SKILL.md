---
name: payment-processing
description: Integrating Square Web Payments SDK for processing payments for locker rentals, room rentals, memberships, and products
---

# Payment Processing (Square SDK)

This skill covers integrating Square Web Payments SDK for processing payments in the Spa-Flow repository for locker rentals, room rentals, memberships, and products.

## Key Concepts

### Square SDK Configuration
- Square SDK 44.0.1
- Sandbox vs production environments
- Environment variables for configuration:
  - `SQUARE_ACCESS_TOKEN` - Square access token
  - `SQUARE_APPLICATION_ID` - Square application ID
  - `SQUARE_LOCATION_ID` - Square location ID
  - `SQUARE_ENVIRONMENT` - sandbox or production
  - `SQUARE_API_VERSION` - API version (default: 2025-08-20)

### Payment Flow for Rentals
- Locker assignments: process payment, assign locker, create rental session
- Room assignments: process payment, assign room, create rental session
- Renewals: process payment, extend session by 6 hours
- Extensions: process payment, extend session by 2 hours with surcharge

### Membership Purchase Flow
- One-time membership: single payment, 24-hour validity
- Six-month membership: single payment, 180-day validity
- Membership expiration tracking
- Membership status updates

### Product Sale Flow
- Product catalog integration
- Stock validation before sale
- Payment processing
- Stock decrement after successful payment
- Transaction record creation

### Idempotency Keys
- Prevent duplicate charges on retry
- Unique key per payment request
- Store processed keys (use Redis in production)
- Return cached response on duplicate key
- Critical for payment reliability

### Tax Calculation
- Configurable tax rate (default: 8.875%)
- Environment variable: `TAX_RATE`
- Applied to rental, membership, and product payments
- Included in transaction record

### Transaction Record Creation
- All payments recorded in `transactions` table
- Includes Square payment ID
- Links to client, membership, rental session, or product
- Amount, tax, and total recorded
- Timestamp and correlation ID

### Error Handling for Payment Failures
- Graceful error handling
- User-friendly error messages
- Log payment failures with context
- Retry logic for transient failures
- Audit log entry for failed attempts

### Square Payment ID Tracking
- Store Square payment ID in transaction record
- Use for refunds and disputes
- Link back to Square dashboard
- Reconciliation with Square reports

### Check-in Flow with Combined Payment
- Combined payment for rental + membership + products
- Single Square transaction
- Atomic operation: all or nothing
- Creates multiple transaction records
- Assigns resources and updates inventory

## Key Files
- `artifacts/api-server/src/routes/lockers.ts` - Locker payments
- `artifacts/api-server/src/routes/rooms.ts` - Room payments
- `artifacts/api-server/src/routes/checkin.ts` - Combined check-in payment
- `artifacts/spaflow/src/components/square-payment/` - Frontend Square integration

## References
- `README.md` - Square environment variables
- `.env.example` - Square configuration

## Common Tasks

### Processing a Payment
```typescript
import { paymentsApi } from '../lib/square';

const payment = await paymentsApi.createPayment({
  sourceId: nonce,
  amountMoney: {
    amount: amount,
    currency: 'USD'
  },
  idempotencyKey: crypto.randomUUID(),
  note: 'Locker rental'
});
```

### Implementing Idempotency
```typescript
const processedKeys = new Map(); // Use Redis in production

if (processedKeys.has(idempotencyKey)) {
  return res.status(200).json(processedKeys.get(idempotencyKey));
}

// Process payment
const payment = await squareClient.createPayment(...);
processedKeys.set(idempotencyKey, payment);
```

### Calculating Tax
```typescript
const taxRate = parseFloat(process.env.TAX_RATE || '0.08875');
const tax = subtotal * taxRate;
const total = subtotal + tax;
```

### Creating Transaction Record
```typescript
await db.insert(transactions).values({
  clientId,
  squarePaymentId: payment.id,
  amount: payment.amountMoney.amount,
  tax,
  total,
  type: 'locker_rental',
  resourceId: lockerId,
});
```

## Security Considerations
- Never log Square access tokens
- Never expose access tokens to client
- Validate payment amounts on server
- Use HTTPS for all payment requests
- Implement webhook signatures for Square webhooks
- Store only Square payment ID, not full payment details
