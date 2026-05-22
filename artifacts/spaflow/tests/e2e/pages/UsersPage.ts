import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class UsersPage extends BasePage {
  readonly searchInput: Locator;
  readonly newUserButton: Locator;
  readonly userForm: Locator;
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly passwordInput: Locator;
  readonly roleSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search users...');
    this.newUserButton = page.getByRole('button', { name: /new user|add user/i });
    this.userForm = page.locator('[data-testid="user-form"]');
    this.emailInput = page.getByTestId('input-email');
    this.nameInput = page.getByTestId('input-name');
    this.passwordInput = page.getByTestId('input-password');
    this.roleSelect = page.getByTestId('select-role');
    this.saveButton = page.getByRole('button', { name: /save|create/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.confirmDeleteButton = page.getByRole('button', { name: /confirm|delete/i });
  }

  async goto() {
    await this.navigate('/users');
  }

  async searchUsers(query: string) {
    await this.fillInput(this.searchInput, query);
  }

  async clickNewUser() {
    await this.clickElement(this.newUserButton);
  }

  async isUsersPageLoaded(): Promise<boolean> {
    return await this.isVisible(this.searchInput);
  }

  async fillUserForm(email: string, name: string, password?: string, role: 'STAFF' | 'MANAGER' = 'STAFF') {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.nameInput, name);
    if (password) {
      await this.fillInput(this.passwordInput, password);
    }
    await this.roleSelect.selectOption(role);
  }

  async saveUser() {
    await this.clickElement(this.saveButton);
  }

  async cancelEdit() {
    await this.clickElement(this.cancelButton);
  }

  async editUser(userEmail: string) {
    await this.page.getByText(userEmail).click();
    await this.clickElement(this.editButton);
  }

  async deleteUser(userEmail: string) {
    await this.page.getByText(userEmail).click();
    await this.clickElement(this.deleteButton);
    await this.clickElement(this.confirmDeleteButton);
  }

  async isUserFormVisible(): Promise<boolean> {
    return await this.isVisible(this.userForm);
  }

  async isUsersPageLoaded(): Promise<boolean> {
    return await this.isVisible(this.searchInput);
  }

  async getUserCount(): Promise<number> {
    const userRows = this.page.locator('[data-testid="user-row"]');
    return await userRows.count();
  }
}
