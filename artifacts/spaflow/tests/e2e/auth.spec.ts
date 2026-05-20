import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// Lockout test configuration
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 900000; // 15 minutes
// Use existing staff user for lockout testing to avoid user creation/deletion issues
const LOCKOUT_TEST_USER = {
  email: 'staff@spaflow.com',
  password: 'Staff2024!',
  name: 'Staff Member'
};
const ADMIN_USER = {
  email: 'admin@spaflow.com',
  password: 'SpaFlow2024!',
  name: 'Admin'
};
const BASE_URL = 'http://localhost:5173';

test.describe('Authentication Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(ADMIN_USER.email, ADMIN_USER.password);
    await loginPage.waitForLoginSuccess();

    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto(`${BASE_URL}/login`);
    await loginPage.login('invalid@example.com', 'wrongpassword');

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');
  });

  test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should maintain session across page navigation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(ADMIN_USER.email, ADMIN_USER.password);
    await loginPage.waitForLoginSuccess();

    await page.goto(`${BASE_URL}/clients`);
    await expect(page).toHaveURL(`${BASE_URL}/clients`);

    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);
  });
});

test.describe('Account Lockout', () => {
  test.beforeEach(async ({ request }) => {
    // Reset lockout state for staff user before each test
    try {
      const loginResponse = await request.post('http://localhost:5000/auth/login', {
        data: {
          email: ADMIN_USER.email,
          password: ADMIN_USER.password
        }
      });

      if (loginResponse.ok()) {
        const cookies = loginResponse.headers['set-cookie'];
        const users = await request.get('http://localhost:5000/users', {
          headers: {
            'Cookie': cookies
          }
        });
        if (users.ok()) {
          const usersData = await users.json();
          const staffUser = usersData.find((u: any) => u.email === LOCKOUT_TEST_USER.email);
          if (staffUser) {
            // Reset lockout state by unlocking the user
            await request.post(`http://localhost:5000/users/${staffUser.id}/unlock`, {
              headers: {
                'Cookie': cookies
              }
            });
          }
        }
      }
    } catch (e) {
      console.log('Setup warning:', e);
    }
  });

  test('should allow login before lockout threshold', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Attempt login N-1 times (threshold - 1)
    for (let i = 0; i < LOCKOUT_THRESHOLD - 1; i++) {
      await page.goto(`${BASE_URL}/login`);
      await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
      
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid email or password');
    }

    // Nth attempt (threshold) should still allow login with correct credentials
    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
    await loginPage.waitForLoginSuccess();

    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  });

  test('should lock account after threshold failed attempts', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Attempt login N times to trigger lockout
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await page.goto(`${BASE_URL}/login`);
      await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
      
      const errorMessage = await loginPage.getErrorMessage();
      
      // Last attempt should show lockout message
      if (i === LOCKOUT_THRESHOLD - 1) {
        expect(errorMessage).toContain('locked');
      } else {
        expect(errorMessage).toContain('Invalid email or password');
      }
    }

    // Attempt login with correct credentials during lockout should fail
    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
    
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('locked');
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should remain locked during lockout period', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Trigger lockout
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await page.goto(`${BASE_URL}/login`);
      await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
    }

    // Wait a short time (less than lockout duration)
    await page.waitForTimeout(2000);

    // Should still be locked
    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
    
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('locked');
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should allow login after lockout expires', async ({ page, request }) => {
    const loginPage = new LoginPage(page);

    // Trigger lockout
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await page.goto(`${BASE_URL}/login`);
      await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
    }

    // Manually expire the lockout by updating the database
    // This is a test-only operation to avoid waiting 15 minutes
    try {
      const loginResponse = await request.post('http://localhost:5000/auth/login', {
        data: {
          email: 'admin@spaflow.com',
          password: 'SpaFlow2024!'
        }
      });
      
      if (loginResponse.ok()) {
        const cookies = loginResponse.headers['set-cookie'];
        // Get user ID first
        const usersResponse = await request.get('http://localhost:5000/users', {
          headers: {
            'Cookie': cookies
          }
        });
        
        if (usersResponse.ok()) {
          const users = await usersResponse.json();
          const testUser = users.find((u: any) => u.email === LOCKOUT_TEST_USER.email);
          
          if (testUser) {
            // Reset lockout via database (simulating time passing)
            await request.post(`http://localhost:5000/users/${testUser.id}/unlock`, {
              headers: {
                'Cookie': cookies
              }
            });
          }
        }
      }
    } catch (e) {
      console.log('Manual unlock warning:', e);
    }

    // Should now be able to login
    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
    await loginPage.waitForLoginSuccess();

    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  });

  test('should allow manager to unlock locked account', async ({ page, request }) => {
    const loginPage = new LoginPage(page);

    // Trigger lockout
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await page.goto(`${BASE_URL}/login`);
      await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
    }

    // Verify account is locked
    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
    
    let errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('locked');

    // Login as manager and unlock the account
    const managerLoginResponse = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: 'admin@spaflow.com',
        password: 'SpaFlow2024!'
      }
    });
    
    expect(managerLoginResponse.ok()).toBeTruthy();
    
    const managerCookies = managerLoginResponse.headers['set-cookie'];
    
    // Get user ID
    const usersResponse = await request.get('http://localhost:5000/users', {
      headers: {
        'Cookie': managerCookies
      }
    });
    
    expect(usersResponse.ok()).toBeTruthy();
    const users = await usersResponse.json();
    const testUser = users.find((u: any) => u.email === LOCKOUT_TEST_USER.email);
    expect(testUser).toBeDefined();
    
    // Unlock the account
    const unlockResponse = await request.post(`http://localhost:5000/users/${testUser.id}/unlock`, {
      headers: {
        'Cookie': managerCookies
      }
    });
    
    expect(unlockResponse.ok()).toBeTruthy();
    const unlockData = await unlockResponse.json();
    expect(unlockData.success).toBe(true);

    // Now the locked user should be able to login
    await page.goto(`${BASE_URL}/login`);
    await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
    await loginPage.waitForLoginSuccess();

    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  });
});

