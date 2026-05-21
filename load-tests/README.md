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
# Set API base URL (default: http://localhost:5000/api/v1)
export API_BASE_URL=http://localhost:5000/api/v1

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
pnpm run test:load:smoke
pnpm run test:load:health
pnpm run test:load:clients
pnpm run test:load:dashboard
pnpm run test:load:checkin
pnpm run test:load:all
```

### Run with custom API base URL
```bash
API_BASE_URL=http://localhost:5000/api/v1 k6 run load-tests/health-check.js
```

### Run smoke test locally
```bash
# Ensure API server is running first
cd artifacts/api-server
pnpm run dev

# In another terminal, wait for server to be healthy
./scripts/wait-for-server.sh http://localhost:5000/health

# Then run smoke test
API_BASE_URL=http://localhost:5000/api/v1 pnpm run test:load:smoke
```

### Health Check Script
The repository includes a health check script at `scripts/wait-for-server.sh` that uses exponential backoff to wait for the server to be healthy before running load tests. This is preferred over hardcoded sleep delays.

**Usage:**
```bash
./scripts/wait-for-server.sh <URL> [MAX_RETRIES] [INITIAL_DELAY]
```

**Example:**
```bash
./scripts/wait-for-server.sh http://localhost:5000/health 12 5
```

**Parameters:**
- `URL`: Health endpoint to check (default: http://localhost:5000/health)
- `MAX_RETRIES`: Maximum number of retry attempts (default: 12)
- `INITIAL_DELAY`: Initial delay in seconds before first retry (default: 5)

The script uses exponential backoff, doubling the delay between retries (max 60s) to avoid overwhelming the server while waiting for it to start.

## Performance Baselines

**Note**: Baselines will be established after the first successful load test run. The API server must be running to execute load tests.

Expected performance targets based on thresholds configured in test scripts:

| Endpoint | p95 Response Time | Error Rate | Notes |
|----------|-------------------|------------|-------|
| /healthz/live (smoke) | < 200ms | < 1% | Smoke test - critical health check |
| /healthz/ready (smoke) | < 200ms | < 1% | Smoke test - readiness check |
| /clients (smoke) | < 200ms | < 1% | Smoke test - critical endpoint |
| /healthz/live | < 100ms | < 1% | Health check should be very fast |
| /clients (search) | < 300ms | < 1% | Client search with pagination |
| /dashboard | < 500ms | < 1% | Dashboard aggregates data |
| Check-in flow | < 1000ms | < 5% | Complex multi-step flow |

### Smoke Test Baselines

Smoke tests run on every PR to catch performance regressions early:
- **Load**: 5 VUs for 30 seconds
- **Duration**: ~30 seconds total
- **Endpoints tested**: /healthz/live, /healthz/ready, /clients (limit=10)
- **Thresholds**: p95 < 200ms, error rate < 1%
- **Purpose**: Quick validation that critical endpoints respond under minimal load

## Test Scenarios

### Smoke Test
- **Purpose**: Quick validation of critical endpoints under minimal load
- **Load**: 5 VUs for 30 seconds
- **Thresholds**: p95 < 200ms, error rate < 1%
- **Endpoints**: /healthz/live, /healthz/ready, /clients (limit=10)
- **Runs on**: Every PR (fast feedback)

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

### Smoke Tests
Smoke tests run on every PR in GitHub Actions to:
- Detect performance regressions early
- Provide fast feedback on critical endpoints
- Fail quickly if there are issues
- Run before full load tests to save CI resources

### Full Load Tests
Full load tests run on every PR in GitHub Actions to:
- Detect performance regressions under higher load
- Establish performance trends over time
- Validate performance before deployments

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
