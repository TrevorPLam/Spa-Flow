import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionsPage from './transactions';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Select components to avoid empty string value error
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid={`select-${value}`}>
      {children}
      <button onClick={() => onValueChange?.('locker_rental')}>Change Value</button>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <div>Select Value</div>,
}));

// Mock date-range-picker components
vi.mock('@/components/ui/date-range-picker', () => ({
  DateRangePicker: ({ onChange }: any) => (
    <div>
      <button onClick={() => onChange?.({ from: new Date(), to: new Date() })}>Change Date Range</button>
    </div>
  ),
  DateRangePresets: ({ onChange }: any) => (
    <div>
      <button onClick={() => onChange?.({ from: new Date(), to: new Date() })}>Change Preset</button>
    </div>
  ),
}));

// Mock API client
const mockUseListTransactions = vi.fn();
const mockGetListTransactionsQueryKey = vi.fn(() => ['transactions']);

vi.mock('@workspace/api-client-react', () => ({
  useListTransactions: () => mockUseListTransactions(),
  getListTransactionsQueryKey: () => mockGetListTransactionsQueryKey(),
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

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseListTransactions.mockReturnValue({
      data: { transactions: [], total: 0 },
      isLoading: false,
    });
  });

  it('should render without crashing', () => {
    renderWithProvider(<TransactionsPage />);
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('should display loading state when data is loading', () => {
    mockUseListTransactions.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderWithProvider(<TransactionsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display no transactions message when data is empty', () => {
    mockUseListTransactions.mockReturnValue({
      data: { transactions: [], total: 0 },
      isLoading: false,
    });
    renderWithProvider(<TransactionsPage />);
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('should display transactions when data is available', () => {
    const mockTransactions = [
      {
        id: 1,
        clientName: 'John Doe',
        type: 'locker_rental',
        description: 'Locker rental',
        amount: 10,
        tax: 0.89,
        total: 10.89,
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListTransactions.mockReturnValue({
      data: { transactions: mockTransactions, total: 1 },
      isLoading: false,
    });
    renderWithProvider(<TransactionsPage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1 total')).toBeInTheDocument();
  });

  it('should display transaction type badges', () => {
    const mockTransactions = [
      {
        id: 1,
        clientName: 'John Doe',
        type: 'locker_rental',
        description: 'Locker rental',
        amount: 10,
        tax: 0.89,
        total: 10.89,
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListTransactions.mockReturnValue({
      data: { transactions: mockTransactions, total: 1 },
      isLoading: false,
    });
    renderWithProvider(<TransactionsPage />);
    expect(screen.getByText('locker rental')).toBeInTheDocument();
  });

  it('should display transaction amounts correctly', () => {
    const mockTransactions = [
      {
        id: 1,
        clientName: 'John Doe',
        type: 'locker_rental',
        description: 'Locker rental',
        amount: 10,
        tax: 0.89,
        total: 10.89,
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListTransactions.mockReturnValue({
      data: { transactions: mockTransactions, total: 1 },
      isLoading: false,
    });
    renderWithProvider(<TransactionsPage />);
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('$0.89')).toBeInTheDocument();
    expect(screen.getByText('$10.89')).toBeInTheDocument();
  });

  it('should display pagination when there are multiple pages', () => {
    mockUseListTransactions.mockReturnValue({
      data: { transactions: [], total: 50 },
      isLoading: false,
    });
    renderWithProvider(<TransactionsPage />);
    expect(screen.getByText('Page 1 of 2 (50 total)')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('should disable previous button on first page', () => {
    mockUseListTransactions.mockReturnValue({
      data: { transactions: [], total: 50 },
      isLoading: false,
    });
    renderWithProvider(<TransactionsPage />);
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });
});
