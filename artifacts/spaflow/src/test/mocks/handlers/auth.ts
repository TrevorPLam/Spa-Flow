import { http, HttpResponse } from 'msw';
import { createAuthUser } from '../factories';

/**
 * Auth API handlers
 * Following 2026 best practices: realistic responses, organized by feature
 */

export const authHandlers = [
  // POST /api/v1/auth/login
  http.post('/api/v1/auth/login', async () => {
    // For integration tests, always return success by default
    // Specific error scenarios are handled by overriding this handler in tests
    return HttpResponse.json({
      user: createAuthUser(),
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
  }),

  // POST /api/v1/auth/logout
  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // GET /api/v1/auth/me
  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json(createAuthUser());
  }),

  // POST /api/v1/auth/refresh
  http.post('/api/v1/auth/refresh', () => {
    return HttpResponse.json({
      user: createAuthUser(),
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token',
    });
  }),
];
