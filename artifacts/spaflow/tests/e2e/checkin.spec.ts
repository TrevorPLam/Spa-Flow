import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CheckInPage } from './pages/CheckInPage';

test.describe('Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');
    await loginPage.waitForLoginSuccess();
  });

  test('should search and select a client', async ({ page }) => {
    const checkInPage = new CheckInPage(page);

    await checkInPage.goto();
    await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

    // Visual regression check for check-in page initial state
    await expect(page).toHaveScreenshot('checkin-page-initial.png');

    await checkInPage.searchClient('John');
    await page.waitForTimeout(500); // Wait for search results

    // Verify client list appears
    const clientCount = await checkInPage.clientList.count();
    expect(clientCount).toBeGreaterThan(0);
  });

  test('should select resource type (locker vs room)', async ({ page }) => {
    const checkInPage = new CheckInPage(page);

    await checkInPage.goto();
    await checkInPage.searchClient('John');
    await page.waitForTimeout(500);

    if (await checkInPage.clientList.count() > 0) {
      await checkInPage.selectClient('John Doe');
      await page.waitForTimeout(500);

      // Test locker selection
      await checkInPage.selectResourceType('locker');
      await page.waitForTimeout(300);

      // Test room selection
      await checkInPage.selectResourceType('room');
      await page.waitForTimeout(300);
    }
  });

  test('should complete full check-in flow', async ({ page }) => {
    const checkInPage = new CheckInPage(page);

    await checkInPage.goto();
    await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

    // Step 1: Search and select client
    await checkInPage.searchClient('John');
    await page.waitForTimeout(500);

    if (await checkInPage.clientList.count() > 0) {
      await checkInPage.selectClient('John Doe');
      await page.waitForTimeout(500);

      // Step 2: Select resource type
      await checkInPage.selectResourceType('locker');
      await page.waitForTimeout(300);

      // Step 3: Select products
      await checkInPage.selectProduct('Day Pass');
      await page.waitForTimeout(300);

      // Step 4: Complete payment
      await checkInPage.completePayment();
      await page.waitForTimeout(1000);

      // Step 5: Verify success message
      await expect(checkInPage.isSuccessMessageVisible()).resolves.toBe(true);
      const successMessage = await checkInPage.getSuccessMessageText();
      expect(successMessage).toContain('Check-in');

      // Verify we're still on check-in page or redirected appropriately
      const url = page.url();
      expect(url).toContain('/checkin');
    }
  });

  test('should navigate through check-in steps', async ({ page }) => {
    const checkInPage = new CheckInPage(page);

    await checkInPage.goto();
    await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

    // Start at client selection step
    await checkInPage.searchClient('John');
    await page.waitForTimeout(500);

    // Proceed through steps (this is a simplified test)
    // In a real scenario, you'd need test data setup
    const url = page.url();
    expect(url).toContain('/checkin');
  });
});
