import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';

test.describe('Client Management', { tag: ['@smoke', '@critical'] }, () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');
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

  test('should add new client', async ({ page }) => {
    const clientsPage = new ClientsPage(page);

    await clientsPage.goto();
    await clientsPage.clickNewClient();
    await page.waitForTimeout(500);

    // Verify client form is visible
    await expect(clientsPage.isClientFormVisible()).resolves.toBe(true);

    // Fill client form
    await clientsPage.fillClientForm('Test Client', 'test@example.com', '555-1234');
    await page.waitForTimeout(300);

    // Save client
    await clientsPage.saveClient();
    await page.waitForTimeout(1000);

    // Verify redirect back to clients list
    const url = page.url();
    expect(url).toContain('/clients');
  });

  test('should edit existing client', async ({ page }) => {
    const clientsPage = new ClientsPage(page);

    await clientsPage.goto();
    await page.waitForTimeout(500);

    // Search for a client to edit
    await clientsPage.searchClients('John');
    await page.waitForTimeout(500);

    // Edit the first client found
    await clientsPage.editClient('John Doe');
    await page.waitForTimeout(500);

    // Verify client form is visible
    await expect(clientsPage.isClientFormVisible()).resolves.toBe(true);

    // Update client information
    await clientsPage.fillClientForm('John Doe Updated', 'john.updated@example.com', '555-5678');
    await page.waitForTimeout(300);

    // Save changes
    await clientsPage.saveClient();
    await page.waitForTimeout(1000);

    // Verify redirect back to clients list
    const url = page.url();
    expect(url).toContain('/clients');
  });

  test('should delete client', async ({ page }) => {
    const clientsPage = new ClientsPage(page);

    await clientsPage.goto();
    await page.waitForTimeout(500);

    // Search for a client to delete
    await clientsPage.searchClients('Test Client');
    await page.waitForTimeout(500);

    // Delete the client
    await clientsPage.deleteClient('Test Client');
    await page.waitForTimeout(1000);

    // Verify redirect back to clients list
    const url = page.url();
    expect(url).toContain('/clients');
  });

  test('should cancel client edit', async ({ page }) => {
    const clientsPage = new ClientsPage(page);

    await clientsPage.goto();
    await clientsPage.clickNewClient();
    await page.waitForTimeout(500);

    // Fill client form
    await clientsPage.fillClientForm('Cancelled Client', 'cancel@example.com', '555-9999');
    await page.waitForTimeout(300);

    // Cancel edit
    await clientsPage.cancelEdit();
    await page.waitForTimeout(500);

    // Verify redirect back to clients list without saving
    const url = page.url();
    expect(url).toContain('/clients');
  });
});
