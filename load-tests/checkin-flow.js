import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Lower VUs for complex flow
    { duration: '1m', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Check-in flow can be slower
    http_req_failed: ['rate<0.05'],     // Allow higher error rate for complex flow
  },
};

export default function () {
  // Simulate check-in flow: get pricing, get available lockers, get available rooms
  const pricingRes = http.get(`${BASE_URL}/pricing`);
  check(pricingRes, {
    'pricing endpoint returns 200': (r) => r.status === 200,
  });

  sleep(0.5);

  const lockersRes = http.get(`${BASE_URL}/lockers/available`);
  check(lockersRes, {
    'lockers available returns 200': (r) => r.status === 200,
  });

  sleep(0.5);

  const roomsRes = http.get(`${BASE_URL}/rooms/available`);
  check(roomsRes, {
    'rooms available returns 200': (r) => r.status === 200,
  });

  sleep(1);
}
