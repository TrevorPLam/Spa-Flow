import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from './dashboard';
import { render as renderWithProviders } from '@/test/test-utils';

// Mock components
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('DashboardPage', () => {
  it('renders loading state', () => {
    // Arrange
    renderWithProviders(<DashboardPage />);

    // Assert
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });
});
