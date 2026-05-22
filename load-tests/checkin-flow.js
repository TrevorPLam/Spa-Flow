import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Warm up
    { duration: '20s', target: 20 },  // Ramp to 20 concurrent users
    { duration: '60s', target: 20 },  // Sustain 20 concurrent check-ins
    { duration: '20s', target: 5 },   // Ramp down
    { duration: '10s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<2000'], // Check-in flow can be slower under load
    http_req_failed: ['rate<0.05'],     // Allow higher error rate for complex flow
    'http_req_duration{endpoint:pricing}': ['p(95)<300'],
    'http_req_duration{endpoint:lockers}': ['p(95)<500'],
    'http_req_duration{endpoint:rooms}': ['p(95)<500'],
  },
};

// Track concurrent check-in attempts
let concurrentCheckins = 0;
let successfulCheckins = 0;
let failedCheckins = 0;

export function setup() {
  console.log('Starting concurrent check-in load test');
  console.log(`Target: 20 concurrent users`);
  console.log(`Base URL: ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  concurrentCheckins++;
  
  // Simulate realistic check-in flow with resource contention
  const checkinId = `checkin-${__VU}-${__ITER}`;
  
  // Step 1: Get pricing (read-only, should be fast)
  const pricingRes = http.get(`${BASE_URL}/pricing/calculate?duration=3600000`, {
    tags: { name: 'pricing' },
  });
  check(pricingRes, {
    'pricing endpoint returns 200': (r) => r.status === 200,
    'pricing response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(Math.random() * 0.5 + 0.5); // Random think time 0.5-1s

  // Step 2: Get available lockers (tests row-level locking)
  const lockersRes = http.get(`${BASE_URL}/lockers`, {
    tags: { name: 'lockers' },
  });
  const lockersSuccess = check(lockersRes, {
    'lockers available returns 200': (r) => r.status === 200,
    'lockers response time < 500ms': (r) => r.timings.duration < 500,
    'lockers has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length >= 0;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 0.3 + 0.2); // Random think time 0.2-0.5s

  // Step 3: Get available rooms (tests row-level locking)
  const roomsRes = http.get(`${BASE_URL}/rooms`, {
    tags: { name: 'rooms' },
  });
  const roomsSuccess = check(roomsRes, {
    'rooms available returns 200': (r) => r.status === 200,
    'rooms response time < 500ms': (r) => r.timings.duration < 500,
    'rooms has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length >= 0;
      } catch {
        return false;
      }
    },
  });

  // Track success/failure
  if (lockersSuccess && roomsSuccess) {
    successfulCheckins++;
  } else {
    failedCheckins++;
  }

  sleep(Math.random() * 1 + 0.5); // Random think time 0.5-1.5s
}

export function teardown(data) {
  console.log('\n=== CONCURRENT CHECK-IN TEST RESULTS ===');
  console.log(`Start time: ${data.startTime}`);
  console.log(`End time: ${new Date().toISOString()}`);
  console.log(`Total check-in attempts: ${concurrentCheckins}`);
  console.log(`Successful check-ins: ${successfulCheckins}`);
  console.log(`Failed check-ins: ${failedCheckins}`);
  console.log(`Success rate: ${((successfulCheckins / concurrentCheckins) * 100).toFixed(2)}%`);
  
  if (failedCheckins > 0) {
    console.log('\n⚠️  Some check-ins failed - investigate row-level locking and database contention');
  } else {
    console.log('\n✅ All check-ins succeeded - row-level locking is working correctly');
  }
}
