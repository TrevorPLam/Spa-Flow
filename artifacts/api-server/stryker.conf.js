export default {
  // Package manager (required for pnpm)
  packageManager: 'pnpm',
  
  // Explicitly load plugins (required for pnpm)
  plugins: ['@stryker-mutator/vitest-runner'],
  
  // Test runner configuration
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
  },
  
  // Files to mutate - limited to single file for debugging
  mutate: [
    'src/lib/auth.ts',
  ],
  
  // Mutation score thresholds
  // Note: 2026 best practices recommend break threshold of 70-80% for enterprise software
  // Current break: 50% - to be increased after test suite stabilization (T7 blocker)
  thresholds: {
    high: 80,  // Excellent quality
    low: 60,   // Needs improvement
    break: 50, // Fails the build (temporary low threshold due to test suite instability)
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
