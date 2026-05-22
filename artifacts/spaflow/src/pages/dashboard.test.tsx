import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from './dashboard';
import { render as renderWithProviders } from '@/test/test-utils';

// Mock components
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock wouter navigation
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

// Mock API hooks
vi.mock('@workspace/api-client-react', () => ({
  useGetDashboard: () => ({ data: mockDashboardData, isLoading: false }),
  useListClients: () => ({ data: mockClients, isLoading: false }),
  useListLockers: () => ({ data: mockLockers, isLoading: false }),
  useListRooms: () => ({ data: mockRooms, isLoading: false }),
  useAddToWaitlist: () => ({ mutate: vi.fn(), isPending: false }),
  useReleaseLocker: () => ({ mutate: vi.fn(), isPending: false }),
  useReleaseRoom: () => ({ mutate: vi.fn(), isPending: false }),
  getGetDashboardQueryKey: () => ['dashboard'],
  getGetLockersOccupancyQueryKey: () => ['lockers-occupancy'],
  getGetRoomsOccupancyQueryKey: () => ['rooms-occupancy'],
  getListClientsQueryKey: () => ['clients'],
  getListLockersQueryKey: () => ['lockers'],
  getListRoomsQueryKey: () => ['rooms'],
}));

// Mock useWebSocket
vi.mock('@/hooks/use-websocket', () => ({
  useWebSocket: () => ({ status: 'connected' }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockDashboardData = {
  lockerOccupancy: { total: 167, occupied: 50 },
  roomOccupancy: { total: 38, occupied: 15 },
  todayRevenue: 1250.50,
  activeClients: 25,
  waitlistCount: 3,
  lowStockCount: 2,
  lowStockProducts: [
    { id: 1, name: 'Towel', category: 'Amenities', stock: 5, lowStockThreshold: 10 },
    { id: 2, name: 'Shampoo', category: 'Amenities', stock: 0, lowStockThreshold: 5 },
  ],
  activeRentals: [
    { id: 1, clientName: 'John Doe', resourceType: 'locker', resourceName: 'L-101', expiresAt: new Date(Date.now() + 3600000).toISOString() },
    { id: 2, clientName: 'Jane Smith', resourceType: 'room', resourceName: 'R-201', expiresAt: new Date(Date.now() + 7200000).toISOString() },
  ],
  recentTransactions: [
    { id: 1, clientName: 'John Doe', type: 'membership', total: 13.00, createdAt: new Date().toISOString() },
    { id: 2, clientName: 'Jane Smith', type: 'checkin', total: 25.50, createdAt: new Date(Date.now() - 3600000).toISOString() },
  ],
};

const mockClients = [
  { id: 1, name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' },
];

const mockLockers = [
  { id: 1, name: 'L-101', status: 'occupied' },
  { id: 2, name: 'L-102', status: 'occupied' },
];

const mockRooms = [
  { id: 1, name: 'R-201', status: 'occupied' },
  { id: 2, name: 'R-202', status: 'occupied' },
];

describe('DashboardPage', { tags: ['smoke', 'critical'] }, () => {
  it('renders without crashing', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert - Component renders without crashing
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders KPI cards when loaded', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert
    expect(screen.getByTestId('card-locker-occupancy')).toBeInTheDocument();
    expect(screen.getByTestId('card-room-occupancy')).toBeInTheDocument();
    expect(screen.getByTestId('card-today-revenue')).toBeInTheDocument();
    expect(screen.getByTestId('card-active-clients')).toBeInTheDocument();
  });

  it('renders low stock alert when products are low', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert
    expect(screen.getByTestId('card-low-stock-alert')).toBeInTheDocument();
  });

  it('renders active rentals list', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert
    expect(screen.getByText('Active Rentals')).toBeInTheDocument();
  });

  it('renders recent transactions list', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert
    expect(screen.getByText('New Check-in')).toBeInTheDocument();
    expect(screen.getByText('Add to Waitlist')).toBeInTheDocument();
    expect(screen.getByText('Release Resource')).toBeInTheDocument();
  });

  it('renders client search input', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert
    const searchInput = screen.getByPlaceholderText('Search clients...');
    expect(searchInput).toBeInTheDocument();
  });
});
