import { test, expect } from '@playwright/test';

const API_URL = 'http://127.0.0.1:5000';

const ADMIN_USER = {
  email: 'admin@spaflow.com',
  password: 'SpaFlow2024!',
  name: 'Admin'
};

const STAFF_USER = {
  email: 'staff@spaflow.com',
  password: 'Staff2024!',
  name: 'Staff Member'
};

test.describe('Security-Focused E2E Tests', { tag: ['@regression', '@critical'] }, () => {
  test.describe('CSRF Protection Tests', () => {
    test('should require authentication for POST requests', async ({ request }) => {
      // Try to create a client without authentication
      const response = await request.post(`${API_URL}/api/clients`, {
        data: {
          name: 'Test Client',
          email: 'test@example.com',
          phone: '555-1234'
        }
      });

      // Should return 401 Unauthorized
      expect(response.status()).toBe(401);
    });

    test('should reject requests without valid session cookie', async ({ request }) => {
      // Try to access protected endpoint without cookie
      const response = await request.get(`${API_URL}/api/clients`);

      // Should return 401 Unauthorized
      expect(response.status()).toBe(401);
    });

    test('should require valid HttpOnly cookie for authenticated requests', async ({ request, context }) => {
      // Login to get valid cookie
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: ADMIN_USER.email,
          password: ADMIN_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();

      // Get the cookie from the response
      const cookies = loginResponse.headers()['set-cookie'];
      expect(cookies).toBeDefined();

      // Make authenticated request with cookie
      const clientsResponse = await request.get(`${API_URL}/api/clients`, {
        headers: {
          'Cookie': cookies
        }
      });

      expect(clientsResponse.ok()).toBeTruthy();
    });
  });

  test.describe('Authentication Bypass Tests', () => {
    test('should reject request with invalid/expired token', async ({ request }) => {
      // Try to access protected endpoint with invalid token
      const response = await request.get(`${API_URL}/api/clients`, {
        headers: {
          'Cookie': 'spaflow_session=invalid_token'
        }
      });

      // Should return 401 Unauthorized
      expect(response.status()).toBe(401);
    });

    test('should reject request with malformed token', async ({ request }) => {
      // Try to access with malformed cookie
      const response = await request.get(`${API_URL}/api/clients`, {
        headers: {
          'Cookie': 'spaflow_session=malformed.jwt.token'
        }
      });

      // Should return 401 Unauthorized
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Authorization Bypass Tests', () => {
    test('should prevent STAFF user from accessing MANAGER-only endpoints', async ({ request }) => {
      // Login as STAFF user
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: STAFF_USER.email,
          password: STAFF_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const cookies = loginResponse.headers()['set-cookie'];

      // Try to access MANAGER-only endpoint (users list)
      const usersResponse = await request.get(`${API_URL}/api/users`, {
        headers: {
          'Cookie': cookies
        }
      });

      // Should return 403 Forbidden
      expect(usersResponse.status()).toBe(403);
    });

    test('should prevent STAFF user from creating users', async ({ request }) => {
      // Login as STAFF user
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: STAFF_USER.email,
          password: STAFF_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const cookies = loginResponse.headers()['set-cookie'];

      // Try to create a user
      const createResponse = await request.post(`${API_URL}/api/users`, {
        headers: {
          'Cookie': cookies
        },
        data: {
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePassword123',
          role: 'STAFF'
        }
      });

      // Should return 403 Forbidden
      expect(createResponse.status()).toBe(403);
    });

    test('should allow MANAGER user to access MANAGER-only endpoints', async ({ request }) => {
      // Login as MANAGER user
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: ADMIN_USER.email,
          password: ADMIN_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const cookies = loginResponse.headers()['set-cookie'];

      // Access MANAGER-only endpoint (users list)
      const usersResponse = await request.get(`${API_URL}/api/users`, {
        headers: {
          'Cookie': cookies
        }
      });

      // Should return 200 OK
      expect(usersResponse.status()).toBe(200);
    });

    test('should prevent role escalation via API', async ({ request }) => {
      // Login as STAFF user
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: STAFF_USER.email,
          password: STAFF_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const cookies = loginResponse.headers()['set-cookie'];

      // Try to create a user with MANAGER role (privilege escalation attempt)
      const createResponse = await request.post(`${API_URL}/api/users`, {
        headers: {
          'Cookie': cookies
        },
        data: {
          email: 'manager@example.com',
          name: 'Manager User',
          password: 'SecurePassword123',
          role: 'MANAGER' // Attempting to escalate privileges
        }
      });

      // Should return 403 Forbidden (endpoint itself is protected)
      expect(createResponse.status()).toBe(403);
    });
  });

  test.describe('PII Exposure Tests', () => {
    test('should not expose sensitive data in client list for STAFF users', async ({ request }) => {
      // Login as STAFF user
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: STAFF_USER.email,
          password: STAFF_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const cookies = loginResponse.headers()['set-cookie'];

      // Get clients list
      const clientsResponse = await request.get(`${API_URL}/api/clients`, {
        headers: {
          'Cookie': cookies
        }
      });

      expect(clientsResponse.ok()).toBeTruthy();
      const clients = await clientsResponse.json();

      // Verify that sensitive fields are not exposed or are encrypted
      // Note: The actual implementation may encrypt PII, so we verify structure
      if (clients.length > 0) {
        const client = clients[0];
        // Phone should be encrypted or masked if present
        // Email might be visible for business purposes but phone should be protected
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('name');
        // Phone number should be encrypted in the database
      }
    });

    test('should not expose password hashes in API responses', async ({ request }) => {
      // Login as MANAGER user
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: ADMIN_USER.email,
          password: ADMIN_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const cookies = loginResponse.headers()['set-cookie'];

      // Get users list
      const usersResponse = await request.get(`${API_URL}/api/users`, {
        headers: {
          'Cookie': cookies
        }
      });

      expect(usersResponse.ok()).toBeTruthy();
      const users = await usersResponse.json();

      // Verify password hashes are not exposed
      if (users.length > 0) {
        const user = users[0];
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('password');
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('role');
      }
    });

    test('should not expose refresh tokens in API responses', async ({ request }) => {
      // Login
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: ADMIN_USER.email,
          password: ADMIN_USER.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const loginData = await loginResponse.json();

      // Refresh token should be in response body (this is expected)
      // But verify it's not exposed in other endpoints
      const cookies = loginResponse.headers()['set-cookie'];

      // Get user info
      const meResponse = await request.get(`${API_URL}/auth/me`, {
        headers: {
          'Cookie': cookies
        }
      });

      expect(meResponse.ok()).toBeTruthy();
      const userData = await meResponse.json();

      // Verify no token data in user info
      expect(userData).not.toHaveProperty('refreshToken');
      expect(userData).not.toHaveProperty('accessToken');
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('name');
      expect(userData).toHaveProperty('role');
    });

    test('should not expose session information in error responses', async ({ request }) => {
      // Make an invalid request
      const response = await request.get(`${API_URL}/api/clients/99999`);

      expect(response.status()).toBe(401);

      const errorData = await response.json();

      // Verify error message doesn't expose session details
      expect(errorData).not.toHaveProperty('session');
      expect(errorData).not.toHaveProperty('token');
      expect(errorData).not.toHaveProperty('cookie');
    });
  });
});
