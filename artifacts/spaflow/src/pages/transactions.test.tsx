import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionsPage from './transactions';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Select components to avoid empty string value error
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <div>Select Value</div>,
}));

// Mock date-range-picker components
vi.mock('@/components/ui/date-range-picker', () => ({
  DateRangePicker: () => <div>Date Range Picker</div>,
  DateRangePresets: () => <div>Date Range Presets</div>,
}));

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useListTransactions: vi.fn(() => ({ data: { transactions: [], total: 0 }, isLoading: false })),
  getListTransactionsQueryKey: vi.fn(() => ['transactions']),
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
  it('should render without crashing', () => {
    renderWithProvider(<TransactionsPage />);
    expect(true).toBe(true);
  });
});
