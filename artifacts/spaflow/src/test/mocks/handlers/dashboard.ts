import { http, HttpResponse } from 'msw';
import { createDashboard } from '../factories';

/**
 * Dashboard API handlers
 * Following 2026 best practices: realistic responses, organized by feature
 */

export const dashboardHandlers = [
  // GET /api/v1/dashboard
  http.get('/api/v1/dashboard', () => {
    return HttpResponse.json(createDashboard());
  }),
];
