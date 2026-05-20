import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

afterEach(() => {
  cleanup();
});

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    isManager: false,
  }),
}));

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useGetMe: () => ({ data: null, isLoading: false }),
  useLogin: () => ({ mutateAsync: vi.fn() }),
  useLogout: () => ({ mutateAsync: vi.fn() }),
  useGetDashboard: () => ({ data: null, isLoading: false }),
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
  getGetMeQueryKey: () => ['me'],
  getGetDashboardQueryKey: () => ['dashboard'],
  getGetLockersOccupancyQueryKey: () => ['lockers'],
  getGetRoomsOccupancyQueryKey: () => ['rooms'],
  getListClientsQueryKey: () => ['clients'],
}));

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Redirect: () => null,
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
