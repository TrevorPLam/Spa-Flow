import { Router } from "express";
import { db, transactionsTable, lockersTable, roomsTable, rentalSessionsTable, clientsTable, membershipsTable } from "@workspace/db";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import { requireManager } from "../lib/auth";
import { apiLimiter } from "../middleware/rateLimit";
import {
  getSalesVelocity,
  getLowStockPrediction,
  getCategoryPerformance,
  getSeasonalDemand,
  getReorderPoints,
  getStockTurnover,
} from "../services/inventory";

const router = Router();

/**
 * Get revenue report by date range with time granularity
 * Manager-only endpoint for financial reporting
 */
router.get("/reports/revenue", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate, granularity = "daily" } = req.query;

  // Validate granularity
  if (granularity !== "daily" && granularity !== "weekly" && granularity !== "monthly") {
    res.status(400).json({ error: "Invalid granularity. Must be daily, weekly, or monthly" });
    return;
  }

  // Set default date range to last 30 days if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Build date truncation expression based on granularity
  let dateTrunc: string;
  switch (granularity) {
    case "daily":
      dateTrunc = "DATE_TRUNC('day', created_at)";
      break;
    case "weekly":
      dateTrunc = "DATE_TRUNC('week', created_at)";
      break;
    case "monthly":
      dateTrunc = "DATE_TRUNC('month', created_at)";
      break;
    default:
      dateTrunc = "DATE_TRUNC('day', created_at)";
  }

  // Query revenue data grouped by date
  const revenueData = await db
    .select({
      date: sql.raw(dateTrunc),
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      transactionCount: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)))
    .groupBy(sql.raw(dateTrunc))
    .orderBy(sql.raw(dateTrunc));

  // Calculate totals
  const totalRevenue = revenueData.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0);
  const totalTax = revenueData.reduce((sum: number, row: any) => sum + (row.tax || 0), 0);
  const total = revenueData.reduce((sum: number, row: any) => sum + (row.total || 0), 0);

  res.json({
    data: revenueData.map((row: any) => ({
      date: row.date,
      revenue: row.revenue || 0,
      tax: row.tax || 0,
      total: row.total || 0,
      transactionCount: row.transactionCount || 0,
    })),
    totalRevenue,
    totalTax,
    total,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    granularity: granularity as string,
  });
});

/**
 * Get revenue breakdown by service type
 * Manager-only endpoint for understanding revenue sources
 */
