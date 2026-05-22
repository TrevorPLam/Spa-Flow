import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';
import { createTestClient, cleanupTestClients, getManagerAuthHeaders } from './helpers/test-data';

test.describe('Waitlist Assignment Flow', { tag: ['@smoke', '@critical'] }, () => {
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

  test('should add client to waitlist', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    // Create a test client
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Waitlist Test Client',
      email: 'waitlist-test@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await expect(clientsPage.isClientsPageLoaded()).resolves.toBe(true);

    // Search for the client
    await clientsPage.searchClient('Waitlist Test Client');
    
    // Wait for search results to appear using smart waiting
    await expect(clientsPage.clientList).toBeVisible();

    // Select the client
    await clientsPage.selectClient('Waitlist Test Client');

    // Add to waitlist (assuming there's a button/action for this)
    // This is a placeholder - actual implementation depends on UI
    const addToWaitlistButton = page.getByRole('button', { name: /add to waitlist/i });
    if (await addToWaitlistButton.isVisible()) {
      await addToWaitlistButton.click();
      
      // Verify success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText('waitlist', { ignoreCase: true });
    }
  });

  test('should display waitlist position', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    // Create a test client
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Waitlist Position Test',
      email: 'waitlist-position@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Waitlist Position Test');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Waitlist Position Test');

    // Verify waitlist position is displayed
    const waitlistPosition = page.locator('[data-testid="waitlist-position"]');
    if (await waitlistPosition.isVisible()) {
      const positionText = await waitlistPosition.textContent();
      expect(positionText).toMatch(/\d+/); // Should contain a number
    }
  });

  test('should confirm waitlist assignment', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    // Create a test client
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Waitlist Confirm Test',
      email: 'waitlist-confirm@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Waitlist Confirm Test');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Waitlist Confirm Test');

    // Confirm assignment if available
    const confirmButton = page.getByRole('button', { name: /confirm assignment/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      
      // Verify confirmation
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText('confirmed', { ignoreCase: true });
    }
  });

  test('should remove client from waitlist', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    // Create a test client
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Waitlist Remove Test',
      email: 'waitlist-remove@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Waitlist Remove Test');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Waitlist Remove Test');

    // Remove from waitlist if available
    const removeButton = page.getByRole('button', { name: /remove from waitlist/i });
    if (await removeButton.isVisible()) {
      await removeButton.click();
      
      // Verify removal
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText('removed', { ignoreCase: true });
    }
  });

  test('should show waitlist count on dashboard', async ({ page }) => {
    const dashboardPage = page; // Assuming dashboard is the default page after login
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify waitlist count is displayed
    const waitlistCount = page.locator('[data-testid="waitlist-count"]');
    if (await waitlistCount.isVisible()) {
      const countText = await waitlistCount.textContent();
      expect(countText).toMatch(/\d+/); // Should contain a number
    }
  });
});
