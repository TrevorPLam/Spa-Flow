import * as Sentry from "@sentry/node";
import { logger } from "./logger";
import { isSentryInitialized } from "./sentry";

/**
 * Performance monitoring service for tracking application metrics
 * Tracks response times, error rates, database query times, memory usage
 */

interface MetricData {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

interface AlertRule {
  name: string;
  threshold: number;
  comparison: "gt" | "lt" | "eq";
  enabled: boolean;
}

// Alert rules for critical failures
const alertRules: Record<string, AlertRule> = {
  errorRate: { name: "error_rate", threshold: 0.05, comparison: "gt", enabled: true }, // 5% error rate
  responseTime: { name: "response_time", threshold: 5000, comparison: "gt", enabled: true }, // 5 seconds
  databaseLatency: { name: "database_latency", threshold: 1000, comparison: "gt", enabled: true }, // 1 second
  memoryUsage: { name: "memory_usage", threshold: 0.9, comparison: "gt", enabled: true }, // 90% memory
};

// Metric storage for rolling window (in-memory for now, could be moved to Redis)
const metricHistory: Map<string, number[]> = new Map();
const MAX_HISTORY_SIZE = 1000;

/**
 * Record a metric value
 */
export function recordMetric(data: MetricData): void {
  const history = metricHistory.get(data.name) || [];
  history.push(data.value);
  
  // Keep only recent values
  if (history.length > MAX_HISTORY_SIZE) {
    history.shift();
  }
  
  metricHistory.set(data.name, history);
  
  // Check alert rules
  checkAlerts(data.name, data.value);
  
  // Send to Sentry if available
  if (isSentryInitialized()) {
    Sentry.addBreadcrumb({
      category: "metric",
      message: `${data.name}: ${data.value}${data.unit}`,
      level: "info",
      data: { ...data, tags: data.tags || {} },
    });
  }
}

/**
 * Get average value for a metric
 */
export function getMetricAverage(name: string): number {
  const history = metricHistory.get(name);
  if (!history || history.length === 0) {
    return 0;
  }
  
  const sum = history.reduce((acc, val) => acc + val, 0);
  return sum / history.length;
}

/**
 * Get percentile value for a metric
 */
export function getMetricPercentile(name: string, percentile: number): number {
  const history = metricHistory.get(name);
  if (!history || history.length === 0) {
    return 0;
  }
  
  const sorted = [...history].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Check if metric triggers any alert rules
 */
function checkAlerts(metricName: string, value: number): void {
  const rule = alertRules[metricName];
  if (!rule || !rule.enabled) {
    return;
  }
  
  let triggered = false;
  switch (rule.comparison) {
    case "gt":
      triggered = value > rule.threshold;
      break;
    case "lt":
      triggered = value < rule.threshold;
      break;
    case "eq":
      triggered = value === rule.threshold;
      break;
  }
  
  if (triggered) {
    logger.error({
      metric: metricName,
      value,
      threshold: rule.threshold,
      comparison: rule.comparison,
    }, `Alert triggered: ${metricName} exceeded threshold`);
    
    if (isSentryInitialized()) {
      Sentry.captureMessage(`Alert triggered: ${metricName} exceeded threshold`, "warning");
    }
  }
}

/**
 * Measure database query performance
 */
export async function measureDatabaseQuery<T>(
  operation: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await query();
    const duration = Date.now() - startTime;
    
    recordMetric({
      name: "database_query_duration",
      value: duration,
      unit: "ms",
      tags: { operation },
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    recordMetric({
      name: "database_query_error",
      value: duration,
      unit: "ms",
      tags: { operation },
    });
    
    throw error;
  }
}

/**
 * Measure API response time
 */
export function measureResponseTime(
  route: string,
  method: string
): {
  start: () => void;
  end: () => void;
} {
  let startTime: number;
  
  return {
    start: () => {
      startTime = Date.now();
    },
    end: () => {
      const duration = Date.now() - startTime;
      
      recordMetric({
        name: "api_response_time",
        value: duration,
        unit: "ms",
        tags: { route, method },
      });
    },
  };
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} {
  const usage = process.memoryUsage();
  const used = usage.heapUsed / 1024 / 1024; // MB
  const total = usage.heapTotal / 1024 / 1024; // MB
  const percentage = used / total;
  
  recordMetric({
    name: "memory_usage",
    value: percentage,
    unit: "%",
  });
  
  return { used, total, percentage };
}

/**
 * Get system health metrics
 */
export async function getHealthMetrics(): Promise<{
  memory: ReturnType<typeof getMemoryUsage>;
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  avgDatabaseLatency: number;
}> {
  const memory = getMemoryUsage();
  const uptime = process.uptime();
  
  // Calculate error rate from recent history
  const errorHistory = metricHistory.get("database_query_error") || [];
  const totalHistory = metricHistory.get("database_query_duration") || [];
  const errorRate = totalHistory.length > 0 
    ? errorHistory.length / totalHistory.length 
    : 0;
  
  return {
    memory,
    uptime,
    errorRate,
    avgResponseTime: getMetricAverage("api_response_time"),
    p95ResponseTime: getMetricPercentile("api_response_time", 95),
    avgDatabaseLatency: getMetricAverage("database_query_duration"),
  };
}

/**
 * Clear metric history (useful for testing)
 */
export function clearMetrics(): void {
  metricHistory.clear();
}
