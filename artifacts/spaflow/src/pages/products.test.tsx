import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductsPage from './products';

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isManager: true })),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useListProducts: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateProduct: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateProduct: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteProduct: vi.fn(() => ({ mutateAsync: vi.fn() })),
  getListProductsQueryKey: vi.fn(() => ['products']),
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

describe('ProductsPage', () => {
  it('should render without crashing', () => {
    renderWithProvider(<ProductsPage />);
    expect(true).toBe(true);
  });
});
