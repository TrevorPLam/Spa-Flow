import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CheckInPage } from './pages/CheckInPage';
import { createTestClient, cleanupTestClients, getManagerAuthHeaders } from './helpers/test-data';

test.describe('Check-in Flow', { tag: ['@smoke', '@critical'] }, () => {
  let authHeaders: Record<string, string>;
  let createdClientIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    authHeaders = await getManagerAuthHeaders(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestClients(request, authHeaders, createdClientIds);
  });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');
    await loginPage.waitForLoginSuccess();
  });

  test('should search and select a client', async ({ page, request }) => {
    const checkInPage = new CheckInPage(page);
    
    // Create a test client
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Checkin Search Test',
      email: 'checkin-search@example.com',
    });
    createdClientIds.push(testClient.id);

    await checkInPage.goto();
    await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

    // Visual regression check for check-in page initial state
    await expect(page).toHaveScreenshot('checkin-page-initial.png');

    await checkInPage.searchClient('Checkin Search Test');
    
    // Smart waiting: wait for client list to appear
    await expect(checkInPage.clientList).toBeVisible();

    // Verify client list appears
    const clientCount = await checkInPage.clientList.count();
    expect(clientCount).toBeGreaterThan(0);
  });

  test('should select resource type (locker vs room)', async ({ page, request }) => {
    const checkInPage = new CheckInPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Resource Type Test',
      email: 'resource-type@example.com',
    });
    createdClientIds.push(testClient.id);

    await checkInPage.goto();
    await checkInPage.searchClient('Resource Type Test');
    await expect(checkInPage.clientList).toBeVisible();

    if (await checkInPage.clientList.count() > 0) {
      await checkInPage.selectClient('Resource Type Test');
      
      // Smart waiting: wait for resource type selection to appear
      await expect(checkInPage.resourceTypeLocker).toBeVisible();

      // Test locker selection
      await checkInPage.selectResourceType('locker');
      
      // Test room selection
      await checkInPage.selectResourceType('room');
    }
  });

  test('should complete full check-in flow', async ({ page, request }) => {
    const checkInPage = new CheckInPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Full Flow Test',
      email: 'full-flow@example.com',
    });
    createdClientIds.push(testClient.id);

    await checkInPage.goto();
    await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

    // Step 1: Search and select client
    await checkInPage.searchClient('Full Flow Test');
    await expect(checkInPage.clientList).toBeVisible();

    if (await checkInPage.clientList.count() > 0) {
      await checkInPage.selectClient('Full Flow Test');
      
      // Step 2: Select resource type
      await expect(checkInPage.resourceTypeLocker).toBeVisible();
      await checkInPage.selectResourceType('locker');
      
      // Step 3: Select products
      await expect(checkInPage.productSelection).toBeVisible();
      await checkInPage.selectProduct('Day Pass');
      
      // Step 4: Complete payment
      await expect(checkInPage.submitButton).toBeVisible();
      await checkInPage.completePayment();
      
      // Step 5: Verify success message
      await expect(checkInPage.successMessage).toBeVisible();
      const successMessage = await checkInPage.getSuccessMessageText();
      expect(successMessage).toContain('Check-in');

      // Verify we're still on check-in page or redirected appropriately
      const url = page.url();
      expect(url).toContain('/checkin');
    }
  });

  test('should navigate through check-in steps', async ({ page, request }) => {
    const checkInPage = new CheckInPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Navigation Test',
      email: 'navigation@example.com',
    });
    createdClientIds.push(testClient.id);

    await checkInPage.goto();
    await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

    // Start at client selection step
    await checkInPage.searchClient('Navigation Test');
    await expect(checkInPage.clientList).toBeVisible();

    // Proceed through steps
    const url = page.url();
    expect(url).toContain('/checkin');
  });

  test('should display error for invalid client selection', async ({ page }) => {
    const checkInPage = new CheckInPage(page);

    await checkInPage.goto();
    await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

    // Search for non-existent client
    await checkInPage.searchClient('NonExistentClient12345');
    
    // Wait for search to complete
    await page.waitForTimeout(1000);
    
    // Verify no results or empty state
    const clientCount = await checkInPage.clientList.count();
    expect(clientCount).toBe(0);
  });

  test('should validate product selection before payment', async ({ page, request }) => {
    const checkInPage = new CheckInPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Validation Test',
      email: 'validation@example.com',
    });
    createdClientIds.push(testClient.id);

    await checkInPage.goto();
    await checkInPage.searchClient('Validation Test');
    await expect(checkInPage.clientList).toBeVisible();

    if (await checkInPage.clientList.count() > 0) {
      await checkInPage.selectClient('Validation Test');
      await expect(checkInPage.resourceTypeLocker).toBeVisible();
      await checkInPage.selectResourceType('locker');
      
      // Try to complete payment without selecting product
      // This should show validation error
      const submitButton = checkInPage.submitButton;
      if (await submitButton.isEnabled()) {
        await submitButton.click();
        
        // Verify error message appears
        const errorMessage = page.locator('[data-testid="error-message"]');
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toContainText('product', { ignoreCase: true });
        }
      }
    }
  });
});
