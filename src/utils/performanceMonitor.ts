/**
 * Performance Monitoring Utility
 * Tracks performance metrics for the application
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceStats {
  average: number;
  min: number;
  max: number;
  count: number;
  p95: number;
  p99: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private readonly statsCache: Map<string, PerformanceStats> = new Map();
  private readonly statsCacheTTL = 60000; // 1 minute

  /**
   * Records a performance metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Invalidate cache for this metric
    this.statsCache.delete(name);
  }

  /**
   * Starts a performance timer
   */
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.record(name, duration, tags);
    };
  }

  /**
   * Gets statistics for a metric
   */
  getStats(name: string, timeWindow?: number): PerformanceStats | null {
    const cacheKey = `${name}-${timeWindow || 'all'}`;
    const cached = this.statsCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevantMetrics = this.metrics.filter(
      (m) => m.name === name && m.timestamp >= windowStart
    );

    if (relevantMetrics.length === 0) {
      return null;
    }

    const values = relevantMetrics.map((m) => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = values[0];
    const max = values[values.length - 1];
    const p95Index = Math.floor(values.length * 0.95);
    const p99Index = Math.floor(values.length * 0.99);

    const stats: PerformanceStats = {
      average,
      min,
      max,
      count: values.length,
      p95: values[p95Index] || average,
      p99: values[p99Index] || average,
    };

    // Cache stats
    this.statsCache.set(cacheKey, stats);
    
    // Clear cache after TTL
    setTimeout(() => {
      this.statsCache.delete(cacheKey);
    }, this.statsCacheTTL);

    return stats;
  }

  /**
   * Gets all metrics for a name
   */
  getMetrics(name: string, timeWindow?: number): PerformanceMetric[] {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;

    return this.metrics.filter(
      (m) => m.name === name && m.timestamp >= windowStart
    );
  }

  /**
   * Gets all unique metric names
   */
  getMetricNames(): string[] {
    return Array.from(new Set(this.metrics.map((m) => m.name)));
  }

  /**
   * Clears all metrics
   */
  clear(): void {
    this.metrics = [];
    this.statsCache.clear();
  }

  /**
   * Exports metrics for analysis
   */
  export(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Gets summary of all metrics
   */
  getSummary(): Record<string, PerformanceStats> {
    const summary: Record<string, PerformanceStats> = {};
    const names = this.getMetricNames();

    for (const name of names) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = stats;
      }
    }

    return summary;
  }
}

// Singleton instance
let instance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!instance) {
    instance = new PerformanceMonitor();
  }
  return instance;
}

// Convenience functions
export function recordMetric(name: string, value: number, tags?: Record<string, string>): void {
  getPerformanceMonitor().record(name, value, tags);
}

export function startTimer(name: string, tags?: Record<string, string>): () => void {
  return getPerformanceMonitor().startTimer(name, tags);
}

export function getMetricStats(name: string, timeWindow?: number): PerformanceStats | null {
  return getPerformanceMonitor().getStats(name, timeWindow);
}

export function getMetricSummary(): Record<string, PerformanceStats> {
  return getPerformanceMonitor().getSummary();
}

export type { PerformanceMetric, PerformanceStats };
