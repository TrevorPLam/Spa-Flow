# Monitoring and Alerting

This document describes the monitoring and alerting infrastructure for Spa-Flow.

## Overview

Spa-Flow includes comprehensive monitoring and alerting capabilities to ensure system reliability and performance:

- **Error Tracking**: Sentry integration for error tracking and performance monitoring
- **Health Checks**: Liveness and readiness probes for all dependencies
- **Performance Monitoring**: Real-time metrics for response times, database latency, memory usage
- **Critical Alerts**: Automated alerting for system failures
- **Log Aggregation**: Structured logging with correlation IDs for distributed tracing
- **Monitoring Dashboard**: Manager-only UI for system health visualization
- **Uptime Monitoring**: Automated uptime checks via GitHub Actions

## Sentry Error Tracking

### Configuration

Sentry is configured in `artifacts/api-server/src/lib/sentry.ts`. To enable Sentry:

1. Set `SENTRY_DSN` in your environment (see `.env.example`)
2. Configure `SENTRY_ENVIRONMENT` (development, staging, production)
3. Optionally set `SENTRY_RELEASE` for version tracking

### Features

- **Error Capture**: Automatic error capture with stack traces
- **User Context**: User information attached to errors (when authenticated)
- **Request Context**: Route, method, and request ID for tracing
- **Performance Monitoring**: Transaction sampling (10% in production, 100% in development)
- **Sensitive Data Filtering**: Authorization headers, cookies, and tokens automatically filtered

### Source Maps

Source maps are uploaded to Sentry during the build process:

```bash
pnpm run build:sentry
```

## Health Checks

### Endpoints

#### Liveness Probe
- **Endpoint**: `GET /healthz/live`
- **Purpose**: Check if the application is running
- **Response**: `{ status: "ok", uptime: number, timestamp: string }`
- **Use Case**: Kubernetes liveness probe, load balancer health checks

#### Readiness Probe
- **Endpoint**: `GET /healthz/ready`
- **Purpose**: Check if dependencies are available
- **Response**: `{ status: "ready" | "not_ready", checks: { ... } }`
- **Checks**:
  - `database`: PostgreSQL connectivity
  - `square`: Square API connectivity (degraded if not configured)
  - `twilio`: Twilio API connectivity (degraded if not configured)
  - `redis`: Redis connectivity (degraded if not configured)
  - `jwt_secret`: JWT secret configuration
  - `encryption_key`: Encryption key configuration
  - `disk_space`: Disk space availability
- **Use Case**: Kubernetes readiness probe, deployment health checks

### Health Check Status

- **healthy**: All checks passed
- **unhealthy**: Critical failure (blocks readiness)
- **degraded**: Non-critical issue (does not block readiness)

## Performance Monitoring

### Metrics Service

The performance monitoring service (`artifacts/api-server/src/lib/monitoring.ts`) tracks:

- **API Response Time**: Average and P95 response times
- **Database Latency**: Query execution times
- **Memory Usage**: Heap memory usage percentage
- **Error Rate**: Percentage of failed requests
- **System Uptime**: Application uptime in seconds

### Alert Rules

Critical alerts are triggered when:

- **Error Rate**: > 5%
- **Response Time**: > 5 seconds
- **Database Latency**: > 1 second
- **Memory Usage**: > 90%

Alerts are logged and sent to Sentry when triggered.

### Using the Monitoring Service

```typescript
import { recordMetric, measureResponseTime, getHealthMetrics } from "./lib/monitoring";

// Record a custom metric
recordMetric({
  name: "custom_operation",
  value: 123,
  unit: "ms",
  tags: { operation: "process_payment" },
});

// Measure API response time
const timer = measureResponseTime("/api/v1/checkin", "POST");
timer.start();
// ... process request
timer.end();

// Get health metrics
const metrics = await getHealthMetrics();
console.log(metrics.memory, metrics.avgResponseTime);
```

## Log Aggregation

### Structured Logging

Logs are structured using Pino with the following features:

- **JSON Format**: Production logs in JSON for easy parsing
- **Pretty Printing**: Development logs with colors for readability
- **Sensitive Data Redaction**: Authorization headers and cookies automatically redacted
- **Correlation IDs**: Unique IDs for request tracing

### Correlation IDs

Generate and use correlation IDs for distributed tracing:

```typescript
import { generateCorrelationId, createCorrelationLogger } from "./lib/logger";

const correlationId = generateCorrelationId();
const logger = createCorrelationLogger(correlationId, { userId: 123 });

logger.info("Processing request");
```

### Log Levels

Configure log level via `LOG_LEVEL` environment variable:

- `error`: Only error messages
- `warn`: Warnings and errors
- `info`: General information (default)
- `debug`: Detailed debugging information

## Monitoring Dashboard

### Access

The monitoring dashboard is available at `/monitoring` (manager-only access).

### Metrics Displayed

- **Memory Usage**: Current memory usage with percentage
- **System Uptime**: Total uptime in days/hours/minutes
- **Error Rate**: Percentage of recent request errors
- **Average Response Time**: Mean API response time
- **P95 Response Time**: 95th percentile response time
- **Database Latency**: Average query latency

### Status Indicators

Each metric displays a status badge:

- **Healthy**: Green badge with checkmark
- **Warning**: Yellow badge with alert icon
- **Critical**: Red badge with X icon

### Auto-Refresh

The dashboard auto-refreshes every 30 seconds.

## Uptime Monitoring

### GitHub Actions Workflow

The uptime monitoring workflow (`.github/workflows/monitoring.yml`) runs every 5 minutes:

1. Checks liveness endpoint (`/healthz/live`)
2. Checks readiness endpoint (`/healthz/ready`)
3. Logs success or failure
4. Can be extended with Slack/email alerts

### Configuration

Set the `MONITORING_URL` secret in GitHub repository settings:

```
https://your-api-domain.com
```

### Extending Alerts

Add Slack or email alerts in the workflow:

```yaml
- name: Alert on Failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"🚨 Uptime monitoring failed"}'
```

## Troubleshooting

### Sentry Not Receiving Errors

1. Verify `SENTRY_DSN` is set correctly
2. Check network connectivity to Sentry
3. Review Sentry initialization logs
4. Ensure source maps are uploaded for production

### Health Checks Failing

1. Check database connectivity: `psql $DATABASE_URL`
2. Verify Redis is running: `redis-cli ping`
3. Check Square/Twilio credentials
4. Verify JWT_SECRET and ENCRYPTION_KEY are set
5. Check disk space on the server

### High Memory Usage

1. Review memory metrics in monitoring dashboard
2. Check for memory leaks in application code
3. Review database connection pool settings
4. Consider increasing server memory

### Slow Response Times

1. Review P95 response time metrics
2. Check database query performance
3. Review database indexes
4. Check for N+1 query patterns
5. Review external API call latency

## On-Call Rotation

### Alert Escalation

1. **Immediate**: Critical alerts (Sentry, uptime monitoring)
2. **Within 1 hour**: Warning alerts (high memory, slow response times)
3. **Within 24 hours**: Degraded status (external service issues)

### Contact Information

Update with your team's on-call contact information:

- **Primary On-Call**: [Phone/Email]
- **Secondary On-Call**: [Phone/Email]
- **Escalation Manager**: [Phone/Email]

## References

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Pino Logger Documentation](https://getpino.io/)
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Microservices Health Check Pattern](https://microservices.io/patterns/observability/health-check-api.html)
