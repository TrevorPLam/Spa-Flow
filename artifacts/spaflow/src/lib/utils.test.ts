import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', { tags: ['regression'] }, () => {
  describe('Basic functionality', () => {
    it('merges class names correctly', () => {
      // Arrange & Act
      const result = cn('class1', 'class2');

      // Assert
      expect(result).toBe('class1 class2');
    });

    it('handles single class name', () => {
      // Arrange & Act
      const result = cn('class1');

      // Assert
      expect(result).toBe('class1');
    });

    it('handles empty input', () => {
      // Arrange & Act
      const result = cn();

      // Assert
      expect(result).toBe('');
    });
  });

  describe('Conditional classes', () => {
    it('handles conditional classes with boolean values', () => {
      // Arrange & Act
      const result = cn('class1', true && 'class2', false && 'class3');

      // Assert
      expect(result).toBe('class1 class2');
    });

    it('handles conditional classes with null/undefined', () => {
      // Arrange & Act
      const result = cn('class1', null, undefined, 'class2');

      // Assert
      expect(result).toBe('class1 class2');
    });
  });

  describe('Tailwind conflict resolution', () => {
    it('resolves conflicting Tailwind classes (last one wins)', () => {
      // Arrange & Act
      const result = cn('px-4', 'px-2');

      // Assert
      expect(result).toBe('px-2');
    });

    it('keeps non-conflicting classes', () => {
      // Arrange & Act
      const result = cn('px-4', 'py-2');

      // Assert
      expect(result).toBe('px-4 py-2');
    });

    it('handles complex conflicts', () => {
      // Arrange & Act
      const result = cn('text-red-500', 'text-blue-500', 'bg-white', 'bg-black');

      // Assert
      expect(result).toBe('text-blue-500 bg-black');
    });
  });

  describe('clsx integration', () => {
    it('handles array input', () => {
      // Arrange & Act
      const result = cn(['class1', 'class2']);

      // Assert
      expect(result).toBe('class1 class2');
    });

    it('handles object input with conditional classes', () => {
      // Arrange & Act
      const result = cn({ class1: true, class2: false, class3: true });

      // Assert
      expect(result).toBe('class1 class3');
    });

    it('handles mixed input types', () => {
      // Arrange & Act
      const result = cn('class1', ['class2', { class3: true }], 'class4');

      // Assert
      expect(result).toBe('class1 class2 class3 class4');
    });
  });

  describe('Edge cases', () => {
    it('handles numbers in class names', () => {
      // Arrange & Act
      const result = cn('w-1/2', 'h-1/2');

      // Assert
      expect(result).toBe('w-1/2 h-1/2');
    });

    it('handles special characters', () => {
      // Arrange & Act
      const result = cn('hover:bg-gray-100', 'focus:ring-2');

      // Assert
      expect(result).toBe('hover:bg-gray-100 focus:ring-2');
    });

    it('handles duplicate classes', () => {
      // Arrange & Act
      const result = cn('class1', 'class1', 'class2');

      // Assert - cn doesn't deduplicate, it just merges
      expect(result).toBe('class1 class1 class2');
    });
  });
});
