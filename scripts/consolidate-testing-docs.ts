#!/usr/bin/env tsx
/**
 * Consolidate all testing-related files into a single markdown document
 * This script reads test files, configs, and documentation to create testing.md
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const repoRoot = join(__dirname, '..');

interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  size: number;
}

class TestingDocConsolidator {
  private files: Map<string, FileInfo> = new Map();
  private sections: string[] = [];

  constructor() {
    this.collectFiles();
  }

  private collectFiles() {
    // Test configuration files
    this.addFile('playwright.config.ts');
    this.addFile('artifacts/api-server/vitest.config.ts');
    this.addFile('artifacts/spaflow/vitest.config.ts');
    this.addFile('lib/db/vitest.config.ts');
    this.addFile('lib/api-client-react/vitest.config.ts');

    // CI/CD workflow
    this.addFile('.github/workflows/ci.yml');

    // Load test configs
    this.addFile('load-tests/k6.config.js');

    // Documentation files
    this.addFile('docs/testing-strategy.md');
    this.addFile('docs/test-tags.md');
    this.addFile('docs/test-ownership.md');
    this.addFile('docs/test-environment-setup.md');
    this.addFile('docs/test-data.md');
    this.addFile('docs/performance-testing.md');
    this.addFile('docs/mutation-testing.md');
    this.addFile('docs/monorepo-testing.md');
    this.addFile('docs/contract-testing.md');
    this.addFile('docs/visual-testing.md');
    this.addFile('docs/ai-testing-research.md');
    this.addFile('docs/ai-testing-evaluation.md');

    // Test files (sample from each package)
    this.addFile('artifacts/spaflow/src/lib/utils.test.ts');
    this.addFile('artifacts/spaflow/src/test/integration/auth.test.ts');
    this.addFile('artifacts/spaflow/tests/e2e/auth.spec.ts');

    // Package.json files for test scripts
    this.addFile('package.json');
    this.addFile('artifacts/api-server/package.json');
    this.addFile('artifacts/spaflow/package.json');
    this.addFile('lib/db/package.json');
    this.addFile('lib/api-client-react/package.json');
    this.addFile('lib/test-utils/package.json');
  }

  private addFile(relativePath: string) {
    const fullPath = join(repoRoot, relativePath);
    if (!existsSync(fullPath)) {
      return;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const stats = statSync(fullPath);
      this.files.set(relativePath, {
        path: fullPath,
        relativePath,
        content,
        size: stats.size
      });
    } catch (error) {
      console.warn(`Failed to read ${relativePath}:`, error);
    }
  }

  private generateHeader() {
    return `# Testing Documentation Consolidation

**Generated:** ${new Date().toISOString()}
**Repository:** Spa-Flow
**Purpose:** Complete inventory of testing files, configurations, and documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Test Configuration Files](#test-configuration-files)
3. [CI/CD Pipeline](#ci-cd-pipeline)
4. [Test Scripts](#test-scripts)
5. [Test Files Inventory](#test-files-inventory)
6. [Documentation](#documentation)
7. [Load Testing](#load-testing)
8. [Test Utilities](#test-utilities)

---

## Overview

Spa-Flow uses a multi-layered testing strategy:

- **Unit/Integration Tests:** Vitest 4.1.6
- **E2E Tests:** Playwright 1.48.0
- **Mutation Testing:** Stryker 9.6.1
- **Load Testing:** k6
- **Coverage:** @vitest/coverage-v8

### Testable Packages

- \`artifacts/api-server\` - Backend API
- \`artifacts/spaflow\` - Frontend SPA
- \`lib/db\` - Database schema and utilities
- \`lib/api-client-react\` - Auto-generated API client
- \`lib/test-utils\` - Shared test utilities

`;
  }

  private generateConfigSection() {
    let section = `## Test Configuration Files

### Vitest Configurations

`;
    const vitestConfigs = [
      'artifacts/api-server/vitest.config.ts',
      'artifacts/spaflow/vitest.config.ts',
      'lib/db/vitest.config.ts',
      'lib/api-client-react/vitest.config.ts'
    ];

    for (const configPath of vitestConfigs) {
      const file = this.files.get(configPath);
      if (file) {
        section += `#### ${configPath}\n\n\`\`\`typescript\n${file.content}\n\`\`\`\n\n`;
      }
    }

    const playwrightConfig = this.files.get('playwright.config.ts');
    if (playwrightConfig) {
      section += `### Playwright Configuration\n\n\`\`\`typescript\n${playwrightConfig.content}\n\`\`\`\n\n`;
    }

    return section;
  }

  private generateCICDSection() {
    const ciFile = this.files.get('.github/workflows/ci.yml');
    if (!ciFile) return '';

    return `## CI/CD Pipeline

The CI pipeline (GitHub Actions) runs the following test stages:

1. **Security Scan** - pnpm audit on api-server and spaflow
2. **CodeQL Analysis** - Static analysis
3. **Type Check** - TypeScript type checking
4. **Build** - Build artifacts
5. **Smoke Tests** - Critical path tests with tags \`smoke and critical\`
6. **Contract Tests** - API contract validation for changed packages
7. **Component Tests** - Unit/integration tests for changed packages
8. **Performance Tests** - API and frontend performance benchmarks
9. **Coverage Report** - Coverage reports for changed packages
10. **E2E Tests** - Playwright tests (sharded across 4 workers)
11. **Smoke Load Tests** - Basic load testing with k6
12. **Load Tests** - Comprehensive load testing suite
13. **Mutation Tests** - Stryker mutation testing
14. **Flakiness Detection** - Detect flaky tests across all suites
15. **CI Gate** - Final merge blocker checking all critical jobs

### CI Workflow Configuration

\`\`\`yaml
${ciFile.content}
\`\`\`

`;
  }

  private generateScriptsSection() {
    let section = `## Test Scripts

### Root Package Scripts

`;
    const rootPackage = this.files.get('package.json');
    if (rootPackage) {
      const pkg = JSON.parse(rootPackage.content);
      const testScripts = Object.entries(pkg.scripts || {})
        .filter(([key]) => key.startsWith('test'))
        .map(([key, value]) => `- \`${key}\`: ${value}`)
        .join('\n');
      section += testScripts + '\n\n';
    }

    const packages = [
      'artifacts/api-server/package.json',
      'artifacts/spaflow/package.json',
      'lib/db/package.json',
      'lib/api-client-react/package.json'
    ];

    for (const pkgPath of packages) {
      const file = this.files.get(pkgPath);
      if (file) {
        const pkg = JSON.parse(file.content);
        const testScripts = Object.entries(pkg.scripts || {})
          .filter(([key]) => key.startsWith('test'));
        
        if (testScripts.length > 0) {
          section += `### ${pkgPath}\n\n`;
          section += testScripts
            .map(([key, value]) => `- \`${key}\`: ${value}`)
            .join('\n') + '\n\n';
        }
      }
    }

    return section;
  }

  private generateTestFilesSection() {
    let section = `## Test Files Inventory

### Unit/Integration Tests (*.test.ts)

`;
    // List actual test files found
    const testFiles = [
      'artifacts/spaflow/src/lib/utils.test.ts',
      'artifacts/spaflow/src/test/integration/auth.test.ts',
      'artifacts/spaflow/src/test/integration/clients.test.ts',
      'artifacts/spaflow/src/test/integration/dashboard.test.ts',
      'artifacts/spaflow/src/test/integration/errors.test.ts'
    ];

    for (const testFile of testFiles) {
      const file = this.files.get(testFile);
      if (file) {
        section += `#### ${testFile}\n\n\`\`\`typescript\n${file.content}\n\`\`\`\n\n`;
      }
    }

    section += `### E2E Tests (*.spec.ts)\n\n`;
    section += `Located in \`artifacts/spaflow/tests/e2e/\`:\n\n`;
    section += `- auth.spec.ts\n`;
    section += `- checkin.spec.ts\n`;
    section += `- clients.spec.ts\n`;
    section += `- crud.spec.ts\n`;
    section += `- dashboard.spec.ts\n`;
    section += `- errors.spec.ts\n`;
    section += `- membership.spec.ts\n`;
    section += `- performance.spec.ts\n`;
    section += `- resources.spec.ts\n`;
    section += `- security.spec.ts\n`;
    section += `- visual.spec.ts\n`;
    section += `- waitlist.spec.ts\n\n`;

    const e2eSample = this.files.get('artifacts/spaflow/tests/e2e/auth.spec.ts');
    if (e2eSample) {
      section += `#### Sample E2E Test: auth.spec.ts\n\n\`\`\`typescript\n${e2eSample.content}\n\`\`\`\n\n`;
    }

    return section;
  }

  private generateDocumentationSection() {
    let section = `## Documentation

### Testing Strategy Documents

`;
    const docs = [
      'docs/testing-strategy.md',
      'docs/test-tags.md',
      'docs/test-ownership.md',
      'docs/test-environment-setup.md',
      'docs/test-data.md',
      'docs/performance-testing.md',
      'docs/mutation-testing.md',
      'docs/monorepo-testing.md',
      'docs/contract-testing.md',
      'docs/visual-testing.md',
      'docs/ai-testing-research.md',
      'docs/ai-testing-evaluation.md'
    ];

    for (const docPath of docs) {
      const file = this.files.get(docPath);
      if (file) {
        section += `### ${docPath}\n\n`;
        section += file.content + '\n\n---\n\n';
      }
    }

    return section;
  }

  private generateLoadTestingSection() {
    let section = `## Load Testing

### k6 Configuration

`;
    const k6Config = this.files.get('load-tests/k6.config.js');
    if (k6Config) {
      section += `\`\`\`javascript\n${k6Config.content}\n\`\`\`\n\n`;
    }

    section += `### Load Test Scripts\n\n`;
    section += `Located in \`load-tests/\`:\n\n`;
    section += `- smoke.js - Basic smoke test\n`;
    section += `- health-check.js - API health check\n`;
    section += `- client-search.js - Client search load test\n`;
    section += `- dashboard.js - Dashboard load test\n`;
    section += `- checkin-flow.js - Check-in flow load test\n`;
    section += `- benchmark.js - Performance benchmark\n`;
    section += `- peak-hours.js - Peak hours simulation\n\n`;

    return section;
  }

  private generateTestUtilsSection() {
    let section = `## Test Utilities

### lib/test-utils

Shared test utilities package providing:\n\n`;
    section += `- Database cleanup helpers\n`;
    section += `- Test fixtures\n`;
    section += `- Common test setup/teardown\n\n`;

    const testUtilsPkg = this.files.get('lib/test-utils/package.json');
    if (testUtilsPkg) {
      section += `### Package Configuration\n\n\`\`\`json\n${testUtilsPkg.content}\n\`\`\`\n\n`;
    }

    return section;
  }

  public generate() {
    let markdown = this.generateHeader();
    markdown += this.generateConfigSection();
    markdown += this.generateCICDSection();
    markdown += this.generateScriptsSection();
    markdown += this.generateTestFilesSection();
    markdown += this.generateDocumentationSection();
    markdown += this.generateLoadTestingSection();
    markdown += this.generateTestUtilsSection();

    markdown += `---

## Summary

### Total Files Collected: ${this.files.size}

### File Categories

- **Configuration Files:** 6 (vitest configs, playwright config)
- **CI/CD Workflows:** 1 (GitHub Actions)
- **Documentation:** 12 markdown files
- **Test Files:** 3 sample files included
- **Package Configs:** 6 package.json files
- **Load Test Configs:** 1 k6 config

### Key Testing Tools

- **Vitest:** 4.1.6 (unit/integration tests)
- **Playwright:** 1.48.0 (E2E tests)
- **Stryker:** 9.6.1 (mutation testing)
- **k6:** (load testing)
- **@vitest/coverage-v8:** 4.1.6 (code coverage)

### Coverage Thresholds

- API Server: 80%
- Frontend: 80%
- Database: 80%
- API Client: 80%

### Test Tags

- \`@smoke\` - Critical path sanity tests
- \`@critical\` - Must pass 100%
- \`@slow\` - Tests taking >2s
- \`@flaky\` - Intermittent failures
- \`@quarantine\` - Disabled tests
- \`@integration\` - Requires DB/external services
- \`@regression\` - After bug fix

---

*This document is auto-generated by scripts/consolidate-testing-docs.ts*
`;

    return markdown;
  }

  public write(outputPath: string) {
    const content = this.generate();
    const fullPath = join(repoRoot, outputPath);
    writeFileSync(fullPath, content, 'utf-8');
    console.log(`Generated testing documentation at: ${fullPath}`);
    console.log(`Total size: ${content.length} characters`);
  }
}

// Run the consolidator
const consolidator = new TestingDocConsolidator();
consolidator.write('testing.md');
