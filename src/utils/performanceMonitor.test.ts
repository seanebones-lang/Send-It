/**
 * Unit tests for PerformanceMonitor
 * Tests metric recording, statistics, and timer functionality
 */

import { getPerformanceMonitor, recordMetric, startTimer, getMetricStats, getMetricSummary } from './performanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: ReturnType<typeof getPerformanceMonitor>;

  beforeEach(() => {
    monitor = getPerformanceMonitor();
    monitor.clear();
  });

  describe('Metric Recording', () => {
    it('should record a metric', () => {
      recordMetric('test.metric', 100);

      const stats = getMetricStats('test.metric');
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(1);
      expect(stats?.average).toBe(100);
    });

    it('should record multiple metrics', () => {
      recordMetric('test.metric', 100);
      recordMetric('test.metric', 200);
      recordMetric('test.metric', 300);

      const stats = getMetricStats('test.metric');
      expect(stats?.count).toBe(3);
      expect(stats?.average).toBe(200);
    });

    it('should record metrics with tags', () => {
      recordMetric('test.metric', 100, { platform: 'vercel' });
      recordMetric('test.metric', 200, { platform: 'railway' });

      const metrics = monitor.getMetrics('test.metric');
      expect(metrics[0].tags?.platform).toBe('vercel');
      expect(metrics[1].tags?.platform).toBe('railway');
    });
  });

  describe('Timer Functionality', () => {
    it('should measure execution time', async () => {
      const stopTimer = startTimer('test.timer');

      await new Promise((resolve) => setTimeout(resolve, 50));
      stopTimer();

      const stats = getMetricStats('test.timer');
      expect(stats).toBeDefined();
      expect(stats?.average).toBeGreaterThan(40);
      expect(stats?.average).toBeLessThan(100);
    });

    it('should measure multiple timers', () => {
      const stop1 = startTimer('test.timer1');
      stop1();

      const stop2 = startTimer('test.timer2');
      stop2();

      const stats1 = getMetricStats('test.timer1');
      const stats2 = getMetricStats('test.timer2');

      expect(stats1).toBeDefined();
      expect(stats2).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should calculate average correctly', () => {
      recordMetric('test.metric', 100);
      recordMetric('test.metric', 200);
      recordMetric('test.metric', 300);

      const stats = getMetricStats('test.metric');
      expect(stats?.average).toBe(200);
    });

    it('should calculate min and max correctly', () => {
      recordMetric('test.metric', 100);
      recordMetric('test.metric', 200);
      recordMetric('test.metric', 300);

      const stats = getMetricStats('test.metric');
      expect(stats?.min).toBe(100);
      expect(stats?.max).toBe(300);
    });

    it('should calculate percentiles correctly', () => {
      // Record 100 values
      for (let i = 1; i <= 100; i++) {
        recordMetric('test.metric', i);
      }

      const stats = getMetricStats('test.metric');
      expect(stats?.p95).toBeGreaterThanOrEqual(95);
      expect(stats?.p99).toBeGreaterThanOrEqual(99);
    });

    it('should return null for non-existent metrics', () => {
      const stats = getMetricStats('nonexistent');
      expect(stats).toBeNull();
    });
  });

  describe('Time Window', () => {
    it('should filter metrics by time window', () => {
      recordMetric('test.metric', 100);

      // Wait a bit
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Wait
      }

      recordMetric('test.metric', 200);

      const stats = getMetricStats('test.metric', 5); // 5ms window
      // Should only include recent metrics
      expect(stats?.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Metric Names', () => {
    it('should return all unique metric names', () => {
      recordMetric('metric1', 100);
      recordMetric('metric2', 200);
      recordMetric('metric1', 300);

      const names = monitor.getMetricNames();
      expect(names).toContain('metric1');
      expect(names).toContain('metric2');
      expect(names.length).toBe(2);
    });
  });

  describe('Summary', () => {
    it('should return summary of all metrics', () => {
      recordMetric('metric1', 100);
      recordMetric('metric2', 200);

      const summary = getMetricSummary();
      expect(summary).toHaveProperty('metric1');
      expect(summary).toHaveProperty('metric2');
    });
  });

  describe('Clear', () => {
    it('should clear all metrics', () => {
      recordMetric('test.metric', 100);
      monitor.clear();

      const stats = getMetricStats('test.metric');
      expect(stats).toBeNull();
    });
  });

  describe('Export', () => {
    it('should export all metrics', () => {
      recordMetric('test.metric', 100, { tag: 'value' });

      const exported = monitor.export();
      expect(exported.length).toBeGreaterThan(0);
      expect(exported[0]).toHaveProperty('name', 'test.metric');
      expect(exported[0]).toHaveProperty('value', 100);
      expect(exported[0]).toHaveProperty('tags', { tag: 'value' });
    });
  });

  describe('Memory Management', () => {
    it('should limit number of stored metrics', () => {
      // Record more than maxMetrics
      for (let i = 0; i < 1500; i++) {
        recordMetric('test.metric', i);
      }

      const metrics = monitor.getMetrics('test.metric');
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });
});
