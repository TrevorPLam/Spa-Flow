# Load Testing with k6

This directory contains load test scripts for the SpaFlow API using k6.

## Prerequisites

Install k6:
```bash
# On macOS
brew install k6

# On Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E34C5A
sudo apt install -y k6

# On Windows
choco install k6

# Or using the k6 installer
# Download from https://k6.io/docs/getting-started/installation/
```

## Running Load Tests

### Run all tests
```bash
# Set API base URL (default: http://localhost:3000/api)
export API_BASE_URL=http://localhost:3000/api

# Run health check test
k6 run load-tests/health-check.ts

# Run client search test
k6 run load-tests/client-search.ts

# Run dashboard test
k6 run load-tests/dashboard.ts

# Run check-in flow test
k6 run load-tests/checkin-flow.ts
```

### Run with npm scripts
```bash
# From root directory
pnpm run test:load:health
pnpm run test:load:clients
pnpm run test:load:dashboard
pnpm run test:load:checkin
pnpm run test:load:all
```

### Run with custom API base URL
```bash
API_BASE_URL=http://localhost:3000/api k6 run load-tests/health-check.js
```

## Performance Baselines

**Note**: Baselines will be established after the first successful load test run. The API server must be running to execute load tests.

Expected performance targets based on thresholds configured in test scripts:

| Endpoint | p95 Response Time | Error Rate | Notes |
|----------|-------------------|------------|-------|
| /health | < 100ms | < 1% | Health check should be very fast |
| /clients (search) | < 300ms | < 1% | Client search with pagination |
| /dashboard | < 500ms | < 1% | Dashboard aggregates data |
| Check-in flow | < 1000ms | < 5% | Complex multi-step flow |

## Test Scenarios

### Health Check Test
- **Purpose**: Verify API health endpoint responds quickly
- **Load**: 10 VUs for 30 seconds
- **Thresholds**: p95 < 100ms, error rate < 1%

### Client Search Test
- **Purpose**: Test client search functionality under load
- **Load**: Ramp up to 50 VUs over 90 seconds
- **Thresholds**: p95 < 300ms, error rate < 1%

### Dashboard Test
- **Purpose**: Test dashboard endpoint under load
- **Load**: Ramp up to 30 VUs over 90 seconds
- **Thresholds**: p95 < 500ms, error rate < 1%

### Check-in Flow Test
- **Purpose**: Test the complete check-in flow (pricing, lockers, rooms)
- **Load**: Ramp up to 20 VUs over 90 seconds
- **Thresholds**: p95 < 1000ms, error rate < 5%

## CI/CD Integration

Load tests run on a schedule (daily) in GitHub Actions to:
- Detect performance regressions
- Establish performance trends over time
- Validate performance before deployments

Load tests do not run on every PR to conserve CI resources.

## Troubleshooting

### Connection Refused
Ensure the API server is running:
```bash
cd artifacts/api-server
pnpm run dev
```

### High Error Rates
- Check API server logs
- Verify database connectivity
- Check Redis connection
- Verify environment variables

### Slow Response Times
- Check database query performance
- Verify cache hit rates
- Check for resource exhaustion (CPU, memory)
- Review connection pool settings

## Adding New Tests

1. Create a new TypeScript file in this directory
2. Import the BASE_URL from k6.config.ts
3. Define options with stages and thresholds
4. Export a default function that performs the test
5. Add npm script to root package.json
6. Update this README with the new test details
