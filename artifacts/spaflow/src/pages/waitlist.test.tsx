import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WaitlistPage from './waitlist';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock API client
const mockUseListWaitlist = vi.fn();
const mockUseAddToWaitlist = vi.fn();
const mockUseRemoveFromWaitlist = vi.fn();
const mockUseConfirmWaitlistAssignment = vi.fn();
const mockUseListClients = vi.fn();
const mockGetListWaitlistQueryKey = vi.fn(() => ['waitlist']);
const mockGetListClientsQueryKey = vi.fn(() => ['clients']);

vi.mock('@workspace/api-client-react', () => ({
  useListWaitlist: () => mockUseListWaitlist(),
  useAddToWaitlist: () => mockUseAddToWaitlist(),
  useRemoveFromWaitlist: () => mockUseRemoveFromWaitlist(),
  useConfirmWaitlistAssignment: () => mockUseConfirmWaitlistAssignment(),
  useListClients: () => mockUseListClients(),
  getListWaitlistQueryKey: () => mockGetListWaitlistQueryKey(),
  getListClientsQueryKey: () => mockGetListClientsQueryKey(),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Countdown component
vi.mock('@/components/Countdown', () => ({
  Countdown: () => <span>0:00</span>,
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

describe('WaitlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseListWaitlist.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseAddToWaitlist.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseRemoveFromWaitlist.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseConfirmWaitlistAssignment.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseListClients.mockReturnValue({
      data: { clients: [] },
      isLoading: false,
    });
  });

  it('should render without crashing', () => {
    renderWithProvider(<WaitlistPage />);
    expect(screen.getByText('Waitlist')).toBeInTheDocument();
  });

  it('should display empty state when waitlist is empty', () => {
    mockUseListWaitlist.mockReturnValue({
      data: [],
      isLoading: false,
    });
    renderWithProvider(<WaitlistPage />);
    expect(screen.getByText('Waitlist is empty')).toBeInTheDocument();
  });

  it('should display waitlist entries when data is available', () => {
    const mockWaitlist = [
      {
        id: 1,
        clientName: 'John Doe',
        clientPhone: '555-1234',
        position: 1,
        status: 'waiting',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListWaitlist.mockReturnValue({
      data: mockWaitlist,
      isLoading: false,
    });
    renderWithProvider(<WaitlistPage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByTestId('row-waitlist-1')).toBeInTheDocument();
  });

  it('should have search input', () => {
    renderWithProvider(<WaitlistPage />);
    expect(screen.getByPlaceholderText('Search client...')).toBeInTheDocument();
  });

  it('should display confirm button for assigned entries', () => {
    const mockWaitlist = [
      {
        id: 1,
        clientName: 'John Doe',
        position: 1,
        status: 'assigned',
        assignedRoomName: 'Room 1',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListWaitlist.mockReturnValue({
      data: mockWaitlist,
      isLoading: false,
    });
    renderWithProvider(<WaitlistPage />);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });
});