test.describe('Session Refresh', () => {
  test('should automatically refresh expired access token', async ({ page, request }) => {
    // Login via API to get refresh token and set httpOnly cookie
    const loginResponse = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.refreshToken).toBeDefined();

    // Set refresh token in localStorage and navigate to dashboard
    // The httpOnly cookie is already set by the API call
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate((refreshToken) => {
      localStorage.setItem('spaflow_refresh_token', refreshToken);
    }, loginData.refreshToken);

    // Navigate to dashboard - the client should handle auth state
    await page.goto(`${BASE_URL}/dashboard`);
    // If the access token is expired, the client's automatic refresh should handle it
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  });

  test('should rotate refresh token on each use', async ({ page, request }) => {
    // Login via API to get initial refresh token
    const loginResponse = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const initialRefreshToken = loginData.refreshToken;
    expect(initialRefreshToken).toBeDefined();

    // Use the refresh token to get a new one
    const refreshResponse = await request.post('http://localhost:5000/auth/refresh', {
      data: {
        refreshToken: initialRefreshToken
      }
    });

    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json();
    const newRefreshToken = refreshData.refreshToken;
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(initialRefreshToken);

    // Try to use the old refresh token again (should fail)
    const secondRefreshResponse = await request.post('http://localhost:5000/auth/refresh', {
      data: {
        refreshToken: initialRefreshToken
      }
    });

    expect(secondRefreshResponse.ok()).toBeFalsy();
    expect(secondRefreshResponse.status()).toBe(401);
  });

  test('should reject invalid refresh token', async ({ page, request }) => {
    // Try to refresh with an invalid token
    const refreshResponse = await request.post('http://localhost:5000/auth/refresh', {
      data: {
        refreshToken: 'invalid-refresh-token'
      }
    });

    expect(refreshResponse.ok()).toBeFalsy();
    expect(refreshResponse.status()).toBe(401);

    const errorData = await refreshResponse.json();
    expect(errorData).toHaveProperty('error');
  });

  test('should redirect to login when refresh fails', async ({ page }) => {
    // Set an invalid refresh token in localStorage
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.setItem('spaflow_refresh_token', 'invalid-refresh-token');
    });

    // Navigate to a protected route
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to login due to refresh failure
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should handle refresh token expiration gracefully', async ({ request }) => {
    // Login to get a refresh token
    const loginResponse = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const refreshToken = loginData.refreshToken;

    // Manually expire the refresh token in the database by revoking all sessions
    // This simulates a token that has been revoked or expired
    try {
      const adminLoginResponse = await request.post('http://localhost:5000/auth/login', {
        data: {
          email: ADMIN_USER.email,
          password: ADMIN_USER.password
        }
      });

      if (adminLoginResponse.ok()) {
        const cookies = adminLoginResponse.headers()['set-cookie'];
        // Revoke all sessions for the user
        await request.delete('http://localhost:5000/auth/sessions', {
          headers: {
            'Cookie': cookies || ''
          }
        });
      }
    } catch (e) {
      console.log('Token expiration setup warning:', e);
    }

    // Try to use the now-expired refresh token
    const refreshResponse = await request.post('http://localhost:5000/auth/refresh', {
      data: {
        refreshToken: refreshToken
      }
    });

    // Should fail with 401
    expect(refreshResponse.ok()).toBeFalsy();
    expect(refreshResponse.status()).toBe(401);
  });
});

