import { db, productsTable, transactionItemsTable, transactionsTable } from "@workspace/db";
import { sql, gte, lte, and, eq, desc } from "drizzle-orm";

/**
 * Calculate sales velocity per product (units sold per day/week)
 * @param startDate - Start date for analysis
 * @param endDate - End date for analysis
 * @returns Sales velocity data for each product
 */
export async function getSalesVelocity(startDate: Date, endDate: Date) {
  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const salesData = await db
    .select({
      productId: transactionItemsTable.productId,
      productName: productsTable.name,
      productCategory: productsTable.category,
      currentStock: productsTable.stock,
      totalQuantitySold: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity}), 0)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity} * ${transactionItemsTable.unitPrice}::numeric), 0)::float`,
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transactionId, transactionsTable.id))
    .innerJoin(productsTable, eq(transactionItemsTable.productId, productsTable.id))
    .where(and(gte(transactionsTable.createdAt, startDate), lte(transactionsTable.createdAt, endDate)))
    .groupBy(transactionItemsTable.productId, productsTable.name, productsTable.category, productsTable.stock)
    .orderBy(desc(sql`SUM(${transactionItemsTable.quantity})`));

  return salesData.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    productCategory: row.productCategory,
    currentStock: row.currentStock,
    totalQuantitySold: row.totalQuantitySold || 0,
    totalRevenue: row.totalRevenue || 0,
    salesVelocityPerDay: (row.totalQuantitySold || 0) / daysInPeriod,
    salesVelocityPerWeek: ((row.totalQuantitySold || 0) / daysInPeriod) * 7,
    classification: classifySalesVelocity((row.totalQuantitySold || 0) / daysInPeriod),
  }));
}

/**
 * Classify product based on sales velocity
 */
function classifySalesVelocity(velocityPerDay: number): string {
  if (velocityPerDay >= 5) return "fast_mover";
  if (velocityPerDay >= 1) return "moderate_mover";
  if (velocityPerDay >= 0.1) return "slow_mover";
  return "very_slow_mover";
}

/**
 * Predict stock-out date based on sales velocity and current stock
 * @param startDate - Start date for analysis
 * @param endDate - End date for analysis
 * @returns Low stock predictions for products
 */
export async function getLowStockPrediction(startDate: Date, endDate: Date) {
  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const salesData = await db
    .select({
      productId: transactionItemsTable.productId,
      productName: productsTable.name,
      productCategory: productsTable.category,
      currentStock: productsTable.stock,
      lowStockThreshold: productsTable.lowStockThreshold,
      totalQuantitySold: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity}), 0)::int`,
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transactionId, transactionsTable.id))
    .innerJoin(productsTable, eq(transactionItemsTable.productId, productsTable.id))
    .where(and(gte(transactionsTable.createdAt, startDate), lte(transactionsTable.createdAt, endDate)))
    .groupBy(transactionItemsTable.productId, productsTable.name, productsTable.category, productsTable.stock, productsTable.lowStockThreshold);

  const predictions = salesData.map((row) => {
    const salesVelocityPerDay = (row.totalQuantitySold || 0) / daysInPeriod;
    const currentStock = row.currentStock || 0;
    const threshold = row.lowStockThreshold || 5;

    let daysUntilStockout: number | null = null;
    let daysUntilLowStock: number | null = null;
    let riskLevel: string = "none";

    if (salesVelocityPerDay > 0) {
      daysUntilStockout = currentStock / salesVelocityPerDay;
      daysUntilLowStock = Math.max(0, currentStock - threshold) / salesVelocityPerDay;

      if (daysUntilLowStock <= 7) {
        riskLevel = "critical";
      } else if (daysUntilLowStock <= 14) {
        riskLevel = "high";
      } else if (daysUntilLowStock <= 30) {
        riskLevel = "moderate";
      } else {
        riskLevel = "low";
      }
    } else if (currentStock <= threshold) {
      riskLevel = "critical";
      daysUntilLowStock = 0;
    }

    return {
      productId: row.productId,
      productName: row.productName,
      productCategory: row.productCategory,
      currentStock,
      lowStockThreshold: threshold,
      salesVelocityPerDay,
      daysUntilStockout,
      daysUntilLowStock,
      riskLevel,
      suggestedReorderDate: daysUntilLowStock !== null ? new Date(Date.now() + daysUntilLowStock * 24 * 60 * 60 * 1000) : null,
    };
  });

  // Sort by risk level (critical first) then by days until low stock
  const riskOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3, none: 4 };
  return predictions.sort((a, b) => {
    const aRisk = riskOrder[a.riskLevel] ?? 4;
    const bRisk = riskOrder[b.riskLevel] ?? 4;
    if (aRisk !== bRisk) {
      return aRisk - bRisk;
    }
    return (a.daysUntilLowStock ?? Infinity) - (b.daysUntilLowStock ?? Infinity);
  });
}

