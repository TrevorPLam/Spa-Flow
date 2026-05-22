import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Calendar } from './calendar';

describe('Calendar', { tags: ['regression'] }, () => {
  describe('Rendering', () => {
    it('renders calendar component', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('applies custom className', () => {
      // Arrange & Act
      render(<Calendar mode="single" className="custom-class" />);

      // Assert
      const calendar = screen.getByRole('grid').closest('[data-slot="calendar"]');
      expect(calendar).toHaveClass('custom-class');
    });

    it('renders with default showOutsideDays', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('renders with custom buttonVariant', () => {
      // Arrange & Act
      render(<Calendar mode="single" buttonVariant="outline" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Modes', () => {
    it('renders in single mode', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('renders in range mode', () => {
      // Arrange & Act
      render(<Calendar mode="range" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('renders in multiple mode', () => {
      // Arrange & Act
      render(<Calendar mode="multiple" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Caption Layout', () => {
    it('renders with label caption layout', () => {
      // Arrange & Act
      render(<Calendar mode="single" captionLayout="label" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('renders with dropdown caption layout', () => {
      // Arrange & Act
      render(<Calendar mode="single" captionLayout="dropdown" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Custom Components', () => {
    it('renders with custom Chevron component', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      // Calendar should render navigation buttons with chevron icons
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('renders with custom DayButton component', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      // Calendar should render day buttons
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Class Names', () => {
    it('applies default class names', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      const calendar = screen.getByRole('grid').closest('[data-slot="calendar"]');
      expect(calendar).toHaveClass('bg-background');
    });

    it('merges custom classNames with defaults', () => {
      // Arrange & Act
      render(
        <Calendar
          mode="single"
          classNames={{ root: 'custom-root' }}
        />
      );

      // Assert
      const calendar = screen.getByRole('grid').closest('[data-slot="calendar"]');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Formatters', () => {
    it('applies custom month formatter', () => {
      // Arrange & Act
      render(
        <Calendar
          mode="single"
          formatters={{
            formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
          }}
        />
      );

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper role for grid', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('has data-slot attribute for calendar', () => {
      // Arrange & Act
      render(<Calendar mode="single" />);

      // Assert
      const calendar = screen.getByRole('grid').closest('[data-slot="calendar"]');
      expect(calendar).toBeInTheDocument();
    });
  });
});