router.get("/reports/revenue-by-type", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  // Set default date range to last 30 days if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Query revenue data grouped by transaction type
  const revenueByType = await db
    .select({
      type: transactionsTable.type,
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)))
    .groupBy(transactionsTable.type)
    .orderBy(sql`SUM(total::numeric) DESC`);

  // Calculate totals
  const totalRevenue = revenueByType.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0);
  const totalTax = revenueByType.reduce((sum: number, row: any) => sum + (row.tax || 0), 0);
  const total = revenueByType.reduce((sum: number, row: any) => sum + (row.total || 0), 0);

  res.json({
    data: revenueByType.map((row: any) => ({
      type: row.type,
      revenue: row.revenue || 0,
      tax: row.tax || 0,
      total: row.total || 0,
      count: row.count || 0,
    })),
    totalRevenue,
    totalTax,
    total,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get locker utilization rates over time
 * Manager-only endpoint for capacity planning
 */
router.get("/reports/utilization/lockers", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate, granularity = "daily" } = req.query;

  // Validate granularity
  if (granularity !== "daily" && granularity !== "weekly" && granularity !== "monthly") {
    res.status(400).json({ error: "Invalid granularity. Must be daily, weekly, or monthly" });
    return;
  }

  // Set default date range to last 30 days if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Get total locker count for capacity calculation
  const totalLockersResult = await db.select({ count: sql<number>`COUNT(*)::int` }).from(lockersTable);
  const totalLockers = totalLockersResult[0]?.count || 0;

  // Build date truncation expression based on granularity
  let dateTrunc: string;
  switch (granularity) {
    case "daily":
      dateTrunc = "DATE_TRUNC('day', start_time)";
      break;
    case "weekly":
      dateTrunc = "DATE_TRUNC('week', start_time)";
      break;
    case "monthly":
      dateTrunc = "DATE_TRUNC('month', start_time)";
      break;
    default:
      dateTrunc = "DATE_TRUNC('day', start_time)";
  }

  // Query locker utilization data grouped by time period
  const utilizationData = await db
    .select({
      date: sql.raw(dateTrunc),
      occupiedCount: sql<number>`COUNT(*)::int`,
      totalCapacity: sql<number>`${totalLockers}::int`,
    })
    .from(lockersTable)
    .where(
      and(
        gte(lockersTable.startTime, start),
        lte(lockersTable.startTime, end),
        eq(lockersTable.status, "occupied")
      )
    )
    .groupBy(sql.raw(dateTrunc))
    .orderBy(sql.raw(dateTrunc));

  // Calculate utilization percentage for each period
  const utilizationWithPercentage = utilizationData.map((row: any) => ({
    date: row.date,
    occupiedCount: row.occupiedCount || 0,
    totalCapacity: row.totalCapacity || 0,
    utilizationRate: row.totalCapacity > 0 ? ((row.occupiedCount / row.totalCapacity) * 100).toFixed(2) : "0.00",
  }));

  // Calculate average utilization
  const avgUtilization =
    utilizationWithPercentage.length > 0
      ? (
          utilizationWithPercentage.reduce((sum: number, row: any) => sum + parseFloat(row.utilizationRate), 0) /
          utilizationWithPercentage.length
        ).toFixed(2)
      : "0.00";

  res.json({
    data: utilizationWithPercentage,
    averageUtilization: parseFloat(avgUtilization),
    totalCapacity: totalLockers,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    granularity: granularity as string,
  });
});

/**
 * Get room utilization rates over time
 * Manager-only endpoint for capacity planning
 */
router.get("/reports/utilization/rooms", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate, granularity = "daily" } = req.query;

  // Validate granularity
  if (granularity !== "daily" && granularity !== "weekly" && granularity !== "monthly") {
    res.status(400).json({ error: "Invalid granularity. Must be daily, weekly, or monthly" });
    return;
  }

  // Set default date range to last 30 days if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Get total room count for capacity calculation
  const totalRoomsResult = await db.select({ count: sql<number>`COUNT(*)::int` }).from(roomsTable);
  const totalRooms = totalRoomsResult[0]?.count || 0;

  // Build date truncation expression based on granularity
  let dateTrunc: string;
  switch (granularity) {
    case "daily":
      dateTrunc = "DATE_TRUNC('day', start_time)";
      break;
    case "weekly":
      dateTrunc = "DATE_TRUNC('week', start_time)";
      break;
    case "monthly":
      dateTrunc = "DATE_TRUNC('month', start_time)";
      break;
    default:
      dateTrunc = "DATE_TRUNC('day', start_time)";
  }

  // Query room utilization data grouped by time period
  const utilizationData = await db
    .select({
      date: sql.raw(dateTrunc),
      occupiedCount: sql<number>`COUNT(*)::int`,
      totalCapacity: sql<number>`${totalRooms}::int`,
    })
    .from(roomsTable)
    .where(
      and(
        gte(roomsTable.startTime, start),
        lte(roomsTable.startTime, end),
        eq(roomsTable.status, "occupied")
      )
    )
    .groupBy(sql.raw(dateTrunc))
    .orderBy(sql.raw(dateTrunc));

  // Calculate utilization percentage for each period
  const utilizationWithPercentage = utilizationData.map((row: any) => ({
    date: row.date,
    occupiedCount: row.occupiedCount || 0,
    totalCapacity: row.totalCapacity || 0,
    utilizationRate: row.totalCapacity > 0 ? ((row.occupiedCount / row.totalCapacity) * 100).toFixed(2) : "0.00",
  }));

  // Calculate average utilization
  const avgUtilization =
    utilizationWithPercentage.length > 0
      ? (
          utilizationWithPercentage.reduce((sum: number, row: any) => sum + parseFloat(row.utilizationRate), 0) /
          utilizationWithPercentage.length
        ).toFixed(2)
      : "0.00";

  res.json({
    data: utilizationWithPercentage,
    averageUtilization: parseFloat(avgUtilization),
    totalCapacity: totalRooms,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    granularity: granularity as string,
  });
});

