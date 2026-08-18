import { SERVER_LIMITS } from "./ServerLimits.js";
import { logger } from "../lib/logger.js";

export interface MemorySample {
  timestamp: number;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  arrayBuffersMb: number;
}

export interface MemoryAnalysisReport {
  current: MemorySample;
  baseline: MemorySample;
  deltaMb: number;
  growthRateMbPerMin: number;
  isLeakingSuspected: boolean;
  heapUsageRatio: number;
  samplesCount: number;
  history: MemorySample[];
}

/**
 * Server-side memory profiling & leak baseline monitor.
 */
export class MemoryMonitor {
  private samples: MemorySample[] = [];
  private maxSamples = 60;
  private intervalId: NodeJS.Timeout | null = null;
  private baseline: MemorySample;

  constructor() {
    this.baseline = this.captureSample();
    this.samples.push(this.baseline);
  }

  /**
   * Starts periodic memory sampling.
   */
  public start(intervalMs = 30_000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.tick();
    }, intervalMs);
    // Don't prevent process from exiting
    if (this.intervalId.unref) {
      this.intervalId.unref();
    }
  }

  /**
   * Stops periodic sampling.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Captures a single instantaneous memory sample.
   */
  public captureSample(): MemorySample {
    const mem = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      arrayBuffersMb: Math.round(((mem.arrayBuffers ?? 0) / 1024 / 1024) * 100) / 100,
    };
  }

  /**
   * Samples memory and checks safety thresholds.
   */
  public tick(): MemorySample {
    const sample = this.captureSample();
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    const ratio = sample.heapUsedMb / Math.max(1, sample.heapTotalMb);
    if (ratio > SERVER_LIMITS.HEAP_CRITICAL_THRESHOLD_RATIO) {
      logger.error({
        message: `CRITICAL Memory Alert: Heap used ${sample.heapUsedMb}MB / ${sample.heapTotalMb}MB (${Math.round(ratio * 100)}%)`,
        module: "MEMORY",
      });
    } else if (ratio > SERVER_LIMITS.HEAP_WARNING_THRESHOLD_RATIO) {
      logger.warn({
        message: `High Memory Alert: Heap used ${sample.heapUsedMb}MB / ${sample.heapTotalMb}MB (${Math.round(ratio * 100)}%)`,
        module: "MEMORY",
      });
    }

    return sample;
  }

  /**
   * Produces a comprehensive memory analysis report.
   */
  public getAnalysis(): MemoryAnalysisReport {
    const current = this.samples[this.samples.length - 1] ?? this.captureSample();
    const deltaMb = Math.round((current.heapUsedMb - this.baseline.heapUsedMb) * 100) / 100;
    const durationMinutes = Math.max(0.5, (current.timestamp - this.baseline.timestamp) / 60_000);
    const growthRateMbPerMin = Math.round((deltaMb / durationMinutes) * 100) / 100;
    const heapUsageRatio = current.heapUsedMb / Math.max(1, current.heapTotalMb);

    // Flag suspected leak if growth rate is consistently positive (>5 MB/min over >= 5 min)
    const isLeakingSuspected = durationMinutes >= 5 && growthRateMbPerMin > 5.0;

    return {
      current,
      baseline: this.baseline,
      deltaMb,
      growthRateMbPerMin,
      isLeakingSuspected,
      heapUsageRatio: Math.round(heapUsageRatio * 100) / 100,
      samplesCount: this.samples.length,
      history: [...this.samples],
    };
  }

  /**
   * Resets baseline (e.g. after a manual test or GC cycle).
   */
  public resetBaseline(): void {
    this.baseline = this.captureSample();
    this.samples = [this.baseline];
  }
}

export const memoryMonitor = new MemoryMonitor();
