import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ClientNewPage from './client-new';
import { render as renderWithProviders } from '@/test/test-utils';

// Mock components
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ClientNewPage', { tags: ['@smoke', '@critical'] }, () => {
  describe('Rendering', () => {
    it('renders page title', () => {
      // Arrange
      renderWithProviders(<ClientNewPage />);

      // Assert
      expect(screen.getByText(/new client/i)).toBeInTheDocument();
    });

    it('renders form fields', () => {
      // Arrange
      renderWithProviders(<ClientNewPage />);

      // Assert
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/membership/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders identification section', () => {
      // Arrange
      renderWithProviders(<ClientNewPage />);

      // Assert
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/document/i)).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      // Arrange
      renderWithProviders(<ClientNewPage />);

      // Assert
      expect(screen.getByRole('button', { name: /create client/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });
});
