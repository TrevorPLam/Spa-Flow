import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Error Handling', () => {
  test('should show 404 page for non-existent route', async ({ page }) => {
    await page.goto('/non-existent-route');

    // Verify 404 error is shown
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Page not found')).toBeVisible();
  });

  test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('should show validation error on invalid form submission', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/login');

    // Submit empty form
    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Verify validation errors are shown
    await expect(page.locator('text=required')).toBeVisible();
  });

  test('should show error message on invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/login');
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Verify error message is shown
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');
  });

  test('should handle API error gracefully', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/login');

    // Mock API error by intercepting requests
    await page.route('**/auth/login', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');

    // Verify error message is shown
    await expect(page.locator('text=error')).toBeVisible();
  });

  test('should show network error when offline', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/login');

    // Simulate offline mode
    await page.context().setOffline(true);

    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');

    // Verify network error message is shown
    await expect(page.locator('text=network')).toBeVisible();

    // Restore online mode
    await page.context().setOffline(false);
  });

  test('should handle timeout on slow API response', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/login');

    // Mock slow API response
    await page.route('**/auth/login', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ email: 'admin@spaflow.com', refreshToken: 'token' })
        });
      }, 60000); // 60 second delay
    });

    // Set short timeout
    page.setDefaultTimeout(5000);

    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');

    // Verify timeout error is shown
    await expect(page.locator('text=timeout')).toBeVisible();

    // Restore default timeout
    page.setDefaultTimeout(30000);
  });
});
