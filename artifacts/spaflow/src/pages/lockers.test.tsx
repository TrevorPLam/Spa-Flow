import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LockersPage from './lockers';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock useWebSocket
const mockUseWebSocket = vi.fn(() => ({ status: 'connected' }));
vi.mock('@/hooks/use-websocket', () => ({
  useWebSocket: () => mockUseWebSocket(),
}));

// Mock Countdown component
vi.mock('@/components/Countdown', () => ({
  Countdown: () => <span>0:00</span>,
}));

// Mock API client
const mockMutateAsync = vi.fn();
const mockRelease = { mutate: vi.fn(), isPending: false };
const mockRenew = { mutate: vi.fn(), isPending: false };
const mockExtend = { mutate: vi.fn(), isPending: false };
const mockBulkRelease = { mutate: vi.fn(), isPending: false };
const mockUseListLockers = vi.fn(() => ({ data: [], isLoading: false }));
const mockUseGetLockersOccupancy = vi.fn(() => ({ data: { available: 0, occupied: 0, reserved: 0, total: 0 }, isLoading: false }));

vi.mock('@workspace/api-client-react', () => ({
  useListLockers: () => mockUseListLockers(),
  useGetLockersOccupancy: () => mockUseGetLockersOccupancy(),
  useReleaseLocker: () => mockRelease,
  useRenewLocker: () => mockRenew,
  useExtendLocker: () => mockExtend,
  useBulkReleaseLockers: () => mockBulkRelease,
  getListLockersQueryKey: vi.fn(() => ['lockers']),
  getGetLockersOccupancyQueryKey: vi.fn(() => ['lockers-occupancy']),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('LockersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseListLockers.mockReturnValue({ data: [], isLoading: false });
    mockUseGetLockersOccupancy.mockReturnValue({ data: { available: 0, occupied: 0, reserved: 0, total: 0 }, isLoading: false });
  });

  describe('Page Rendering', () => {
    it('renders page header with title', () => {
      renderWithProvider(<LockersPage />);
      expect(screen.getByText('Lockers')).toBeInTheDocument();
    });

    it('renders WebSocket connection status badge', () => {
      renderWithProvider(<LockersPage />);
      expect(screen.getByText('connected')).toBeInTheDocument();
    });

    it('renders Release All Expired button', () => {
      renderWithProvider(<LockersPage />);
      expect(screen.getByText('Release All Expired')).toBeInTheDocument();
    });

    it('renders status legend', () => {
      renderWithProvider(<LockersPage />);
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Occupied')).toBeInTheDocument();
      expect(screen.getByText('Reserved')).toBeInTheDocument();
    });
  });

  describe('Occupancy Display', () => {
    it('displays occupancy statistics when data is available', () => {
      mockUseGetLockersOccupancy.mockReturnValue({
        data: { available: 50, occupied: 100, reserved: 17, total: 167 },
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      expect(screen.getByText('50 available · 100 occupied · 17 reserved')).toBeInTheDocument();
    });

    it('does not display occupancy when data is not available', () => {
      mockUseGetLockersOccupancy.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      expect(screen.queryByText(/available/)).not.toBeInTheDocument();
    });
  });

  describe('Locker Grid Rendering', () => {
    it('renders empty grid when no lockers available', () => {
      mockUseListLockers.mockReturnValue({ data: [], isLoading: false });

      renderWithProvider(<LockersPage />);
      expect(screen.queryByTestId(/card-locker-/)).not.toBeInTheDocument();
    });

    it('renders locker cards when data is available', () => {
      mockUseListLockers.mockReturnValue({
        data: [
          { id: 1, name: 'L1', status: 'available' },
          { id: 2, name: 'L2', status: 'occupied' },
        ],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      expect(screen.getByTestId('card-locker-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-locker-2')).toBeInTheDocument();
      expect(screen.getByText('L1')).toBeInTheDocument();
      expect(screen.getByText('L2')).toBeInTheDocument();
    });

    it('applies correct styling for available lockers', () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'available' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      expect(lockerCard).toHaveClass('bg-green-50', 'border-green-200', 'text-green-700');
    });

    it('applies correct styling for occupied lockers', () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      expect(lockerCard).toHaveClass('bg-amber-50', 'border-amber-300', 'text-amber-800');
    });

    it('applies correct styling for reserved lockers', () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'reserved' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      expect(lockerCard).toHaveClass('bg-blue-50', 'border-blue-300', 'text-blue-800');
    });
  });


  describe('Locker Detail Dialog', () => {
    it('opens dialog when clicking occupied locker', async () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);

      const dialog = screen.getByTestId('dialog-locker-detail');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText('L1')).toBeInTheDocument();
      expect(within(dialog).getByText('John Doe')).toBeInTheDocument();
    });

    it('shows Release, Renew, Extend buttons in dialog', async () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);

      expect(screen.getByTestId('button-release-locker')).toBeInTheDocument();
      expect(screen.getByTestId('button-renew-locker')).toBeInTheDocument();
      expect(screen.getByTestId('button-extend-locker')).toBeInTheDocument();
    });

    it('shows status badge in dialog', async () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);

      const dialog = screen.getByTestId('dialog-locker-detail');
      expect(within(dialog).getByText('occupied')).toBeInTheDocument();
    });
  });

  describe('Release Action', () => {
    it('shows confirmation dialog when Release button clicked', async () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);
      const releaseButton = screen.getByTestId('button-release-locker');
      await userEvent.click(releaseButton);

      expect(screen.getByText('Release locker?')).toBeInTheDocument();
    });

    it('calls release mutation when confirmed', async () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);
      const releaseButton = screen.getByTestId('button-release-locker');
      await userEvent.click(releaseButton);

      // Use fireEvent for AlertDialogAction to bypass pointer-events: none
      const confirmButton = screen.getAllByText('Release')[1];
      fireEvent.click(confirmButton);

      expect(mockRelease.mutate).toHaveBeenCalled();
    });
  });

  describe('Renew Action', () => {
    it('calls renew mutation when Renew button clicked', async () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);
      const renewButton = screen.getByTestId('button-renew-locker');
      await userEvent.click(renewButton);

      expect(mockRenew.mutate).toHaveBeenCalled();
    });
  });

  describe('Extend Action', () => {
    it('calls extend mutation when Extend button clicked', async () => {
      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);
      const extendButton = screen.getByTestId('button-extend-locker');
      await userEvent.click(extendButton);

      expect(mockExtend.mutate).toHaveBeenCalled();
    });
  });

  describe('Bulk Release', () => {
    it('shows confirmation dialog when Release All Expired clicked', async () => {
      renderWithProvider(<LockersPage />);
      const releaseAllButton = screen.getByText('Release All Expired');
      await userEvent.click(releaseAllButton);

      expect(screen.getByText('Release all expired lockers?')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows toast error when release fails', async () => {
      mockRelease.mutate.mockImplementation((_options, callbacks) => {
        callbacks?.onError();
      });

      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);
      const releaseButton = screen.getByTestId('button-release-locker');
      await userEvent.click(releaseButton);

      const confirmButton = screen.getAllByText('Release')[1];
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to release locker',
          variant: 'destructive',
        });
      });
    });

    it('shows toast error when renew fails', async () => {
      mockRenew.mutate.mockImplementation((_options, callbacks) => {
        callbacks?.onError();
      });

      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);
      const renewButton = screen.getByTestId('button-renew-locker');
      await userEvent.click(renewButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to renew',
          variant: 'destructive',
        });
      });
    });

    it('shows toast error when extend fails', async () => {
      mockExtend.mutate.mockImplementation((_options, callbacks) => {
        callbacks?.onError();
      });

      mockUseListLockers.mockReturnValue({
        data: [{ id: 1, name: 'L1', status: 'occupied', clientName: 'John Doe' }],
        isLoading: false,
      });

      renderWithProvider(<LockersPage />);
      const lockerCard = screen.getByTestId('card-locker-1');
      await userEvent.click(lockerCard);
      const extendButton = screen.getByTestId('button-extend-locker');
      await userEvent.click(extendButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to extend',
          variant: 'destructive',
        });
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('displays connected status when WebSocket is connected', () => {
      mockUseWebSocket.mockReturnValue({ status: 'connected' });
      renderWithProvider(<LockersPage />);
      expect(screen.getByText('connected')).toBeInTheDocument();
    });

    it('displays disconnected status when WebSocket is disconnected', () => {
      mockUseWebSocket.mockReturnValue({ status: 'disconnected' });
      renderWithProvider(<LockersPage />);
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });
  });
});
