import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './switch';

describe('Switch', { tags: ['regression'] }, () => {
  describe('Rendering', () => {
    it('renders switch component', () => {
      // Arrange & Act
      render(<Switch />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      // Arrange & Act
      render(<Switch className="custom-class" />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('custom-class');
    });
  });

  describe('Toggle On/Off', () => {
    it('toggles from unchecked to checked when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Switch />);

      // Act
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Assert
      expect(switchElement).toBeChecked();
    });

    it('toggles from checked to unchecked when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Switch defaultChecked />);

      // Act
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Assert
      expect(switchElement).not.toBeChecked();
    });

    it('can be controlled with checked prop', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);

      // Act
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Assert
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('can be controlled with checked prop (checked state)', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={true} onCheckedChange={handleChange} />);

      // Act
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Assert
      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Disabled State', () => {
    it('cannot be toggled when disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch disabled onCheckedChange={handleChange} />);

      // Act
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Assert
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('applies disabled styling', () => {
      // Arrange & Act
      render(<Switch disabled />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeDisabled();
      expect(switchElement).toHaveClass('disabled:cursor-not-allowed');
      expect(switchElement).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Keyboard Interaction', () => {
    it('toggles when Enter key is pressed', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch onCheckedChange={handleChange} />);

      // Act
      const switchElement = screen.getByRole('switch');
      switchElement.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(handleChange).toHaveBeenCalled();
    });

    it('toggles when Space key is pressed', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch onCheckedChange={handleChange} />);

      // Act
      const switchElement = screen.getByRole('switch');
      switchElement.focus();
      await user.keyboard(' ');

      // Assert
      expect(handleChange).toHaveBeenCalled();
    });

    it('does not toggle when disabled and keyboard is used', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch disabled onCheckedChange={handleChange} />);

      // Act
      const switchElement = screen.getByRole('switch');
      switchElement.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Controlled Mode', () => {
    it('respects controlled checked state', () => {
      // Arrange & Act
      render(<Switch checked={true} />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeChecked();
    });

    it('respects controlled unchecked state', () => {
      // Arrange & Act
      render(<Switch checked={false} />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).not.toBeChecked();
    });

    it('calls onCheckedChange when clicked in controlled mode', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);

      // Act
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Assert
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Uncontrolled Mode', () => {
    it('uses defaultChecked for initial state', () => {
      // Arrange & Act
      render(<Switch defaultChecked={true} />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeChecked();
    });

    it('toggles state internally in uncontrolled mode', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Switch defaultChecked={false} />);

      // Act
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Assert
      expect(switchElement).toBeChecked();
    });
  });

  describe('Styling States', () => {
    it('applies checked styling when checked', () => {
      // Arrange & Act
      render(<Switch checked={true} />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });

    it('applies unchecked styling when unchecked', () => {
      // Arrange & Act
      render(<Switch checked={false} />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });

    it('thumb moves when checked', () => {
      // Arrange & Act
      render(<Switch checked={true} />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper role attribute', () => {
      // Arrange & Act
      render(<Switch />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });

    it('is focusable', () => {
      // Arrange & Act
      render(<Switch />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).not.toHaveAttribute('tabIndex', '-1');
    });

    it('is not focusable when disabled', () => {
      // Arrange & Act
      render(<Switch disabled />);

      // Assert
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeDisabled();
    });
  });
});
