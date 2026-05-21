/**
 * Simple logger utility for scripts with proper log levels and formatting.
 * Provides a consistent logging interface across all scripts.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'success';

/**
 * Logger utility for scripts
 */
export const logger = {
  /**
   * Log informational message
   */
  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  },

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Log success message (typically for completed operations)
   */
  success(message: string, ...args: unknown[]): void {
    console.log(`[SUCCESS] ${message}`, ...args);
  },

  /**
   * Log message with custom level
   */
  log(level: LogLevel, message: string, ...args: unknown[]): void {
    switch (level) {
      case 'info':
        this.info(message, ...args);
        break;
      case 'warn':
        this.warn(message, ...args);
        break;
      case 'error':
        this.error(message, ...args);
        break;
      case 'success':
        this.success(message, ...args);
        break;
    }
  }
};
