---
name: reporting-analytics
description: Generating revenue reports, utilization reports, and peak hours analysis for business insights
---

# Reporting & Analytics

This skill covers generating revenue reports, utilization reports, and peak hours analysis in the Spa-Flow repository for business insights.

## Key Concepts

### Revenue Reports by Date Range
- Filter by date range
- Time granularity options (hourly, daily, weekly, monthly)
- Total revenue calculation
- Tax breakdown
- Transaction type breakdown
- MANAGER-only access

### Revenue Breakdown by Service Type
- Revenue by locker rentals
- Revenue by room rentals
- Revenue by memberships
- Revenue by products
- Percentage breakdown
- Trend analysis

### Locker Utilization Rates Over Time
- Historical occupancy data
- Utilization percentage calculation
- Time-based aggregation
- Peak/off-peak analysis
- Capacity planning insights
- MANAGER-only access

### Room Utilization Rates Over Time
- Historical occupancy data
- Utilization percentage calculation
- Time-based aggregation
- Peak/off-peak analysis
- Capacity planning insights
- MANAGER-only access

### Peak Hours Analysis for Rentals
- Identify busiest hours
- Day-of-week patterns
- Seasonal trends
- Resource allocation optimization
- Staff scheduling insights
- MANAGER-only access

### MANAGER-Only Access
- All report endpoints require MANAGER role
- Authorization middleware enforces access
- Returns 403 Forbidden for STAFF
- Audit log entry for access
- Sensitive business data

### Date Range Filtering
- Start date and end date parameters
- Inclusive date ranges
- Default to last 30 days
- Validation of date format
- Timezone handling

### Time Granularity Options
- `hourly` - Hour-by-hour breakdown
- `daily` - Day-by-day breakdown
- `weekly` - Week-by-week breakdown
- `monthly` - Month-by-month breakdown
- Configurable per report

## Key Files
- `artifacts/api-server/src/routes/reports.ts` - Report endpoints

## References
- `README.md` - Reporting features

## Common Tasks

### Generating Revenue Report
```typescript
const revenue = await db.query.transactions.findMany({
  where: and(
    gte(transactions.createdAt, startDate),
    lte(transactions.createdAt, endDate)
  ),
  orderBy: asc(transactions.createdAt)
});

// Group by time granularity
const grouped = groupByTime(revenue, granularity);
```

### Calculating Utilization Rate
```typescript
const totalSlots = await db.query.lockers.findMany();
const occupied = await db.query.lockers.findMany({
  where: eq(lockers.status, 'occupied')
});

const utilization = (occupied.length / totalSlots.length) * 100;
```

### Analyzing Peak Hours
```typescript
const rentals = await db.query.rentalSessions.findMany({
  where: gte(rentalSessions.createdAt, startDate)
});

const hourly = groupByHour(rentals);
const peakHour = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0];
```

## Best Practices
- Always enforce MANAGER-only access
- Use appropriate time granularity
- Cache report results when appropriate
- Validate date ranges
- Handle timezone differences
