import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    unstubEnvs: true,
    pool: 'threads',
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.stryker-tmp'],
    tags: [
      {
        name: 'smoke',
        description: 'Critical functionality tests that verify basic application health',
      },
      {
        name: 'regression',
        description: 'Tests that ensure new changes don\'t break existing functionality',
      },
      {
        name: 'critical',
        description: 'High-priority tests that must pass for application stability',
      },
      {
        name: 'integration',
        description: 'Tests that verify integration between components or services',
      },
      {
        name: 'slow',
        description: 'Tests that take longer to execute',
        timeout: 60_000,
      },
      {
        name: 'flaky',
        description: 'Tests that are known to be unstable',
        retry: process.env.CI ? 3 : 0,
        timeout: 30_000,
        priority: 1,
      },
      {
        name: 'quarantine',
        description: 'Tests that are quarantined due to flakiness - excluded from CI runs',
        retry: 0,
        timeout: 30_000,
        priority: 0,
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        'build.mjs',
        'src/test/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@workspace/db': path.resolve(__dirname, '../../lib/db/src'),
      '@workspace/api-zod': path.resolve(__dirname, '../../lib/api-zod/src'),
    },
  },
});
