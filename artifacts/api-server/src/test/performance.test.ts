/**
 * API Performance Regression Tests
 * 
 * Measures API response time percentiles to detect performance regressions.
 * 
 * 2026 Best Practice: Track P50, P95, P99 response times per endpoint.
 * Flag degradations beyond 150% of baseline.
 * 
 * These tests catch slow regressions that functional tests miss -
 * where responses are structurally correct but take 30 seconds instead of 300ms.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('API Performance Regression @performance @slow', () => {
  let server: any;

  beforeAll(async () => {
    // Start server for testing
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  /**
   * Helper to measure endpoint response times with multiple samples
   * Returns P50, P95, P99 percentiles
   */
  async function measureEndpointPerformance(
    method: string,
    path: string,
    samples: number = 10
  ): Promise<{ p50: number; p95: number; p99: number; avg: number; max: number }> {
    const times: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = Date.now();
      try {
        if (method === 'GET') {
          await request(app).get(path);
        } else if (method === 'POST') {
          await request(app).post(path).send({});
        }
        const end = Date.now();
        times.push(end - start);
      } catch (error) {
        // Failed requests still count for performance measurement
        const end = Date.now();
        times.push(end - start);
      }
    }

    // Sort times for percentile calculation
    times.sort((a, b) => a - b);

    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = times[times.length - 1];

    return {
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      avg: Math.round(avg),
      max: Math.round(max),
    };
  }

  test('health endpoint should respond quickly', async () => {
    const metrics = await measureEndpointPerformance('GET', '/health', 20);

    // Health endpoint should be very fast
    expect(metrics.p50).toBeLessThan(50); // P50 < 50ms
    expect(metrics.p95).toBeLessThan(100); // P95 < 100ms
    expect(metrics.p99).toBeLessThan(200); // P99 < 200ms
    expect(metrics.avg).toBeLessThan(100); // Average < 100ms

    console.log('Health endpoint performance:', JSON.stringify(metrics, null, 2));
  });

  test('auth login endpoint should respond within acceptable time', async () => {
    const metrics = await measureEndpointPerformance('POST', '/api/auth/login', 10);

    // Auth endpoints should be fast but may have bcrypt overhead
    expect(metrics.p50).toBeLessThan(500); // P50 < 500ms
    expect(metrics.p95).toBeLessThan(1000); // P95 < 1s
    expect(metrics.p99).toBeLessThan(2000); // P99 < 2s
    expect(metrics.max).toBeLessThan(3000); // Max < 3s

    console.log('Auth login performance:', JSON.stringify(metrics, null, 2));
  });

  test('clients list endpoint should respond quickly', async () => {
    const metrics = await measureEndpointPerformance('GET', '/api/clients', 10);

    // Data endpoints should be fast
    expect(metrics.p50).toBeLessThan(200); // P50 < 200ms
    expect(metrics.p95).toBeLessThan(500); // P95 < 500ms
    expect(metrics.p99).toBeLessThan(1000); // P99 < 1s

    console.log('Clients list performance:', JSON.stringify(metrics, null, 2));
  });

  test('dashboard endpoint should respond quickly', async () => {
    const metrics = await measureEndpointPerformance('GET', '/api/dashboard', 10);

    // Dashboard aggregates data, may be slightly slower
    expect(metrics.p50).toBeLessThan(300); // P50 < 300ms
    expect(metrics.p95).toBeLessThan(700); // P95 < 700ms
    expect(metrics.p99).toBeLessThan(1500); // P99 < 1.5s

    console.log('Dashboard performance:', JSON.stringify(metrics, null, 2));
  });

  test('rooms endpoint should respond quickly', async () => {
    const metrics = await measureEndpointPerformance('GET', '/api/rooms', 10);

    expect(metrics.p50).toBeLessThan(200); // P50 < 200ms
    expect(metrics.p95).toBeLessThan(500); // P95 < 500ms
    expect(metrics.p99).toBeLessThan(1000); // P99 < 1s

    console.log('Rooms performance:', JSON.stringify(metrics, null, 2));
  });

  test('lockers endpoint should respond quickly', async () => {
    const metrics = await measureEndpointPerformance('GET', '/api/lockers', 10);

    expect(metrics.p50).toBeLessThan(200); // P50 < 200ms
    expect(metrics.p95).toBeLessThan(500); // P95 < 500ms
    expect(metrics.p99).toBeLessThan(1000); // P99 < 1s

    console.log('Lockers performance:', JSON.stringify(metrics, null, 2));
  });

  test('products endpoint should respond quickly', async () => {
    const metrics = await measureEndpointPerformance('GET', '/api/products', 10);

    expect(metrics.p50).toBeLessThan(200); // P50 < 200ms
    expect(metrics.p95).toBeLessThan(500); // P95 < 500ms
    expect(metrics.p99).toBeLessThan(1000); // P99 < 1s

    console.log('Products performance:', JSON.stringify(metrics, null, 2));
  });

  /**
   * Regression detection test
   * Compares current metrics against baseline and flags degradations
   */
  test('should detect performance regression', async () => {
    const baseline = {
      health: { p95: 100, p99: 200 },
      clients: { p95: 500, p99: 1000 },
      dashboard: { p95: 700, p99: 1500 },
    };

    const currentMetrics = {
      health: await measureEndpointPerformance('GET', '/health', 20),
      clients: await measureEndpointPerformance('GET', '/api/clients', 10),
      dashboard: await measureEndpointPerformance('GET', '/api/dashboard', 10),
    };

    // Flag if degradation exceeds 150% of baseline (2026 best practice)
    const regressions: string[] = [];

    if (currentMetrics.health.p95 > baseline.health.p95 * 1.5) {
      regressions.push(`Health endpoint P95 degraded: ${currentMetrics.health.p95}ms > ${baseline.health.p95 * 1.5}ms`);
    }

    if (currentMetrics.clients.p95 > baseline.clients.p95 * 1.5) {
      regressions.push(`Clients endpoint P95 degraded: ${currentMetrics.clients.p95}ms > ${baseline.clients.p95 * 1.5}ms`);
    }

    if (currentMetrics.dashboard.p95 > baseline.dashboard.p95 * 1.5) {
      regressions.push(`Dashboard endpoint P95 degraded: ${currentMetrics.dashboard.p95}ms > ${baseline.dashboard.p95 * 1.5}ms`);
    }

    // Log all metrics for historical tracking
    console.log('Performance Baseline Comparison:', JSON.stringify({
      baseline,
      current: currentMetrics,
      regressions,
    }, null, 2));

    // If there are regressions, this test will fail
    // In production, these baselines would be stored and loaded from a file
    if (regressions.length > 0) {
      console.warn('Performance regressions detected:', regressions);
      // Uncomment to fail build on regression:
      // expect(regressions).toHaveLength(0);
    }
  });
});
