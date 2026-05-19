import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ClientsPage extends BasePage {
  readonly searchInput: Locator;
  readonly newClientButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search clients...');
    this.newClientButton = page.getByRole('button', { name: /new client/i });
  }

  async goto() {
    await this.navigate('/clients');
  }

  async searchClients(query: string) {
    await this.fillInput(this.searchInput, query);
  }

  async clickNewClient() {
    await this.clickElement(this.newClientButton);
  }

  async isClientsPageLoaded(): Promise<boolean> {
    return await this.isVisible(this.searchInput);
  }
}
