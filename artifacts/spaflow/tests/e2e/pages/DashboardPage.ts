import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly lockerOccupancyCard: Locator;
  readonly roomOccupancyCard: Locator;
  readonly todayRevenueCard: Locator;
  readonly activeClientsCard: Locator;
  readonly navigationMenu: Locator;
  readonly clientsNavLink: Locator;
  readonly checkinNavLink: Locator;
  readonly lockersNavLink: Locator;
  readonly roomsNavLink: Locator;

  constructor(page: Page) {
    super(page);
    this.lockerOccupancyCard = page.getByTestId('card-locker-occupancy');
    this.roomOccupancyCard = page.getByTestId('card-room-occupancy');
    this.todayRevenueCard = page.getByTestId('card-today-revenue');
    this.activeClientsCard = page.getByTestId('card-active-clients');
    this.navigationMenu = page.getByTestId('navigation-menu');
    this.clientsNavLink = page.getByRole('link', { name: /clients/i });
    this.checkinNavLink = page.getByRole('link', { name: /check.?in/i });
    this.lockersNavLink = page.getByRole('link', { name: /lockers/i });
    this.roomsNavLink = page.getByRole('link', { name: /rooms/i });
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

  async navigateToClients() {
    await this.clickElement(this.clientsNavLink);
  }

  async navigateToCheckIn() {
    await this.clickElement(this.checkinNavLink);
  }

  async navigateToLockers() {
    await this.clickElement(this.lockersNavLink);
  }

  async navigateToRooms() {
    await this.clickElement(this.roomsNavLink);
  }

  async isNavigationMenuVisible(): Promise<boolean> {
    return await this.isVisible(this.navigationMenu);
  }
}
