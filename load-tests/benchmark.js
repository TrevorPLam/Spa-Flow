import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m', target: 20 },    // Ramp up
    { duration: '2m', target: 20 },    // Sustained load
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
  summaryExport: 'load-results.json',
};

// Benchmark results storage
const benchmarkResults = {
  endpoints: {},
  startTime: new Date().toISOString(),
};

export function setup() {
  console.log('Starting comprehensive API benchmark');
  console.log(`Base URL: ${BASE_URL}`);
  return benchmarkResults;
}

export default function () {
  // Health endpoints
  benchmarkEndpoint('/healthz/live', 'GET', 'Liveness probe');
  benchmarkEndpoint('/healthz/ready', 'GET', 'Readiness probe');

  // Client endpoints
  benchmarkEndpoint('/clients?limit=10', 'GET', 'Client list (paginated)');
  benchmarkEndpoint('/clients?search=test', 'GET', 'Client search');

  // Locker endpoints
  benchmarkEndpoint('/lockers', 'GET', 'Available lockers');
  benchmarkEndpoint('/lockers/occupancy', 'GET', 'Locker occupancy');

  // Room endpoints
  benchmarkEndpoint('/rooms', 'GET', 'Available rooms');
  benchmarkEndpoint('/rooms/occupancy', 'GET', 'Room occupancy');

  // Pricing endpoint
  benchmarkEndpoint('/pricing/calculate?duration=3600000', 'GET', 'Pricing calculation');

  // Product endpoints
  benchmarkEndpoint('/products', 'GET', 'Product list');
  benchmarkEndpoint('/products/low-stock', 'GET', 'Low stock products');

  // Dashboard endpoint
  benchmarkEndpoint('/dashboard', 'GET', 'Dashboard data');

  // Transaction endpoints
  benchmarkEndpoint('/transactions?limit=10', 'GET', 'Transaction list');

  // Waitlist endpoint
  benchmarkEndpoint('/waitlist', 'GET', 'Waitlist');

  sleep(1);
}

function benchmarkEndpoint(path, method, description) {
  const url = `${BASE_URL}${path}`;
  const startTime = Date.now();

  let response;
  if (method === 'GET') {
    response = http.get(url);
  } else if (method === 'POST') {
    response = http.post(url, {});
  }

  const duration = Date.now() - startTime;

  // Record benchmark data
  if (!benchmarkResults.endpoints[path]) {
    benchmarkResults.endpoints[path] = {
      description,
      method,
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: 0,
    };
  }

  const endpoint = benchmarkResults.endpoints[path];
  endpoint.count++;
  endpoint.totalDuration += duration;
  endpoint.minDuration = Math.min(endpoint.minDuration, duration);
  endpoint.maxDuration = Math.max(endpoint.maxDuration, duration);

  if (response.status >= 400) {
    endpoint.errors++;
  }

  // Check response
  check(response, {
    [`${description} returns 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${description} response time < 500ms`]: (r) => duration < 500,
  });

  return { response, duration };
}

export function teardown(data) {
  console.log('\n=== BENCHMARK RESULTS ===');
  console.log(`Start time: ${data.startTime}`);
  console.log(`End time: ${new Date().toISOString()}`);
  console.log('\nEndpoint Performance Summary:');
  console.log('Path | Description | Count | Avg (ms) | Min (ms) | Max (ms) | Errors');
  console.log('---|---|---|---|---|---|---');

  for (const [path, stats] of Object.entries(data.endpoints)) {
    const avg = stats.count > 0 ? (stats.totalDuration / stats.count).toFixed(2) : 'N/A';
    const min = stats.minDuration === Infinity ? 'N/A' : stats.minDuration;
    const errorRate = stats.count > 0 ? ((stats.errors / stats.count) * 100).toFixed(2) : '0';
    
    console.log(`${path} | ${stats.description} | ${stats.count} | ${avg} | ${min} | ${stats.maxDuration} | ${stats.errors} (${errorRate}%)`);
  }

  // Identify slow endpoints
  console.log('\n=== SLOW ENDPOINTS (avg > 300ms) ===');
  for (const [path, stats] of Object.entries(data.endpoints)) {
    const avg = stats.count > 0 ? stats.totalDuration / stats.count : 0;
    if (avg > 300) {
      console.log(`${path}: ${avg.toFixed(2)}ms avg - ${stats.description}`);
    }
  }

  // Identify high error rate endpoints
  console.log('\n=== HIGH ERROR RATE ENDPOINTS (> 1%) ===');
  for (const [path, stats] of Object.entries(data.endpoints)) {
    if (stats.count > 0) {
      const errorRate = (stats.errors / stats.count) * 100;
      if (errorRate > 1) {
        console.log(`${path}: ${errorRate.toFixed(2)}% error rate - ${stats.description}`);
      }
    }
  }
}
