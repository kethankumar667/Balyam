import { describe, it, expect, beforeEach } from "vitest";
import { TelemetryAggregator } from "../TelemetryAggregator.js";
import { metricsRegistry } from "../MetricsRegistry.js";

describe("TelemetryAggregator", () => {
  let aggregator: TelemetryAggregator;

  beforeEach(() => {
    metricsRegistry.reset();
    aggregator = new TelemetryAggregator();
  });

  it("produces structured platform snapshot with recovery and realtime rates", () => {
    metricsRegistry.increment("rooms.created_total", 5);
    metricsRegistry.increment("recovery.attempts_total", 4);
    metricsRegistry.increment("recovery.success_total", 4);
    metricsRegistry.increment("realtime.reconnect_attempt_total", 10);
    metricsRegistry.increment("realtime.reconnect_success_total", 10);

    const snapshot = aggregator.getSnapshot();
    expect(snapshot.rooms.createdTotal).toBe(5);
    expect(snapshot.recovery.successRate).toBe(100);
    expect(snapshot.realtime.reconnectSuccessRate).toBe(100);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  it("computes per-game completion rates, abandon rates, and durations", () => {
    // Ludo: 10 started, 8 finished, 2 abandoned
    metricsRegistry.increment("game.ludo.matches_started_total", 10);
    metricsRegistry.increment("game.ludo.matches_finished_total", 8);
    metricsRegistry.increment("game.ludo.abandoned_total", 2);
    metricsRegistry.recordHistogram("game.ludo.duration_ms", 120_000);
    metricsRegistry.increment("game.ludo.moves_total", 150);

    const games = aggregator.getGamesTelemetry();
    const ludo = games.find((g) => g.game === "ludo");

    expect(ludo).toBeDefined();
    expect(ludo?.matchesStarted).toBe(10);
    expect(ludo?.matchesFinished).toBe(8);
    expect(ludo?.matchesAbandoned).toBe(2);
    expect(ludo?.completionRate).toBe(80);
    expect(ludo?.abandonRate).toBe(20);
    expect(ludo?.avgDurationSec).toBe(120);
    expect(ludo?.totalMoves).toBe(150);
  });
});
