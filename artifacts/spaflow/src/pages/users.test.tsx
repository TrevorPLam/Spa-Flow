import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from './users';

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

// Mock API client
const mockUseListUsers = vi.fn();
const mockUseCreateUser = vi.fn();
const mockUseUpdateUser = vi.fn();
const mockUseDeleteUser = vi.fn();
const mockGetListUsersQueryKey = vi.fn(() => ['users']);

vi.mock('@workspace/api-client-react', () => ({
  useListUsers: () => mockUseListUsers(),
  useCreateUser: () => mockUseCreateUser(),
  useUpdateUser: () => mockUseUpdateUser(),
  useDeleteUser: () => mockUseDeleteUser(),
  getListUsersQueryKey: () => mockGetListUsersQueryKey(),
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

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isManager: true, user: { id: 1 } });
    mockUseListUsers.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseCreateUser.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseUpdateUser.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteUser.mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  it('should render without crashing for manager', () => {
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('Staff')).toBeInTheDocument();
  });

  it('should show access denied message for non-manager users', () => {
    mockUseAuth.mockReturnValue({ isManager: false, user: { id: 1 } });
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('Access denied — manager role required')).toBeInTheDocument();
  });

  it('should display loading state when data is loading', () => {
    mockUseListUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display users when data is available', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'MANAGER',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should display role badges correctly', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'MANAGER',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'STAFF',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('MANAGER')).toBeInTheDocument();
    expect(screen.getByText('STAFF')).toBeInTheDocument();
  });

  it('should display "You" badge for current user', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'MANAGER',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseAuth.mockReturnValue({ isManager: true, user: { id: 1 } });
    mockUseListUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should display user count', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'MANAGER',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'STAFF',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    mockUseListUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('2 users')).toBeInTheDocument();
  });

  it('should display table headers', () => {
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('should have new user button', () => {
    renderWithProvider(<UsersPage />);
    expect(screen.getByText('New User')).toBeInTheDocument();
  });
});
