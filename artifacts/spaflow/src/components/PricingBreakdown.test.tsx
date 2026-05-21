import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PricingBreakdown } from './PricingBreakdown';

describe('PricingBreakdown', { tags: ['regression'] }, () => {
  describe('Rendering', () => {
    it('renders pricing breakdown with basic props', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Weekday off-peak locker rate')).toBeInTheDocument();
      expect(screen.getByText('$20.00')).toBeInTheDocument();
      expect(screen.getByText('$1.78')).toBeInTheDocument();
      expect(screen.getByText('$21.78')).toBeInTheDocument();
    });

    it('renders applied rules section header', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Applied Pricing Rules')).toBeInTheDocument();
    });

    it('does not render applied rules section when empty', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: [],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.queryByText('Applied Pricing Rules')).not.toBeInTheDocument();
    });
  });

  describe('Special Pricing Badges', () => {
    it('shows Special badge for birthday rule', () => {
      // Arrange
      const props = {
        subtotal: 0,
        tax: 0,
        total: 0,
        appliedRules: ['Birthday Special: locker fee waived'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Special')).toBeInTheDocument();
      expect(screen.getByText('Birthday Special: locker fee waived')).toBeInTheDocument();
    });

    it('shows Special badge for 18-24 rule', () => {
      // Arrange
      const props = {
        subtotal: 0,
        tax: 0,
        total: 0,
        appliedRules: ['18-24 Special: weekday locker is free'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Special')).toBeInTheDocument();
      expect(screen.getByText('18-24 Special: weekday locker is free')).toBeInTheDocument();
    });

    it('shows Standard badge for regular rules', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });
  });

  describe('Membership Cost Display', () => {
    it('shows membership cost separately when bundled', () => {
      // Arrange
      const props = {
        subtotal: 33,
        tax: 2.93,
        total: 35.93,
        appliedRules: ['Weekday off-peak locker rate'],
        membershipCost: 13,
        membershipBundled: true,
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Rental Cost')).toBeInTheDocument();
      expect(screen.getByText('Membership')).toBeInTheDocument();
      expect(screen.getByText('$13.00')).toBeInTheDocument();
    });

    it('shows rental cost without membership label when not bundled', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.queryByText('Membership')).not.toBeInTheDocument();
    });

    it('shows combined subtotal when membership bundled', () => {
      // Arrange
      const props = {
        subtotal: 33,
        tax: 2.93,
        total: 35.93,
        appliedRules: ['Weekday off-peak locker rate'],
        membershipCost: 13,
        membershipBundled: true,
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      // Should show rental cost, membership cost, and subtotal
      const subtotals = screen.getAllByText('$33.00');
      expect(subtotals.length).toBeGreaterThan(0);
    });
  });

  describe('Tax Rate Display', () => {
    it('displays custom tax rate when provided', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
        taxRate: 0.08875,
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText(/Tax \(8\.875%\)/)).toBeInTheDocument();
    });

    it('displays default tax rate when not provided', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText(/Tax \(8\.875%\)/)).toBeInTheDocument();
    });
  });

  describe('Tooltips', () => {
    it('renders info icon for each rule', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      // Info icon should be present (button with aria-label or accessible name)
      const infoButtons = document.querySelectorAll('button');
      expect(infoButtons.length).toBeGreaterThan(0);
    });

    it('renders multiple info icons for multiple rules', () => {
      // Arrange
      const props = {
        subtotal: 0,
        tax: 0,
        total: 0,
        appliedRules: [
          'Birthday Special: locker fee waived',
          '18-24 Special: weekday locker is free',
        ],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      const infoButtons = document.querySelectorAll('button');
      expect(infoButtons.length).toBeGreaterThan(1);
    });
  });

  describe('Cost Calculation', () => {
    it('correctly calculates rental cost when membership bundled', () => {
      // Arrange
      const props = {
        subtotal: 33,
        tax: 2.93,
        total: 35.93,
        appliedRules: ['Weekday off-peak locker rate'],
        membershipCost: 13,
        membershipBundled: true,
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      // Rental cost should be subtotal - membershipCost = 33 - 13 = 20
      expect(screen.getByText('$20.00')).toBeInTheDocument();
    });

    it('displays total correctly', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      const totalElement = screen.getByText('Total');
      expect(totalElement).toBeInTheDocument();
      expect(screen.getByText('$21.78')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero costs', () => {
      // Arrange
      const props = {
        subtotal: 0,
        tax: 0,
        total: 0,
        appliedRules: ['Birthday Special: locker fee waived'],
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0);
    });

    it('handles undefined membership properties', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
        membershipCost: undefined,
        membershipBundled: undefined,
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.queryByText('Membership')).not.toBeInTheDocument();
    });

    it('handles undefined tax rate', () => {
      // Arrange
      const props = {
        subtotal: 20,
        tax: 1.78,
        total: 21.78,
        appliedRules: ['Weekday off-peak locker rate'],
        taxRate: undefined,
      };

      // Act
      render(<PricingBreakdown {...props} />);

      // Assert
      expect(screen.getByText(/Tax/)).toBeInTheDocument();
    });
  });
});
