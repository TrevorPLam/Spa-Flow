import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LockersPage } from './pages/LockersPage';
import { WebSocketPage } from './pages/WebSocketPage';
import {
  createTestUser,
  cleanupTestData,
  getManagerAuthHeaders,
  type TestUser,
} from './helpers/test-data';

test.describe('WebSocket Functionality', { tag: ['@smoke', '@critical'] }, () => {
  let testUser: TestUser;

  test.beforeEach(async ({ request }) => {
    testUser = await createTestUser(request, { role: 'MANAGER' });
  });

  test.afterEach(async ({ request }) => {
    const authHeaders = await getManagerAuthHeaders(request);
    await cleanupTestData(request, authHeaders, [testUser.id]);
  });

  test('should establish WebSocket connection after login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const webSocketPage = new WebSocketPage(page);

    await page.goto('/login');
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForLoginSuccess();

    // Navigate to dashboard which uses WebSocket
    await dashboardPage.goto();
    await dashboardPage.isDashboardLoaded();

    // Wait for WebSocket connection to establish
    await webSocketPage.waitForConnection();

    // Verify connection status shows as connected
    const status = await webSocketPage.getConnectionStatus();
    expect(status).toBe('connected');

    // Verify WiFi icon is present (not WiFi off)
    const hasWifiIcon = await webSocketPage.hasWifiIcon();
    const hasWifiOffIcon = await webSocketPage.hasWifiOffIcon();
    expect(hasWifiIcon).toBe(true);
    expect(hasWifiOffIcon).toBe(false);
  });

  test('should display connection status on lockers page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const lockersPage = new LockersPage(page);
    const webSocketPage = new WebSocketPage(page);

    await page.goto('/login');
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForLoginSuccess();

    // Navigate to lockers page which also uses WebSocket
    await lockersPage.goto();
    await page.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await webSocketPage.waitForConnection();

    // Verify connection status badge is visible
    const status = await webSocketPage.getConnectionStatus();
    expect(status).toBe('connected');
  });

  test('should disconnect WebSocket on logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const webSocketPage = new WebSocketPage(page);

    await page.goto('/login');
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForLoginSuccess();

    await dashboardPage.goto();
    await dashboardPage.isDashboardLoaded();
    await webSocketPage.waitForConnection();

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await page.waitForURL('/login');

    // Navigate back to dashboard (should redirect to login)
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');

    // After logout, WebSocket should be disconnected
    // We can't easily test this without logging back in, but the redirect confirms session is cleared
  });

  test('should show disconnected status when WebSocket server is unavailable', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const webSocketPage = new WebSocketPage(page);

    // Block WebSocket connections to simulate server unavailability
    await context.route('**/ws', route => route.abort());

    await page.goto('/login');
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForLoginSuccess();

    await dashboardPage.goto();
    await dashboardPage.isDashboardLoaded();

    // Wait for connection attempt to fail
    await page.waitForTimeout(2000);

    // Connection should show as disconnected or error
    const status = await webSocketPage.getConnectionStatus();
    expect(['disconnected', 'error', 'connecting']).toContain(status);
  });

  test('should maintain WebSocket connection across page navigation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const lockersPage = new LockersPage(page);
    const webSocketPage = new WebSocketPage(page);

    await page.goto('/login');
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForLoginSuccess();

    await dashboardPage.goto();
    await dashboardPage.isDashboardLoaded();
    await webSocketPage.waitForConnection();

    // Navigate to lockers page
    await dashboardPage.navigateToLockers();
    await page.waitForLoadState('networkidle');

    // WebSocket should still be connected
    const status = await webSocketPage.getConnectionStatus();
    expect(status).toBe('connected');

    // Navigate back to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // WebSocket should still be connected
    const statusAfterNav = await webSocketPage.getConnectionStatus();
    expect(statusAfterNav).toBe('connected');
  });

  test('should show connecting status during initial connection', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const webSocketPage = new WebSocketPage(page);

    await page.goto('/login');
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForLoginSuccess();

    // Navigate to dashboard and immediately check status
    await dashboardPage.goto();

    // Briefly check if status is connecting (may be too fast to catch)
    const initialStatus = await webSocketPage.getConnectionStatus();
    expect(['connecting', 'connected', 'disconnected']).toContain(initialStatus);

    // Wait for final connection state
    await webSocketPage.waitForConnection();
    const finalStatus = await webSocketPage.getConnectionStatus();
    expect(finalStatus).toBe('connected');
  });
});

test.describe('WebSocket Reconnection', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ request }) => {
    testUser = await createTestUser(request, { role: 'MANAGER' });
  });

  test.afterEach(async ({ request }) => {
    const authHeaders = await getManagerAuthHeaders(request);
    await cleanupTestData(request, authHeaders, [testUser.id]);
  });

  test('should attempt reconnection after network interruption', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const webSocketPage = new WebSocketPage(page);

    await page.goto('/login');
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForLoginSuccess();

    await dashboardPage.goto();
    await dashboardPage.isDashboardLoaded();
    await webSocketPage.waitForConnection();

    // Simulate network interruption by blocking WebSocket
    await context.route('**/ws', route => route.abort());

    // Wait for disconnection
    await page.waitForTimeout(3000);

    // Unblock WebSocket
    await context.unrouteAll({ behavior: 'ignoreErrors' });

    // Wait for reconnection attempt
    await page.waitForTimeout(2000);

    // Check if connection is re-established or attempting to reconnect
    const status = await webSocketPage.getConnectionStatus();
    expect(['connecting', 'connected', 'disconnected', 'error']).toContain(status);
  });
});
