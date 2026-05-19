import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<100'], // Health check should be very fast
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  
  check(res, {
    'health check returns 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check has status up': (r) => r.json('status') === 'up',
  });

  sleep(1);
}
