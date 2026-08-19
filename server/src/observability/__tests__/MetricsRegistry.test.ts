import { describe, it, expect, beforeEach } from "vitest";
import { MetricsRegistry, Histogram } from "../MetricsRegistry.js";

describe("MetricsRegistry", () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it("handles monotonic counters accurately", () => {
    expect(registry.getCounter("test_counter")).toBe(0);
    registry.increment("test_counter");
    registry.increment("test_counter", 5);
    expect(registry.getCounter("test_counter")).toBe(6);
  });

  it("handles dynamic gauges accurately", () => {
    expect(registry.getGauge("active_gauge")).toBe(0);
    registry.setGauge("active_gauge", 42);
    expect(registry.getGauge("active_gauge")).toBe(42);
    registry.setGauge("active_gauge", 10);
    expect(registry.getGauge("active_gauge")).toBe(10);
  });

  it("calculates histogram percentiles (p50, p95, p99), min, max, avg", () => {
    for (let i = 1; i <= 100; i++) {
      registry.recordHistogram("latencies", i);
    }

    const snap = registry.getHistogramSnapshot("latencies");
    expect(snap.count).toBe(100);
    expect(snap.min).toBe(1);
    expect(snap.max).toBe(100);
    expect(snap.avg).toBe(50.5);
    expect(snap.p50).toBe(51);
    expect(snap.p95).toBe(96);
    expect(snap.p99).toBe(100);
  });

  it("produces full metric dumps and handles reset", () => {
    registry.increment("c1", 10);
    registry.setGauge("g1", 20);
    registry.recordHistogram("h1", 30);

    const dump = registry.dump();
    expect(dump.counters["c1"]).toBe(10);
    expect(dump.gauges["g1"]).toBe(20);
    expect(dump.histograms["h1"]?.count).toBe(1);

    registry.reset();
    expect(registry.getCounter("c1")).toBe(0);
    expect(registry.getGauge("g1")).toBe(0);
    expect(registry.getHistogramSnapshot("h1").count).toBe(0);
  });
});
