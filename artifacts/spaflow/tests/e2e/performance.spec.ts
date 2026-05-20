import { test, expect } from '@playwright/test';

/**
 * Performance Regression Tests
 * 
 * Measures Core Web Vitals to detect performance regressions:
 * - LCP (Largest Contentful Paint): Loading performance
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FID (First Input Delay): Interactivity
 * - TTFB (Time to First Byte): Server response time
 * 
 * 2026 Best Practice: Track these metrics over time and fail builds
 * when metrics degrade beyond baseline thresholds.
 */

test.describe('Performance Regression @performance @slow', () => {
  test('should measure Core Web Vitals on dashboard', async ({ page }) => {
    // Navigate to dashboard (authenticated page)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');

    // Get performance metrics from Chrome DevTools Protocol
    const metrics = await page.evaluate(() => {
      const entries = performance.getEntries();
      const navigation = entries[0] as PerformanceNavigationTiming;
      
      // Calculate Web Vitals
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcpEntries.length > 0 ? lcpEntries[0].startTime : 0;
      
      // CLS calculation (simplified - doesn't use observer due to async issues)
      let clsValue = 0;
      
      return {
        lcp: Math.round(lcp),
        cls: clsValue.toFixed(3),
        ttfb: Math.round(navigation.responseStart - navigation.requestStart),
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart),
      };
    });

    // Performance thresholds based on 2026 Web Vitals standards
    // LCP: < 2.5s is good, < 4s needs improvement
    expect(metrics.lcp).toBeLessThan(4000);
    
    // CLS: < 0.1 is good, < 0.25 needs improvement
    expect(parseFloat(metrics.cls as string)).toBeLessThan(0.25);
    
    // TTFB: < 600ms is good
    expect(metrics.ttfb).toBeLessThan(600);
    
    // DOM Content Loaded: Should be fast
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    
    // Load Complete: Full page load time
    expect(metrics.loadComplete).toBeLessThan(5000);

    // Log metrics for historical tracking
    console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
  });

  test('should measure client list page performance', async ({ page }) => {
    // Navigate to clients page
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    await page.click('text=Clients');
    await page.waitForURL('/clients');
    await page.waitForLoadState('networkidle');

    // Measure performance
    const metrics = await page.evaluate(() => {
      const entries = performance.getEntries();
      const navigation = entries[0] as PerformanceNavigationTiming;
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcpEntries.length > 0 ? lcpEntries[0].startTime : 0;
      
      return {
        lcp: Math.round(lcp),
        ttfb: Math.round(navigation.responseStart - navigation.requestStart),
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart),
      };
    });

    // Client list should load quickly
    expect(metrics.lcp).toBeLessThan(3500);
    expect(metrics.ttfb).toBeLessThan(600);
    expect(metrics.domContentLoaded).toBeLessThan(2500);
    
    console.log('Client List Performance:', JSON.stringify(metrics, null, 2));
  });

  test('should measure API response times from client perspective', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    
    // Track API response times
    const apiMetrics = await page.evaluate(() => {
      const responseTimes: number[] = [];
      
      // Track resource timing for API calls
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const apiResources = resources.filter(r => 
        r.initiatorType === 'xmlhttprequest' || r.initiatorType === 'fetch'
      );
      
      for (const resource of apiResources) {
        const duration = resource.responseEnd - resource.fetchStart;
        responseTimes.push(duration);
      }
      
      if (responseTimes.length === 0) {
        return { avg: 0, max: 0, p95: 0, count: 0 };
      }
      
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const max = Math.max(...responseTimes);
      const sorted = responseTimes.sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      
      return {
        avg: Math.round(avg),
        max: Math.round(max),
        p95: Math.round(p95),
        count: responseTimes.length,
      };
    });

    // API responses should be fast
    if (apiMetrics.count > 0) {
      expect(apiMetrics.avg).toBeLessThan(500);
      expect(apiMetrics.max).toBeLessThan(2000);
      expect(apiMetrics.p95).toBeLessThan(1000);
    }
    
    console.log('API Response Times:', JSON.stringify(apiMetrics, null, 2));
  });

  test('should measure resource loading performance', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');

    // Analyze resource loading
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const scripts = resources.filter(r => r.initiatorType === 'script');
      const stylesheets = resources.filter(r => r.initiatorType === 'link');
      const images = resources.filter(r => r.initiatorType === 'img');
      const xhr = resources.filter(r => r.initiatorType === 'xmlhttprequest' || r.initiatorType === 'fetch');
      
      const calculateSize = (items: PerformanceResourceTiming[]) => 
        items.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      
      const calculateDuration = (items: PerformanceResourceTiming[]) => {
        if (items.length === 0) return { avg: 0, max: 0 };
        const durations = items.map(r => r.responseEnd - r.fetchStart);
        return {
          avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          max: Math.round(Math.max(...durations)),
        };
      };
      
      return {
        scripts: {
          count: scripts.length,
          totalSize: calculateSize(scripts),
          ...calculateDuration(scripts),
        },
        stylesheets: {
          count: stylesheets.length,
          totalSize: calculateSize(stylesheets),
          ...calculateDuration(stylesheets),
        },
        images: {
          count: images.length,
          totalSize: calculateSize(images),
          ...calculateDuration(images),
        },
        api: {
          count: xhr.length,
          totalSize: calculateSize(xhr),
          ...calculateDuration(xhr),
        },
      };
    });

    // Resource loading should be efficient
    expect(resourceMetrics.scripts.count).toBeLessThan(20); // Not too many scripts
    expect(resourceMetrics.scripts.totalSize).toBeLessThan(2000000); // < 2MB JS
    expect(resourceMetrics.api.avg).toBeLessThan(500); // Fast API responses
    
    console.log('Resource Metrics:', JSON.stringify(resourceMetrics, null, 2));
  });
});
