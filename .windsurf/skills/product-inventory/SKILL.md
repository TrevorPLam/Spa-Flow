---
name: product-inventory
description: Managing product catalog with categories, stock tracking, price management, and low-stock alerts
---

# Product Inventory Management

This skill covers managing product catalog in the Spa-Flow repository with categories, stock tracking, price management, and low-stock alerts.

## Key Concepts

### Product CRUD Operations
- Create new products
- Update existing products
- Delete products
- List all products
- Filter by category
- Search by name

### Stock Tracking and Decrement
- Stock count per product
- Decrement on sale
- Prevent overselling
- Stock validation in check-in flow
- Stock level monitoring

### Low Stock Threshold Configuration
- Configurable threshold per product
- Default threshold: 10 units
- Alert when below threshold
- Dashboard indicator
- Reorder recommendations

### Low Stock Alerts
- Automatic low stock detection
- Dashboard alerts
- Email notifications (future)
- Report generation
- Reorder suggestions

### Product Categories
- Category field for organization
- Category-based filtering
- Hierarchical categories (future)
- Category management
- Reporting by category

### Price Management
- Price per product
- Tax calculation
- Price updates
- Historical pricing (future)
- Bulk price updates

### Product Sales Integration with Transactions
- Link products to transactions
- Track sales per product
- Revenue reporting by product
- Sales trend analysis
- Popular product identification

### Stock Validation in Check-in Flow
- Validate stock before sale
- Prevent overselling
- Real-time stock check
- Decrement after successful payment
- Rollback on payment failure

## Key Files
- `artifacts/api-server/src/routes/products.ts` - Product endpoints
- `artifacts/spaflow/src/pages/products.tsx` - Product UI

## References
- `README.md` - Product inventory features

## Common Tasks

### Creating a Product
```typescript
await db.insert(products).values({
  name,
  category,
  price,
  stock,
  lowStockThreshold: 10,
});
```

### Updating Stock
```typescript
await db.update(products)
  .set({ stock: newStock })
  .where(eq(products.id, productId));
```

### Validating Stock Before Sale
```typescript
const product = await db.query.products.findFirst({
  where: eq(products.id, productId)
});

if (product.stock < quantity) {
  throw new Error('Insufficient stock');
}
```

### Getting Low Stock Products
```typescript
const lowStock = await db.query.products.findMany({
  where: lt(products.stock, sql`${products.lowStockThreshold}`)
});
```

## Best Practices
- Always validate stock before sale
- Set appropriate low stock thresholds
- Monitor stock levels regularly
- Use transactions for stock updates
- Track product sales for insights
