import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import LoginPage from './login';
import { render as renderWithProviders } from '@/test/test-utils';

describe('LoginPage', () => {
  describe('Rendering', () => {
    it('renders email and password inputs', () => {
      // Arrange
      renderWithProviders(<LoginPage />);
      
      // Assert
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      // Arrange
      renderWithProviders(<LoginPage />);
      
      // Assert
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders SpaFlow branding', () => {
      // Arrange
      renderWithProviders(<LoginPage />);
      
      // Assert
      expect(screen.getAllByText(/SpaFlow/i).length).toBeGreaterThan(0);
    });

    it('renders left panel with branding on large screens', () => {
      // Arrange
      renderWithProviders(<LoginPage />);
      
      // Assert
      expect(screen.getByText(/The spa management system/)).toBeInTheDocument();
    });
  });
});
