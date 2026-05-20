#!/usr/bin/env node
/**
 * Flakiness Detection Script for Playwright
 * Analyzes Playwright test results to detect flaky tests based on retry patterns
 * Following 2026 best practices: threshold-based detection, quarantine recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  retry?: number;
}

interface SuiteResult {
  tests: {
    title: string[];
    results: TestResult[];
  }[];
}

interface FlakyTest {
  testId: string;
  testName: string;
  file: string;
  flakinessScore: number;
  totalRuns: number;
  failures: number;
  passes: number;
  recommendation: 'quarantine' | 'monitor' | 'stable';
}

const FLAKINESS_THRESHOLD = 0.05; // 5% failure rate triggers quarantine
const MONITOR_THRESHOLD = 0.02; // 2% failure rate triggers monitoring

function parsePlaywrightResults(resultsPath: string): SuiteResult | null {
  try {
    const resultsJson = fs.readFileSync(resultsPath, 'utf-8');
    return JSON.parse(resultsJson);
  } catch (error) {
    console.error(`Error reading Playwright results from ${resultsPath}:`, error);
    return null;
  }
}

function analyzeFlakiness(results: SuiteResult[]): FlakyTest[] {
  const testHistory = new Map<string, { passes: number; failures: number; testName: string; file: string }>();

  results.forEach((suite) => {
    suite.tests.forEach((test) => {
      const testId = test.title.join(' > ');
      const testFile = test.title[0] || 'unknown';

      test.results.forEach((result) => {
        if (!testHistory.has(testId)) {
          testHistory.set(testId, { passes: 0, failures: 0, testName: testId, file: testFile });
        }

        const history = testHistory.get(testId)!;
        if (result.status === 'passed') {
          history.passes++;
        } else if (result.status === 'failed') {
          history.failures++;
        }
      });
    });
  });

  const flakyTests: FlakyTest[] = [];

  testHistory.forEach((history, testId) => {
    const totalRuns = history.passes + history.failures;
    if (totalRuns < 3) return; // Need at least 3 runs to detect flakiness

    const flakinessScore = history.failures / totalRuns;
    let recommendation: FlakyTest['recommendation'] = 'stable';

    if (flakinessScore >= FLAKINESS_THRESHOLD) {
      recommendation = 'quarantine';
    } else if (flakinessScore >= MONITOR_THRESHOLD) {
      recommendation = 'monitor';
    }

    if (recommendation !== 'stable') {
      flakyTests.push({
        testId,
        testName: history.testName,
        file: history.file,
        flakinessScore,
        totalRuns,
        failures: history.failures,
        passes: history.passes,
        recommendation,
      });
    }
  });

  return flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);
}

function generateQuarantineComment(flakyTest: FlakyTest): string {
  const owner = getTestOwner(flakyTest.testId);
  const deadline = getFixDeadline();
  
  return `
<!-- FLAKY TEST QUARANTINE -->
<!-- Detected by automated flakiness detection -->
<!-- Flakiness Score: ${(flakyTest.flakinessScore * 100).toFixed(2)}% -->
<!-- Total Runs: ${flakyTest.totalRuns} | Failures: ${flakyTest.failures} -->
<!-- Owner: ${owner} -->
<!-- Fix Deadline: ${deadline} -->
<!-- 
  This test has been quarantined due to flakiness.
  Please investigate and fix before the deadline.
  Once fixed, remove this comment and the @quarantine tag.
-->
`;
}

function getTestOwner(testId: string): string {
  // Try to read from ownership tracking file
  const ownershipPath = path.join(__dirname, '..', 'docs', 'test-ownership.md');
  try {
    if (fs.existsSync(ownershipPath)) {
      const content = fs.readFileSync(ownershipPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes(testId) && line.includes('|')) {
          const parts = line.split('|');
          if (parts.length >= 3) {
            return parts[2].trim();
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors reading ownership file
  }
  return 'unassigned';
}

function getFixDeadline(): string {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7); // 7-day deadline
  return deadline.toISOString().split('T')[0];
}

function generateReport(flakyTests: FlakyTest[]): string {
  const report = [
    '# Flakiness Detection Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `- Total Flaky Tests: ${flakyTests.length}`,
    `- Recommended for Quarantine: ${flakyTests.filter(t => t.recommendation === 'quarantine').length}`,
    `- Recommended for Monitoring: ${flakyTests.filter(t => t.recommendation === 'monitor').length}`,
    '',
    '## Flaky Tests',
    '',
  ];

  if (flakyTests.length === 0) {
    report.push('✅ No flaky tests detected!');
  } else {
    flakyTests.forEach((test) => {
      report.push(`### ${test.testName}`);
      report.push(`- **File**: ${test.file}`);
      report.push(`- **Flakiness Score**: ${(test.flakinessScore * 100).toFixed(2)}%`);
      report.push(`- **Total Runs**: ${test.totalRuns}`);
      report.push(`- **Failures**: ${test.failures}`);
      report.push(`- **Passes**: ${test.passes}`);
      report.push(`- **Recommendation**: ${test.recommendation.toUpperCase()}`);
      report.push('');
      
      if (test.recommendation === 'quarantine') {
        report.push('**Action Required:**');
        report.push('```typescript');
        report.push(generateQuarantineComment(test).trim());
        report.push('```');
        report.push('');
      }
    });
  }

  return report.join('\n');
}

function main() {
  const resultsDir = path.join(__dirname, '..', 'artifacts', 'spaflow', 'test-results');
  const outputDir = path.join(__dirname, '..', 'artifacts', 'spaflow', 'flakiness-reports');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Collect all test results
  const results: SuiteResult[] = [];
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir);
    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const result = parsePlaywrightResults(path.join(resultsDir, file));
        if (result) {
          results.push(result);
        }
      }
    });
  }

  if (results.length === 0) {
    console.log('No Playwright test results found to analyze.');
    process.exit(0);
  }

  const flakyTests = analyzeFlakiness(results);
  const report = generateReport(flakyTests);

  // Write report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(outputDir, `flakiness-report-${timestamp}.md`);
  fs.writeFileSync(reportPath, report);

  // Also write latest report
  const latestPath = path.join(outputDir, 'latest-flakiness-report.md');
  fs.writeFileSync(latestPath, report);

  console.log(`Flakiness report generated: ${reportPath}`);
  console.log(`Flaky tests detected: ${flakyTests.length}`);

  // Exit with error if tests need quarantine
  const quarantineCount = flakyTests.filter(t => t.recommendation === 'quarantine').length;
  if (quarantineCount > 0) {
    console.error(`${quarantineCount} test(s) recommended for quarantine.`);
    process.exit(1);
  }
}

main();