/**
 * Aggregate sales by product category
 * @param startDate - Start date for analysis
 * @param endDate - End date for analysis
 * @returns Category performance data
 */
export async function getCategoryPerformance(startDate: Date, endDate: Date) {
  const categoryData = await db
    .select({
      category: productsTable.category,
      totalQuantitySold: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity}), 0)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity} * ${transactionItemsTable.unitPrice}::numeric), 0)::float`,
      productCount: sql<number>`COUNT(DISTINCT ${productsTable.id})::int`,
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transactionId, transactionsTable.id))
    .innerJoin(productsTable, eq(transactionItemsTable.productId, productsTable.id))
    .where(and(gte(transactionsTable.createdAt, startDate), lte(transactionsTable.createdAt, endDate)))
    .groupBy(productsTable.category)
    .orderBy(desc(sql`SUM(${transactionItemsTable.quantity} * ${transactionItemsTable.unitPrice}::numeric)`));

  const totalRevenue = categoryData.reduce((sum, row) => sum + (row.totalRevenue || 0), 0);

  return categoryData.map((row) => ({
    category: row.category || "uncategorized",
    totalQuantitySold: row.totalQuantitySold || 0,
    totalRevenue: row.totalRevenue || 0,
    productCount: row.productCount || 0,
    revenuePercentage: totalRevenue > 0 ? ((row.totalRevenue || 0) / totalRevenue * 100).toFixed(2) : "0.00",
    avgRevenuePerProduct: row.productCount > 0 ? (row.totalRevenue || 0) / row.productCount : 0,
  }));
}

/**
 * Analyze sales by month/season to identify seasonal patterns
 * @param startDate - Start date for analysis
 * @param endDate - End date for analysis
 * @returns Seasonal demand analysis
 */
export async function getSeasonalDemand(startDate: Date, endDate: Date) {
  const monthlyData = await db
    .select({
      productId: transactionItemsTable.productId,
      productName: productsTable.name,
      productCategory: productsTable.category,
      month: sql<number>`EXTRACT(MONTH FROM ${transactionsTable.createdAt})::int`,
      year: sql<number>`EXTRACT(YEAR FROM ${transactionsTable.createdAt})::int`,
      totalQuantitySold: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity}), 0)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity} * ${transactionItemsTable.unitPrice}::numeric), 0)::float`,
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transactionId, transactionsTable.id))
    .innerJoin(productsTable, eq(transactionItemsTable.productId, productsTable.id))
    .where(and(gte(transactionsTable.createdAt, startDate), lte(transactionsTable.createdAt, endDate)))
    .groupBy(
      transactionItemsTable.productId,
      productsTable.name,
      productsTable.category,
      sql`EXTRACT(MONTH FROM ${transactionsTable.createdAt})`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.createdAt})`
    )
    .orderBy(sql`EXTRACT(YEAR FROM ${transactionsTable.createdAt})`, sql`EXTRACT(MONTH FROM ${transactionsTable.createdAt})`);

  // Group by month across all years to identify patterns
  const monthMap = new Map<number, { totalQuantity: number; totalRevenue: number; count: number }>();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  monthlyData.forEach((row) => {
    const month = row.month;
    if (!monthMap.has(month)) {
      monthMap.set(month, { totalQuantity: 0, totalRevenue: 0, count: 0 });
    }
    const data = monthMap.get(month)!;
    data.totalQuantity += row.totalQuantitySold || 0;
    data.totalRevenue += row.totalRevenue || 0;
    data.count += 1;
  });

  const seasonalData = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    monthName: monthNames[month - 1],
    avgQuantitySold: data.count > 0 ? data.totalQuantity / data.count : 0,
    avgRevenue: data.count > 0 ? data.totalRevenue / data.count : 0,
    totalMonths: data.count,
  }));

  // Identify peak and low months
  const peakMonth = seasonalData.reduce((max, row) => row.avgQuantitySold > max.avgQuantitySold ? row : max, seasonalData[0] || { avgQuantitySold: 0 });
  const lowMonth = seasonalData.reduce((min, row) => row.avgQuantitySold < min.avgQuantitySold ? row : min, seasonalData[0] || { avgQuantitySold: Infinity });

  return {
    monthlyData: seasonalData.sort((a, b) => a.month - b.month),
    peakMonth: peakMonth.monthName,
    lowMonth: lowMonth.monthName,
    seasonalVariation: peakMonth.avgQuantitySold > 0 ? ((peakMonth.avgQuantitySold - lowMonth.avgQuantitySold) / peakMonth.avgQuantitySold * 100).toFixed(2) : "0.00",
  };
}

/**
 * Calculate optimal reorder point based on sales velocity and lead time
 * @param startDate - Start date for analysis
 * @param endDate - End date for analysis
 * @param leadTimeDays - Default lead time in days (default: 7)
 * @param safetyStockDays - Safety stock in days of supply (default: 3)
 * @returns Reorder point recommendations
 */
export async function getReorderPoints(startDate: Date, endDate: Date, leadTimeDays: number = 7, safetyStockDays: number = 3) {
  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const salesData = await db
    .select({
      productId: transactionItemsTable.productId,
      productName: productsTable.name,
      productCategory: productsTable.category,
      currentStock: productsTable.stock,
      lowStockThreshold: productsTable.lowStockThreshold,
      totalQuantitySold: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity}), 0)::int`,
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transactionId, transactionsTable.id))
    .innerJoin(productsTable, eq(transactionItemsTable.productId, productsTable.id))
    .where(and(gte(transactionsTable.createdAt, startDate), lte(transactionsTable.createdAt, endDate)))
    .groupBy(transactionItemsTable.productId, productsTable.name, productsTable.category, productsTable.stock, productsTable.lowStockThreshold);

  return salesData.map((row) => {
    const salesVelocityPerDay = (row.totalQuantitySold || 0) / daysInPeriod;
    const currentStock = row.currentStock || 0;

    // Reorder point = (daily sales rate * lead time) + safety stock
    const demandDuringLeadTime = salesVelocityPerDay * leadTimeDays;
    const safetyStock = salesVelocityPerDay * safetyStockDays;
    const reorderPoint = Math.ceil(demandDuringLeadTime + safetyStock);
    const suggestedReorderQuantity = Math.ceil(salesVelocityPerDay * 30); // 30 days supply

    const shouldReorder = currentStock <= reorderPoint;
    const urgency = shouldReorder ? (currentStock <= row.lowStockThreshold ? "immediate" : "soon") : "none";

    return {
      productId: row.productId,
      productName: row.productName,
      productCategory: row.productCategory,
      currentStock,
      salesVelocityPerDay,
      leadTimeDays,
      safetyStockDays,
      demandDuringLeadTime,
      safetyStock,
      reorderPoint,
      suggestedReorderQuantity,
      shouldReorder,
      urgency,
    };
  }).filter((row) => row.salesVelocityPerDay > 0); // Only include products with sales history
}

