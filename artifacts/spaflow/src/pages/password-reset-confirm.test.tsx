import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordResetConfirmPage from './password-reset-confirm';

// Mock fetch
global.fetch = vi.fn();

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Mock wouter
const mockSearchParams = new Map([['token', 'test-token']]);
vi.mock('wouter', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe('PasswordResetConfirmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<PasswordResetConfirmPage />);
    expect(true).toBe(true);
  });
});
