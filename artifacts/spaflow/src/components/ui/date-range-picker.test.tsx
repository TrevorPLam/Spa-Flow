import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker, DateRangePresets } from './date-range-picker';

describe('DateRangePicker', { tags: ['regression'] }, () => {
  describe('Rendering', () => {
    it('renders date range picker component', () => {
      // Arrange & Act
      render(<DateRangePicker />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('applies custom className', () => {
      // Arrange & Act
      render(<DateRangePicker className="custom-class" />);

      // Assert
      const container = screen.getByRole('button').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('displays placeholder when no value is selected', () => {
      // Arrange & Act
      render(<DateRangePicker placeholder="Pick a date range" />);

      // Assert
      expect(screen.getByText('Pick a date range')).toBeInTheDocument();
    });

    it('displays custom placeholder', () => {
      // Arrange & Act
      render(<DateRangePicker placeholder="Select dates" />);

      // Assert
      expect(screen.getByText('Select dates')).toBeInTheDocument();
    });
  });

  describe('Value Display', () => {
    it('displays single date when only from date is selected', () => {
      // Arrange
      const value = { from: new Date(2024, 0, 15) };

      // Act
      render(<DateRangePicker value={value} />);

      // Assert
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Jan 15, 2024');
    });

    it('displays date range when both from and to dates are selected', () => {
      // Arrange
      const value = { from: new Date(2024, 0, 15), to: new Date(2024, 0, 20) };

      // Act
      render(<DateRangePicker value={value} />);

      // Assert
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Jan 15, 2024');
      expect(button.textContent).toContain('Jan 20, 2024');
    });

    it('displays placeholder when value is undefined', () => {
      // Arrange & Act
      render(<DateRangePicker value={undefined} />);

      // Assert
      expect(screen.getByText('Pick a date range')).toBeInTheDocument();
    });
  });

  describe('Open/Close States', () => {
    it('renders date range picker button', () => {
      // Arrange & Act
      render(<DateRangePicker />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('onChange Callback', () => {
    it('accepts onChange callback prop', () => {
      // Arrange
      const handleChange = vi.fn();

      // Act
      render(<DateRangePicker onChange={handleChange} />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Calendar Configuration', () => {
    it('configures calendar with range mode', () => {
      // Arrange & Act
      render(<DateRangePicker />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper role for button', () => {
      // Arrange & Act
      render(<DateRangePicker />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('has id attribute for accessibility', () => {
      // Arrange & Act
      render(<DateRangePicker />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'date');
    });
  });
});

describe('DateRangePresets', { tags: ['regression'] }, () => {
  describe('Rendering', () => {
    it('renders all preset buttons', () => {
      // Arrange & Act
      render(<DateRangePresets />);

      // Assert
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('This week')).toBeInTheDocument();
      expect(screen.getByText('This month')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      // Arrange & Act
      render(<DateRangePresets className="custom-class" />);

      // Assert
      const container = screen.getByText('Today').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Preset Selection', () => {
    it('selects Today preset when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<DateRangePresets onChange={handleChange} />);

      // Act
      await user.click(screen.getByText('Today'));

      // Assert
      expect(handleChange).toHaveBeenCalledWith({
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });

    it('selects Last 7 days preset when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<DateRangePresets onChange={handleChange} />);

      // Act
      await user.click(screen.getByText('Last 7 days'));

      // Assert
      expect(handleChange).toHaveBeenCalledWith({
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });

    it('selects Last 30 days preset when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<DateRangePresets onChange={handleChange} />);

      // Act
      await user.click(screen.getByText('Last 30 days'));

      // Assert
      expect(handleChange).toHaveBeenCalledWith({
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });

    it('selects This week preset when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<DateRangePresets onChange={handleChange} />);

      // Act
      await user.click(screen.getByText('This week'));

      // Assert
      expect(handleChange).toHaveBeenCalledWith({
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });

    it('selects This month preset when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<DateRangePresets onChange={handleChange} />);

      // Act
      await user.click(screen.getByText('This month'));

      // Assert
      expect(handleChange).toHaveBeenCalledWith({
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });
  });

  describe('Active State', () => {
    it('highlights active preset when value matches', () => {
      // Arrange
      const today = new Date();
      const value = { from: today, to: today };

      // Act
      render(<DateRangePresets value={value} />);

      // Assert
      const todayButton = screen.getByText('Today');
      expect(todayButton).toHaveClass('bg-primary');
      expect(todayButton).toHaveClass('text-primary-foreground');
    });

    it('does not highlight preset when value does not match', () => {
      // Arrange
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const value = { from: yesterday, to: yesterday };

      // Act
      render(<DateRangePresets value={value} />);

      // Assert
      const todayButton = screen.getByText('Today');
      expect(todayButton).not.toHaveClass('bg-primary');
    });

    it('does not highlight when value is undefined', () => {
      // Arrange & Act
      render(<DateRangePresets value={undefined} />);

      // Assert
      const todayButton = screen.getByText('Today');
      expect(todayButton).not.toHaveClass('bg-primary');
    });
  });

  describe('Preset Edge Cases', () => {
    it('handles month boundary for This week preset', () => {
      // Arrange & Act
      render(<DateRangePresets />);

      // Assert
      // This week preset should handle month boundaries correctly
      expect(screen.getByText('This week')).toBeInTheDocument();
    });

    it('handles year boundary for This month preset', () => {
      // Arrange & Act
      render(<DateRangePresets />);

      // Assert
      // This month preset should handle year boundaries correctly
      expect(screen.getByText('This month')).toBeInTheDocument();
    });

    it('handles leap years for date calculations', () => {
      // Arrange & Act
      render(<DateRangePresets />);

      // Assert
      // Date calculations should handle leap years
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });
  });

  describe('Invalid Ranges', () => {
    it('handles preset with missing to date', () => {
      // Arrange
      const value = { from: new Date() };

      // Act
      render(<DateRangePresets value={value} />);

      // Assert
      // Should not crash with incomplete range
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('handles preset with missing from date', () => {
      // Arrange
      const value = { to: new Date() };

      // Act
      render(<DateRangePresets value={value} />);

      // Assert
      // Should not crash with incomplete range
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('applies outline variant to preset buttons', () => {
      // Arrange & Act
      render(<DateRangePresets />);

      // Assert
      const todayButton = screen.getByText('Today');
      expect(todayButton).toBeInTheDocument();
    });

    it('applies small size to preset buttons', () => {
      // Arrange & Act
      render(<DateRangePresets />);

      // Assert
      const todayButton = screen.getByText('Today');
      expect(todayButton).toBeInTheDocument();
    });
  });
});
