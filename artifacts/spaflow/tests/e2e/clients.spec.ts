import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'password123');
    await loginPage.waitForLoginSuccess();
  });

  test('should load clients page', async ({ page }) => {
    const clientsPage = new ClientsPage(page);

    await clientsPage.goto();
    await expect(clientsPage.isClientsPageLoaded()).resolves.toBe(true);

    // Visual regression check for clients page
    await expect(page).toHaveScreenshot('clients-page.png');
  });

  test('should search clients', async ({ page }) => {
    const clientsPage = new ClientsPage(page);

    await clientsPage.goto();
    await clientsPage.searchClients('John');
    await page.waitForTimeout(500);

    const url = page.url();
    expect(url).toContain('/clients');
  });

  test('should navigate to new client form', async ({ page }) => {
    const clientsPage = new ClientsPage(page);

    await clientsPage.goto();
    await clientsPage.clickNewClient();

    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/clients/new');
  });
});
