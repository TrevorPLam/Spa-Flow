import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render as renderWithProviders } from '@/test/test-utils';
import { Layout } from './Layout';

describe('Layout', () => {
  describe('Authentication Redirect', () => {
    it('redirects to login when user is not authenticated', () => {
      // Arrange
      renderWithProviders(<Layout>Test Content</Layout>);

      // Assert - Redirect component renders null in tests when user is null
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });
});
