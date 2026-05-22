import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RoomsPage from './rooms';

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
const mockRelease = { mutate: vi.fn(), isPending: false };
const mockRenew = { mutate: vi.fn(), isPending: false };
const mockExtend = { mutate: vi.fn(), isPending: false };
const mockBulkRelease = { mutate: vi.fn(), isPending: false };
const mockUseListRooms = vi.fn(() => ({ data: [], isLoading: false }));
const mockUseGetRoomsOccupancy = vi.fn(() => ({ data: { available: 0, occupied: 0, reserved: 0, total: 0 }, isLoading: false }));

vi.mock('@workspace/api-client-react', () => ({
  useListRooms: () => mockUseListRooms(),
  useGetRoomsOccupancy: () => mockUseGetRoomsOccupancy(),
  useReleaseRoom: () => mockRelease,
  useRenewRoom: () => mockRenew,
  useExtendRoom: () => mockExtend,
  useBulkReleaseRooms: () => mockBulkRelease,
  getListRoomsQueryKey: vi.fn(() => ['rooms']),
  getGetRoomsOccupancyQueryKey: vi.fn(() => ['rooms-occupancy']),
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

describe('RoomsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseListRooms.mockReturnValue({ data: [], isLoading: false });
    mockUseGetRoomsOccupancy.mockReturnValue({ data: { available: 0, occupied: 0, reserved: 0, total: 0 }, isLoading: false });
  });

  describe('Page Rendering', () => {
    it('renders page header with title', () => {
      renderWithProvider(<RoomsPage />);
      expect(screen.getByText('Private Rooms')).toBeInTheDocument();
    });

    it('renders WebSocket connection status badge', () => {
      renderWithProvider(<RoomsPage />);
      expect(screen.getByText('connected')).toBeInTheDocument();
    });

    it('renders Release All Expired button', () => {
      renderWithProvider(<RoomsPage />);
      expect(screen.getByText('Release All Expired')).toBeInTheDocument();
    });

    it('renders status legend', () => {
      renderWithProvider(<RoomsPage />);
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Occupied')).toBeInTheDocument();
      expect(screen.getByText('Reserved')).toBeInTheDocument();
    });
  });

  describe('Occupancy Display', () => {
    it('displays occupancy statistics when data is available', () => {
      mockUseGetRoomsOccupancy.mockReturnValue({
        data: { available: 20, occupied: 15, reserved: 3, total: 38 },
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      expect(screen.getByText('20 available · 15 occupied · 3 reserved')).toBeInTheDocument();
    });

    it('does not display occupancy when data is not available', () => {
      mockUseGetRoomsOccupancy.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      expect(screen.queryByText(/available/)).not.toBeInTheDocument();
    });
  });

  describe('Room Grid Rendering', () => {
    it('renders empty grid when no rooms available', () => {
      mockUseListRooms.mockReturnValue({ data: [], isLoading: false });

      renderWithProvider(<RoomsPage />);
      expect(screen.queryByTestId(/card-room-/)).not.toBeInTheDocument();
    });

    it('renders room cards when data is available', () => {
      mockUseListRooms.mockReturnValue({
        data: [
          { id: 1, name: 'R1', status: 'available' },
          { id: 2, name: 'R2', status: 'occupied' },
        ],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      expect(screen.getByTestId('card-room-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-room-2')).toBeInTheDocument();
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R2')).toBeInTheDocument();
    });

    it('applies correct styling for available rooms', () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'available' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      expect(roomCard).toHaveClass('bg-green-50', 'border-green-200', 'text-green-700');
    });

    it('applies correct styling for occupied rooms', () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      expect(roomCard).toHaveClass('bg-amber-50', 'border-amber-300', 'text-amber-900');
    });

    it('applies correct styling for reserved rooms', () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'reserved' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      expect(roomCard).toHaveClass('bg-blue-50', 'border-blue-300', 'text-blue-900');
    });

    it('displays client name on room card when occupied', () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      expect(within(roomCard).getByText((content, element) => {
        return element?.textContent === 'Client: Jane Smith' || content === 'Jane Smith';
      })).toBeInTheDocument();
    });

    it('displays status badge on room card', () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      expect(within(roomCard).getByText('occupied')).toBeInTheDocument();
    });
  });

  describe('Room Detail Dialog', () => {
    it('opens dialog when clicking occupied room', async () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);

      const dialog = screen.getByTestId('dialog-room-detail');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText('R1')).toBeInTheDocument();
      expect(within(dialog).getByText('Jane Smith')).toBeInTheDocument();
    });

    it('shows Release, Renew, Extend buttons in dialog', async () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);

      expect(screen.getByTestId('button-release-room')).toBeInTheDocument();
      expect(screen.getByTestId('button-renew-room')).toBeInTheDocument();
      expect(screen.getByTestId('button-extend-room')).toBeInTheDocument();
    });

    it('shows status badge in dialog', async () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);

      const dialog = screen.getByTestId('dialog-room-detail');
      expect(within(dialog).getByText('occupied')).toBeInTheDocument();
    });
  });

  describe('Release Action', () => {
    it('shows confirmation dialog when Release button clicked', async () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);
      const releaseButton = screen.getByTestId('button-release-room');
      await userEvent.click(releaseButton);

      expect(screen.getByText('Release room?')).toBeInTheDocument();
    });

    it('calls release mutation when confirmed', async () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);
      const releaseButton = screen.getByTestId('button-release-room');
      await userEvent.click(releaseButton);

      // Use fireEvent for AlertDialogAction to bypass pointer-events: none
      const confirmButton = screen.getAllByText('Release')[1];
      fireEvent.click(confirmButton);

      expect(mockRelease.mutate).toHaveBeenCalled();
    });
  });

  describe('Renew Action', () => {
    it('calls renew mutation when Renew button clicked', async () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);
      const renewButton = screen.getByTestId('button-renew-room');
      await userEvent.click(renewButton);

      expect(mockRenew.mutate).toHaveBeenCalled();
    });
  });

  describe('Extend Action', () => {
    it('calls extend mutation when Extend button clicked', async () => {
      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);
      const extendButton = screen.getByTestId('button-extend-room');
      await userEvent.click(extendButton);

      expect(mockExtend.mutate).toHaveBeenCalled();
    });
  });

  describe('Bulk Release', () => {
    it('shows confirmation dialog when Release All Expired clicked', async () => {
      renderWithProvider(<RoomsPage />);
      const releaseAllButton = screen.getByText('Release All Expired');
      await userEvent.click(releaseAllButton);

      expect(screen.getByText('Release all expired rooms?')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows toast error when release fails', async () => {
      mockRelease.mutate.mockImplementation((_options, callbacks) => {
        callbacks?.onError();
      });

      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);
      const releaseButton = screen.getByTestId('button-release-room');
      await userEvent.click(releaseButton);

      const confirmButton = screen.getAllByText('Release')[1];
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to release room',
          variant: 'destructive',
        });
      });
    });

    it('shows toast error when renew fails', async () => {
      mockRenew.mutate.mockImplementation((_options, callbacks) => {
        callbacks?.onError();
      });

      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);
      const renewButton = screen.getByTestId('button-renew-room');
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

      mockUseListRooms.mockReturnValue({
        data: [{ id: 1, name: 'R1', status: 'occupied', clientName: 'Jane Smith' }],
        isLoading: false,
      });

      renderWithProvider(<RoomsPage />);
      const roomCard = screen.getByTestId('card-room-1');
      await userEvent.click(roomCard);
      const extendButton = screen.getByTestId('button-extend-room');
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
      renderWithProvider(<RoomsPage />);
      expect(screen.getByText('connected')).toBeInTheDocument();
    });

    it('displays disconnected status when WebSocket is disconnected', () => {
      mockUseWebSocket.mockReturnValue({ status: 'disconnected' });
      renderWithProvider(<RoomsPage />);
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });
  });
});