/**
 * Get peak hours analysis for rentals
 * Manager-only endpoint for identifying busiest times
 */
router.get("/reports/utilization/peak-hours", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  // Set default date range to last 30 days if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Query rental sessions grouped by hour of day (0-23)
  const peakHoursData = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM start_time)::int`,
      lockerRentals: sql<number>`COUNT(CASE WHEN resource_type = 'locker' THEN 1 END)::int`,
      roomRentals: sql<number>`COUNT(CASE WHEN resource_type = 'room' THEN 1 END)::int`,
      totalRentals: sql<number>`COUNT(*)::int`,
    })
    .from(rentalSessionsTable)
    .where(and(gte(rentalSessionsTable.startTime, start), lte(rentalSessionsTable.startTime, end)))
    .groupBy(sql`EXTRACT(HOUR FROM start_time)`)
    .orderBy(sql`EXTRACT(HOUR FROM start_time)`);

  // Find peak hour (hour with most total rentals)
  const peakHour =
    peakHoursData.length > 0
      ? peakHoursData.reduce((max: any, row: any) => (row.totalRentals > max.totalRentals ? row : max))
      : null;

  // Calculate average rentals per hour
  const totalRentals = peakHoursData.reduce((sum: number, row: any) => sum + (row.totalRentals || 0), 0);
  const avgRentalsPerHour = peakHoursData.length > 0 ? (totalRentals / peakHoursData.length).toFixed(2) : "0.00";

  res.json({
    data: peakHoursData.map((row: any) => ({
      hour: row.hour,
      lockerRentals: row.lockerRentals || 0,
      roomRentals: row.roomRentals || 0,
      totalRentals: row.totalRentals || 0,
    })),
    peakHour: peakHour ? { hour: peakHour.hour, totalRentals: peakHour.totalRentals } : null,
    averageRentalsPerHour: parseFloat(avgRentalsPerHour),
    totalRentals,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get revenue by membership type
 * Manager-only endpoint for understanding membership revenue contribution
 */
router.get("/reports/revenue/membership", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Join transactions with memberships to get membership type
  const revenueByMembership = await db
    .select({
      membershipType: membershipsTable.type,
      revenue: sql<number>`COALESCE(SUM(transactions.amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(transactions.tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(transactions.total::numeric), 0)::float`,
      count: sql<number>`COUNT(transactions.id)::int`,
    })
    .from(transactionsTable)
    .innerJoin(membershipsTable, eq(membershipsTable.transactionId, transactionsTable.id))
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)))
    .groupBy(membershipsTable.type)
    .orderBy(sql`SUM(transactions.total::numeric) DESC`);

  // Also get non-membership revenue for comparison
  const nonMembershipRevenue = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.createdAt, start),
        lte(transactionsTable.createdAt, end),
        sql`type != 'membership'`
      )
    );

  const totalRevenue = revenueByMembership.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0) + (nonMembershipRevenue[0]?.revenue || 0);
  const totalTax = revenueByMembership.reduce((sum: number, row: any) => sum + (row.tax || 0), 0) + (nonMembershipRevenue[0]?.tax || 0);
  const total = revenueByMembership.reduce((sum: number, row: any) => sum + (row.total || 0), 0) + (nonMembershipRevenue[0]?.total || 0);

  res.json({
    data: [
      ...revenueByMembership.map((row: any) => ({
        membershipType: row.membershipType,
        revenue: row.revenue || 0,
        tax: row.tax || 0,
        total: row.total || 0,
        count: row.count || 0,
      })),
      {
        membershipType: "non_membership",
        revenue: nonMembershipRevenue[0]?.revenue || 0,
        tax: nonMembershipRevenue[0]?.tax || 0,
        total: nonMembershipRevenue[0]?.total || 0,
        count: nonMembershipRevenue[0]?.count || 0,
      },
    ],
    totalRevenue,
    totalTax,
    total,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get revenue by time of day
 * Manager-only endpoint for understanding hourly revenue patterns
 */
router.get("/reports/revenue/time-of-day", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Query revenue grouped by hour of day (0-23)
  const revenueByHour = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM created_at)::int`,
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      transactionCount: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)))
    .groupBy(sql`EXTRACT(HOUR FROM created_at)`)
    .orderBy(sql`EXTRACT(HOUR FROM created_at)`);

  // Find peak hour (hour with most revenue)
  const peakHour =
    revenueByHour.length > 0
      ? revenueByHour.reduce((max: any, row: any) => (row.total > max.total ? row : max))
      : null;

  // Calculate totals
  const totalRevenue = revenueByHour.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0);
  const totalTax = revenueByHour.reduce((sum: number, row: any) => sum + (row.tax || 0), 0);
  const total = revenueByHour.reduce((sum: number, row: any) => sum + (row.total || 0), 0);

  res.json({
    data: revenueByHour.map((row: any) => ({
      hour: row.hour,
      revenue: row.revenue || 0,
      tax: row.tax || 0,
      total: row.total || 0,
      transactionCount: row.transactionCount || 0,
    })),
    peakHour: peakHour ? { hour: peakHour.hour, total: peakHour.total } : null,
    totalRevenue,
    totalTax,
    total,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get revenue by day of week
 * Manager-only endpoint for understanding weekly revenue patterns
 */
router.get("/reports/revenue/day-of-week", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Query revenue grouped by day of week (0=Sunday, 6=Saturday)
  const revenueByDay = await db
    .select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM created_at)::int`,
      dayName: sql<string>`TO_CHAR(created_at, 'Day')`,
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      transactionCount: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)))
    .groupBy(sql`EXTRACT(DOW FROM created_at)`, sql`TO_CHAR(created_at, 'Day')`)
    .orderBy(sql`EXTRACT(DOW FROM created_at)`);

  // Find best day (day with most revenue)
  const bestDay =
    revenueByDay.length > 0
      ? revenueByDay.reduce((max: any, row: any) => (row.total > max.total ? row : max))
      : null;

  // Calculate totals
  const totalRevenue = revenueByDay.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0);
  const totalTax = revenueByDay.reduce((sum: number, row: any) => sum + (row.tax || 0), 0);
  const total = revenueByDay.reduce((sum: number, row: any) => sum + (row.total || 0), 0);

  res.json({
    data: revenueByDay.map((row: any) => ({
      dayOfWeek: row.dayOfWeek,
      dayName: row.dayName?.trim(),
      revenue: row.revenue || 0,
      tax: row.tax || 0,
      total: row.total || 0,
      transactionCount: row.transactionCount || 0,
    })),
    bestDay: bestDay ? { dayOfWeek: bestDay.dayOfWeek, dayName: bestDay.dayName?.trim(), total: bestDay.total } : null,
    totalRevenue,
    totalTax,
    total,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get membership conversion rate
 * Manager-only endpoint for tracking non-member to member conversion
 */
router.get("/reports/analytics/conversion-rate", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Count unique clients who were non-members at start and became members during period
  const conversions = await db
    .select({
      count: sql<number>`COUNT(DISTINCT clients.id)::int`,
    })
    .from(clientsTable)
    .innerJoin(membershipsTable, eq(membershipsTable.clientId, clientsTable.id))
    .where(
      and(
        gte(membershipsTable.purchasedAt, start),
        lte(membershipsTable.purchasedAt, end)
      )
    );

  // Count total unique clients who had transactions during period
  const totalClients = await db
    .select({
      count: sql<number>`COUNT(DISTINCT client_id)::int`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)));

  const conversionCount = conversions[0]?.count || 0;
  const totalClientCount = totalClients[0]?.count || 0;
  const conversionRate = totalClientCount > 0 ? ((conversionCount / totalClientCount) * 100).toFixed(2) : "0.00";

  res.json({
    conversionCount,
    totalClients: totalClientCount,
    conversionRate: parseFloat(conversionRate),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get average transaction value
 * Manager-only endpoint for understanding transaction patterns
 */
router.get("/reports/analytics/avg-transaction", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Calculate average transaction value by type
  const avgByType = await db
    .select({
      type: transactionsTable.type,
      avgAmount: sql<number>`COALESCE(AVG(amount::numeric), 0)::float`,
      avgTotal: sql<number>`COALESCE(AVG(total::numeric), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)))
    .groupBy(transactionsTable.type)
    .orderBy(sql`SUM(total::numeric) DESC`);

  // Calculate overall average
  const overall = await db
    .select({
      avgAmount: sql<number>`COALESCE(AVG(amount::numeric), 0)::float`,
      avgTotal: sql<number>`COALESCE(AVG(total::numeric), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)));

  res.json({
    data: avgByType.map((row: any) => ({
      type: row.type,
      avgAmount: row.avgAmount || 0,
      avgTotal: row.avgTotal || 0,
      count: row.count || 0,
      totalRevenue: row.totalRevenue || 0,
    })),
    overall: {
      avgAmount: overall[0]?.avgAmount || 0,
      avgTotal: overall[0]?.avgTotal || 0,
      count: overall[0]?.count || 0,
      totalRevenue: overall[0]?.totalRevenue || 0,
    },
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get product vs rental revenue breakdown
 * Manager-only endpoint for understanding revenue sources
 */
router.get("/reports/revenue/breakdown", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Product revenue
  const productRevenue = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.createdAt, start),
        lte(transactionsTable.createdAt, end),
        eq(transactionsTable.type, "product")
      )
    );

  // Rental revenue (locker + room)
  const rentalRevenue = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.createdAt, start),
        lte(transactionsTable.createdAt, end),
        sql`type IN ('locker_rental', 'room_rental', 'renewal', 'extension')`
      )
    );

  // Membership revenue
  const membershipRevenue = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      tax: sql<number>`COALESCE(SUM(tax::numeric), 0)::float`,
      total: sql<number>`COALESCE(SUM(total::numeric), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.createdAt, start),
        lte(transactionsTable.createdAt, end),
        eq(transactionsTable.type, "membership")
      )
    );

  const totalRevenue = (productRevenue[0]?.revenue || 0) + (rentalRevenue[0]?.revenue || 0) + (membershipRevenue[0]?.revenue || 0);
  const totalTax = (productRevenue[0]?.tax || 0) + (rentalRevenue[0]?.tax || 0) + (membershipRevenue[0]?.tax || 0);
  const total = (productRevenue[0]?.total || 0) + (rentalRevenue[0]?.total || 0) + (membershipRevenue[0]?.total || 0);

  res.json({
    data: [
      {
        category: "product",
        revenue: productRevenue[0]?.revenue || 0,
        tax: productRevenue[0]?.tax || 0,
        total: productRevenue[0]?.total || 0,
        count: productRevenue[0]?.count || 0,
        percentage: total > 0 ? ((productRevenue[0]?.total || 0) / total * 100).toFixed(2) : "0.00",
      },
      {
        category: "rental",
        revenue: rentalRevenue[0]?.revenue || 0,
        tax: rentalRevenue[0]?.tax || 0,
        total: rentalRevenue[0]?.total || 0,
        count: rentalRevenue[0]?.count || 0,
        percentage: total > 0 ? ((rentalRevenue[0]?.total || 0) / total * 100).toFixed(2) : "0.00",
      },
      {
        category: "membership",
        revenue: membershipRevenue[0]?.revenue || 0,
        tax: membershipRevenue[0]?.tax || 0,
        total: membershipRevenue[0]?.total || 0,
        count: membershipRevenue[0]?.count || 0,
        percentage: total > 0 ? ((membershipRevenue[0]?.total || 0) / total * 100).toFixed(2) : "0.00",
      },
    ],
    totalRevenue,
    totalTax,
    total,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get discount/special usage analytics
 * Manager-only endpoint for tracking special pricing usage
 */
router.get("/reports/analytics/discounts", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  // Count transactions with birthday discounts (description contains "birthday")
  const birthdayDiscounts = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      totalDiscount: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.createdAt, start),
        lte(transactionsTable.createdAt, end),
        sql`description ILIKE '%birthday%'`
      )
    );

  // Count transactions with 18-24 discounts (description contains "1824" or "18-24")
  const age1824Discounts = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      totalDiscount: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.createdAt, start),
        lte(transactionsTable.createdAt, end),
        sql`(description ILIKE '%1824%' OR description ILIKE '%18-24%')`
      )
    );

  // Count transactions with weekend discounts (description contains "weekend")
  const weekendDiscounts = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      totalDiscount: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.createdAt, start),
        lte(transactionsTable.createdAt, end),
        sql`description ILIKE '%weekend%'`
      )
    );

  // Total transactions in period
  const totalTransactions = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, start), lte(transactionsTable.createdAt, end)));

  const totalCount = totalTransactions[0]?.count || 0;

  res.json({
    data: [
      {
        discountType: "birthday",
        count: birthdayDiscounts[0]?.count || 0,
        totalDiscount: birthdayDiscounts[0]?.totalDiscount || 0,
        percentage: totalCount > 0 ? ((birthdayDiscounts[0]?.count || 0) / totalCount * 100).toFixed(2) : "0.00",
      },
      {
        discountType: "age_1824",
        count: age1824Discounts[0]?.count || 0,
        totalDiscount: age1824Discounts[0]?.totalDiscount || 0,
        percentage: totalCount > 0 ? ((age1824Discounts[0]?.count || 0) / totalCount * 100).toFixed(2) : "0.00",
      },
      {
        discountType: "weekend",
        count: weekendDiscounts[0]?.count || 0,
        totalDiscount: weekendDiscounts[0]?.totalDiscount || 0,
        percentage: totalCount > 0 ? ((weekendDiscounts[0]?.count || 0) / totalCount * 100).toFixed(2) : "0.00",
      },
    ],
    totalTransactions: totalCount,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get sales velocity report for products
 * Manager-only endpoint for inventory management
 */
router.get("/reports/inventory/sales-velocity", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const salesVelocity = await getSalesVelocity(start, end);

  res.json({
    data: salesVelocity,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get low stock predictions based on sales trends
 * Manager-only endpoint for inventory planning
 */
router.get("/reports/inventory/low-stock-prediction", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const predictions = await getLowStockPrediction(start, end);

  res.json({
    data: predictions,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get product performance by category
 * Manager-only endpoint for category analysis
 */
router.get("/reports/inventory/category-performance", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const categoryPerformance = await getCategoryPerformance(start, end);

  res.json({
    data: categoryPerformance,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get seasonal demand analysis
 * Manager-only endpoint for seasonal pattern identification
 */
router.get("/reports/inventory/seasonal-demand", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const seasonalDemand = await getSeasonalDemand(start, end);

  res.json({
    data: seasonalDemand,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

/**
 * Get reorder point calculations
 * Manager-only endpoint for inventory replenishment planning
 */
router.get("/reports/inventory/reorder-points", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate, leadTimeDays = "7", safetyStockDays = "3" } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const leadTime = parseInt(leadTimeDays as string, 10);
  const safetyStock = parseInt(safetyStockDays as string, 10);

  if (isNaN(leadTime) || isNaN(safetyStock) || leadTime < 0 || safetyStock < 0) {
    res.status(400).json({ error: "Invalid lead time or safety stock days. Must be positive integers" });
    return;
  }

  const reorderPoints = await getReorderPoints(start, end, leadTime, safetyStock);

  res.json({
    data: reorderPoints,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    leadTimeDays: leadTime,
    safetyStockDays: safetyStock,
  });
});

/**
 * Get stock turnover rate analysis
 * Manager-only endpoint for inventory efficiency metrics
 */
router.get("/reports/inventory/stock-turnover", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 format" });
    return;
  }

  if (start > end) {
    res.status(400).json({ error: "Start date must be before end date" });
    return;
  }

  const stockTurnover = await getStockTurnover(start, end);

  res.json({
    data: stockTurnover,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
});

export default router;
