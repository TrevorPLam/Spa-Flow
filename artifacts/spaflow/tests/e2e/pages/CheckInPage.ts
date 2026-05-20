import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckInPage extends BasePage {
  readonly searchInput: Locator;
  readonly clientList: Locator;
  readonly resourceTypeLocker: Locator;
  readonly resourceTypeRoom: Locator;
  readonly proceedButton: Locator;
  readonly productSelection: Locator;
  readonly paymentForm: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search clients...');
    this.clientList = page.locator('[data-testid^="client-"]');
    this.resourceTypeLocker = page.getByRole('button', { name: /locker/i });
    this.resourceTypeRoom = page.getByRole('button', { name: /room/i });
    this.proceedButton = page.getByRole('button', { name: /proceed|next/i });
    this.productSelection = page.locator('[data-testid="product-selection"]');
    this.paymentForm = page.locator('[data-testid="payment-form"]');
    this.submitButton = page.getByRole('button', { name: /submit|complete check-in/i });
    this.successMessage = page.locator('[data-testid="success-message"]');
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

  async selectProduct(productName: string) {
    await this.productSelection.getByText(productName).click();
  }

  async completePayment() {
    await this.submitButton.click();
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async getSuccessMessageText(): Promise<string> {
    return await this.getText(this.successMessage);
  }
}
