import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class RoomsPage extends BasePage {
  readonly roomGrid: Locator;

  constructor(page: Page) {
    super(page);
    this.roomGrid = page.locator('[data-testid^="room-"]');
  }

  async goto() {
    await this.navigate('/rooms');
  }

  async getRoomCount(): Promise<number> {
    await this.page.waitForSelector('[data-testid^="room-"]');
    return await this.roomGrid.count();
  }

  async isRoomsPageLoaded(): Promise<boolean> {
    return await this.roomGrid.count() > 0;
  }
}
