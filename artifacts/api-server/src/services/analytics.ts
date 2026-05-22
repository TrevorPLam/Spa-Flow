import { db, rentalSessionsTable, transactionsTable, clientsTable } from "@workspace/db";
import { sql, gte, lte, and, eq, desc } from "drizzle-orm";

/**
 * Client Behavior Analytics Service
 * Provides metrics for visit frequency, duration, CLV, churn risk, and segmentation
 */

/**
 * Calculate visit frequency per client
 * Returns visits per month, frequent visitors, and visit patterns
 */
export async function getVisitFrequency(startDate: Date, endDate: Date) {
  const visitFrequency = await db
    .select({
      clientId: rentalSessionsTable.clientId,
      clientName: clientsTable.name,
      visitCount: sql<number>`COUNT(*)::int`,
      firstVisit: sql<Date>`MIN(start_time)`,
      lastVisit: sql<Date>`MAX(start_time)`,
    })
    .from(rentalSessionsTable)
    .innerJoin(clientsTable, eq(clientsTable.id, rentalSessionsTable.clientId))
    .where(and(gte(rentalSessionsTable.startTime, startDate), lte(rentalSessionsTable.startTime, endDate)))
    .groupBy(rentalSessionsTable.clientId, clientsTable.name)
    .orderBy(desc(sql`COUNT(*)`));

  // Calculate visits per month for each client
  const monthsDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const withMonthlyRate = visitFrequency.map((row) => ({
    clientId: row.clientId,
    clientName: row.clientName,
    visitCount: row.visitCount,
    visitsPerMonth: (row.visitCount / monthsDiff).toFixed(2),
    firstVisit: row.firstVisit,
    lastVisit: row.lastVisit,
  }));

  // Identify frequent visitors (>= 4 visits/month)
  const frequentVisitors = withMonthlyRate.filter((row) => parseFloat(row.visitsPerMonth) >= 4);

  return {
    data: withMonthlyRate,
    frequentVisitors,
    totalClients: withMonthlyRate.length,
    frequentVisitorCount: frequentVisitors.length,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Calculate average visit duration per client
 * Returns average session duration and duration-based segmentation
 */
export async function getAverageVisitDuration(startDate: Date, endDate: Date) {
  const visitDuration = await db
    .select({
      clientId: rentalSessionsTable.clientId,
      clientName: clientsTable.name,
      avgDurationMinutes: sql<number>`AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60)::float`,
      totalVisits: sql<number>`COUNT(*)::int`,
    })
    .from(rentalSessionsTable)
    .innerJoin(clientsTable, eq(clientsTable.id, rentalSessionsTable.clientId))
    .where(
      and(
        gte(rentalSessionsTable.startTime, startDate),
        lte(rentalSessionsTable.startTime, endDate),
        sql`end_time IS NOT NULL`
      )
    )
    .groupBy(rentalSessionsTable.clientId, clientsTable.name)
    .orderBy(desc(sql`AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60)`));

  // Segment by duration
  const longVisits = visitDuration.filter((row) => row.avgDurationMinutes >= 120); // 2+ hours
  const shortVisits = visitDuration.filter((row) => row.avgDurationMinutes < 60); // < 1 hour

  return {
    data: visitDuration.map((row) => ({
      clientId: row.clientId,
      clientName: row.clientName,
      avgDurationMinutes: row.avgDurationMinutes || 0,
      totalVisits: row.totalVisits || 0,
      segment: row.avgDurationMinutes >= 120 ? "long" : row.avgDurationMinutes < 60 ? "short" : "medium",
    })),
    longVisitCount: longVisits.length,
    shortVisitCount: shortVisits.length,
    overallAvgDuration:
      visitDuration.length > 0
        ? (visitDuration.reduce((sum, row) => sum + (row.avgDurationMinutes || 0), 0) / visitDuration.length).toFixed(2)
        : "0.00",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Analyze peak client hours
 * Returns check-in distribution by hour and day of week
 */
export async function getPeakHoursAnalysis(startDate: Date, endDate: Date) {
  const hourlyDistribution = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM start_time)::int`,
      dayOfWeek: sql<number>`EXTRACT(DOW FROM start_time)::int`,
      dayName: sql<string>`TO_CHAR(start_time, 'Day')`,
      visitCount: sql<number>`COUNT(*)::int`,
    })
    .from(rentalSessionsTable)
    .where(and(gte(rentalSessionsTable.startTime, startDate), lte(rentalSessionsTable.startTime, endDate)))
    .groupBy(sql`EXTRACT(HOUR FROM start_time)`, sql`EXTRACT(DOW FROM start_time)`, sql`TO_CHAR(start_time, 'Day')`)
    .orderBy(sql`EXTRACT(DOW FROM start_time)`, sql`EXTRACT(HOUR FROM start_time)`);

  // Find peak hour overall
  const peakHour = hourlyDistribution.length > 0 
    ? hourlyDistribution.reduce((max, row) => (row.visitCount > max.visitCount ? row : max))
    : null;

  // Aggregate by hour across all days
  const hourlyAggregated = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM start_time)::int`,
      visitCount: sql<number>`COUNT(*)::int`,
    })
    .from(rentalSessionsTable)
    .where(and(gte(rentalSessionsTable.startTime, startDate), lte(rentalSessionsTable.startTime, endDate)))
    .groupBy(sql`EXTRACT(HOUR FROM start_time)`)
    .orderBy(sql`EXTRACT(HOUR FROM start_time)`);

  return {
    hourlyData: hourlyAggregated.map((row) => ({
      hour: row.hour,
      visitCount: row.visitCount || 0,
    })),
    detailedData: hourlyDistribution.map((row) => ({
      hour: row.hour,
      dayOfWeek: row.dayOfWeek,
      dayName: row.dayName?.trim(),
      visitCount: row.visitCount || 0,
    })),
    peakHour: peakHour ? { hour: peakHour.hour, dayName: peakHour.dayName?.trim(), visitCount: peakHour.visitCount } : null,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Calculate client lifetime value (CLV)
 * Returns total revenue per client and CLV-based segmentation
 */
export async function getClientLifetimeValue(startDate: Date, endDate: Date) {
  const clientRevenue = await db
    .select({
      clientId: clientsTable.id,
      clientName: clientsTable.name,
      totalRevenue: sql<number>`COALESCE(SUM(transactions.total::numeric), 0)::float`,
      transactionCount: sql<number>`COUNT(transactions.id)::int`,
      firstTransaction: sql<Date>`MIN(transactions.created_at)`,
      lastTransaction: sql<Date>`MAX(transactions.created_at)`,
    })
    .from(clientsTable)
    .leftJoin(transactionsTable, eq(transactionsTable.clientId, clientsTable.id))
    .where(
      and(
        gte(transactionsTable.createdAt, startDate),
        lte(transactionsTable.createdAt, endDate)
      )
    )
    .groupBy(clientsTable.id, clientsTable.name)
    .orderBy(desc(sql`SUM(transactions.total::numeric)`));

  // Segment by CLV tiers
  const highValue = clientRevenue.filter((row) => row.totalRevenue >= 500);
  const mediumValue = clientRevenue.filter((row) => row.totalRevenue >= 100 && row.totalRevenue < 500);
  const lowValue = clientRevenue.filter((row) => row.totalRevenue < 100);

  return {
    data: clientRevenue.map((row) => ({
      clientId: row.clientId,
      clientName: row.clientName,
      totalRevenue: row.totalRevenue || 0,
      transactionCount: row.transactionCount || 0,
      avgTransactionValue: row.transactionCount > 0 ? (row.totalRevenue / row.transactionCount).toFixed(2) : "0.00",
      firstTransaction: row.firstTransaction,
      lastTransaction: row.lastTransaction,
      clvTier: row.totalRevenue >= 500 ? "high" : row.totalRevenue >= 100 ? "medium" : "low",
    })),
    highValueCount: highValue.length,
    mediumValueCount: mediumValue.length,
    lowValueCount: lowValue.length,
    totalRevenue: clientRevenue.reduce((sum, row) => sum + (row.totalRevenue || 0), 0),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Analyze churn risk
 * Identifies members not visiting in 30/60/90 days and calculates churn risk score
 */
export async function getChurnRiskAnalysis(asOfDate: Date = new Date()) {
  const thirtyDaysAgo = new Date(asOfDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date(asOfDate);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const ninetyDaysAgo = new Date(asOfDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get clients with last visit date
  const clientLastVisit = await db
    .select({
      clientId: clientsTable.id,
      clientName: clientsTable.name,
      membershipStatus: clientsTable.membershipStatus,
      membershipExpiresAt: clientsTable.membershipExpiresAt,
      lastVisit: sql<Date>`MAX(rental_sessions.start_time)`,
      totalVisits: sql<number>`COUNT(rental_sessions.id)::int`,
    })
    .from(clientsTable)
    .leftJoin(rentalSessionsTable, eq(rentalSessionsTable.clientId, clientsTable.id))
    .groupBy(clientsTable.id, clientsTable.name, clientsTable.membershipStatus, clientsTable.membershipExpiresAt);

  // Calculate churn risk based on days since last visit
  const withRiskScore = clientLastVisit.map((row) => {
    const daysSinceLastVisit = row.lastVisit
      ? Math.floor((asOfDate.getTime() - new Date(row.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      : 999; // Never visited

    let riskScore = 0;
    let riskLevel = "low";

    if (daysSinceLastVisit >= 90) {
      riskScore = 100;
      riskLevel = "critical";
    } else if (daysSinceLastVisit >= 60) {
      riskScore = 75;
      riskLevel = "high";
    } else if (daysSinceLastVisit >= 30) {
      riskScore = 50;
      riskLevel = "medium";
    }

    // Increase risk if membership is expired
    if (row.membershipExpiresAt && new Date(row.membershipExpiresAt) < asOfDate) {
      riskScore = Math.min(100, riskScore + 20);
      if (riskLevel === "low") riskLevel = "medium";
    }

    return {
      clientId: row.clientId,
      clientName: row.clientName,
      membershipStatus: row.membershipStatus,
      membershipExpiresAt: row.membershipExpiresAt,
      lastVisit: row.lastVisit,
      totalVisits: row.totalVisits || 0,
      daysSinceLastVisit,
      riskScore,
      riskLevel,
    };
  });

  // Filter at-risk clients
  const atRiskClients = withRiskScore.filter((row) => row.riskScore >= 50);
  const criticalRisk = withRiskScore.filter((row) => row.riskLevel === "critical");
  const highRisk = withRiskScore.filter((row) => row.riskLevel === "high");
  const mediumRisk = withRiskScore.filter((row) => row.riskLevel === "medium");

  return {
    data: withRiskScore,
    atRiskClients,
    criticalRiskCount: criticalRisk.length,
    highRiskCount: highRisk.length,
    mediumRiskCount: mediumRisk.length,
    totalClients: withRiskScore.length,
    asOfDate: asOfDate.toISOString(),
  };
}

/**
 * Segment clients by visit patterns, revenue tier, membership type, and visit duration
 */
export async function getClientSegmentation(startDate: Date, endDate: Date) {
  // Get visit frequency data
  const visitFrequency = await getVisitFrequency(startDate, endDate);
  
  // Get CLV data
  const clvData = await getClientLifetimeValue(startDate, endDate);
  
  // Get duration data
  const durationData = await getAverageVisitDuration(startDate, endDate);

  // Combine all data for comprehensive segmentation
  const clientMap = new Map<number, any>();

  // Add visit frequency
  visitFrequency.data.forEach((row: any) => {
    clientMap.set(row.clientId, {
      clientId: row.clientId,
      clientName: row.clientName,
      visitPattern: parseFloat(row.visitsPerMonth) >= 4 ? "frequent" : parseFloat(row.visitsPerMonth) >= 1 ? "occasional" : "rare",
      visitsPerMonth: row.visitsPerMonth,
    });
  });

  // Add CLV tier
  clvData.data.forEach((row: any) => {
    const existing = clientMap.get(row.clientId) || { clientId: row.clientId, clientName: row.clientName };
    clientMap.set(row.clientId, {
      ...existing,
      revenueTier: row.clvTier,
      totalRevenue: row.totalRevenue,
    });
  });

  // Add duration segment
  durationData.data.forEach((row: any) => {
    const existing = clientMap.get(row.clientId) || { clientId: row.clientId, clientName: row.clientName };
    clientMap.set(row.clientId, {
      ...existing,
      durationSegment: row.segment,
      avgDurationMinutes: row.avgDurationMinutes,
    });
  });

  // Get membership status for all clients
  const allClients = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      membershipStatus: clientsTable.membershipStatus,
    })
    .from(clientsTable);

  allClients.forEach((client) => {
    const existing = clientMap.get(client.id) || { clientId: client.id, clientName: client.name };
    clientMap.set(client.id, {
      ...existing,
      membershipType: client.membershipStatus,
    });
  });

  const segmentedClients = Array.from(clientMap.values());

  // Count segments
  const visitPatternCounts = {
    frequent: segmentedClients.filter((c) => c.visitPattern === "frequent").length,
    occasional: segmentedClients.filter((c) => c.visitPattern === "occasional").length,
    rare: segmentedClients.filter((c) => c.visitPattern === "rare").length,
  };

  const revenueTierCounts = {
    high: segmentedClients.filter((c) => c.revenueTier === "high").length,
    medium: segmentedClients.filter((c) => c.revenueTier === "medium").length,
    low: segmentedClients.filter((c) => c.revenueTier === "low").length,
  };

  const membershipTypeCounts = {
    none: segmentedClients.filter((c) => c.membershipType === "none").length,
    one_time: segmentedClients.filter((c) => c.membershipType === "one_time").length,
    six_month: segmentedClients.filter((c) => c.membershipType === "six_month").length,
  };

  return {
    data: segmentedClients,
    visitPatternCounts,
    revenueTierCounts,
    membershipTypeCounts,
    totalClients: segmentedClients.length,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}
