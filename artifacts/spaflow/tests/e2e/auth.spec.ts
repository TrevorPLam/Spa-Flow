import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Authentication Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'password123');
    await loginPage.waitForLoginSuccess();

    await expect(page).toHaveURL('/dashboard');
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'wrongpassword');

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');
  });

  test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should maintain session across page navigation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'password123');
    await loginPage.waitForLoginSuccess();

    await page.goto('/clients');
    await expect(page).toHaveURL('/clients');

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);
  });
});
