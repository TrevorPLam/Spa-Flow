import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e'],
    css: true,
    timeout: 10000,
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads',
    fileParallelism: true,
    excludeTags: ['slow'],
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
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/main.tsx',
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
      '@': path.resolve(__dirname, './src'),
    },
  },
});
