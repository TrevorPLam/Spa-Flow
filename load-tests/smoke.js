import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'], // Smoke test should be very fast
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/healthz/live`);
  check(healthRes, {
    'health check returns 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Test readiness endpoint
  const readyRes = http.get(`${BASE_URL}/healthz/ready`);
  check(readyRes, {
    'readiness check returns 200': (r) => r.status === 200,
    'readiness check response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Test one critical endpoint - clients list (paginated, light query)
  const clientsRes = http.get(`${BASE_URL}/clients?limit=10`);
  check(clientsRes, {
    'clients list returns 200': (r) => r.status === 200,
    'clients list response time < 200ms': (r) => r.timings.duration < 200,
    'clients list returns array': (r) => Array.isArray(r.json('data')),
  });

  sleep(1);
}
