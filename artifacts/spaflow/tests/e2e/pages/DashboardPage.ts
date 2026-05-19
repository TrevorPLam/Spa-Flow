import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly lockerOccupancyCard: Locator;
  readonly roomOccupancyCard: Locator;
  readonly todayRevenueCard: Locator;
  readonly activeClientsCard: Locator;

  constructor(page: Page) {
    super(page);
    this.lockerOccupancyCard = page.getByTestId('card-locker-occupancy');
    this.roomOccupancyCard = page.getByTestId('card-room-occupancy');
    this.todayRevenueCard = page.getByTestId('card-today-revenue');
    this.activeClientsCard = page.getByTestId('card-active-clients');
  }

  async goto() {
    await this.navigate('/dashboard');
  }

  async getLockerOccupancy(): Promise<string> {
    await this.waitForElement(this.lockerOccupancyCard);
    return await this.getText(this.lockerOccupancyCard);
  }

  async getRoomOccupancy(): Promise<string> {
    await this.waitForElement(this.roomOccupancyCard);
    return await this.getText(this.roomOccupancyCard);
  }

  async isDashboardLoaded(): Promise<boolean> {
    return await this.isVisible(this.lockerOccupancyCard);
  }
}
