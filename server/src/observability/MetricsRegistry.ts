/**
 * High-performance, In-Memory Metrics Registry for BHALYAM.
 * Supports counters, gauges, histograms, and percentile computation (p50, p95, p99).
 */

export interface HistogramSnapshot {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export class Histogram {
  private samples: number[] = [];
  private maxSamples = 1_000;
  private sorted = true;

  constructor(private name: string, maxSamples = 1_000) {
    this.maxSamples = maxSamples;
  }

  public record(value: number): void {
    if (typeof value !== "number" || isNaN(value)) return;
    this.samples.push(value);
    this.sorted = false;

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  public getSnapshot(): HistogramSnapshot {
    if (this.samples.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    if (!this.sorted) {
      this.samples.sort((a, b) => a - b);
      this.sorted = true;
    }

    const count = this.samples.length;
    const min = this.samples[0]!;
    const max = this.samples[count - 1]!;
    const sum = this.samples.reduce((acc, val) => acc + val, 0);
    const avg = Math.round((sum / count) * 100) / 100;

    const p50 = this.getPercentile(50);
    const p95 = this.getPercentile(95);
    const p99 = this.getPercentile(99);

    return { count, min, max, avg, p50, p95, p99 };
  }

  public clear(): void {
    this.samples = [];
    this.sorted = true;
  }

  private getPercentile(pct: number): number {
    if (this.samples.length === 0) return 0;
    const idx = Math.min(
      this.samples.length - 1,
      Math.max(0, Math.floor((pct / 100) * this.samples.length))
    );
    return Math.round((this.samples[idx] ?? 0) * 100) / 100;
  }
}

export class MetricsRegistry {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  /**
   * Increments a monotonic counter.
   */
  public increment(name: string, amount = 1): number {
    const current = this.counters.get(name) || 0;
    const next = current + amount;
    this.counters.set(name, next);
    return next;
  }

  /**
   * Retrieves counter value.
   */
  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Sets a gauge value.
   */
  public setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  /**
   * Retrieves gauge value.
   */
  public getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Records a duration or numeric sample into a named histogram.
   */
  public recordHistogram(name: string, value: number): void {
    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = new Histogram(name);
      this.histograms.set(name, histogram);
    }
    histogram.record(value);
  }

  /**
   * Gets histogram statistical snapshot.
   */
  public getHistogramSnapshot(name: string): HistogramSnapshot {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }
    return histogram.getSnapshot();
  }

  /**
   * Returns all metric keys and values.
   */
  public dump(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, HistogramSnapshot>;
  } {
    const counters: Record<string, number> = {};
    for (const [k, v] of this.counters.entries()) {
      counters[k] = v;
    }

    const gauges: Record<string, number> = {};
    for (const [k, v] of this.gauges.entries()) {
      gauges[k] = v;
    }

    const histograms: Record<string, HistogramSnapshot> = {};
    for (const [k, v] of this.histograms.entries()) {
      histograms[k] = v.getSnapshot();
    }

    return { counters, gauges, histograms };
  }

  /**
   * Resets registry (for tests or reboot).
   */
  public reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

export const metricsRegistry = new MetricsRegistry();
