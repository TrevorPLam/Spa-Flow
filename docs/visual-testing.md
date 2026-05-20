# Visual Regression Testing Strategy

## Overview
This document outlines the visual regression testing approach for SpaFlow using Playwright's built-in visual comparison capabilities.

## Tool Selection
**Selected Tool:** Playwright Built-in Visual Comparisons (`toHaveScreenshot()`)

**Rationale:**
- Already integrated with our existing Playwright E2E test suite
- No additional dependencies or external services required
- Free and open-source (MIT license)
- Seamless integration with existing CI/CD pipeline
- Recommended approach for teams already using Playwright
- Avoids vendor lock-in and external service costs

## Critical Pages for Visual Testing

### Priority 1: High-Traffic Core Flows
1. **Login Page** (`/login`)
   - Authentication entry point
   - Critical for user access
   - Visual validation of form layout and branding

2. **Dashboard** (`/dashboard`)
   - Main hub after login
   - Displays key metrics (occupancy, revenue, clients)
   - Complex data visualization

3. **Client List** (`/clients`)
   - High-traffic page for staff
   - Table layout and search functionality
   - Critical for daily operations

4. **Check-in Form** (`/checkin`)
   - Core business process
   - Multi-step wizard interface
   - Critical for revenue generation

### Priority 2: Secondary Pages (Future)
- Client detail view
- Locker management
- Room management
- Settings pages

## Visual Test Configuration

### Screenshot Capture Settings
```typescript
await expect(page).toHaveScreenshot('page-name.png', {
  maxDiffPixels: 100,        // Allow minor rendering differences
  maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference
  threshold: 0.2,           // Color difference threshold
});
```

### Dynamic Content Masking
To prevent false positives from dynamic content:
- **Timestamps and dates**: Mask or use fixed test data
- **Random IDs**: Use consistent test data
- **Loading states**: Wait for content to settle before capture
- **Animations**: Disable or wait for completion

## Test Implementation

### Adding Visual Assertions
Visual assertions are added to existing E2E tests:

```typescript
test('should login and show dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin@spaflow.com', 'password123');
  await loginPage.waitForLoginSuccess();

  // Visual regression check
  await expect(page).toHaveScreenshot('dashboard-logged-in.png');
});
```

### Baseline Management
- Baseline screenshots stored in: `tests/e2e/*.spec.ts-snapshots/`
- Baselines committed to version control
- Update baselines with: `npx playwright test --update-snapshots`
- Review changes before committing new baselines

### Initial Baseline Setup
To establish the initial baseline screenshots:

1. **Start the application locally:**
   ```bash
   cd artifacts/spaflow
   pnpm run dev
   ```

2. **Run E2E tests with snapshot update:**
   ```bash
   pnpm run test:e2e -- --update-snapshots
   ```

3. **Review generated screenshots:**
   - Check `artifacts/spaflow/tests/e2e/*.spec.ts-snapshots/`
   - Verify screenshots look correct
   - Ensure no dynamic content is causing issues

4. **Commit baselines to version control:**
   ```bash
   git add artifacts/spaflow/tests/e2e/*.spec.ts-snapshots/
   git commit -m "Add visual regression test baselines"
   ```

### Updating Baselines
When UI changes are intentional:

1. Run tests with update flag:
   ```bash
   pnpm run test:e2e -- --update-snapshots
   ```

2. Review the diff in the test report

3. Commit updated baselines with descriptive message:
   ```bash
   git commit -m "Update visual baselines for [feature name]"
   ```

## CI/CD Integration

### GitHub Actions
Visual tests run in the E2E test job:
- Runs on every PR and push to main
- Uses consistent CI environment for stable screenshots
- Fails PR if visual differences exceed thresholds
- Uploads diff reports as artifacts for review

### Running Visual Tests Locally
```bash
# Run all tests with visual checks
pnpm run test:e2e

# Update baselines
pnpm run test:e2e -- --update-snapshots

# Run only visual tests
pnpm run test:e2e --grep "visual"
```

## Review Process

### When Visual Tests Fail
1. Review the diff image in the test report
2. Determine if change is intentional:
   - **Intentional**: Update baseline with `--update-snapshots`
   - **Unintentional**: Fix the UI regression
3. Commit changes with descriptive message

### Best Practices
- Review visual changes in PR before merging
- Keep baselines updated with intentional UI changes
- Don't ignore visual test failures
- Use meaningful screenshot names for easy identification

## Thresholds and Tolerances

### Current Settings
- `maxDiffPixels: 100` - Allow up to 100 different pixels
- `maxDiffPixelRatio: 0.01` - Allow 1% total pixel difference
- `threshold: 0.2` - Color difference threshold (0-1 scale)

### Rationale
These thresholds balance:
- Catching genuine UI regressions
- Allowing minor rendering variations (anti-aliasing, font rendering)
- Reducing false positives from CI environment differences

## Future Enhancements

### Immediate Improvements
- **Dynamic Content Masking**: Add masking for timestamps, dates, and random IDs to reduce false positives
- **Viewport Testing**: Add visual tests for mobile/tablet viewports
- **Error State Visual Tests**: Add visual checks for error states and empty states

### Potential Upgrades (if needed)
- **Percy**: If team grows and needs AI-powered diffing with review workflow
- **Chromatic**: If adopting Storybook for component-level visual testing
- **Cross-browser visual testing**: Expand beyond Chromium if needed

### Triggers for Upgrade
- Team size grows beyond 5-20 engineers
- Visual test review becomes bottleneck
- Need for designer review workflow
- Cross-browser visual consistency issues

## Maintenance

### Regular Tasks
- Review and update baselines after intentional UI changes
- Monitor false positive rate and adjust thresholds if needed
- Keep visual tests focused on critical paths (avoid testing every state)
- Periodic audit of visual test coverage

### Anti-Patterns to Avoid
- Testing every possible component state (too much noise)
- Not masking dynamic content (flaky tests)
- Ignoring visual test failures
- Overly strict thresholds (excessive false positives)
- Testing implementation details instead of user-visible UI

## References
- [Playwright Visual Comparisons Documentation](https://playwright.dev/docs/test-snapshots)
- [Visual Regression Testing Best Practices](https://bug0.com/knowledge-base/visual-regression-testing-tools)
