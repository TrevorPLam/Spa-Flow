import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WaitlistPage from './waitlist';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useListWaitlist: vi.fn(() => ({ data: [], isLoading: false })),
  useAddToWaitlist: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveFromWaitlist: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useConfirmWaitlistAssignment: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useListClients: vi.fn(() => ({ data: { clients: [] }, isLoading: false })),
  getListWaitlistQueryKey: vi.fn(() => ['waitlist']),
  getListClientsQueryKey: vi.fn(() => ['clients']),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
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
  it('should render without crashing', () => {
    renderWithProvider(<WaitlistPage />);
    expect(true).toBe(true);
  });
});
