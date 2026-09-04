import v8 from "node:v8";
import { SERVER_LIMITS } from "./ServerLimits.js";
import { logger } from "../lib/logger.js";

export interface MemorySample {
  timestamp: number;
  heapUsedMb: number;
  heapTotalMb: number;
  heapSizeLimitMb: number;
  rssMb: number;
  externalMb: number;
  arrayBuffersMb: number;
}

export type MemoryTrend = "STABLE" | "RECLAIMING" | "GROWING" | "LEAKING_SUSPECTED";

export interface GrowthTrendAnalysis {
  trend: MemoryTrend;
  sampleCount: number;
  windowDurationSec: number;
  growthRateMbPerMin: number;
  netDeltaMb: number;
  consecutiveIncreases: number;
  isSustainedGrowth: boolean;
}

export interface MemoryAnalysisReport {
  current: MemorySample;
  baseline: MemorySample;
  deltaMb: number;
  growthRateMbPerMin: number;
  isLeakingSuspected: boolean;
  /** True heap utilization ratio against V8 heap_size_limit (0..1) */
  heapUsageRatio: number;
  /** Same as heapUsageRatio (true ratio against heap_size_limit) */
  heapUtilizationRatio: number;
  /** Ratio of heapUsed to currently allocated heapTotal (for diagnostic reference) */
  heapToTotalRatio: number;
  growthTrend: GrowthTrendAnalysis;
  samplesCount: number;
  history: MemorySample[];
}

export type MemoryAlertLevel = "NONE" | "WARNING" | "CRITICAL";

export interface AlertState {
  lastAlertLevel: MemoryAlertLevel;
  lastAlertTimestamp: number;
  consecutiveBreaches: number;
  consecutiveNormalTicks: number;
  suppressionCount: number;
}

export interface MemoryThresholdConfig {
  heapWarningThreshold: number;
  heapCriticalThreshold: number;
  rssWarningThresholdMb: number;
  rssCriticalThresholdMb: number;
  minHeapAlertFloorMb: number;
  alertCooldownMs: number;
  consecutiveBreachesRequired: number;
}

/**
 * Production-grade Server-side Memory & Reliability Profiler for BHALYAM.
 *
 * Designed to prevent false-positive alerts by monitoring:
 *   1. heapUsed against V8's hard heap_size_limit (not temporary heapTotal)
 *   2. rss (Resident Set Size against host / container limits)
 *   3. growth trend (sustained un-reclaimed memory growth over time)
 *   4. alert suppression (cooldown periods, consecutive breach debounce, and resolution tracking)
 */
export class MemoryMonitor {
  private samples: MemorySample[] = [];
  private maxSamples = 60;
  private intervalId: NodeJS.Timeout | null = null;
  private baseline: MemorySample;

  // Thresholds & Quotas
  private heapWarningThreshold: number = SERVER_LIMITS.HEAP_WARNING_THRESHOLD_RATIO;
  private heapCriticalThreshold: number = SERVER_LIMITS.HEAP_CRITICAL_THRESHOLD_RATIO;
  private rssWarningThresholdMb: number = SERVER_LIMITS.RSS_WARNING_THRESHOLD_MB;
  private rssCriticalThresholdMb: number = SERVER_LIMITS.RSS_CRITICAL_THRESHOLD_MB;
  private minHeapAlertFloorMb: number = SERVER_LIMITS.MIN_HEAP_ALERT_FLOOR_MB;
  private alertCooldownMs: number = SERVER_LIMITS.MEMORY_ALERT_COOLDOWN_MS;
  private consecutiveBreachesRequired: number = SERVER_LIMITS.MEMORY_ALERT_CONSECUTIVE_BREACHES;

  // Alert State Tracking for Suppression & Hysteresis
  private lastAlertLevel: MemoryAlertLevel = "NONE";
  private lastAlertTimestamp = 0;
  private consecutiveBreaches = 0;
  private consecutiveNormalTicks = 0;
  private suppressionCount = 0;

