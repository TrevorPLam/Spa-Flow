import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Dashboard Navigation', { tag: ['@smoke', '@critical'] }, () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');
    await loginPage.waitForLoginSuccess();
  });

  test('should load dashboard with occupancy cards', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

    // Verify occupancy cards are displayed
    const lockerOccupancy = await dashboardPage.getLockerOccupancy();
    const roomOccupancy = await dashboardPage.getRoomOccupancy();

    expect(lockerOccupancy).toBeDefined();
    expect(roomOccupancy).toBeDefined();
  });

  test('should display navigation menu', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await expect(dashboardPage.isNavigationMenuVisible()).resolves.toBe(true);
  });

  test('should navigate to clients from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.navigateToClients();

    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/clients');
  });

  test('should navigate to check-in from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.navigateToCheckIn();

    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/checkin');
  });

  test('should navigate to lockers from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.navigateToLockers();

    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/lockers');
  });

  test('should navigate to rooms from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.navigateToRooms();

    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/rooms');
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

    // Navigate to clients
    await dashboardPage.navigateToClients();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/clients');

    // Navigate back to dashboard
    await dashboardPage.goto();
    await page.waitForTimeout(500);
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

    // Navigate to check-in
    await dashboardPage.navigateToCheckIn();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/checkin');

    // Navigate back to dashboard
    await dashboardPage.goto();
    await page.waitForTimeout(500);
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);
  });

  test('should verify data loads correctly on dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await expect(dashboardPage.isDashboardLoaded()).resolves.toBe(true);

    // Verify occupancy data is loaded
    const lockerOccupancy = await dashboardPage.getLockerOccupancy();
    const roomOccupancy = await dashboardPage.getRoomOccupancy();

    // Verify data is not empty
    expect(lockerOccupancy.length).toBeGreaterThan(0);
    expect(roomOccupancy.length).toBeGreaterThan(0);
  });
});
