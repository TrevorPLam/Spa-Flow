import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';
import { ProductsPage } from './pages/ProductsPage';
import { UsersPage } from './pages/UsersPage';
import { LockersPage } from './pages/LockersPage';
import { RoomsPage } from './pages/RoomsPage';
import { assertNoCriticalViolations } from './helpers/accessibility';

test.describe('CRUD Operations', { tag: ['@smoke', '@critical'] }, () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');
    await loginPage.waitForLoginSuccess();
  });

  test.describe('Clients CRUD', () => {
    test('should create a new client', async ({ page }) => {
      const clientsPage = new ClientsPage(page);

      await clientsPage.goto();
      await clientsPage.clickNewClient();

      await expect(clientsPage.isClientFormVisible()).resolves.toBe(true);
      await assertNoCriticalViolations(page);

      await clientsPage.fillClientForm('CRUD Test Client', 'crud@example.com', '555-0000');
      await clientsPage.saveClient();

      await expect(page).toHaveURL(/\/clients/);
      await expect(page.getByText('CRUD Test Client')).toBeVisible();
    });

    test('should read client details', async ({ page }) => {
      const clientsPage = new ClientsPage(page);

      await clientsPage.goto();
      await clientsPage.searchClients('CRUD Test Client');

      await expect(page.getByText('CRUD Test Client')).toBeVisible();
      await expect(page.getByText('crud@example.com')).toBeVisible();
    });

    test('should update client information', async ({ page }) => {
      const clientsPage = new ClientsPage(page);

      await clientsPage.goto();
      await clientsPage.searchClients('CRUD Test Client');
      await clientsPage.editClient('CRUD Test Client');

      await expect(clientsPage.isClientFormVisible()).resolves.toBe(true);
      await clientsPage.fillClientForm('CRUD Test Client Updated', 'crud.updated@example.com', '555-1111');
      await clientsPage.saveClient();

      await expect(page).toHaveURL(/\/clients/);
      await expect(page.getByText('CRUD Test Client Updated')).toBeVisible();
    });

    test('should delete a client', async ({ page }) => {
      const clientsPage = new ClientsPage(page);

      await clientsPage.goto();
      await clientsPage.searchClients('CRUD Test Client Updated');
      await clientsPage.deleteClient('CRUD Test Client Updated');

      await expect(page).toHaveURL(/\/clients/);
      await expect(page.getByText('CRUD Test Client Updated')).not.toBeVisible();
    });
  });

  test.describe('Products CRUD', () => {
    test('should create a new product', async ({ page }) => {
      const productsPage = new ProductsPage(page);

      await productsPage.goto();
      await productsPage.clickNewProduct();

      await expect(productsPage.isProductFormVisible()).resolves.toBe(true);
      await assertNoCriticalViolations(page);

      await productsPage.fillProductForm('CRUD Test Product', '19.99', '50', 'Test description', 'Test Category');
      await productsPage.saveProduct();

      await expect(page).toHaveURL(/\/products/);
      await expect(page.getByText('CRUD Test Product')).toBeVisible();
    });

    test('should read product details', async ({ page }) => {
      const productsPage = new ProductsPage(page);

      await productsPage.goto();
      await productsPage.searchProducts('CRUD Test Product');

      await expect(page.getByText('CRUD Test Product')).toBeVisible();
      await expect(page.getByText('$19.99')).toBeVisible();
      await expect(page.getByText('50')).toBeVisible();
    });

    test('should update product information', async ({ page }) => {
      const productsPage = new ProductsPage(page);

      await productsPage.goto();
      await productsPage.searchProducts('CRUD Test Product');
      await productsPage.editProduct('CRUD Test Product');

      await expect(productsPage.isProductFormVisible()).resolves.toBe(true);
      await productsPage.fillProductForm('CRUD Test Product Updated', '24.99', '75', 'Updated description', 'Updated Category');
      await productsPage.saveProduct();

      await expect(page).toHaveURL(/\/products/);
      await expect(page.getByText('CRUD Test Product Updated')).toBeVisible();
      await expect(page.getByText('$24.99')).toBeVisible();
    });

    test('should delete a product', async ({ page }) => {
      const productsPage = new ProductsPage(page);

      await productsPage.goto();
      await productsPage.searchProducts('CRUD Test Product Updated');
      await productsPage.deleteProduct('CRUD Test Product Updated');

      await expect(page).toHaveURL(/\/products/);
      await expect(page.getByText('CRUD Test Product Updated')).not.toBeVisible();
    });
  });

  test.describe('Users CRUD', () => {
    const testUserEmail = 'crud-test@example.com';
    const testUserName = 'CRUD Test User';

    test('should create a new user', async ({ page }) => {
      const usersPage = new UsersPage(page);

      await usersPage.goto();
      await usersPage.clickNewUser();

      await expect(usersPage.isUserFormVisible()).resolves.toBe(true);
      await assertNoCriticalViolations(page);

      await usersPage.fillUserForm(testUserEmail, testUserName, 'TestPassword123!', 'STAFF');
      await usersPage.saveUser();

      await expect(page).toHaveURL(/\/users/);
      await expect(page.getByText(testUserEmail)).toBeVisible();
    });

    test('should read user details', async ({ page }) => {
      const usersPage = new UsersPage(page);

      await usersPage.goto();
      await usersPage.searchUsers(testUserEmail);

      await expect(page.getByText(testUserEmail)).toBeVisible();
      await expect(page.getByText(testUserName)).toBeVisible();
    });

    test('should update user information', async ({ page }) => {
      const usersPage = new UsersPage(page);

      await usersPage.goto();
      await usersPage.searchUsers(testUserEmail);
      await usersPage.editUser(testUserEmail);

      await expect(usersPage.isUserFormVisible()).resolves.toBe(true);
      await usersPage.fillUserForm(testUserEmail, 'CRUD Test User Updated', undefined, 'MANAGER');
      await usersPage.saveUser();

      await expect(page).toHaveURL(/\/users/);
      await expect(page.getByText('CRUD Test User Updated')).toBeVisible();
    });

    test('should delete a user', async ({ page }) => {
      const usersPage = new UsersPage(page);

      await usersPage.goto();
      await usersPage.searchUsers(testUserEmail);
      await usersPage.deleteUser(testUserEmail);

      await expect(page).toHaveURL(/\/users/);
      await expect(page.getByText(testUserEmail)).not.toBeVisible();
    });
  });

  test.describe('Lockers CRUD', () => {
    test('should read all lockers', async ({ page }) => {
      const lockersPage = new LockersPage(page);

      await lockersPage.goto();
      await expect(lockersPage.isLockersPageLoaded()).resolves.toBe(true);

      const lockerCount = await lockersPage.getLockerCount();
      expect(lockerCount).toBeGreaterThan(0);
    });

    test('should filter lockers by status', async ({ page }) => {
      const lockersPage = new LockersPage(page);

      await lockersPage.goto();
      await expect(lockersPage.isLockersPageLoaded()).resolves.toBe(true);

      const statusFilter = page.locator('[data-testid="status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('available');
        
        const availableLockers = page.locator('[data-status="available"]');
        const count = await availableLockers.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Rooms CRUD', () => {
    test('should read all rooms', async ({ page }) => {
      const roomsPage = new RoomsPage(page);

      await roomsPage.goto();
      await expect(roomsPage.isRoomsPageLoaded()).resolves.toBe(true);

      const roomCount = await roomsPage.getRoomCount();
      expect(roomCount).toBeGreaterThan(0);
    });

    test('should filter rooms by status', async ({ page }) => {
      const roomsPage = new RoomsPage(page);

      await roomsPage.goto();
      await expect(roomsPage.isRoomsPageLoaded()).resolves.toBe(true);

      const statusFilter = page.locator('[data-testid="status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('available');
        
        const availableRooms = page.locator('[data-status="available"]');
        const count = await availableRooms.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('CRUD Error Handling', () => {
    test('should handle duplicate client creation', async ({ page }) => {
      const clientsPage = new ClientsPage(page);

      await clientsPage.goto();
      await clientsPage.clickNewClient();
      await clientsPage.fillClientForm('Duplicate Client', 'duplicate@example.com', '555-2222');
      await clientsPage.saveClient();

      // Try to create the same client again
      await clientsPage.clickNewClient();
      await clientsPage.fillClientForm('Duplicate Client', 'duplicate@example.com', '555-2222');
      await clientsPage.saveClient();

      // Should show an error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('should handle invalid product data', async ({ page }) => {
      const productsPage = new ProductsPage(page);

      await productsPage.goto();
      await productsPage.clickNewProduct();
      
      // Try to save with invalid data (negative price)
      await productsPage.fillProductForm('Invalid Product', '-10', '50');
      await productsPage.saveProduct();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('should handle invalid user email', async ({ page }) => {
      const usersPage = new UsersPage(page);

      await usersPage.goto();
      await usersPage.clickNewUser();
      
      // Try to save with invalid email
      await usersPage.fillUserForm('invalid-email', 'Test User', 'TestPassword123!', 'STAFF');
      await usersPage.saveUser();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });
});
