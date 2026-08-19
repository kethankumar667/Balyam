import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryMonitor } from "../MemoryMonitor.js";

describe("MemoryMonitor", () => {
  let monitor: MemoryMonitor;

  beforeEach(() => {
    monitor = new MemoryMonitor();
  });

  afterEach(() => {
    monitor.stop();
  });

  it("captures valid process memory snapshot with MB conversions", () => {
    const sample = monitor.captureSample();
    expect(sample.heapUsedMb).toBeGreaterThan(0);
    expect(sample.heapTotalMb).toBeGreaterThan(0);
    expect(sample.rssMb).toBeGreaterThan(0);
    expect(sample.timestamp).toBeGreaterThan(0);
  });

  it("computes analysis report with baseline delta and growth rate", () => {
    monitor.tick();
    const analysis = monitor.getAnalysis();

    expect(analysis.samplesCount).toBeGreaterThanOrEqual(1);
    expect(typeof analysis.deltaMb).toBe("number");
    expect(typeof analysis.growthRateMbPerMin).toBe("number");
    expect(typeof analysis.isLeakingSuspected).toBe("boolean");
    expect(analysis.history.length).toBeGreaterThanOrEqual(1);
  });

  it("resets baseline correctly", () => {
    monitor.tick();
    monitor.tick();
    monitor.resetBaseline();

    const analysis = monitor.getAnalysis();
    expect(analysis.samplesCount).toBe(1);
    expect(analysis.deltaMb).toBe(0);
  });
});
