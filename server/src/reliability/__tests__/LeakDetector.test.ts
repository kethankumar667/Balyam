import { describe, it, expect, beforeEach } from "vitest";
import { LeakDetector } from "../LeakDetector.js";
import { serverResourceTracker } from "../ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";
import { serverLifecycleRegistry } from "../LifecycleRegistry.js";

describe("LeakDetector", () => {
  let detector: LeakDetector;

  beforeEach(() => {
    serverResourceTracker.reset();
    serverEventStore.reset();
    serverLifecycleRegistry.reset();
    detector = new LeakDetector();
  });

  it("reports healthy system state under normal operations", () => {
    const report = detector.runDiagnostics();
    expect(report.healthy).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.items.length).toBe(0);
  });

  it("flags dangling timers as high severity leaks", () => {
    // Add a resource created 2 hours ago
    serverResourceTracker.register(
      "timer",
      "tmr_old",
      "test_turn",
      "ROOM_OLD"
    );
    // Artificially change createdAt
    (serverResourceTracker as any).resources.get("timer:tmr_old").createdAt = Date.now() - 7_200_000;

    const report = detector.runDiagnostics();
    expect(report.items.some((i) => i.category === "timer" && i.severity === "high")).toBe(true);
    expect(report.score).toBeLessThan(100);
  });
});
