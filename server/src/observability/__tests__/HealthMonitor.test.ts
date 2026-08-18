import { describe, it, expect, beforeEach } from "vitest";
import { HealthMonitor } from "../HealthMonitor.js";
import { metricsRegistry } from "../MetricsRegistry.js";
import { memoryMonitor } from "../../reliability/MemoryMonitor.js";

describe("HealthMonitor", () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    metricsRegistry.reset();
    monitor = new HealthMonitor();
  });

  it("evaluates healthy state under baseline conditions", () => {
    const report = monitor.evaluate();
    expect(report.status).toBe("HEALTHY");
    expect(report.activeAlerts.length).toBe(0);
    expect(report.checks.length).toBeGreaterThan(0);
  });

  it("flags CRITICAL status upon excessive recovery failure rates", () => {
    // 10 recovery attempts with 5 failures (50% failure rate)
    for (let i = 0; i < 10; i++) {
      metricsRegistry.increment("recovery.attempts_total");
      if (i < 5) {
        metricsRegistry.increment("recovery.failure_total");
      } else {
        metricsRegistry.increment("recovery.success_total");
      }
    }

    const report = monitor.evaluate();
    expect(report.status).toBe("CRITICAL");
    expect(report.activeAlerts).toContain("High Recovery Failure Rate");
  });

  it("flags WARNING when latency budget target is exceeded", () => {
    for (let i = 0; i < 50; i++) {
      metricsRegistry.recordHistogram("perf.room_create", 80); // Target is 50ms, Critical is 150ms
    }

    const report = monitor.evaluate();
    expect(report.status).toBe("WARNING");
    expect(report.activeAlerts).toContain("Elevated Operation Latency");
  });
});
