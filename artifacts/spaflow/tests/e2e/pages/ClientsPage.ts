import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ClientsPage extends BasePage {
  readonly searchInput: Locator;
  readonly newClientButton: Locator;
  readonly clientForm: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search clients...');
    this.newClientButton = page.getByRole('button', { name: /new client/i });
    this.clientForm = page.locator('[data-testid="client-form"]');
    this.nameInput = page.getByTestId('input-name');
    this.emailInput = page.getByTestId('input-email');
    this.phoneInput = page.getByTestId('input-phone');
    this.saveButton = page.getByRole('button', { name: /save|create/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.confirmDeleteButton = page.getByRole('button', { name: /confirm|delete/i });
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

  async fillClientForm(name: string, email: string, phone: string) {
    await this.fillInput(this.nameInput, name);
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.phoneInput, phone);
  }

  async saveClient() {
    await this.clickElement(this.saveButton);
  }

  async cancelEdit() {
    await this.clickElement(this.cancelButton);
  }

  async editClient(clientName: string) {
    await this.page.getByText(clientName).click();
    await this.clickElement(this.editButton);
  }

  async deleteClient(clientName: string) {
    await this.page.getByText(clientName).click();
    await this.clickElement(this.deleteButton);
    await this.clickElement(this.confirmDeleteButton);
  }

  async isClientFormVisible(): Promise<boolean> {
    return await this.isVisible(this.clientForm);
  }
}
