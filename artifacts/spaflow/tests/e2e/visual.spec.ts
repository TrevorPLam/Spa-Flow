import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ProductsPage } from './pages/ProductsPage';
import { UsersPage } from './pages/UsersPage';
import { LockersPage } from './pages/LockersPage';
import { RoomsPage } from './pages/RoomsPage';
import { CheckInPage } from './pages/CheckInPage';

test.describe('Visual Regression Tests', { tag: ['@regression'] }, () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');
    await loginPage.waitForLoginSuccess();
  });

  test.describe('Key Pages Visual Regression', () => {
    test('should match dashboard screenshot', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

      // Full page screenshot with configured thresholds
      await expect(page).toHaveScreenshot('dashboard-full.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match clients page screenshot', async ({ page }) => {
      const clientsPage = new ClientsPage(page);
      await clientsPage.goto();
      await expect(clientsPage.isClientsPageLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('clients-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match products page screenshot', async ({ page }) => {
      const productsPage = new ProductsPage(page);
      await productsPage.goto();
      await expect(productsPage.isProductsPageLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('products-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match users page screenshot', async ({ page }) => {
      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await expect(usersPage.isUsersPageLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('users-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match lockers page screenshot', async ({ page }) => {
      const lockersPage = new LockersPage(page);
      await lockersPage.goto();
      await expect(lockersPage.isLockersPageLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('lockers-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match rooms page screenshot', async ({ page }) => {
      const roomsPage = new RoomsPage(page);
      await roomsPage.goto();
      await expect(roomsPage.isRoomsPageLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('rooms-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match check-in page screenshot', async ({ page }) => {
      const checkInPage = new CheckInPage(page);
      await checkInPage.goto();
      await expect(checkInPage.isCheckInPageLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('checkin-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Component Visual Regression', () => {
    test('should match navigation menu screenshot', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await expect(dashboardPage.isNavigationMenuVisible()).resolves.toBe(true);

      const navigationMenu = page.getByTestId('navigation-menu');
      await expect(navigationMenu).toHaveScreenshot('navigation-menu.png', {
        maxDiffPixels: 50,
        threshold: 0.15,
      });
    });

    test('should match dashboard cards screenshot', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

      const dashboardCards = page.locator('[data-testid^="card-"]');
      await expect(dashboardCards.first()).toHaveScreenshot('dashboard-card.png', {
        maxDiffPixels: 50,
        threshold: 0.15,
      });
    });

    test('should match client form screenshot', async ({ page }) => {
      const clientsPage = new ClientsPage(page);
      await clientsPage.goto();
      await clientsPage.clickNewClient();
      await expect(clientsPage.isClientFormVisible()).resolves.toBe(true);

      const clientForm = page.locator('[data-testid="client-form"]');
      await expect(clientForm).toHaveScreenshot('client-form.png', {
        maxDiffPixels: 50,
        threshold: 0.15,
      });
    });

    test('should match product form screenshot', async ({ page }) => {
      const productsPage = new ProductsPage(page);
      await productsPage.goto();
      await productsPage.clickNewProduct();
      await expect(productsPage.isProductFormVisible()).resolves.toBe(true);

      const productForm = page.locator('[data-testid="product-form"]');
      await expect(productForm).toHaveScreenshot('product-form.png', {
        maxDiffPixels: 50,
        threshold: 0.15,
      });
    });

    test('should match user form screenshot', async ({ page }) => {
      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.clickNewUser();
      await expect(usersPage.isUserFormVisible()).resolves.toBe(true);

      const userForm = page.locator('[data-testid="user-form"]');
      await expect(userForm).toHaveScreenshot('user-form.png', {
        maxDiffPixels: 50,
        threshold: 0.15,
      });
    });
  });

  test.describe('Responsive Design Visual Regression', () => {
    test('should match dashboard on tablet viewport', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await page.setViewportSize({ width: 768, height: 1024 });
      await dashboardPage.goto();
      await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match dashboard on mobile viewport', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.goto();
      await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match clients page on mobile viewport', async ({ page }) => {
      const clientsPage = new ClientsPage(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await clientsPage.goto();
      await expect(clientsPage.isClientsPageLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('clients-mobile.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Interactive State Visual Regression', () => {
    test('should match clients page with search results', async ({ page }) => {
      const clientsPage = new ClientsPage(page);
      await clientsPage.goto();
      await clientsPage.searchClients('John');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('clients-search-results.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should match lockers page with status filter', async ({ page }) => {
      const lockersPage = new LockersPage(page);
      await lockersPage.goto();
      
      const statusFilter = page.locator('[data-testid="status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('available');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('lockers-filtered.png', {
          maxDiffPixels: 100,
          threshold: 0.2,
        });
      }
    });

    test('should match client form with filled data', async ({ page }) => {
      const clientsPage = new ClientsPage(page);
      await clientsPage.goto();
      await clientsPage.clickNewClient();
      await clientsPage.fillClientForm('Visual Test Client', 'visual@example.com', '555-9999');

      const clientForm = page.locator('[data-testid="client-form"]');
      await expect(clientForm).toHaveScreenshot('client-form-filled.png', {
        maxDiffPixels: 50,
        threshold: 0.15,
      });
    });
  });

  test.describe('Dark Mode Visual Regression', () => {
    test('should match dashboard in dark mode', async ({ page }) => {
      // Toggle dark mode if available
      const themeToggle = page.getByTestId('theme-toggle');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
      }

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

      await expect(page).toHaveScreenshot('dashboard-dark.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });
});
