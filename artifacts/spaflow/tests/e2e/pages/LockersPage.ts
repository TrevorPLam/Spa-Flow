import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LockersPage extends BasePage {
  readonly lockerGrid: Locator;

  constructor(page: Page) {
    super(page);
    this.lockerGrid = page.locator('[data-testid^="locker-"]');
  }

  async goto() {
    await this.navigate('/lockers');
  }

  async getLockerCount(): Promise<number> {
    await this.page.waitForSelector('[data-testid^="locker-"]');
    return await this.lockerGrid.count();
  }

  async isLockersPageLoaded(): Promise<boolean> {
    return await this.lockerGrid.count() > 0;
  }
}
