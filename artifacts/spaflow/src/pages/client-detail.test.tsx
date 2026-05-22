import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ClientDetailPage from './client-detail';
import { render as renderWithProviders } from '@/test/test-utils';

// Mock components
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/Countdown', () => ({
  Countdown: ({ expiresAt }: { expiresAt: Date }) => <div data-testid="countdown">{expiresAt.toISOString()}</div>,
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isManager: true, user: { id: 1, role: 'manager' } }),
}));

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useGetClient: () => ({ data: mockClient, isLoading: false }),
  useUpdateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useGetClientRentals: () => ({ data: mockRentals, isLoading: false }),
  useGetClientTransactions: () => ({ data: mockTransactions, isLoading: false }),
  useGetClientRentalProducts: () => ({ data: [], isLoading: false }),
  useRenewMembership: () => ({ mutate: vi.fn(), isPending: false }),
  getGetClientQueryKey: (id: number) => ['client', id],
  getListClientsQueryKey: () => ['clients'],
  getGetClientRentalsQueryKey: (id: number) => ['client', id, 'rentals'],
  getGetClientTransactionsQueryKey: (id: number) => ['client', id, 'transactions'],
  getGetClientRentalProductsQueryKey: (id: number, sessionId: number) => ['client', id, 'rentals', sessionId, 'products'],
}));

// Mock wouter
vi.mock('wouter', () => ({
  useRoute: () => [true, { id: '1' }],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockClient = {
  id: 1,
  name: 'Test Client',
  email: 'test@example.com',
  phone: '555-1234',
  memberId: 'SPF-ABC123',
  membershipStatus: 'none' as const,
  membershipExpiresAt: null,
  notes: 'Test notes',
  dob: '[encrypted]',
  address: '[encrypted]',
  documentNumber: '[encrypted]',
  smsRemindersEnabled: 'true',
  createdAt: new Date().toISOString(),
  activeSessions: [],
};

const mockRentals = [
  {
    id: 1,
    clientId: 1,
    resourceType: 'locker',
    resourceName: 'L-101',
    status: 'active',
    startTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  },
];

const mockTransactions = [
  {
    id: 1,
    clientId: 1,
    clientName: 'Test Client',
    amount: 13.00,
    tax: 1.15,
    total: 14.15,
    type: 'membership' as const,
    squarePaymentId: 'sq_123',
    description: 'one_time membership renewal for Test Client',
    sessionId: null,
    createdAt: new Date().toISOString(),
  },
];

describe('ClientDetailPage', { tags: ['smoke', 'critical'] }, () => {
  it('renders without crashing', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert - Component renders without crashing
    expect(screen.getByText('Test Client')).toBeInTheDocument();
  });

  it('renders client name and member ID', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('SPF-ABC123')).toBeInTheDocument();
  });

  it('renders contact information', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
  });

  it('renders membership badge', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows "Purchase Membership" button for non-members', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByRole('button', { name: /purchase membership/i })).toBeInTheDocument();
  });

  it('renders notes when present', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByText('Test notes')).toBeInTheDocument();
  });

  it('renders encrypted PII fields', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getAllByText(/encrypted/i)).toHaveLength(3);
  });

  it('shows "View Identification" button for managers', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByTestId('button-view-pii')).toBeInTheDocument();
  });

  it('renders active rentals', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByText('Active Rentals')).toBeInTheDocument();
  });

  it('renders transaction history', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('renders membership history when membership transactions exist', () => {
    // Arrange
    renderWithProviders(<ClientDetailPage />);

    // Assert
    expect(screen.getByText(/membership history/i)).toBeInTheDocument();
    expect(screen.getByText(/one-time membership/i)).toBeInTheDocument();
  });
});
