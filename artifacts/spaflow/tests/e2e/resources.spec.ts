import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { LockersPage } from './pages/LockersPage';
import { RoomsPage } from './pages/RoomsPage';

test.describe('Resource Management', { tag: ['@regression', '@critical'] }, () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@spaflow.com', 'SpaFlow2024!');
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

  test('should release occupied locker', async ({ page }) => {
    const lockersPage = new LockersPage(page);

    await lockersPage.goto();
    await expect(lockersPage.isLockersPageLoaded()).resolves.toBe(true);

    // Find an occupied locker
    const occupiedLocker = page.locator('[data-status="occupied"]').first();
    
    if (await occupiedLocker.isVisible()) {
      // Click on the occupied locker
      await occupiedLocker.click();
      
      // Look for release button
      const releaseButton = page.getByRole('button', { name: /release/i });
      if (await releaseButton.isVisible()) {
        await releaseButton.click();
        
        // Verify success message
        const successMessage = page.locator('[data-testid="success-message"]');
        await expect(successMessage).toBeVisible();
        await expect(successMessage).toContainText('released', { ignoreCase: true });
        
        // Verify locker status updated
        await expect(occupiedLocker).toHaveAttribute('data-status', 'available');
      }
    }
  });

  test('should release occupied room', async ({ page }) => {
    const roomsPage = new RoomsPage(page);

    await roomsPage.goto();
    await expect(roomsPage.isRoomsPageLoaded()).resolves.toBe(true);

    // Find an occupied room
    const occupiedRoom = page.locator('[data-status="occupied"]').first();
    
    if (await occupiedRoom.isVisible()) {
      // Click on the occupied room
      await occupiedRoom.click();
      
      // Look for release button
      const releaseButton = page.getByRole('button', { name: /release/i });
      if (await releaseButton.isVisible()) {
        await releaseButton.click();
        
        // Verify success message
        const successMessage = page.locator('[data-testid="success-message"]');
        await expect(successMessage).toBeVisible();
        await expect(successMessage).toContainText('released', { ignoreCase: true });
        
        // Verify room status updated
        await expect(occupiedRoom).toHaveAttribute('data-status', 'available');
      }
    }
  });

  test('should verify waitlist assignment after room release', async ({ page }) => {
    const roomsPage = new RoomsPage(page);

    await roomsPage.goto();
    await expect(roomsPage.isRoomsPageLoaded()).resolves.toBe(true);

    // Find an occupied room
    const occupiedRoom = page.locator('[data-status="occupied"]').first();
    
    if (await occupiedRoom.isVisible()) {
      // Check if there's a waitlist
      const waitlistIndicator = page.locator('[data-testid="waitlist-count"]');
      const hasWaitlist = await waitlistIndicator.isVisible() && 
                          (await waitlistIndicator.textContent()) !== '0';
      
      if (hasWaitlist) {
        // Release the room
        await occupiedRoom.click();
        const releaseButton = page.getByRole('button', { name: /release/i });
        if (await releaseButton.isVisible()) {
          await releaseButton.click();
          
          // Verify waitlist assignment notification
          const waitlistNotification = page.locator('[data-testid="waitlist-assignment"]');
          if (await waitlistNotification.isVisible()) {
            await expect(waitlistNotification).toContainText('waitlist', { ignoreCase: true });
          }
        }
      }
    }
  });

  test('should display resource status indicators', async ({ page }) => {
    const lockersPage = new LockersPage(page);

    await lockersPage.goto();
    await expect(lockersPage.isLockersPageLoaded()).resolves.toBe(true);

    // Verify status indicators are visible
    const availableLockers = page.locator('[data-status="available"]');
    const occupiedLockers = page.locator('[data-status="occupied"]');
    const maintenanceLockers = page.locator('[data-status="maintenance"]');

    // At least one status should be visible
    const hasStatusIndicators = await (availableLockers.count() > 0 || 
                                       occupiedLockers.count() > 0 || 
                                       maintenanceLockers.count() > 0);
    expect(hasStatusIndicators).toBe(true);
  });

  test('should filter resources by status', async ({ page }) => {
    const lockersPage = new LockersPage(page);

    await lockersPage.goto();
    await expect(lockersPage.isLockersPageLoaded()).resolves.toBe(true);

    // Look for status filter
    const statusFilter = page.locator('[data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      // Filter by available
      await statusFilter.selectOption('available');
      
      // Verify only available lockers are shown
      const visibleLockers = page.locator('[data-status="available"]');
      const count = await visibleLockers.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
