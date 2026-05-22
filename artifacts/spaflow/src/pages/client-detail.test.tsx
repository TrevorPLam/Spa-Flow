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

// Mock API client
vi.mock('@workspace/api-client-react', () => ({
  useGetClient: () => ({ data: mockClient, isLoading: false }),
  useUpdateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useGetClientRentals: () => ({ data: [], isLoading: false }),
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
  createdAt: new Date().toISOString(),
  activeSessions: [],
};

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
  describe('Membership Purchase Button', () => {
    it('shows "Purchase Membership" button for non-members', () => {
      // Arrange
      renderWithProviders(<ClientDetailPage />);

      // Assert
      expect(screen.getByRole('button', { name: /purchase membership/i })).toBeInTheDocument();
    });
  });

  describe('Membership History Timeline', () => {
    it('shows membership history card when membership transactions exist', () => {
      // Arrange
      renderWithProviders(<ClientDetailPage />);

      // Assert
      expect(screen.getByText(/membership history/i)).toBeInTheDocument();
      expect(screen.getByText(/one-time membership/i)).toBeInTheDocument();
      expect(screen.getAllByText(/14\.15/i)).toHaveLength(2); // Appears in both Transaction History and Membership History
    });
  });
});
