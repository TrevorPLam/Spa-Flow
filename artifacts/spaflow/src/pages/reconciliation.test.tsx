import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReconciliationPage from './reconciliation';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock API client
const mockRefetch = vi.fn();
const mockMutate = vi.fn();
const mockUseGetReconciliationHistory = vi.fn();
const mockUseRunReconciliation = vi.fn();
const mockGetGetReconciliationHistoryQueryKey = vi.fn(() => ['reconciliation']);

vi.mock('@workspace/api-client-react', () => ({
  useGetReconciliationHistory: () => mockUseGetReconciliationHistory(),
  useRunReconciliation: () => mockUseRunReconciliation(),
  getGetReconciliationHistoryQueryKey: () => mockGetGetReconciliationHistoryQueryKey(),
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

describe('ReconciliationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    mockUseGetReconciliationHistory.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: mockRefetch,
    });
    mockUseRunReconciliation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('should render without crashing for manager', () => {
    renderWithProvider(<ReconciliationPage />);
    expect(screen.getByText('Payment Reconciliation')).toBeInTheDocument();
  });

  it('should show access denied message for non-manager users', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'STAFF' } });
    renderWithProvider(<ReconciliationPage />);
    expect(screen.getByText('Payment reconciliation is only available to managers.')).toBeInTheDocument();
  });

  it('should display loading state when data is loading', () => {
    mockUseGetReconciliationHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });
    renderWithProvider(<ReconciliationPage />);
    expect(screen.getByText('Loading reconciliation data...')).toBeInTheDocument();
  });

  it('should display no data message when reconciliation data is empty', () => {
    mockUseGetReconciliationHistory.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: mockRefetch,
    });
    renderWithProvider(<ReconciliationPage />);
    expect(screen.getByText('No reconciliation data available for the selected date range.')).toBeInTheDocument();
  });

  it('should display reconciliation results when data is available', () => {
    const mockData = {
      data: [
        {
          date: '2024-01-15',
          status: 'matched',
          totalInternal: 1000,
          totalSquare: 1000,
          discrepancies: null,
        },
      ],
    };
    mockUseGetReconciliationHistory.mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: mockRefetch,
    });
    renderWithProvider(<ReconciliationPage />);
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(screen.getByText('Matched')).toBeInTheDocument();
  });

  it('should display discrepancy cards when there are discrepancies', () => {
    const mockData = {
      data: [
        {
          date: '2024-01-15',
          status: 'discrepancy',
          totalInternal: 1000,
          totalSquare: 950,
          discrepancies: {
            missingInSquare: [{ paymentId: 'pay_123', amount: 50 }],
            missingInInternal: [],
            amountMismatches: [],
          },
        },
      ],
    };
    mockUseGetReconciliationHistory.mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: mockRefetch,
    });
    renderWithProvider(<ReconciliationPage />);
    expect(screen.getByText('Discrepancy')).toBeInTheDocument();
    expect(screen.getByText('Missing in Square (1)')).toBeInTheDocument();
  });

  it('should call refetch when refresh button is clicked', () => {
    renderWithProvider(<ReconciliationPage />);
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should call mutate when manual reconciliation is triggered', () => {
    renderWithProvider(<ReconciliationPage />);
    const runButton = screen.getByText('Run Reconciliation');
    fireEvent.click(runButton);
    expect(mockMutate).toHaveBeenCalled();
  });

  it('should disable run button when reconciliation is pending', () => {
    mockUseRunReconciliation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    renderWithProvider(<ReconciliationPage />);
    const runButton = screen.getByText('Running...');
    expect(runButton).toBeDisabled();
  });

  it('should display summary cards when data is available', () => {
    const mockData = {
      data: [
        {
          date: '2024-01-15',
          status: 'matched',
          totalInternal: 1000,
          totalSquare: 1000,
          discrepancies: null,
        },
        {
          date: '2024-01-16',
          status: 'matched',
          totalInternal: 500,
          totalSquare: 500,
          discrepancies: null,
        },
      ],
    };
    mockUseGetReconciliationHistory.mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: mockRefetch,
    });
    renderWithProvider(<ReconciliationPage />);
    expect(screen.getByText('Total Internal')).toBeInTheDocument();
    expect(screen.getByText('Total Square')).toBeInTheDocument();
    expect(screen.getByText('Matched Days')).toBeInTheDocument();
    expect(screen.getAllByText(/Discrepancies/).length).toBeGreaterThan(0);
  });
});
