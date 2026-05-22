import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from './settings';

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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isManager: true });
  });

  it('should render without crashing for manager', () => {
    renderWithProvider(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should show access denied message for non-manager users', () => {
    mockUseAuth.mockReturnValue({ isManager: false });
    renderWithProvider(<SettingsPage />);
    expect(screen.getByText('Manager access required')).toBeInTheDocument();
  });

  it('should display page title and description', () => {
    renderWithProvider(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage system configuration and special events')).toBeInTheDocument();
  });

  it('should display special events section', () => {
    renderWithProvider(<SettingsPage />);
    expect(screen.getByText('Special Events')).toBeInTheDocument();
    expect(screen.getByText('Manage holidays and special events that disable pricing specials')).toBeInTheDocument();
  });

  it('should have add event button', () => {
    renderWithProvider(<SettingsPage />);
    expect(screen.getByText('Add Event')).toBeInTheDocument();
  });
});
