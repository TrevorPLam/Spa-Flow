import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('NotFound Page', () => {
  it('should render 404 error message', () => {
    render(<NotFound />);
    
    expect(screen.getByText('404 Page Not Found')).toBeInTheDocument();
  });

  it('should render error icon', () => {
    const { container } = render(<NotFound />);
    
    const icon = container.querySelector('.text-red-500');
    expect(icon).toBeInTheDocument();
  });

  it('should render helpful message', () => {
    render(<NotFound />);
    
    expect(screen.getByText('Did you forget to add the page to the router?')).toBeInTheDocument();
  });

  it('should render in centered layout', () => {
    const { container } = render(<NotFound />);
    
    const wrapper = container.querySelector('.min-h-screen');
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
  });
});
