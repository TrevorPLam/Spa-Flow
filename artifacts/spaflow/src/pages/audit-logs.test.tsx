import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuditLogsPage from './audit-logs';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the API client
vi.mock('@workspace/api-client-react', () => ({
  useListAuditLogs: vi.fn(() => ({
    data: { logs: [], total: 0 },
    isLoading: false,
  })),
  getListAuditLogsQueryKey: vi.fn(() => ['audit-logs']),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isManager: true })),
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

describe('AuditLogsPage', () => {
  it('should render without crashing', () => {
    renderWithProvider(<AuditLogsPage />);
    expect(true).toBe(true);
  });
});
