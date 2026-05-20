import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import LoginPage from './login';
import { render as renderWithProviders } from '@/test/test-utils';

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders SpaFlow branding', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getAllByText(/SpaFlow/i).length).toBeGreaterThan(0);
  });
});
