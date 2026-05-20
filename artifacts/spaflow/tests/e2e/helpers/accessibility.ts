import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Creates a pre-configured AxeBuilder instance for accessibility testing.
 * Targets WCAG 2.1 Level A and AA success criteria, which is the enterprise standard.
 *
 * @param page - Playwright Page object
 * @param context - Optional context (selector) to limit the scan to specific elements
 * @returns Configured AxeBuilder instance
 */
export const getAxeBuilder = (page: Page, context?: string) => {
  const builder = new AxeBuilder({ page })
    // Target WCAG 2.1 Level A and AA success criteria (enterprise standard)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

  // If a context is provided, limit the scan to that specific element
  if (context) {
    builder.include(context);
  }

  return builder;
};

/**
 * Runs accessibility scan and returns violations.
 * Use this for more granular control over results.
 *
 * @param page - Playwright Page object
 * @param context - Optional context (selector) to limit the scan
 * @returns Accessibility scan results
 */
export const scanAccessibility = async (page: Page, context?: string) => {
  const axeBuilder = getAxeBuilder(page, context);
  return await axeBuilder.analyze();
};

/**
 * Asserts that there are no critical accessibility violations.
 * Critical violations are those that impact users with disabilities.
 *
 * @param page - Playwright Page object
 * @param context - Optional context (selector) to limit the scan
 */
export const assertNoCriticalViolations = async (page: Page, context?: string) => {
  const results = await scanAccessibility(page, context);
  
  // Filter for critical violations (impact: 'critical')
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === 'critical'
  );

  if (criticalViolations.length > 0) {
    console.error('Critical accessibility violations found:', criticalViolations);
  }

  expect(criticalViolations).toEqual([]);
};

/**
 * Asserts that there are no accessibility violations of any severity.
 * Use this for comprehensive accessibility testing.
 *
 * @param page - Playwright Page object
 * @param context - Optional context (selector) to limit the scan
 */
export const assertNoViolations = async (page: Page, context?: string) => {
  const results = await scanAccessibility(page, context);

  if (results.violations.length > 0) {
    console.error('Accessibility violations found:', results.violations);
  }

  expect(results.violations).toEqual([]);
};
