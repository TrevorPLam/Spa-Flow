import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './k6.config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // Client search should be fast
    http_req_failed: ['rate<0.01'],
  },
};

// Test data
const searchTerms = ['John', 'Smith', 'Jane', 'Doe', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson'];

export default function () {
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  const res = http.get(`${BASE_URL}/clients?search=${encodeURIComponent(searchTerm)}`);
  
  check(res, {
    'client search returns 200': (r) => r.status === 200,
    'client search returns array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'client search response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
