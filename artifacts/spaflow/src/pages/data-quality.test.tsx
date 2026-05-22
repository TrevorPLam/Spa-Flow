import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DataQualityPage from './data-quality';

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

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

describe('DataQualityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Access Control', () => {
    it('shows access denied message for non-manager users', () => {
      mockUseAuth.mockReturnValue({ user: { role: 'STAFF' } });
      renderWithProvider(<DataQualityPage />);
      expect(screen.getByText('Data quality tools are only available to managers.')).toBeInTheDocument();
    });

    it('shows access denied message for non-authenticated users', () => {
      mockUseAuth.mockReturnValue({ user: null });
      renderWithProvider(<DataQualityPage />);
      expect(screen.getByText('Data quality tools are only available to managers.')).toBeInTheDocument();
    });

    it('renders page for manager users', () => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
      renderWithProvider(<DataQualityPage />);
      expect(screen.getByText('Data Quality')).toBeInTheDocument();
      expect(screen.queryByText('Data quality tools are only available to managers.')).not.toBeInTheDocument();
    });
  });

  describe('Page Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('renders page header with title and refresh button', () => {
      renderWithProvider(<DataQualityPage />);
      expect(screen.getByText('Data Quality')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('renders tabs for Duplicates, Anomalies, and Validation', () => {
      renderWithProvider(<DataQualityPage />);
      expect(screen.getByText('Duplicates')).toBeInTheDocument();
      expect(screen.getByText('Anomalies')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
    });
  });

  describe('Duplicates Tab', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('shows empty state when no duplicates found', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ duplicates: [] }),
      } as Response);

      renderWithProvider(<DataQualityPage />);
      expect(screen.getByText('No duplicates found. Click Refresh to scan.')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
    });

    it('shows toast error when loading duplicates fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      } as Response);

      renderWithProvider(<DataQualityPage />);
      const refreshButton = screen.getByText('Refresh');
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to load duplicates',
          variant: 'destructive',
        });
      });
    });

    it('shows toast error when loading anomalies fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      } as Response);

      renderWithProvider(<DataQualityPage />);
      const refreshButton = screen.getByText('Refresh');
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to load anomalies',
          variant: 'destructive',
        });
      });
    });
  });
});
