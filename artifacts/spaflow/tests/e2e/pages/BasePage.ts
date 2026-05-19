import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string) {
    await this.page.goto(path);
  }

  async waitForElement(locator: Locator, timeout = 5000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  async clickElement(locator: Locator) {
    await locator.click();
  }

  async fillInput(locator: Locator, value: string) {
    await locator.fill(value);
  }

  async getText(locator: Locator): Promise<string> {
    return await locator.textContent() || '';
  }

  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }
}
