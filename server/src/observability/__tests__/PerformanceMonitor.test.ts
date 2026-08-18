import { describe, it, expect, beforeEach } from "vitest";
import { PerformanceMonitor, PERFORMANCE_BUDGETS } from "../PerformanceMonitor.js";
import { metricsRegistry } from "../MetricsRegistry.js";

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    metricsRegistry.reset();
    monitor = new PerformanceMonitor();
  });

  it("records execution durations and measures blocks", async () => {
    await monitor.measure("room_create", async () => {
      // simulate quick action
      return 123;
    });

    const snap = metricsRegistry.getHistogramSnapshot("perf.room_create");
    expect(snap.count).toBe(1);
    expect(snap.avg).toBeGreaterThanOrEqual(0);
  });

  it("detects performance budget violations when p95 exceeds budget limits", () => {
    // Inject 100 samples with 300ms duration (budget is 50ms)
    for (let i = 0; i < 100; i++) {
      monitor.recordDuration("room_create", 300);
    }

    const report = monitor.getReport();
    expect(report.operations["room_create"]?.budgetBreached).toBe(true);
    expect(report.operations["room_create"]?.status).toBe("CRITICAL");
    expect(report.totalViolations).toBeGreaterThan(0);
  });

  it("passes when p95 stays below target budget", () => {
    for (let i = 0; i < 100; i++) {
      monitor.recordDuration("move_processing", 10); // target budget is 25ms
    }

    const report = monitor.getReport();
    expect(report.operations["move_processing"]?.budgetBreached).toBe(false);
    expect(report.operations["move_processing"]?.status).toBe("PASS");
  });
});
