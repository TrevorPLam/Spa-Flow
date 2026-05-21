import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render as renderWithProviders } from '@/test/test-utils';
import { Sidebar } from './Sidebar';

describe('Sidebar', { tags: ['smoke', 'critical'] }, () => {
  describe('Rendering', () => {
    it('renders main navigation items', () => {
      // Arrange
      renderWithProviders(<Sidebar />);

      // Assert
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-check-in')).toBeInTheDocument();
      expect(screen.getByTestId('nav-clients')).toBeInTheDocument();
      expect(screen.getByTestId('nav-lockers')).toBeInTheDocument();
      expect(screen.getByTestId('nav-rooms')).toBeInTheDocument();
      expect(screen.getByTestId('nav-waitlist')).toBeInTheDocument();
      expect(screen.getByTestId('nav-products')).toBeInTheDocument();
      expect(screen.getByTestId('nav-transactions')).toBeInTheDocument();
      expect(screen.getByTestId('nav-sessions')).toBeInTheDocument();
    });

    it('renders logout button', () => {
      // Arrange
      renderWithProviders(<Sidebar />);

      // Assert
      expect(screen.getByTestId('button-logout')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });
});
