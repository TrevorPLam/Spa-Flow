#!/usr/bin/env node
/**
 * Flakiness Dashboard Generator
 * Aggregates flakiness reports from all test suites and generates an HTML dashboard
 * Following 2026 best practices: visual metrics, trend tracking, ownership display
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

interface DashboardData {
  apiServer: FlakyTest[];
  spaflow: FlakyTest[];
  playwright: FlakyTest[];
  lastUpdated: string;
}

function parseFlakinessReport(reportPath: string): FlakyTest[] {
  try {
    const content = fs.readFileSync(reportPath, 'utf-8');
    const lines = content.split('\n');
    const tests: FlakyTest[] = [];
    let currentTest: Partial<FlakyTest> | null = null;

    for (const line of lines) {
      if (line.startsWith('### ')) {
        if (currentTest && currentTest.testId) {
          tests.push(currentTest as FlakyTest);
        }
        currentTest = { testName: line.replace('### ', '').trim(), testId: '' };
      } else if (line.includes('**File**') && currentTest) {
        currentTest.file = line.split(':')[1]?.trim() || '';
      } else if (line.includes('**Flakiness Score**') && currentTest) {
        const score = line.match(/([\d.]+)%/)?.[1];
        currentTest.flakinessScore = score ? parseFloat(score) / 100 : 0;
      } else if (line.includes('**Total Runs**') && currentTest) {
        currentTest.totalRuns = parseInt(line.match(/(\d+)/)?.[1] || '0');
      } else if (line.includes('**Failures**') && currentTest) {
        currentTest.failures = parseInt(line.match(/(\d+)/)?.[1] || '0');
      } else if (line.includes('**Passes**') && currentTest) {
        currentTest.passes = parseInt(line.match(/(\d+)/)?.[1] || '0');
      } else if (line.includes('**Recommendation**') && currentTest) {
        currentTest.recommendation = line.includes('QUARANTINE') ? 'quarantine' : 
                                     line.includes('MONITOR') ? 'monitor' : 'stable';
        currentTest.testId = `${currentTest.file} > ${currentTest.testName}`;
      }
    }

    if (currentTest && currentTest.testId) {
      tests.push(currentTest as FlakyTest);
    }

    return tests;
  } catch (error) {
    console.error(`Error parsing report from ${reportPath}:`, error);
    return [];
  }
}

function collectFlakinessData(): DashboardData {
  const data: DashboardData = {
    apiServer: [],
    spaflow: [],
    playwright: [],
    lastUpdated: new Date().toISOString(),
  };

  // API Server report
  const apiServerReport = path.join(__dirname, '..', 'artifacts', 'api-server', 'flakiness-reports', 'latest-flakiness-report.md');
  if (fs.existsSync(apiServerReport)) {
    data.apiServer = parseFlakinessReport(apiServerReport);
  }

  // Spaflow report
  const spaflowReport = path.join(__dirname, '..', 'artifacts', 'spaflow', 'flakiness-reports', 'latest-flakiness-report.md');
  if (fs.existsSync(spaflowReport)) {
    data.spaflow = parseFlakinessReport(spaflowReport);
  }

  // Playwright report
  const playwrightReport = path.join(__dirname, '..', 'artifacts', 'spaflow', 'flakiness-reports', 'latest-flakiness-report.md');
  if (fs.existsSync(playwrightReport)) {
    data.playwright = parseFlakinessReport(playwrightReport);
  }

  return data;
}

function generateHTMLDashboard(data: DashboardData): string {
  const totalFlaky = data.apiServer.length + data.spaflow.length + data.playwright.length;
  const quarantineCount = [...data.apiServer, ...data.spaflow, ...data.playwright].filter(t => t.recommendation === 'quarantine').length;
  const monitorCount = [...data.apiServer, ...data.spaflow, ...data.playwright].filter(t => t.recommendation === 'monitor').length;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flakiness Dashboard - Spa-Flow</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      color: #2d3748;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .last-updated {
      color: #718096;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .metric-card.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .metric-card.success {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .metric-label {
      font-size: 14px;
      opacity: 0.9;
    }
    .section {
      margin-bottom: 30px;
    }
    h2 {
      color: #2d3748;
      margin-bottom: 15px;
      font-size: 20px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f7fafc;
      color: #2d3748;
      font-weight: 600;
    }
    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-quarantine {
      background: #fed7d7;
      color: #c53030;
    }
    .badge-monitor {
      background: #feebc8;
      color: #c05621;
    }
    .score-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .score-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .score-fill.high {
      background: #f56565;
    }
    .score-fill.medium {
      background: #ed8936;
    }
    .score-fill.low {
      background: #48bb78;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #718096;
    }
    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 15px;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔬 Flakiness Dashboard</h1>
    <p class="last-updated">Last updated: ${new Date(data.lastUpdated).toLocaleString()}</p>

    <div class="metrics">
      <div class="metric-card ${totalFlaky > 0 ? 'warning' : 'success'}">
        <div class="metric-value">${totalFlaky}</div>
        <div class="metric-label">Total Flaky Tests</div>
      </div>
      <div class="metric-card warning">
        <div class="metric-value">${quarantineCount}</div>
        <div class="metric-label">Need Quarantine</div>
      </div>
      <div class="metric-card warning">
        <div class="metric-value">${monitorCount}</div>
        <div class="metric-label">Need Monitoring</div>
      </div>
      <div class="metric-card success">
        <div class="metric-value">${totalFlaky === 0 ? '✅' : '⚠️'}</div>
        <div class="metric-label">Overall Status</div>
      </div>
    </div>

    ${generateSection('API Server Tests', data.apiServer)}
    ${generateSection('Frontend Unit Tests', data.spaflow)}
    ${generateSection('E2E Tests', data.playwright)}

  </div>

  <script>
    // Auto-refresh every 5 minutes
    setTimeout(() => location.reload(), 300000);
  </script>
</body>
</html>
  `;

  return html.trim();
}

function generateSection(title: string, tests: FlakyTest[]): string {
  if (tests.length === 0) {
    return `
    <div class="section">
      <h2>${title}</h2>
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No flaky tests detected ✅</p>
      </div>
    </div>
    `;
  }

  const rows = tests.map(test => {
    const scoreClass = test.flakinessScore > 0.1 ? 'high' : test.flakinessScore > 0.05 ? 'medium' : 'low';
    const badgeClass = test.recommendation === 'quarantine' ? 'badge-quarantine' : 'badge-monitor';
    
    return `
    <tr>
      <td>
        <strong>${test.testName}</strong>
        <br><small style="color: #718096">${test.file}</small>
      </td>
      <td>
        ${(test.flakinessScore * 100).toFixed(2)}%
        <div class="score-bar">
          <div class="score-fill ${scoreClass}" style="width: ${test.flakinessScore * 100}%"></div>
        </div>
      </td>
      <td>${test.totalRuns}</td>
      <td>${test.failures}</td>
      <td><span class="badge ${badgeClass}">${test.recommendation}</span></td>
    </tr>
    `;
  }).join('');

  return `
  <div class="section">
    <h2>${title} (${tests.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Flakiness Score</th>
          <th>Total Runs</th>
          <th>Failures</th>
          <th>Recommendation</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
  `;
}

function main() {
  const data = collectFlakinessData();
  const html = generateHTMLDashboard(data);

  const outputDir = path.join(__dirname, '..', 'artifacts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'flakiness-dashboard.html');
  fs.writeFileSync(outputPath, html);

  console.log(`Flakiness dashboard generated: ${outputPath}`);
  console.log(`Total flaky tests: ${data.apiServer.length + data.spaflow.length + data.playwright.length}`);
}

main();
