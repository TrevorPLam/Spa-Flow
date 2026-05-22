import { db, transactionsTable, productsTable, transactionItemsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

/**
 * Migration script to create transaction_items records from existing product transactions.
 * 
 * This script parses the description field of product transactions (format: "Product: {name}")
 * and creates corresponding transaction_items records linking transactions to products.
 * 
 * Usage: pnpm tsx scripts/migrate-transaction-items.ts
 * 
 * Note: This is a best-effort migration. Transactions that cannot be parsed or matched
 * to products will be logged but will not cause the script to fail.
 */

async function migrateTransactionItems() {
  console.log("Starting transaction items migration...");

  // Find all product transactions that don't have corresponding transaction_items
  const productTransactions = await db
    .select({
      id: transactionsTable.id,
      description: transactionsTable.description,
      amount: transactionsTable.amount,
      total: transactionsTable.total,
    })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "product"));

  console.log(`Found ${productTransactions.length} product transactions to process`);

  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  for (const txn of productTransactions) {
    try {
      // Check if transaction already has transaction_items
      const existingItems = await db
        .select()
        .from(transactionItemsTable)
        .where(eq(transactionItemsTable.transactionId, txn.id));

      if (existingItems.length > 0) {
        console.log(`Skipping transaction ${txn.id} - already has transaction_items`);
        skippedCount++;
        continue;
      }

      // Parse product name from description
      // Expected format: "Product: {product name}"
      if (!txn.description || !txn.description.startsWith("Product: ")) {
        console.log(`Skipping transaction ${txn.id} - invalid description format: ${txn.description}`);
        failureCount++;
        continue;
      }

      const productName = txn.description.replace("Product: ", "").trim();

      // Find product by name
      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.name, productName));

      if (!product) {
        console.log(`Skipping transaction ${txn.id} - product not found: ${productName}`);
        failureCount++;
        continue;
      }

      // Create transaction item
      await db.insert(transactionItemsTable).values({
        transactionId: txn.id,
        productId: product.id,
        quantity: 1,
        unitPrice: txn.amount,
      });

      console.log(`✓ Migrated transaction ${txn.id} -> product ${product.name} (id: ${product.id})`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to migrate transaction ${txn.id}:`, error);
      failureCount++;
    }
  }

  console.log("\nMigration complete:");
  console.log(`  Success: ${successCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Failed: ${failureCount}`);
  console.log(`  Total: ${productTransactions.length}`);

  if (failureCount > 0) {
    console.log("\n⚠️  Some transactions failed to migrate. Check logs above for details.");
    console.log("   These transactions will need manual review.");
  }
}

// Run migration
migrateTransactionItems()
  .then(() => {
    console.log("\n✓ Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Migration script failed:", error);
    process.exit(1);
  });
