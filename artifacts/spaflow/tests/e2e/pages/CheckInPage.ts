import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckInPage extends BasePage {
  readonly searchInput: Locator;
  readonly clientList: Locator;
  readonly resourceTypeLocker: Locator;
  readonly resourceTypeRoom: Locator;
  readonly proceedButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search clients...');
    this.clientList = page.locator('[data-testid^="client-"]');
    this.resourceTypeLocker = page.getByRole('button', { name: /locker/i });
    this.resourceTypeRoom = page.getByRole('button', { name: /room/i });
    this.proceedButton = page.getByRole('button', { name: /proceed|next/i });
  }

  async goto() {
    await this.navigate('/checkin');
  }

  async searchClient(query: string) {
    await this.fillInput(this.searchInput, query);
  }

  async selectClient(clientName: string) {
    await this.page.getByText(clientName).click();
  }

  async selectResourceType(type: 'locker' | 'room') {
    if (type === 'locker') {
      await this.clickElement(this.resourceTypeLocker);
    } else {
      await this.clickElement(this.resourceTypeRoom);
    }
  }

  async proceed() {
    await this.clickElement(this.proceedButton);
  }

  async isCheckInPageLoaded(): Promise<boolean> {
    return await this.isVisible(this.searchInput);
  }
}
