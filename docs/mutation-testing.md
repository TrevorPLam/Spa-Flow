# Mutation Testing Strategy

## Overview
Mutation testing is a technique to evaluate the quality of test suites by introducing small changes (mutations) to the code and checking if tests can detect them. This helps identify gaps in test coverage and ensures tests are actually testing the intended behavior.

## Implementation

### Tool Selection
We selected **Stryker** as the mutation testing framework for the following reasons:
- Official support for Vitest test runner
- Active development and community support
- Comprehensive reporting capabilities
- Enterprise-grade features

### Configuration

#### Dependencies Installed
```json
{
  "@stryker-mutator/core": "^9.6.1",
  "@stryker-mutator/vitest-runner": "^9.6.1"
}
```

#### Stryker Configuration (`stryker.conf.js`)
The configuration focuses on critical business logic modules:
- **Files to mutate**: `src/lib/auth.ts`, `src/services/**/*.ts`
- **Mutation score thresholds**: 
  - High: 80% (excellent quality)
  - Low: 60% (needs improvement)
  - Break: 50% (fails the build)
- **Coverage analysis**: Disabled initially to avoid integration issues
- **Reporters**: Progress, clear-text, HTML, JSON
- **Concurrency**: 2 test runner processes
- **Excluded mutations**: StringLiteral, ArrayDeclaration (to avoid false positives)

### NPM Scripts
```json
{
  "test:mutation": "stryker run",
  "test:mutation:ci": "stryker run --concurrency 2"
}
```

## Current Challenges

### Vitest Integration Issues
The Stryker Vitest runner is experiencing issues with test discovery during the dry run phase. The error "No tests were executed" occurs even though tests exist and pass when run directly with Vitest.

#### Attempted Solutions
1. **pnpm plugin detection**: Added `packageManager: 'pnpm'` and explicit plugin loading
2. **vitest.related**: Disabled related test file detection
3. **Coverage analysis**: Changed from 'perTest' to 'off'
4. **File scope**: Tried mutating single file vs multiple files
5. **Configuration**: Attempted with and without vitest.config.ts
6. **Directory specification**: Added dir configuration options

#### Root Cause Analysis
The issue appears to be related to how Stryker's Vitest runner discovers test files in the sandbox environment. The tests import source files directly (which is correct), but the runner still cannot locate them during the dry run.

#### Workaround
Due to these integration challenges, the mutation testing is currently configured but not fully operational. The configuration is in place and can be activated once the Vitest runner integration is resolved.

## Future Improvements

### Short-term
1. **Debug Vitest runner**: Investigate why test discovery fails in Stryker sandbox (documented in "Current Challenges" section with workaround)
2. **Alternative runners**: Consider using Jest runner if Vitest integration cannot be resolved
3. **Manual mutation testing**: Run targeted mutation tests on critical functions manually

### Long-term
1. **Scheduled execution**: Add to CI/CD pipeline for weekly runs
2. **Trend analysis**: Track mutation scores over time
3. **Threshold enforcement**: Gradually increase mutation score requirements
4. **Expanded scope**: Include additional critical modules in mutation testing

## Best Practices

### When to Run Mutation Tests
- **Not on every PR**: Too slow for PR validation
- **Scheduled runs**: Weekly or nightly builds
- **Pre-release**: As a quality gate before major releases
- **After major changes**: When critical business logic is modified

### Interpreting Results
- **Killed mutants**: Good - tests caught the mutation
- **Survived mutants**: Bad - tests missed the mutation (test gap)
- **Equivalent mutants**: Neutral - mutation that doesn't change behavior (can be ignored)
- **Timeout mutants**: Bad - test hung (indicates flaky tests)

### Improving Test Quality
1. **Analyze surviving mutants**: Add tests to kill them
2. **Focus on critical paths**: Prioritize business logic over utility functions
3. **Avoid false positives**: Exclude mutations that don't represent real bugs
4. **Set achievable thresholds**: Start with 60-70%, aim for 80% over time

## References
- [Stryker Documentation](https://stryker-mutator.io/)
- [Mutation Testing Best Practices](https://mastersoftwaretesting.com/testing-fundamentals/types-of-testing/mutation-testing)
- [Vitest Runner Guide](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)
