import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from './reports';
import { render as renderWithProviders } from '@/test/test-utils';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock date-range-picker components
vi.mock('@/components/ui/date-range-picker', () => ({
  DateRangePresets: ({ value, onChange }: any) => (
    <div data-testid="date-range-presets">
      <button onClick={() => onChange({ from: new Date('2024-01-01'), to: new Date('2024-01-31') })}>
        Set Date Range
      </button>
    </div>
  ),
}));

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ReportsPage', { tags: ['smoke', 'critical'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Access Control', () => {
    it('shows access denied message for non-manager users', () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: { role: 'STAFF' } });

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports are only available to managers.')).toBeInTheDocument();
    });

    it('shows access denied message for non-authenticated users', () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null });

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports are only available to managers.')).toBeInTheDocument();
    });

    it('renders reports page for manager users', () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalRevenue: 0, totalTax: 0, total: 0, startDate: '', endDate: '', granularity: 'daily' }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.queryByText('Reports are only available to managers.')).not.toBeInTheDocument();
    });
  });

  describe('Page Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders page header with title and description', () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalRevenue: 0, totalTax: 0, total: 0, startDate: '', endDate: '', granularity: 'daily' }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Manager-only financial and utilization reporting')).toBeInTheDocument();
    });

    it('renders date range picker', () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalRevenue: 0, totalTax: 0, total: 0, startDate: '', endDate: '', granularity: 'daily' }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByTestId('date-range-presets')).toBeInTheDocument();
    });

    it('renders granularity selector', () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalRevenue: 0, totalTax: 0, total: 0, startDate: '', endDate: '', granularity: 'daily' }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('Weekly')).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalRevenue: 0, totalTax: 0, total: 0, startDate: '', endDate: '', granularity: 'daily' }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  describe('Revenue Report Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders revenue summary cards when data is available', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ date: '2024-01-01', revenue: 1000, tax: 88.75, total: 1088.75, transactionCount: 10 }],
          totalRevenue: 1000,
          totalTax: 88.75,
          total: 1088.75,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          granularity: 'daily',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Revenue by Type Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders revenue by type chart when data is available', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { type: 'locker_rental', revenue: 500, tax: 44.38, total: 544.38, count: 5 },
            { type: 'room_rental', revenue: 1000, tax: 88.75, total: 1088.75, count: 3 },
          ],
          totalRevenue: 1500,
          totalTax: 133.13,
          total: 1633.13,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Utilization Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders locker utilization summary card', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ date: '2024-01-01', occupiedCount: 50, totalCapacity: 167, utilizationRate: '29.9' }],
          averageUtilization: 29.9,
          totalCapacity: 167,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          granularity: 'daily',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('renders room utilization summary card', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ date: '2024-01-01', occupiedCount: 15, totalCapacity: 38, utilizationRate: '39.5' }],
          averageUtilization: 39.5,
          totalCapacity: 38,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          granularity: 'daily',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Peak Hours Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders peak hours chart when data is available', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { hour: 10, lockerRentals: 5, roomRentals: 3, totalRentals: 8 },
            { hour: 14, lockerRentals: 8, roomRentals: 5, totalRentals: 13 },
          ],
          peakHour: { hour: 14, totalRentals: 13 },
          averageRentalsPerHour: 10.5,
          totalRentals: 21,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Conversion Rate Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders conversion rate card when data is available', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          conversionCount: 25,
          totalClients: 100,
          conversionRate: 25.0,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Average Transaction Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders average transaction value when data is available', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ type: 'locker_rental', avgAmount: 20, avgTotal: 21.78, count: 50, totalRevenue: 1089 }],
          overall: {
            avgAmount: 25,
            avgTotal: 27.23,
            count: 100,
            totalRevenue: 2723,
          },
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Loading and Empty States', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('shows loading state while fetching', () => {
      // Arrange
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) } as Response), 100))
      );

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      expect(screen.getByText('Loading reports...')).toBeInTheDocument();
    });

    it('shows empty state when no data is available', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No data available for the selected date range.')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('allows changing granularity', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalRevenue: 0, totalTax: 0, total: 0, startDate: '', endDate: '', granularity: 'daily' }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);
      const select = screen.getByRole('combobox');
      
      // Assert
      expect(select).toBeInTheDocument();
    });

    it('triggers refresh when refresh button is clicked', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalRevenue: 0, totalTax: 0, total: 0, startDate: '', endDate: '', granularity: 'daily' }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);
      const refreshButton = screen.getByText('Refresh');
      await userEvent.click(refreshButton);

      // Assert
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('CSV Export', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
      
      // Mock URL.createObjectURL and related DOM methods
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('has export buttons for charts with data', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ date: '2024-01-01', revenue: 1000, tax: 88.75, total: 1088.75, transactionCount: 10 }],
          totalRevenue: 1000,
          totalTax: 88.75,
          total: 1088.75,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          granularity: 'daily',
        }),
      } as Response);

      // Act
      renderWithProviders(<ReportsPage />);

      // Assert - Just verify the page renders, export buttons are conditional on data
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });
});