/**
 * Calculate stock turnover rate (cost of goods sold / average inventory)
 * @param startDate - Start date for analysis
 * @param endDate - End date for analysis
 * @returns Stock turnover analysis
 */
export async function getStockTurnover(startDate: Date, endDate: Date) {
  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const salesData = await db
    .select({
      productId: transactionItemsTable.productId,
      productName: productsTable.name,
      productCategory: productsTable.category,
      currentStock: productsTable.stock,
      price: productsTable.price,
      totalQuantitySold: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity}), 0)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(${transactionItemsTable.quantity} * ${transactionItemsTable.unitPrice}::numeric), 0)::float`,
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transactionId, transactionsTable.id))
    .innerJoin(productsTable, eq(transactionItemsTable.productId, productsTable.id))
    .where(and(gte(transactionsTable.createdAt, startDate), lte(transactionsTable.createdAt, endDate)))
    .groupBy(transactionItemsTable.productId, productsTable.name, productsTable.category, productsTable.stock, productsTable.price)
    .orderBy(desc(sql`SUM(${transactionItemsTable.quantity} * ${transactionItemsTable.unitPrice}::numeric)`));

  return salesData.map((row) => {
    const costOfGoodsSold = row.totalRevenue || 0;
    const averageInventoryValue = (row.currentStock || 0) * parseFloat(row.price || "0");
    const turnoverRate = averageInventoryValue > 0 ? costOfGoodsSold / averageInventoryValue : 0;
    const daysToSellInventory = turnoverRate > 0 ? daysInPeriod / turnoverRate : Infinity;

    return {
      productId: row.productId,
      productName: row.productName,
      productCategory: row.productCategory,
      currentStock: row.currentStock || 0,
      costOfGoodsSold,
      averageInventoryValue,
      turnoverRate,
      daysToSellInventory,
      classification: classifyTurnoverRate(turnoverRate),
      recommendation: getTurnoverRecommendation(turnoverRate, row.currentStock || 0),
    };
  });
}

/**
 * Classify turnover rate
 */
function classifyTurnoverRate(turnoverRate: number): string {
  if (turnoverRate >= 4) return "fast";
  if (turnoverRate >= 2) return "healthy";
  if (turnoverRate >= 1) return "slow";
  return "stagnant";
}

/**
 * Get recommendation based on turnover rate
 */
function getTurnoverRecommendation(turnoverRate: number, currentStock: number): string {
  if (turnoverRate >= 4) return "Consider increasing stock to meet high demand";
  if (turnoverRate >= 2) return "Stock levels are healthy";
  if (turnoverRate >= 1) return "Monitor stock levels closely";
  return "Consider clearance or reducing stock orders";
}
