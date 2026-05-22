import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp to 50
    { duration: '1m', target: 100 },   // Ramp to 100 (peak hours)
    { duration: '3m', target: 100 },   // Sustain peak load (100 req/s)
    { duration: '1m', target: 50 },    // Ramp down
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // Allow slower response under stress
    http_req_failed: ['rate<0.1'],     // Allow higher error rate under stress
    'http_req_duration{endpoint:health}': ['p(95)<200'],
    'http_req_duration{endpoint:clients}': ['p(95)<500'],
    'http_req_duration{endpoint:dashboard}': ['p(95)<800'],
  },
};

// Track stress test metrics
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let responseTimes = [];

export function setup() {
  console.log('Starting peak hours stress test');
  console.log(`Peak load: 100 concurrent users (~100 req/s)`);
  console.log(`Base URL: ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  totalRequests++;
  const startTime = Date.now();

  // Simulate realistic peak hours traffic mix
  // 40% dashboard reads (most common during peak)
  // 30% client searches
  // 20% locker/room availability checks
  // 10% other endpoints

  const rand = Math.random();
  let response;
  let endpoint;

  if (rand < 0.4) {
    // Dashboard endpoint (most frequent)
    response = http.get(`${BASE_URL}/dashboard`, { tags: { name: 'dashboard' } });
    endpoint = 'dashboard';
  } else if (rand < 0.7) {
    // Client search
    response = http.get(`${BASE_URL}/clients?limit=20`, { tags: { name: 'clients' } });
    endpoint = 'clients';
  } else if (rand < 0.85) {
    // Locker availability
    response = http.get(`${BASE_URL}/lockers`, { tags: { name: 'lockers' } });
    endpoint = 'lockers';
  } else if (rand < 0.95) {
    // Room availability
    response = http.get(`${BASE_URL}/rooms`, { tags: { name: 'rooms' } });
    endpoint = 'rooms';
  } else {
    // Health check (should always be fast)
    response = http.get(`${BASE_URL}/healthz/live`, { tags: { name: 'health' } });
    endpoint = 'health';
  }

  const duration = Date.now() - startTime;
  responseTimes.push(duration);

  const success = check(response, {
    [`${endpoint} returns 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${endpoint} response time < 1s`]: (r) => duration < 1000,
  });

  if (success) {
    successfulRequests++;
  } else {
    failedRequests++;
  }

  // Minimal sleep to simulate realistic request spacing
  sleep(Math.random() * 0.1 + 0.05);
}

export function teardown(data) {
  console.log('\n=== PEAK HOURS STRESS TEST RESULTS ===');
  console.log(`Start time: ${data.startTime}`);
  console.log(`End time: ${new Date().toISOString()}`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Successful requests: ${successfulRequests}`);
  console.log(`Failed requests: ${failedRequests}`);
  console.log(`Success rate: ${((successfulRequests / totalRequests) * 100).toFixed(2)}%`);
  
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const max = sortedTimes[sortedTimes.length - 1];

    console.log('\nResponse Time Statistics:');
    console.log(`Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`p50: ${p50}ms`);
    console.log(`p95: ${p95}ms`);
    console.log(`p99: ${p99}ms`);
    console.log(`Max: ${max}ms`);
  }

  // Calculate approximate requests per second
  const durationMs = new Date().getTime() - new Date(data.startTime).getTime();
  const durationSec = durationMs / 1000;
  const reqPerSec = totalRequests / durationSec;
  console.log(`\nAverage throughput: ${reqPerSec.toFixed(2)} req/s`);

  // System stability assessment
  console.log('\n=== SYSTEM STABILITY ASSESSMENT ===');
  
  if (failedRequests / totalRequests > 0.05) {
    console.log('❌ CRITICAL: Error rate exceeds 5% - system unstable under load');
    console.log('   Action: Investigate database connection pooling, memory leaks, or resource exhaustion');
  } else if (failedRequests / totalRequests > 0.01) {
    console.log('⚠️  WARNING: Error rate exceeds 1% - system degrading under load');
    console.log('   Action: Review slow queries, increase connection pool size, or add caching');
  } else {
    console.log('✅ GOOD: Error rate within acceptable range (< 1%)');
  }

  if (responseTimes.length > 0) {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    
    if (p95 > 1000) {
      console.log('⚠️  WARNING: p95 response time exceeds 1s - performance degraded');
      console.log('   Action: Optimize slow queries, add database indexes, or implement caching');
    } else {
      console.log('✅ GOOD: p95 response time within acceptable range (< 1s)');
    }
  }

  if (reqPerSec < 50) {
    console.log('⚠️  WARNING: Throughput below 50 req/s - system may not handle peak traffic');
    console.log('   Action: Scale horizontally or optimize application performance');
  } else {
    console.log('✅ GOOD: Throughput acceptable for peak hours');
  }
}
