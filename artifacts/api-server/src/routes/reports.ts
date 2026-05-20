import { Router } from "express";
import { db, transactionsTable, lockersTable, roomsTable, rentalSessionsTable } from "@workspace/db";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import { requireManager } from "../lib/auth";
import { apiLimiter } from "../middleware/rateLimit";

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

export default router;
