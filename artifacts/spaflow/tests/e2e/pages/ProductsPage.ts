import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  readonly searchInput: Locator;
  readonly newProductButton: Locator;
  readonly productForm: Locator;
  readonly nameInput: Locator;
  readonly priceInput: Locator;
  readonly stockInput: Locator;
  readonly lowStockThresholdInput: Locator;
  readonly descriptionInput: Locator;
  readonly categoryInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search products...');
    this.newProductButton = page.getByRole('button', { name: /new product|add product/i });
    this.productForm = page.locator('[data-testid="product-form"]');
    this.nameInput = page.getByTestId('input-name');
    this.priceInput = page.getByTestId('input-price');
    this.stockInput = page.getByTestId('input-stock');
    this.lowStockThresholdInput = page.getByTestId('input-low-stock-threshold');
    this.descriptionInput = page.getByTestId('input-description');
    this.categoryInput = page.getByTestId('input-category');
    this.saveButton = page.getByRole('button', { name: /save|create/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.confirmDeleteButton = page.getByRole('button', { name: /confirm|delete/i });
  }

  async goto() {
    await this.navigate('/products');
  }

  async searchProducts(query: string) {
    await this.fillInput(this.searchInput, query);
  }

  async clickNewProduct() {
    await this.clickElement(this.newProductButton);
  }

  async isProductsPageLoaded(): Promise<boolean> {
    return await this.isVisible(this.searchInput);
  }

  async fillProductForm(name: string, price: string, stock: string, description?: string, category?: string) {
    await this.fillInput(this.nameInput, name);
    await this.fillInput(this.priceInput, price);
    await this.fillInput(this.stockInput, stock);
    if (description) {
      await this.fillInput(this.descriptionInput, description);
    }
    if (category) {
      await this.fillInput(this.categoryInput, category);
    }
  }

  async saveProduct() {
    await this.clickElement(this.saveButton);
  }

  async cancelEdit() {
    await this.clickElement(this.cancelButton);
  }

  async editProduct(productName: string) {
    await this.page.getByText(productName).click();
    await this.clickElement(this.editButton);
  }

  async deleteProduct(productName: string) {
    await this.page.getByText(productName).click();
    await this.clickElement(this.deleteButton);
    await this.clickElement(this.confirmDeleteButton);
  }

  async isProductFormVisible(): Promise<boolean> {
    return await this.isVisible(this.productForm);
  }

  async isProductsPageLoaded(): Promise<boolean> {
    return await this.isVisible(this.searchInput);
  }

  async getProductCount(): Promise<number> {
    const productRows = this.page.locator('[data-testid="product-row"]');
    return await productRows.count();
  }
}
