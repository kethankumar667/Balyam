import { describe, it, expect, beforeEach } from "vitest";
import { MetricsCollector } from "../MetricsCollector.js";
import { metricsRegistry } from "../MetricsRegistry.js";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    metricsRegistry.reset();
    collector = new MetricsCollector();
  });

  it("captures room lifecycle metrics", () => {
    collector.onRoomCreated("ludo");
    collector.onRoomCreated("rummy");
    collector.onRoomAbandoned("ludo");
    collector.onRoomClosed("ludo");

    expect(metricsRegistry.getCounter("rooms.created_total")).toBe(2);
    expect(metricsRegistry.getCounter("rooms.by_game.ludo.created_total")).toBe(1);
    expect(metricsRegistry.getCounter("rooms.abandoned_total")).toBe(1);
    expect(metricsRegistry.getCounter("rooms.closed_total")).toBe(1);
  });

  it("captures recovery metrics and seat reclaim metrics", () => {
    collector.onRecoveryAttempt("ROOM1");
    collector.onRecoverySuccess("ROOM1", 250);
    collector.onRecoveryFailure("ROOM2", "timeout");
    collector.onSeatReclaim(true);
    collector.onSeatReclaim(false);

    expect(metricsRegistry.getCounter("recovery.attempts_total")).toBe(1);
    expect(metricsRegistry.getCounter("recovery.success_total")).toBe(1);
    expect(metricsRegistry.getCounter("recovery.failure_total")).toBe(1);
    expect(metricsRegistry.getCounter("recovery.reclaim_success_total")).toBe(1);
    expect(metricsRegistry.getCounter("recovery.reclaim_failure_total")).toBe(1);

    const hist = metricsRegistry.getHistogramSnapshot("recovery.duration_ms");
    expect(hist.count).toBe(1);
    expect(hist.avg).toBe(250);
  });

  it("captures per-game gameplay metrics and move processing durations", () => {
    collector.onMatchStarted("chess", 2);
    collector.onMoveProcessed("chess", "move", 15);
    collector.onMatchFinished("chess", 60_000);

    expect(metricsRegistry.getCounter("game.chess.matches_started_total")).toBe(1);
    expect(metricsRegistry.getCounter("game.chess.moves_total")).toBe(1);
    expect(metricsRegistry.getCounter("game.chess.matches_finished_total")).toBe(1);

    const matchHist = metricsRegistry.getHistogramSnapshot("game.chess.duration_ms");
    expect(matchHist.count).toBe(1);
    expect(matchHist.avg).toBe(60_000);
  });

  it("captures voice join, leave, active sessions, and failure metrics", () => {
    collector.onVoiceJoin();
    collector.onVoiceJoin();
    expect(metricsRegistry.getGauge("voice.active_sessions")).toBe(2);

    collector.onVoiceLeave();
    expect(metricsRegistry.getGauge("voice.active_sessions")).toBe(1);

    collector.onVoiceFailure("ice_failed");
    expect(metricsRegistry.getCounter("voice.failure_total")).toBe(1);
  });
});
