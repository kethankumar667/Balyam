import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryMonitor, type MemorySample } from "../MemoryMonitor.js";
import { logger } from "../../lib/logger.js";

function makeSample(overrides: Partial<MemorySample> = {}): MemorySample {
  return {
    timestamp: Date.now(),
    heapUsedMb: 50,
    heapTotalMb: 60,
    heapSizeLimitMb: 4096,
    rssMb: 120,
    externalMb: 10,
    arrayBuffersMb: 5,
    ...overrides,
  };
}

describe("MemoryMonitor (Reliability & False-Positive Elimination)", () => {
  let monitor: MemoryMonitor;

  beforeEach(() => {
    monitor = new MemoryMonitor({
      minHeapAlertFloorMb: 128,
      heapWarningThreshold: 0.75,
      heapCriticalThreshold: 0.85,
      rssWarningThresholdMb: 1024,
      rssCriticalThresholdMb: 1536,
      alertCooldownMs: 300_000,
      consecutiveBreachesRequired: 2,
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  it("captures valid process memory snapshot with heap_size_limit and MB conversions", () => {
    const sample = monitor.captureSample();
    expect(sample.heapUsedMb).toBeGreaterThan(0);
    expect(sample.heapTotalMb).toBeGreaterThan(0);
    expect(sample.heapSizeLimitMb).toBeGreaterThan(0);
    expect(sample.rssMb).toBeGreaterThan(0);
    expect(sample.timestamp).toBeGreaterThan(0);
  });

  it("prevents false-positive alerts when heapUsed/heapTotal is high but heap_size_limit utilization is low", () => {
    const warnSpy = vi.spyOn(logger, "warn");
    const errorSpy = vi.spyOn(logger, "error");

    // Scenario: Node.js has allocated 40MB heapTotal, and 35MB is used (87.5% of heapTotal!).
    // Under the old flawed logic, this triggered CRITICAL alerts every 30s!
    // But heap_size_limit is 4096MB (true utilization = 35 / 4096 = 0.85%).
    const sample = makeSample({
      heapUsedMb: 35,
      heapTotalMb: 40,
      heapSizeLimitMb: 4096,
      rssMb: 90,
    });

    // Run multiple ticks
    monitor.tick(sample);
    monitor.tick(sample);
    monitor.tick(sample);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    const analysis = monitor.getAnalysis();
    expect(analysis.heapToTotalRatio).toBe(0.875);
    expect(analysis.heapUtilizationRatio).toBeLessThan(0.01);
    expect(analysis.isLeakingSuspected).toBe(false);
    expect(monitor.getAlertState().lastAlertLevel).toBe("NONE");
  });

  it("differentiates normal GC sawtooth reclamation from memory leaks", () => {
    const baseTime = Date.now();
    // Simulate memory rising then dropping after garbage collection
    const samples: MemorySample[] = [
      makeSample({ timestamp: baseTime, heapUsedMb: 100 }),
      makeSample({ timestamp: baseTime + 60_000, heapUsedMb: 130 }),
      makeSample({ timestamp: baseTime + 120_000, heapUsedMb: 150 }),
      makeSample({ timestamp: baseTime + 180_000, heapUsedMb: 95 }), // GC dropped 55MB!
      makeSample({ timestamp: baseTime + 240_000, heapUsedMb: 110 }),
    ];

    const trend = monitor.calculateGrowthTrend(samples);
    expect(trend.trend).toBe("RECLAIMING");
    expect(trend.isSustainedGrowth).toBe(false);
  });

  it("identifies sustained un-reclaimed growth as a suspected leak", () => {
    const baseTime = Date.now();
    // Simulate continuous, monotonic growth over 6 minutes without GC reclamation
    const samples: MemorySample[] = [
      makeSample({ timestamp: baseTime, heapUsedMb: 150 }),
      makeSample({ timestamp: baseTime + 60_000, heapUsedMb: 170 }),
      makeSample({ timestamp: baseTime + 120_000, heapUsedMb: 190 }),
      makeSample({ timestamp: baseTime + 180_000, heapUsedMb: 215 }),
      makeSample({ timestamp: baseTime + 240_000, heapUsedMb: 235 }),
      makeSample({ timestamp: baseTime + 300_000, heapUsedMb: 260 }),
      makeSample({ timestamp: baseTime + 360_000, heapUsedMb: 285 }),
    ];

    const trend = monitor.calculateGrowthTrend(samples);
    expect(trend.trend).toBe("LEAKING_SUSPECTED");
    expect(trend.growthRateMbPerMin).toBeGreaterThan(5.0);
    expect(trend.netDeltaMb).toBe(135);
  });

  it("filters transient memory spikes and requires sustained consecutive breaches before alerting", () => {
    const warnSpy = vi.spyOn(logger, "warn");

    // Single transient spike (e.g. large file buffer or payload)
    const spikeSample = makeSample({
      heapUsedMb: 3200, // 3200 / 4096 = 78.1% (exceeds warning threshold 75%)
      heapTotalMb: 3500,
      heapSizeLimitMb: 4096,
    });

    // Tick 1: first breach detected, but debounced because consecutiveBreachesRequired = 2
    monitor.tick(spikeSample);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(monitor.getAlertState().consecutiveBreaches).toBe(1);

    // Tick 2: memory returns to normal
    const normalSample = makeSample({
      heapUsedMb: 200,
      heapTotalMb: 300,
      heapSizeLimitMb: 4096,
    });
    monitor.tick(normalSample);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(monitor.getAlertState().consecutiveBreaches).toBe(0);
  });

  it("fires alert when breach is sustained across consecutive ticks", () => {
    const warnSpy = vi.spyOn(logger, "warn");

    const highSample = makeSample({
      heapUsedMb: 3200, // 78.1% of heap_size_limit (above warning 75%)
      heapTotalMb: 3500,
      heapSizeLimitMb: 4096,
    });

    // Tick 1: breach 1 (debounced)
    monitor.tick(highSample);
    expect(warnSpy).not.toHaveBeenCalled();

    // Tick 2: sustained breach (fires alert!)
    monitor.tick(highSample);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(monitor.getAlertState().lastAlertLevel).toBe("WARNING");
  });

  it("suppresses repeated alerts within the cooldown period to eliminate 30-second log spam", () => {
    const warnSpy = vi.spyOn(logger, "warn");

    const highSample = makeSample({
      heapUsedMb: 3200, // Warning level
      heapTotalMb: 3500,
      heapSizeLimitMb: 4096,
    });

    // Ticks 1 & 2: establish sustained breach and fire initial alert
    monitor.tick(highSample);
    monitor.tick(highSample);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Ticks 3, 4, 5 (e.g. 30s intervals within 5-min cooldown): MUST be suppressed!
    monitor.tick(highSample);
    monitor.tick(highSample);
    monitor.tick(highSample);

    expect(warnSpy).toHaveBeenCalledTimes(1); // Still 1! Zero spam!
    expect(monitor.getAlertState().suppressionCount).toBe(3);
  });

  it("bypasses cooldown when alert escalates from WARNING to CRITICAL", () => {
    const warnSpy = vi.spyOn(logger, "warn");
    const errorSpy = vi.spyOn(logger, "error");

    const warningSample = makeSample({
      heapUsedMb: 3200, // 78.1% (Warning)
      heapTotalMb: 3500,
      heapSizeLimitMb: 4096,
    });

    // Establish warning alert
    monitor.tick(warningSample);
    monitor.tick(warningSample);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Now memory jumps to CRITICAL (e.g. 3800 / 4096 = 92.7% or RSS > 1536MB)
    const criticalSample = makeSample({
      heapUsedMb: 3800,
      heapTotalMb: 3900,
      heapSizeLimitMb: 4096,
      rssMb: 1600, // Exceeds RSS critical limit 1536MB
    });

    monitor.tick(criticalSample);
    monitor.tick(criticalSample);

    // Severity escalation fires immediately despite the active warning cooldown
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(monitor.getAlertState().lastAlertLevel).toBe("CRITICAL");
  });

  it("logs recovery and clears alert state when memory returns to normal", () => {
    const infoSpy = vi.spyOn(logger, "info");

    const highSample = makeSample({
      heapUsedMb: 3200,
      heapTotalMb: 3500,
      heapSizeLimitMb: 4096,
    });

    monitor.tick(highSample);
    monitor.tick(highSample);
    expect(monitor.getAlertState().lastAlertLevel).toBe("WARNING");

    // Memory normalizes
    const normalSample = makeSample({
      heapUsedMb: 150,
      heapTotalMb: 200,
      heapSizeLimitMb: 4096,
    });

    monitor.tick(normalSample);
    monitor.tick(normalSample); // Second normal tick confirms resolution hysteresis

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Memory pressure cleared"),
        module: "MEMORY",
      }),
    );
    expect(monitor.getAlertState().lastAlertLevel).toBe("NONE");
  });

  it("resets baseline and sample history cleanly", () => {
    monitor.tick();
    monitor.tick();
    monitor.resetBaseline();

    const analysis = monitor.getAnalysis();
    expect(analysis.samplesCount).toBe(1);
    expect(analysis.deltaMb).toBe(0);
  });
});
