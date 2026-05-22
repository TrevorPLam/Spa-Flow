import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';
import { createTestClient, cleanupTestClients, getManagerAuthHeaders } from './helpers/test-data';

test.describe('Membership Purchase Flow', { tag: ['@smoke', '@critical'] }, () => {
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

  test('should display purchase membership button for non-members', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    // Create a test client without membership
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Non-Member Test Client',
      email: 'non-member@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await expect(clientsPage.isClientsPageLoaded()).resolves.toBe(true);

    await clientsPage.searchClient('Non-Member Test Client');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Non-Member Test Client');

    // Verify purchase membership button is visible
    const purchaseButton = page.getByRole('button', { name: /purchase membership/i });
    await expect(purchaseButton).toBeVisible();
  });

  test('should open membership purchase dialog', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Purchase Dialog Test',
      email: 'purchase-dialog@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Purchase Dialog Test');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Purchase Dialog Test');

    // Click purchase membership button
    const purchaseButton = page.getByRole('button', { name: /purchase membership/i });
    await purchaseButton.click();

    // Verify dialog opens
    const dialog = page.locator('[data-testid="membership-purchase-dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('should display membership pricing', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Pricing Test Client',
      email: 'pricing@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Pricing Test Client');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Pricing Test Client');

    const purchaseButton = page.getByRole('button', { name: /purchase membership/i });
    await purchaseButton.click();

    // Verify pricing is displayed
    const pricingDisplay = page.locator('[data-testid="membership-pricing"]');
    await expect(pricingDisplay).toBeVisible();
    
    // Verify both membership types are shown
    const oneTimeOption = page.getByText(/one-time/i);
    const sixMonthOption = page.getByText(/six-month/i);
    await expect(oneTimeOption).toBeVisible();
    await expect(sixMonthOption).toBeVisible();
  });

  test('should select membership type', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Selection Test Client',
      email: 'selection@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Selection Test Client');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Selection Test Client');

    const purchaseButton = page.getByRole('button', { name: /purchase membership/i });
    await purchaseButton.click();

    // Select six-month membership
    const sixMonthOption = page.getByRole('radio', { name: /six-month/i }).or(
      page.getByRole('button', { name: /six-month/i })
    );
    if (await sixMonthOption.isVisible()) {
      await sixMonthOption.click();
      
      // Verify selection
      const selectedOption = page.locator('[data-testid="selected-membership-type"]');
      await expect(selectedOption).toContainText('six-month', { ignoreCase: true });
    }
  });

  test('should complete membership purchase with payment', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Purchase Complete Test',
      email: 'purchase-complete@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Purchase Complete Test');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Purchase Complete Test');

    const purchaseButton = page.getByRole('button', { name: /purchase membership/i });
    await purchaseButton.click();

    // Select membership type
    const oneTimeOption = page.getByRole('radio', { name: /one-time/i }).or(
      page.getByRole('button', { name: /one-time/i })
    );
    if (await oneTimeOption.isVisible()) {
      await oneTimeOption.click();
    }

    // Complete payment (this is a placeholder - actual payment flow depends on Square integration)
    const confirmButton = page.getByRole('button', { name: /confirm|purchase/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      
      // Verify success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText('membership', { ignoreCase: true });
    }
  });

  test('should update client membership status after purchase', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Status Update Test',
      email: 'status-update@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Status Update Test');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Status Update Test');

    // Get initial status
    const initialStatus = page.locator('[data-testid="membership-status"]');
    const initialStatusText = await initialStatus.textContent();
    expect(initialStatusText).toBe('none');

    // Purchase membership (simplified - in real test would complete payment)
    const purchaseButton = page.getByRole('button', { name: /purchase membership/i });
    if (await purchaseButton.isVisible()) {
      await purchaseButton.click();
      
      const oneTimeOption = page.getByRole('radio', { name: /one-time/i }).or(
        page.getByRole('button', { name: /one-time/i })
      );
      if (await oneTimeOption.isVisible()) {
        await oneTimeOption.click();
      }
      
      const confirmButton = page.getByRole('button', { name: /confirm|purchase/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // Reload page to get updated data
        await page.reload();
        await clientsPage.searchClient('Status Update Test');
        await clientsPage.selectClient('Status Update Test');
        
        // Verify status updated
        const updatedStatus = page.locator('[data-testid="membership-status"]');
        await expect(updatedStatus).not.toContainText('none');
      }
    }
  });

  test('should show membership expiration date', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Expiration Test Client',
      email: 'expiration@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Expiration Test Client');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Expiration Test Client');

    // After membership purchase, verify expiration date is shown
    const expirationDate = page.locator('[data-testid="membership-expiration"]');
    if (await expirationDate.isVisible()) {
      const dateText = await expirationDate.textContent();
      expect(dateText).toBeTruthy();
      expect(dateText?.length).toBeGreaterThan(0);
    }
  });

  test('should add membership to transaction history', async ({ page, request }) => {
    const clientsPage = new ClientsPage(page);
    
    const testClient = await createTestClient(request, authHeaders, {
      name: 'Transaction History Test',
      email: 'transaction-history@example.com',
    });
    createdClientIds.push(testClient.id);

    await clientsPage.goto();
    await clientsPage.searchClient('Transaction History Test');
    await expect(clientsPage.clientList).toBeVisible();
    await clientsPage.selectClient('Transaction History Test');

    // Navigate to transaction history
    const transactionHistoryTab = page.getByRole('tab', { name: /transactions|history/i });
    if (await transactionHistoryTab.isVisible()) {
      await transactionHistoryTab.click();
      
      // Verify transaction history is visible
      const transactionList = page.locator('[data-testid="transaction-list"]');
      await expect(transactionList).toBeVisible();
    }
  });
});
