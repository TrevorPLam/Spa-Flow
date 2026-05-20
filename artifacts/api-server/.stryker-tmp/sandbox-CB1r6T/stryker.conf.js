// @ts-nocheck
export default {
  // Package manager (required for pnpm)
  packageManager: 'pnpm',
  
  // Explicitly load plugins (required for pnpm)
  plugins: ['@stryker-mutator/vitest-runner'],
  
  // Test runner configuration
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
    related: false, // Disable related test file detection
  },
  
  // Explicitly specify test files
  testRunnerNodeArgs: ['--run', '--dir', 'src'],
  
  // Files to mutate - focus on critical business logic
  mutate: [
    'src/lib/auth.ts',
    // Exclude test files
    '!**/*.test.ts',
    '!**/*.spec.ts',
  ],
  
  // Mutation score thresholds
  thresholds: {
    high: 80,  // Excellent quality
    low: 60,   // Needs improvement
    break: 50, // Fails the build
  },
  
  // Reporters for output
  reporters: ['progress', 'clear-text', 'html', 'json'],
  
  // Coverage analysis - use 'off' initially to avoid issues
  coverageAnalysis: 'off',
  
  // Timeout for mutation testing (in milliseconds)
  timeoutMS: 60000,
  
  // Concurrency - limit to avoid overwhelming the system
  concurrency: 2,
  
  // Max test runners reused per test worker
  maxTestRunnerReuse: 2,
  
  // Disable specific mutators that might cause false positives
  mutator: {
    excludedMutations: [
      'StringLiteral',  // Don't mutate string literals (often config/IDs)
      'ArrayDeclaration', // Skip array mutations (often config)
    ],
  },
  
  // Temporary directory for mutation testing
  tempDirName: '.stryker-tmp',
  
  // Clean temp directory after run
  cleanTempDir: true,
};