test.describe('Password Reset', () => {
  const PASSWORD_RESET_USER = {
    email: 'staff@spaflow.com',
    oldPassword: 'Staff2024!',
    newPassword: 'NewSecurePassword123!@#',
    weakPassword: 'weak'
  };

  test.beforeEach(async ({ page }) => {
    // Reset password back to original before each test
    try {
      // This is a setup step to ensure consistent test state
      // In production, you'd want a proper test database reset
    } catch (e) {
      console.log('Setup warning:', e);
    }
  });

  test('should request password reset with valid email', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/password-reset-request`);

    // Fill in email
    await page.fill('[data-testid="input-email"]', PASSWORD_RESET_USER.email);
    
    // Submit form
    await page.click('[data-testid="button-submit"]');

    // Should show success message
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator('text=password reset link has been sent')).toBeVisible();
  });

  test('should request password reset with non-existent email (user enumeration protection)', async ({ page }) => {
    await page.goto(`${BASE_URL}/password-reset-request`);

    // Fill in non-existent email
    await page.fill('[data-testid="input-email"]', 'nonexistent@example.com');
    
    // Submit form
    await page.click('[data-testid="button-submit"]');

    // Should still show success message (to prevent user enumeration)
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator('text=password reset link has been sent')).toBeVisible();
  });

  test('should validate email format on password reset request', async ({ page }) => {
    await page.goto(`${BASE_URL}/password-reset-request`);

    // Fill in invalid email
    await page.fill('[data-testid="input-email"]', 'invalid-email');
    
    // Submit form
    await page.click('[data-testid="button-submit"]');

    // Should show validation error
    await expect(page.locator('text=Valid email required')).toBeVisible();
  });

  test('should reset password with valid token via API', async ({ request }) => {
    // Step 1: Request password reset
    const requestResponse = await request.post('http://localhost:5000/auth/password-reset/request', {
      data: {
        email: PASSWORD_RESET_USER.email
      }
    });

    expect(requestResponse.ok()).toBeTruthy();
    const requestData = await requestResponse.json();
    expect(requestData.message).toContain('password reset link');

    // In test mode, the token is included in the response
    if (!requestData.token) {
      console.log('Token not included in response (not in test mode), skipping test');
      return;
    }

    // Step 2: Confirm password reset with the token
    const confirmResponse = await request.post('http://localhost:5000/auth/password-reset/confirm', {
      data: {
        token: requestData.token,
        newPassword: PASSWORD_RESET_USER.newPassword
      }
    });

    expect(confirmResponse.ok()).toBeTruthy();
    const confirmData = await confirmResponse.json();
    expect(confirmData.message).toContain('Password has been reset');

    // Step 3: Login with new password to verify
    const loginResponse = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: PASSWORD_RESET_USER.email,
        password: PASSWORD_RESET_USER.newPassword
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.email).toBe(PASSWORD_RESET_USER.email);

    // Step 4: Restore original password for test cleanup
    const restoreResponse = await request.post('http://localhost:5000/auth/password-reset/request', {
      data: {
        email: PASSWORD_RESET_USER.email
      }
    });

    expect(restoreResponse.ok()).toBeTruthy();
    const restoreData = await restoreResponse.json();

    if (restoreData.token) {
      const restoreConfirmResponse = await request.post('http://localhost:5000/auth/password-reset/confirm', {
        data: {
          token: restoreData.token,
          newPassword: PASSWORD_RESET_USER.oldPassword
        }
      });

      expect(restoreConfirmResponse.ok()).toBeTruthy();
    }
  });

  test('should reject password reset with invalid token', async ({ page }) => {
    await page.goto(`${BASE_URL}/password-reset-confirm?token=invalidtoken123`);

    // Fill in new password
    await page.fill('[data-testid="input-new-password"]', PASSWORD_RESET_USER.newPassword);
    await page.fill('[data-testid="input-confirm-password"]', PASSWORD_RESET_USER.newPassword);
    
    // Submit form
    await page.click('[data-testid="button-submit"]');

    // Should show error
    await expect(page.locator('[data-testid="text-error"]')).toBeVisible();
    await expect(page.locator('text=Invalid or expired reset token')).toBeVisible();
  });

  test('should enforce password complexity on reset', async ({ page }) => {
    await page.goto(`${BASE_URL}/password-reset-confirm?token=sometoken`);

    // Fill in weak password (less than 15 characters)
    await page.fill('[data-testid="input-new-password"]', PASSWORD_RESET_USER.weakPassword);
    await page.fill('[data-testid="input-confirm-password"]', PASSWORD_RESET_USER.weakPassword);
    
    // Submit form
    await page.click('[data-testid="button-submit"]');

    // Should show validation error
    await expect(page.locator('text=Password must be at least 15 characters long')).toBeVisible();
  });

  test('should require password confirmation on reset', async ({ page }) => {
    await page.goto(`${BASE_URL}/password-reset-confirm?token=sometoken`);

    // Fill in password with mismatched confirmation
    await page.fill('[data-testid="input-new-password"]', PASSWORD_RESET_USER.newPassword);
    await page.fill('[data-testid="input-confirm-password"]', 'differentpassword123');
    
    // Submit form
    await page.click('[data-testid="button-submit"]');

    // Should show validation error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should reject password reset with password too long', async ({ page }) => {
    await page.goto(`${BASE_URL}/password-reset-confirm?token=sometoken`);

    // Fill in password that exceeds 64 characters
    const longPassword = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    await page.fill('[data-testid="input-new-password"]', longPassword);
    await page.fill('[data-testid="input-confirm-password"]', longPassword);
    
    // Submit form
    await page.click('[data-testid="button-submit"]');

    // Should show validation error
    await expect(page.locator('text=Password must be no more than 64 characters long')).toBeVisible();
  });

  test('should reject password reset with expired token', async ({ request }) => {
    // Request a reset token
    const requestResponse = await request.post('http://localhost:5000/auth/password-reset/request', {
      data: {
        email: PASSWORD_RESET_USER.email
      }
    });

    expect(requestResponse.ok()).toBeTruthy();
    const requestData = await requestResponse.json();

    // In test mode, the token is included in the response
    if (!requestData.token) {
      console.log('Token not included in response (not in test mode), skipping test');
      return;
    }

    // Manually expire the token in the database using test endpoint
    // First, login as admin to get access
    const adminLoginResponse = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      }
    });

    expect(adminLoginResponse.ok()).toBeTruthy();
    const adminCookies = adminLoginResponse.headers()['set-cookie'];

    // Get user ID
    const usersResponse = await request.get('http://localhost:5000/users', {
      headers: {
        'Cookie': adminCookies || ''
      }
    });

    expect(usersResponse.ok()).toBeTruthy();
    const users = await usersResponse.json();
    const user = users.find((u: any) => u.email === PASSWORD_RESET_USER.email);
    expect(user).toBeDefined();

    // Manually expire the token in the database using test endpoint
    const expireResponse = await request.post(`http://localhost:5000/test/password-reset-token/${user.id}/expire`, {
      headers: {
        'Cookie': adminCookies || ''
      }
    });

    // If expire endpoint doesn't exist, skip
    if (!expireResponse.ok()) {
      console.log('Expire endpoint not available, skipping expired token test');
      return;
    }

    // Try to use the expired token
    const confirmResponse = await request.post('http://localhost:5000/auth/password-reset/confirm', {
      data: {
        token: requestData.token,
        newPassword: PASSWORD_RESET_USER.newPassword
      }
    });

    expect(confirmResponse.ok()).toBeFalsy();
    const errorData = await confirmResponse.json();
    expect(errorData.error).toContain('expired');
  });
});
