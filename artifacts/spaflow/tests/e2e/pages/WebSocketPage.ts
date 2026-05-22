import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class WebSocketPage extends BasePage {
  readonly connectionStatusBadge: Locator;
  readonly wifiIcon: Locator;
  readonly wifiOffIcon: Locator;

  constructor(page: Page) {
    super(page);
    // Connection status badge is present on dashboard, lockers, and rooms pages
    this.connectionStatusBadge = page.locator('div').filter({ hasText: /^(connected|disconnected|connecting|error)$/i });
    this.wifiIcon = page.locator('svg').filter({ has: page.locator('[data-lucide="wifi"]') });
    this.wifiOffIcon = page.locator('svg').filter({ has: page.locator('[data-lucide="wifi-off"]') });
  }

  async getConnectionStatus(): Promise<string> {
    await this.waitForElement(this.connectionStatusBadge);
    const badgeText = await this.getText(this.connectionStatusBadge);
    // Extract status text from badge (it may contain icon)
    return badgeText.toLowerCase().trim();
  }

  async isConnected(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status === 'connected';
  }

  async isDisconnected(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status === 'disconnected';
  }

  async isConnecting(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status === 'connecting';
  }

  async hasWifiIcon(): Promise<boolean> {
    return await this.isVisible(this.wifiIcon);
  }

  async hasWifiOffIcon(): Promise<boolean> {
    return await this.isVisible(this.wifiOffIcon);
  }

  async waitForConnection(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const badge = document.querySelector('div');
        if (!badge) return false;
        const text = badge.textContent?.toLowerCase() || '';
        return text === 'connected';
      },
      { timeout }
    );
  }

  async waitForDisconnection(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const badge = document.querySelector('div');
        if (!badge) return false;
        const text = badge.textContent?.toLowerCase() || '';
        return text === 'disconnected';
      },
      { timeout }
    );
  }
}