  constructor(customConfig?: Partial<MemoryThresholdConfig>) {
    if (customConfig) {
      this.configure(customConfig);
    }
    this.baseline = this.captureSample();
    this.samples.push(this.baseline);
  }

  /**
   * Configures monitoring thresholds and suppression parameters.
   */
  public configure(config: Partial<MemoryThresholdConfig>): void {
    if (config.heapWarningThreshold !== undefined) this.heapWarningThreshold = config.heapWarningThreshold;
    if (config.heapCriticalThreshold !== undefined) this.heapCriticalThreshold = config.heapCriticalThreshold;
    if (config.rssWarningThresholdMb !== undefined) this.rssWarningThresholdMb = config.rssWarningThresholdMb;
    if (config.rssCriticalThresholdMb !== undefined) this.rssCriticalThresholdMb = config.rssCriticalThresholdMb;
    if (config.minHeapAlertFloorMb !== undefined) this.minHeapAlertFloorMb = config.minHeapAlertFloorMb;
    if (config.alertCooldownMs !== undefined) this.alertCooldownMs = config.alertCooldownMs;
    if (config.consecutiveBreachesRequired !== undefined) {
      this.consecutiveBreachesRequired = config.consecutiveBreachesRequired;
    }
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
   * Captures a single instantaneous memory sample using process.memoryUsage()
   * and v8.getHeapStatistics().
   */
  public captureSample(): MemorySample {
    const mem = process.memoryUsage();
    let heapSizeLimit = 4096 * 1024 * 1024;
    try {
      const stats = v8.getHeapStatistics();
      if (stats?.heap_size_limit) {
        heapSizeLimit = stats.heap_size_limit;
      }
    } catch {
      // Fallback in environments where v8 statistics are restricted
    }

    return {
      timestamp: Date.now(),
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      heapSizeLimitMb: Math.round((heapSizeLimit / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      arrayBuffersMb: Math.round(((mem.arrayBuffers ?? 0) / 1024 / 1024) * 100) / 100,
    };
  }

  /**
   * Analyzes memory growth trajectory across recent samples.
   * Differentiates healthy GC sawtooth fluctuations from sustained leaks.
   */
  public calculateGrowthTrend(samples: MemorySample[]): GrowthTrendAnalysis {
    if (samples.length < 2) {
      return {
        trend: "STABLE",
        sampleCount: samples.length,
        windowDurationSec: 0,
        growthRateMbPerMin: 0,
        netDeltaMb: 0,
        consecutiveIncreases: 0,
        isSustainedGrowth: false,
      };
    }

    const first = samples[0];
    const last = samples[samples.length - 1];
    const windowDurationSec = Math.max(1, Math.round((last.timestamp - first.timestamp) / 1000));
    const durationMinutes = Math.max(0.2, (last.timestamp - first.timestamp) / 60_000);
    const netDeltaMb = Math.round((last.heapUsedMb - first.heapUsedMb) * 100) / 100;
    const growthRateMbPerMin = Math.round((netDeltaMb / durationMinutes) * 100) / 100;

    // Count consecutive upward sample steps from newest to oldest
    let consecutiveIncreases = 0;
    for (let i = samples.length - 1; i > 0; i--) {
      if (samples[i].heapUsedMb >= samples[i - 1].heapUsedMb) {
        consecutiveIncreases++;
      } else {
        break;
      }
    }

    // Check if a substantial garbage collection drop occurred recently
    let hasRecentDrop = false;
    const recentSlice = samples.slice(-4);
    for (let i = 1; i < recentSlice.length; i++) {
      if (recentSlice[i - 1].heapUsedMb - recentSlice[i].heapUsedMb >= 10) {
        hasRecentDrop = true;
        break;
      }
    }

    // Sustained growth requires:
    // 1. Positive net delta of at least 25 MB
    // 2. Minimum observation duration (>= 2 minutes or >= 4 samples)
    // 3. High growth rate (> 3.0 MB/min)
    // 4. Multiple consecutive increases without a GC reclamation drop
    const isSustainedGrowth =
      samples.length >= 4 &&
      netDeltaMb >= 25 &&
      growthRateMbPerMin > 3.0 &&
      consecutiveIncreases >= 3 &&
      !hasRecentDrop;

    // Suspected leak criteria:
    // Significant sustained un-reclaimed growth over >= 5 minutes with > 50MB delta
    const isLeakingSuspected =
      durationMinutes >= 5 &&
      netDeltaMb >= 50 &&
      growthRateMbPerMin > 5.0 &&
      consecutiveIncreases >= 4 &&
      !hasRecentDrop;

    let trend: MemoryTrend = "STABLE";
    if (isLeakingSuspected) {
      trend = "LEAKING_SUSPECTED";
    } else if (isSustainedGrowth) {
      trend = "GROWING";
    } else if (hasRecentDrop || netDeltaMb < -10) {
      trend = "RECLAIMING";
    }

    return {
      trend,
      sampleCount: samples.length,
      windowDurationSec,
      growthRateMbPerMin,
      netDeltaMb,
      consecutiveIncreases,
      isSustainedGrowth,
    };
  }

  /**
   * Samples memory, assesses health across multi-dimensional criteria,
   * and emits suppressed, de-duplicated alerts only when genuine anomalies persist.
   */
  public tick(injectedSample?: MemorySample): MemorySample {
    const sample = injectedSample ?? this.captureSample();
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    const growthTrend = this.calculateGrowthTrend(this.samples);
    const heapUtilizationRatio = sample.heapUsedMb / Math.max(1, sample.heapSizeLimitMb);
    const isAboveFloor = sample.heapUsedMb >= this.minHeapAlertFloorMb;

    // Evaluate CRITICAL conditions
    const isCritical =
      (isAboveFloor && heapUtilizationRatio >= this.heapCriticalThreshold) ||
      sample.rssMb >= this.rssCriticalThresholdMb ||
      growthTrend.trend === "LEAKING_SUSPECTED";

    // Evaluate WARNING conditions
    const isWarning =
      !isCritical &&
      ((isAboveFloor && heapUtilizationRatio >= this.heapWarningThreshold) ||
        sample.rssMb >= this.rssWarningThresholdMb ||
        (growthTrend.isSustainedGrowth && growthTrend.growthRateMbPerMin > 5.0));

    const currentLevel: MemoryAlertLevel = isCritical ? "CRITICAL" : isWarning ? "WARNING" : "NONE";

    if (currentLevel !== "NONE") {
      this.consecutiveNormalTicks = 0;
      this.consecutiveBreaches++;

      // Transient Filter: Require sustained breach before alerting
      if (this.consecutiveBreaches >= this.consecutiveBreachesRequired) {
        const now = Date.now();
        const isEscalation = currentLevel === "CRITICAL" && this.lastAlertLevel === "WARNING";
        const isCooldownElapsed = now - this.lastAlertTimestamp >= this.alertCooldownMs;

        // Alert Suppression Gate:
        // Allow alert if severity escalated OR cooldown elapsed since last notification
        if (isEscalation || isCooldownElapsed || this.lastAlertLevel === "NONE") {
          this.lastAlertLevel = currentLevel;
          this.lastAlertTimestamp = now;

          const alertDetails = {
            heapUsedMb: sample.heapUsedMb,
            heapSizeLimitMb: sample.heapSizeLimitMb,
            heapUtilizationPercent: Math.round(heapUtilizationRatio * 100),
            rssMb: sample.rssMb,
            trend: growthTrend.trend,
            growthRateMbPerMin: growthTrend.growthRateMbPerMin,
            consecutiveBreaches: this.consecutiveBreaches,
          };

          if (currentLevel === "CRITICAL") {
            logger.error({
              message: `CRITICAL Memory Alert: Heap used ${sample.heapUsedMb}MB / ${sample.heapSizeLimitMb}MB (${alertDetails.heapUtilizationPercent}%), RSS: ${sample.rssMb}MB, Trend: ${growthTrend.trend}`,
              module: "MEMORY",
              details: alertDetails,
            });
          } else {
            logger.warn({
              message: `High Memory Alert: Heap used ${sample.heapUsedMb}MB / ${sample.heapSizeLimitMb}MB (${alertDetails.heapUtilizationPercent}%), RSS: ${sample.rssMb}MB, Trend: ${growthTrend.trend}`,
              module: "MEMORY",
              details: alertDetails,
            });
          }
        } else {
          this.suppressionCount++;
        }
      }
    } else {
      // Normal state: reset breach counter and track normalization hysteresis
      this.consecutiveBreaches = 0;
      this.consecutiveNormalTicks++;

      if (this.lastAlertLevel !== "NONE" && this.consecutiveNormalTicks >= 2) {
        logger.info({
          message: `Memory pressure cleared: Heap used ${sample.heapUsedMb}MB / ${sample.heapSizeLimitMb}MB (${Math.round(heapUtilizationRatio * 100)}%), RSS: ${sample.rssMb}MB`,
          module: "MEMORY",
        });
        this.lastAlertLevel = "NONE";
      }
    }

    return sample;
  }

  /**
   * Produces a comprehensive multi-dimensional memory analysis report.
   */
  public getAnalysis(): MemoryAnalysisReport {
    const current = this.samples[this.samples.length - 1] ?? this.captureSample();
    const deltaMb = Math.round((current.heapUsedMb - this.baseline.heapUsedMb) * 100) / 100;
    const durationMinutes = Math.max(0.5, (current.timestamp - this.baseline.timestamp) / 60_000);
    const growthRateMbPerMin = Math.round((deltaMb / durationMinutes) * 100) / 100;
    const growthTrend = this.calculateGrowthTrend(this.samples);

    const heapUtilizationRatio = current.heapUsedMb / Math.max(1, current.heapSizeLimitMb);
    const heapToTotalRatio = current.heapUsedMb / Math.max(1, current.heapTotalMb);

    return {
      current,
      baseline: this.baseline,
      deltaMb,
      growthRateMbPerMin,
      isLeakingSuspected: growthTrend.trend === "LEAKING_SUSPECTED",
      heapUsageRatio: Math.round(heapUtilizationRatio * 1000) / 1000,
      heapUtilizationRatio: Math.round(heapUtilizationRatio * 1000) / 1000,
      heapToTotalRatio: Math.round(heapToTotalRatio * 1000) / 1000,
      growthTrend,
      samplesCount: this.samples.length,
      history: [...this.samples],
    };
  }

  /**
   * Resets baseline (e.g. after a manual test, garbage collection, or new phase).
   */
  public resetBaseline(): void {
    this.baseline = this.captureSample();
    this.samples = [this.baseline];
    this.consecutiveBreaches = 0;
    this.consecutiveNormalTicks = 0;
    this.suppressionCount = 0;
  }

  /**
   * Resets alert suppression state (useful in test teardown or manual resolution).
   */
  public resetAlertState(): void {
    this.lastAlertLevel = "NONE";
    this.lastAlertTimestamp = 0;
    this.consecutiveBreaches = 0;
    this.consecutiveNormalTicks = 0;
    this.suppressionCount = 0;
  }

  /**
   * Returns current internal alert and suppression metrics for observability.
   */
  public getAlertState(): AlertState {
    return {
      lastAlertLevel: this.lastAlertLevel,
      lastAlertTimestamp: this.lastAlertTimestamp,
      consecutiveBreaches: this.consecutiveBreaches,
      consecutiveNormalTicks: this.consecutiveNormalTicks,
      suppressionCount: this.suppressionCount,
    };
  }
}

export const memoryMonitor = new MemoryMonitor();
