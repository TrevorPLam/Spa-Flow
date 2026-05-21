---
name: load-testing
description: Creating and running k6 load tests for performance validation and capacity planning
---

# Load Testing

This skill covers creating and running k6 load tests in the Spa-Flow repository for performance validation and capacity planning.

## Key Concepts

### k6 Scenario Patterns
- Define test scenarios
- Configure virtual users
- Set duration and ramp-up
- Configure thresholds
- Define request patterns

### Smoke Tests (Quick Validation)
- Quick performance check
- Low load (1-10 users)
- Short duration (1-5 minutes)
- Validates basic functionality
- Fast feedback

### Health Check Tests
- Test health endpoints
- `/healthz/live` and `/healthz/ready`
- Validates service availability
- Checks all dependencies
- Quick validation

### Client Search Load Tests
- Test client search endpoint
- Variable search queries
- Cache hit/miss testing
- Performance under load
- Database query optimization

### Dashboard Load Tests
- Test dashboard endpoint
- Aggregated data queries
- Cache effectiveness
- Complex query performance
- Real-world usage simulation

### Check-in Flow Load Tests
- Full check-in flow testing
- Payment processing under load
- Resource assignment
- Transaction creation
- End-to-end performance

### Load Test URL Configuration
- Configure BASE_URL for tests
- Include `/api/v1` prefix
- Environment-specific URLs
- Local vs production testing
- Configurable via environment

### BASE_URL Configuration
- Environment variable: `BASE_URL`
- Default: `http://localhost:5000`
- Override for different environments
- Used in all k6 scripts
- Consistent URL configuration

### Load Test Execution Commands
- `pnpm run test:load:smoke` - Smoke tests
- `pnpm run test:load:health` - Health check
- `pnpm run test:load:clients` - Client search
- `pnpm run test:load:dashboard` - Dashboard
- `pnpm run test:load:checkin` - Check-in flow
- `pnpm run test:load:all` - All tests

### Performance Metrics Interpretation
- Response times (p95, p99)
- Request throughput
- Error rates
- Resource utilization
- Threshold violations

## Key Files
- `load-tests/smoke.js` - Smoke test
- `load-tests/health-check.js` - Health check
- `load-tests/client-search.js` - Client search
- `load-tests/dashboard.js` - Dashboard
- `load-tests/checkin-flow.js` - Check-in flow
- `load-tests/README.md` - Load test documentation

## References
- `README.md` - Load testing commands
- TODO.md TASK-022 - Load test URL configuration fixes

## Common Tasks

### Running a Load Test
```bash
# Smoke test
pnpm run test:load:smoke

# All tests
pnpm run test:load:all
```

### Writing a k6 Test
```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/v1/clients`);
  check(res, {
    'status was 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Configuring Scenarios
```javascript
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};
```

### Setting BASE_URL
```bash
BASE_URL=http://localhost:5000 pnpm run test:load:smoke
```

## Best Practices
- Start with smoke tests
- Use realistic load patterns
- Monitor thresholds
- Test in staging before production
- Analyze results thoroughly
