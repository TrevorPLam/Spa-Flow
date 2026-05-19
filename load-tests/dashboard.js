import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Dashboard can be slightly slower
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/dashboard`);
  
  check(res, {
    'dashboard returns 200': (r) => r.status === 200,
    'dashboard returns object': (r) => {
      try {
        const body = r.json();
        return typeof body === 'object';
      } catch {
        return false;
      }
    },
    'dashboard response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(2);
}
