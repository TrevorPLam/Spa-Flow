import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LockersPage from './lockers';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Mock useWebSocket
vi.mock('@/hooks/use-websocket', () => ({
  useWebSocket: vi.fn(() => ({ status: 'connected' })),
}));

// Mock Countdown component
vi.mock('@/components/Countdown', () => ({
  Countdown: () => <span>0:00</span>,
}));

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useListLockers: vi.fn(() => ({ data: [], isLoading: false })),
  useGetLockersOccupancy: vi.fn(() => ({ data: { available: 0, occupied: 0, reserved: 0, total: 0 }, isLoading: false })),
  useReleaseLocker: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRenewLocker: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExtendLocker: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useBulkReleaseLockers: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
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
  it('should render without crashing', () => {
    renderWithProvider(<LockersPage />);
    expect(true).toBe(true);
  });
});
