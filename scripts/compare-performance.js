#!/usr/bin/env node

/**
 * Performance Regression Comparison Script
 * 
 * Compares current k6 load test results against a baseline to detect performance regressions.
 * Fails with exit code 1 if any critical endpoint's p95 response time degrades by more than 20%.
 */

const fs = require('fs');
const path = require('path');

// Critical endpoints to monitor for regression
const CRITICAL_ENDPOINTS = [
  '/healthz/live',
  '/healthz/ready',
  '/clients',
  '/dashboard',
];

// Regression threshold (20% increase)
const REGRESSION_THRESHOLD = 1.2;

/**
 * Load and parse a JSON file
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Extract p95 response times from k6 summary JSON
 */
function extractP95Times(summary) {
  const p95Times = {};
  
  if (!summary || !summary.metrics) {
    console.error('Invalid k6 summary format: missing metrics');
    return p95Times;
  }

  // k6 stores HTTP metrics per URL in metrics.http_req_duration.values
  const httpMetrics = summary.metrics.http_req_duration?.values;
  if (!httpMetrics) {
    console.error('No HTTP request duration metrics found');
    return p95Times;
  }

  // Extract p95 for each URL group
  for (const [url, data] of Object.entries(httpMetrics)) {
    if (data['p(95)'] !== undefined) {
      p95Times[url] = data['p(95)'];
    }
  }

  return p95Times;
}

/**
 * Compare current performance against baseline
 */
function comparePerformance(current, baseline) {
  const regressions = [];
  const improvements = [];
  const stable = [];

  for (const endpoint of CRITICAL_ENDPOINTS) {
    const currentP95 = current[endpoint];
    const baselineP95 = baseline[endpoint];

    if (currentP95 === undefined || baselineP95 === undefined) {
      console.log(`⚠️  Skipping ${endpoint}: missing data (current: ${currentP95}, baseline: ${baselineP95})`);
      continue;
    }

    const ratio = currentP95 / baselineP95;
    const percentChange = ((ratio - 1) * 100).toFixed(2);

    if (ratio > REGRESSION_THRESHOLD) {
      regressions.push({
        endpoint,
        current: currentP95,
        baseline: baselineP95,
        ratio,
        percentChange,
      });
    } else if (ratio < 0.8) {
      improvements.push({
        endpoint,
        current: currentP95,
        baseline: baselineP95,
        ratio,
        percentChange,
      });
    } else {
      stable.push({
        endpoint,
        current: currentP95,
        baseline: baselineP95,
        ratio,
        percentChange,
      });
    }
  }

  return { regressions, improvements, stable };
}

/**
 * Main execution
 */
function main() {
  const resultsPath = process.argv[2] || 'load-results.json';
  const baselinePath = process.argv[3] || '.performance-baseline.json';

  console.log('=== Performance Regression Check ===');
  console.log(`Current results: ${resultsPath}`);
  console.log(`Baseline: ${baselinePath}`);
  console.log('');

  // Load current results
  const currentSummary = loadJsonFile(resultsPath);
  if (!currentSummary) {
    console.error('Failed to load current results');
    process.exit(1);
  }

  // Check if baseline exists
  if (!fs.existsSync(baselinePath)) {
    console.log('⚠️  No baseline file found. Skipping comparison.');
    console.log('To create a baseline, run: k6 run --summary-export=.performance-baseline.json load-tests/benchmark.js');
    process.exit(0);
  }

  // Load baseline
  const baselineSummary = loadJsonFile(baselinePath);
  if (!baselineSummary) {
    console.error('Failed to load baseline');
    process.exit(1);
  }

  // Extract p95 times
  const currentP95 = extractP95Times(currentSummary);
  const baselineP95 = extractP95Times(baselineSummary);

  console.log('Current p95 times:');
  for (const [endpoint, time] of Object.entries(currentP95)) {
    console.log(`  ${endpoint}: ${time.toFixed(2)}ms`);
  }
  console.log('');

  console.log('Baseline p95 times:');
  for (const [endpoint, time] of Object.entries(baselineP95)) {
    console.log(`  ${endpoint}: ${time.toFixed(2)}ms`);
  }
  console.log('');

  // Compare
  const { regressions, improvements, stable } = comparePerformance(currentP95, baselineP95);

  // Report results
  if (regressions.length > 0) {
    console.log('❌ PERFORMANCE REGRESSIONS DETECTED:');
    for (const reg of regressions) {
      console.log(`  ${reg.endpoint}: ${reg.current.toFixed(2)}ms vs ${reg.baseline.toFixed(2)}ms (+${reg.percentChange}%)`);
    }
    console.log('');
  }

  if (improvements.length > 0) {
    console.log('✅ PERFORMANCE IMPROVEMENTS:');
    for (const imp of improvements) {
      console.log(`  ${imp.endpoint}: ${imp.current.toFixed(2)}ms vs ${imp.baseline.toFixed(2)}ms (${imp.percentChange}%)`);
    }
    console.log('');
  }

  if (stable.length > 0) {
    console.log('✅ STABLE ENDPOINTS:');
    for (const st of stable) {
      console.log(`  ${st.endpoint}: ${st.current.toFixed(2)}ms vs ${st.baseline.toFixed(2)}ms (${st.percentChange}%)`);
    }
    console.log('');
  }

  // Exit with error if regressions detected
  if (regressions.length > 0) {
    console.error(`Performance regression detected: ${regressions.length} endpoint(s) degraded by more than ${((REGRESSION_THRESHOLD - 1) * 100).toFixed(0)}%`);
    process.exit(1);
  }

  console.log('✅ No performance regressions detected');
  process.exit(0);
}

// Run main function
main();
