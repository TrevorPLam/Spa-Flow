import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('input-email');
    this.passwordInput = page.getByTestId('input-password');
    this.submitButton = page.getByTestId('button-submit');
    this.errorMessage = page.getByTestId('text-login-error');
  }

  async goto() {
    await this.navigate('/login');
  }

  async login(email: string, password: string) {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.clickElement(this.submitButton);
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async waitForLoginSuccess() {
    await this.page.waitForURL('/dashboard');
  }
}
