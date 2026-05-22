import { describe, it, expect, beforeEach } from "vitest";
import { db, productsTable, transactionItemsTable, transactionsTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getSalesVelocity,
  getLowStockPrediction,
  getCategoryPerformance,
  getSeasonalDemand,
  getReorderPoints,
  getStockTurnover,
} from "./inventory";
import { cleanDatabase } from "../test/test-helpers";

describe("Inventory Service", () => {
  let testProductId: number;
  let testTransactionId: number;
  let testTransactionItemId: number;
  let testClientId: number;

  beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();
    
    // Create a test client first (required for transactions foreign key)
    const [client] = await db
      .insert(clientsTable)
      .values({
        name: "Test Inventory Client",
        email: "inventory-test@example.com",
      })
      .returning();
    testClientId = client.id;
    
    // Create a test product
    const [product] = await db
      .insert(productsTable)
      .values({
        name: "Test Inventory Product",
        description: "Product for inventory testing",
        price: "10.00",
        stock: 50,
        lowStockThreshold: 10,
        category: "test_category",
      })
      .returning();
    testProductId = product.id;

    // Create a test transaction
    const [transaction] = await db
      .insert(transactionsTable)
      .values({
        type: "product",
        amount: "20.00",
        tax: "1.78",
        total: "21.78",
        clientId: testClientId,
        description: "Test inventory transaction",
      })
      .returning();
    testTransactionId = transaction.id;

    // Create test transaction items
    const [transactionItem] = await db
      .insert(transactionItemsTable)
      .values({
        transactionId: testTransactionId,
        productId: testProductId,
        quantity: 2,
        unitPrice: "10.00",
      })
      .returning();
    testTransactionItemId = transactionItem.id;
  });

  describe("getSalesVelocity", () => {
    it("should calculate sales velocity per product", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const salesVelocity = await getSalesVelocity(startDate, endDate);

      expect(Array.isArray(salesVelocity)).toBe(true);
      expect(salesVelocity.length).toBeGreaterThan(0);

      const testProduct = salesVelocity.find((p) => p.productId === testProductId);
      expect(testProduct).toBeDefined();
      expect(testProduct?.productId).toBe(testProductId);
      expect(testProduct?.productName).toBe("Test Inventory Product");
      expect(testProduct?.totalQuantitySold).toBeGreaterThanOrEqual(0);
      expect(testProduct?.salesVelocityPerDay).toBeGreaterThanOrEqual(0);
      expect(testProduct?.salesVelocityPerWeek).toBeGreaterThanOrEqual(0);
      expect(testProduct?.classification).toMatch(/^(fast_mover|moderate_mover|slow_mover|very_slow_mover)$/);
    });

    it("should support date range filtering", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const salesVelocity = await getSalesVelocity(startDate, endDate);

      expect(Array.isArray(salesVelocity)).toBe(true);
      // Should return data for the 7-day period
      expect(salesVelocity.length).toBeGreaterThan(0);
    });
  });

  describe("getLowStockPrediction", () => {
    it("should predict stock-out dates based on sales velocity", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const predictions = await getLowStockPrediction(startDate, endDate);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);

      const testProduct = predictions.find((p) => p.productId === testProductId);
      expect(testProduct).toBeDefined();
      expect(testProduct?.productId).toBe(testProductId);
      expect(testProduct?.currentStock).toBe(50);
      expect(testProduct?.lowStockThreshold).toBe(10);
      expect(testProduct?.salesVelocityPerDay).toBeGreaterThanOrEqual(0);
      expect(testProduct?.riskLevel).toMatch(/^(critical|high|moderate|low|none)$/);
    });

    it("should sort by risk level (critical first)", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const predictions = await getLowStockPrediction(startDate, endDate);

      if (predictions.length > 1) {
        const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3, none: 4 };
        for (let i = 0; i < predictions.length - 1; i++) {
          const currentRisk = riskOrder[predictions[i].riskLevel as keyof typeof riskOrder];
          const nextRisk = riskOrder[predictions[i + 1].riskLevel as keyof typeof riskOrder];
          expect(currentRisk).toBeLessThanOrEqual(nextRisk);
        }
      }
    });
  });

  describe("getCategoryPerformance", () => {
    it("should aggregate sales by product category", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const categoryPerformance = await getCategoryPerformance(startDate, endDate);

      expect(Array.isArray(categoryPerformance)).toBe(true);
      expect(categoryPerformance.length).toBeGreaterThan(0);

      const testCategory = categoryPerformance.find((c) => c.category === "test_category");
      expect(testCategory).toBeDefined();
      expect(testCategory?.category).toBe("test_category");
      expect(testCategory?.totalQuantitySold).toBeGreaterThanOrEqual(0);
      expect(testCategory?.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(testCategory?.productCount).toBeGreaterThan(0);
      expect(testCategory?.revenuePercentage).toBeDefined();
    });

    it("should calculate revenue percentage correctly", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const categoryPerformance = await getCategoryPerformance(startDate, endDate);

      const totalPercentage = categoryPerformance.reduce(
        (sum, cat) => sum + parseFloat(cat.revenuePercentage),
        0
      );

      // Total percentage should be close to 100% (allowing for rounding)
      expect(totalPercentage).toBeGreaterThan(99);
      expect(totalPercentage).toBeLessThanOrEqual(101);
    });
  });

  describe("getSeasonalDemand", () => {
    it("should analyze sales by month to identify seasonal patterns", async () => {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const endDate = new Date();

      const seasonalDemand = await getSeasonalDemand(startDate, endDate);

      expect(seasonalDemand).toBeDefined();
      expect(seasonalDemand.monthlyData).toBeDefined();
      expect(Array.isArray(seasonalDemand.monthlyData)).toBe(true);
      expect(seasonalDemand.peakMonth).toBeDefined();
      expect(seasonalDemand.lowMonth).toBeDefined();
      expect(seasonalDemand.seasonalVariation).toBeDefined();
    });

    it("should return monthly data with correct structure", async () => {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const endDate = new Date();

      const seasonalDemand = await getSeasonalDemand(startDate, endDate);

      expect(seasonalDemand.monthlyData.length).toBeGreaterThan(0);
      const firstMonth = seasonalDemand.monthlyData[0];
      expect(firstMonth.month).toBeGreaterThanOrEqual(1);
      expect(firstMonth.month).toBeLessThanOrEqual(12);
      expect(firstMonth.monthName).toBeDefined();
      expect(firstMonth.avgQuantitySold).toBeGreaterThanOrEqual(0);
      expect(firstMonth.avgRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getReorderPoints", () => {
    it("should calculate optimal reorder points based on sales velocity", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const reorderPoints = await getReorderPoints(startDate, endDate, 7, 3);

      expect(Array.isArray(reorderPoints)).toBe(true);
      // Only products with sales history should be included
      expect(reorderPoints.every((rp) => rp.salesVelocityPerDay > 0)).toBe(true);

      if (reorderPoints.length > 0) {
        const firstProduct = reorderPoints[0];
        expect(firstProduct.leadTimeDays).toBe(7);
        expect(firstProduct.safetyStockDays).toBe(3);
        expect(firstProduct.reorderPoint).toBeGreaterThan(0);
        expect(firstProduct.suggestedReorderQuantity).toBeGreaterThan(0);
        expect(firstProduct.shouldReorder).toBeDefined();
        expect(firstProduct.urgency).toMatch(/^(immediate|soon|none)$/);
      }
    });

    it("should use custom lead time and safety stock parameters", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const reorderPoints = await getReorderPoints(startDate, endDate, 14, 5);

      if (reorderPoints.length > 0) {
        const firstProduct = reorderPoints[0];
        expect(firstProduct.leadTimeDays).toBe(14);
        expect(firstProduct.safetyStockDays).toBe(5);
      }
    });
  });

  describe("getStockTurnover", () => {
    it("should calculate stock turnover rate for products", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const stockTurnover = await getStockTurnover(startDate, endDate);

      expect(Array.isArray(stockTurnover)).toBe(true);
      expect(stockTurnover.length).toBeGreaterThan(0);

      const testProduct = stockTurnover.find((p) => p.productId === testProductId);
      expect(testProduct).toBeDefined();
      expect(testProduct?.productId).toBe(testProductId);
      expect(testProduct?.currentStock).toBe(50);
      expect(testProduct?.costOfGoodsSold).toBeGreaterThanOrEqual(0);
      expect(testProduct?.averageInventoryValue).toBeGreaterThanOrEqual(0);
      expect(testProduct?.turnoverRate).toBeGreaterThanOrEqual(0);
      expect(testProduct?.classification).toMatch(/^(fast|healthy|slow|stagnant)$/);
      expect(testProduct?.recommendation).toBeDefined();
    });

    it("should provide appropriate recommendations based on turnover rate", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const stockTurnover = await getStockTurnover(startDate, endDate);

      stockTurnover.forEach((product) => {
        expect(product.recommendation).toBeDefined();
        expect(typeof product.recommendation).toBe("string");
        expect(product.recommendation.length).toBeGreaterThan(0);
      });
    });
  });
});
