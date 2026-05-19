import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { LockersPage } from './pages/LockersPage';
import { RoomsPage } from './pages/RoomsPage';

test.describe('Resource Management', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'password123');
    await loginPage.waitForLoginSuccess();
  });

  test('should load lockers page', async ({ page }) => {
    const lockersPage = new LockersPage(page);

    await lockersPage.goto();
    await expect(lockersPage.isLockersPageLoaded()).resolves.toBe(true);
  });

  test('should display lockers grid', async ({ page }) => {
    const lockersPage = new LockersPage(page);

    await lockersPage.goto();
    const lockerCount = await lockersPage.getLockerCount();
    expect(lockerCount).toBeGreaterThan(0);
  });

  test('should load rooms page', async ({ page }) => {
    const roomsPage = new RoomsPage(page);

    await roomsPage.goto();
    await expect(roomsPage.isRoomsPageLoaded()).resolves.toBe(true);
  });

  test('should display rooms grid', async ({ page }) => {
    const roomsPage = new RoomsPage(page);

    await roomsPage.goto();
    const roomCount = await roomsPage.getRoomCount();
    expect(roomCount).toBeGreaterThan(0);
  });
});
