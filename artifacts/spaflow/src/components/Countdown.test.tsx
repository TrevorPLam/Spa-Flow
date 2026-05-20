import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Countdown } from './Countdown';

describe('Countdown', { tags: ['@regression'] }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders countdown text', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 60000); // 1 minute in future

      // Act
      render(<Countdown expiresAt={futureDate} />);

      // Assert
      expect(screen.getByTestId('text-countdown')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 60000);

      // Act
      render(<Countdown expiresAt={futureDate} className="custom-class" />);

      // Assert
      const countdown = screen.getByTestId('text-countdown');
      expect(countdown).toHaveClass('custom-class');
    });
  });

  describe('Time Formatting', () => {
    it('displays seconds when less than 1 minute', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 30000); // 30 seconds

      // Act
      render(<Countdown expiresAt={futureDate} />);

      // Assert
      expect(screen.getByTestId('text-countdown')).toHaveTextContent(/s$/);
    });

    it('displays minutes and seconds when less than 1 hour', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 90000); // 1 minute 30 seconds

      // Act
      render(<Countdown expiresAt={futureDate} />);

      // Assert
      const text = screen.getByTestId('text-countdown').textContent;
      expect(text).toMatch(/\d+m \d{2}s/);
    });

    it('displays hours and minutes when more than 1 hour', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 3600000 + 120000); // 1 hour 2 minutes

      // Act
      render(<Countdown expiresAt={futureDate} />);

      // Assert
      const text = screen.getByTestId('text-countdown').textContent;
      expect(text).toMatch(/\d+h \d+m/);
    });
  });

  describe('Color States', () => {
    it('shows urgent color when less than 30 minutes', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 1800000 - 1000); // 29 minutes 59 seconds

      // Act
      render(<Countdown expiresAt={futureDate} />);

      // Assert
      const countdown = screen.getByTestId('text-countdown');
      expect(countdown).toHaveClass('text-amber-600');
    });

    it('shows destructive color when expired', () => {
      // Arrange
      const pastDate = new Date(Date.now() - 1000); // 1 second ago

      // Act
      render(<Countdown expiresAt={pastDate} />);

      // Assert
      const countdown = screen.getByTestId('text-countdown');
      expect(countdown).toHaveClass('text-destructive');
    });

    it('shows muted color when more than 30 minutes remaining', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 1800000 + 1000); // 30 minutes 1 second

      // Act
      render(<Countdown expiresAt={futureDate} />);

      // Assert
      const countdown = screen.getByTestId('text-countdown');
      expect(countdown).toHaveClass('text-muted-foreground');
    });
  });

  describe('Expiration', () => {
    it('displays Expired when time has passed', () => {
      // Arrange
      const pastDate = new Date(Date.now() - 1000);

      // Act
      render(<Countdown expiresAt={pastDate} />);

      // Assert
      expect(screen.getByTestId('text-countdown')).toHaveTextContent('Expired');
    });

    it('updates countdown over time', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 30000); // 30 seconds
      render(<Countdown expiresAt={futureDate} />);

      // Act
      vi.advanceTimersByTime(10000); // Advance 10 seconds

      // Assert
      const countdown = screen.getByTestId('text-countdown');
      expect(countdown.textContent).toMatch(/\d+s/);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero remaining time', () => {
      // Arrange
      const now = new Date();

      // Act
      render(<Countdown expiresAt={now} />);

      // Assert
      expect(screen.getByTestId('text-countdown')).toHaveTextContent('Expired');
    });

    it('handles negative remaining time', () => {
      // Arrange
      const pastDate = new Date(Date.now() - 5000);

      // Act
      render(<Countdown expiresAt={pastDate} />);

      // Assert
      expect(screen.getByTestId('text-countdown')).toHaveTextContent('Expired');
    });
  });
});
