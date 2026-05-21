---
trigger: glob
globs: artifacts/api-server/src/**/*payment*.ts
---

# Square Payment SDK Best Practices (2026)

## Current State
- Spa-Flow uses Square SDK 44.0.1
- Uses idempotency keys for duplicate charge prevention
- Tracks Square payment IDs in transactions
- Tax rate: 8.875% (configurable)

## 2026 Best Practices
- **Confirmed**: Current implementation aligns with 2026 best practices
- Idempotency keys are essential for preventing duplicate charges
- Square API version 2026-01-22 is current
- Strong Customer Authentication (SCA) requirements for PSD2 compliance

## Idempotency Keys

### Purpose
- Prevent duplicate charges from network failures
- Allow safe retry of failed payment requests
- Ensure exactly-once payment processing

### Implementation
```typescript
// ✅ Good: Idempotency key generation
import { randomUUID } from 'crypto';

async function processPayment(amount: number, sourceId: string) {
  const idempotencyKey = randomUUID();
  
  try {
    const payment = await square.paymentsApi.createPayment({
      idempotencyKey,
      amountMoney: {
        amount: amount,
        currency: 'USD'
      },
      sourceId
    });
    
    // Track payment ID in transaction
    await db.insert(transactions).values({
      squarePaymentId: payment.result.payment.id,
      amount,
      idempotencyKey
    });
    
    return payment.result.payment;
  } catch (error) {
    if (error instanceof ApiError) {
      // Check if payment already succeeded (idempotency)
      if (error.errors?.[0]?.code === 'IDEMPOTENCY_KEY_REUSED') {
        const existingPayment = await getPaymentByIdempotencyKey(idempotencyKey);
        return existingPayment;
      }
    }
    throw error;
  }
}
```

### Idempotency Key Requirements
- **✅ Always Do**: Use UUID v4 for idempotency keys
- **✅ Always Do**: Generate new idempotency key for each payment attempt
- **✅ Always Do**: Track idempotency keys in transactions
- **✅ Always Do**: Handle IDEMPOTENCY_KEY_REUSED errors gracefully
- **✅ Always Do**: Store idempotency keys for at least 24 hours
- **❌ Never Do**: Reuse idempotency keys across different payments
- **❌ Never Do**: Use sequential or predictable idempotency keys
- **❌ Never Do**: Retry payment without idempotency key

## Payment Flow
```typescript
// ✅ Good: Complete payment flow
async function createTransaction(clientId: string, amount: number, sourceId: string) {
  // 1. Calculate price with tax
  const subtotal = amount;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  
  // 2. Process payment with idempotency
  const payment = await processPayment(total, sourceId);
  
  // 3. Create transaction record
  const transaction = await db.insert(transactions).values({
    clientId,
    squarePaymentId: payment.id,
    amount: total,
    tax,
    status: 'completed'
  }).returning();
  
  // 4. Invalidate cache
  await invalidateCache(`client:${clientId}`);
  await invalidateCache('transactions:*');
  
  // 5. Audit log
  await logAudit({
    userId: req.user.id,
    action: 'create',
    resourceType: 'transaction',
    resourceId: transaction[0].id,
    squarePaymentId: payment.id
  });
  
  return transaction[0];
}
```

## Error Handling
```typescript
// ✅ Good: Comprehensive error handling
try {
  const payment = await square.paymentsApi.createPayment(paymentRequest);
} catch (error) {
  if (error instanceof ApiError) {
    const errorCode = error.errors[0]?.code;
    
    switch (errorCode) {
      case 'IDEMPOTENCY_KEY_REUSED':
        // Payment already succeeded, retrieve it
        return await getPaymentByIdempotencyKey(idempotencyKey);
      
      case 'INSUFFICIENT_FUNDS':
        throw new PaymentError('Insufficient funds');
      
      case 'CARD_DECLINED':
        throw new PaymentError('Card declined');
      
      case 'INVALID_CARD':
        throw new PaymentError('Invalid card');
      
      default:
        throw new PaymentError('Payment failed');
    }
  }
  throw error;
}
```

## Square API Version
- **✅ Always Do**: Use latest Square API version (2026-01-22 as of May 2026)
- **✅ Always Do**: Specify API version in requests
- **✅ Always Do**: Update API version regularly
- **⚠️ Ask First**: Changing Square API version

## Payment Types
- **✅ Always Do**: Support locker rentals
- **✅ Always Do**: Support room rentals
- **✅ Always Do**: Support memberships
- **✅ Always Do**: Support products
- **✅ Always Do**: Calculate tax correctly (8.875% default, configurable)

## Security Requirements
- **✅ Always Do**: Never store raw card data
- **✅ Always Do**: Use Square's secure payment form
- **✅ Always Do**: Validate payment amount before processing
- **✅ Always Do**: Log all payment attempts (success and failure)
- **❌ Never Do**: Store CVV/CVC codes
- **❌ Never Do**: Handle raw card data on server
- **❌ Never Do**: Log sensitive payment information

## Refund Handling
```typescript
// ✅ Good: Safe refund handling
async function refundTransaction(transactionId: string) {
  const transaction = await getTransaction(transactionId);
  
  if (!transaction.squarePaymentId) {
    throw new Error('No Square payment ID found');
  }
  
  const refund = await square.refundsApi.createRefund({
    paymentId: transaction.squarePaymentId,
    amountMoney: {
      amount: transaction.amount,
      currency: 'USD'
    },
    idempotencyKey: randomUUID()
  });
  
  // Update transaction status
  await db.update(transactions)
    .set({ status: 'refunded' })
    .where(eq(transactions.id, transactionId));
  
  return refund.result.refund;
}
```

## Testing
- **✅ Always Do**: Use Square sandbox for testing
- **✅ Always Do**: Test payment success scenarios
- **✅ Always Do**: Test payment failure scenarios
- **✅ Always Do**: Test idempotency key reuse
- **✅ Always Do**: Test refund flow
- **❌ Never Do**: Use production credentials in tests

## References
- Square Idempotency Documentation (2026)
- Square API Reference (2026-01-22)
- Square Payment SDK Best Practices
