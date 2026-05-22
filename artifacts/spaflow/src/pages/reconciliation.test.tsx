import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReconciliationPage from './reconciliation';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'MANAGER' } })),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useGetReconciliationHistory: vi.fn(() => ({ data: [], isLoading: false })),
  useRunReconciliation: vi.fn(() => ({ mutate: vi.fn() })),
  getGetReconciliationHistoryQueryKey: vi.fn(() => ['reconciliation']),
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
  it('should render without crashing for manager', () => {
    renderWithProvider(<ReconciliationPage />);
    expect(true).toBe(true);
  });
});
