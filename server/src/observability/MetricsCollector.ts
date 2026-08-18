import { metricsRegistry } from "./MetricsRegistry.js";
import { performanceMonitor } from "./PerformanceMonitor.js";
import type { GameKind } from "@shared/types.js";

/**
 * Central Metrics Collector for BHALYAM Platform Operations.
 */
export class MetricsCollector {
  // --- Room Metrics ---
  public onRoomCreated(game: GameKind): void {
    metricsRegistry.increment("rooms.created_total");
    metricsRegistry.increment(`rooms.by_game.${game}.created_total`);
  }

  public onRoomClosed(game: GameKind): void {
    metricsRegistry.increment("rooms.closed_total");
  }

  public onRoomAbandoned(game: GameKind): void {
    metricsRegistry.increment("rooms.abandoned_total");
    metricsRegistry.increment(`game.${game}.abandoned_total`);
  }

  public onRoomRecovered(game: GameKind): void {
    metricsRegistry.increment("rooms.recovered_total");
  }

  // --- Recovery Metrics ---
  public onRecoveryAttempt(roomId: string): void {
    metricsRegistry.increment("recovery.attempts_total");
  }

  public onRecoverySuccess(roomId: string, durationMs: number): void {
    metricsRegistry.increment("recovery.success_total");
    metricsRegistry.recordHistogram("recovery.duration_ms", durationMs);
    performanceMonitor.recordDuration("recovery_duration", durationMs);
  }

  public onRecoveryFailure(roomId: string, reason?: string): void {
    metricsRegistry.increment("recovery.failure_total");
  }

  public onSeatReclaim(success: boolean): void {
    if (success) {
      metricsRegistry.increment("recovery.reclaim_success_total");
    } else {
      metricsRegistry.increment("recovery.reclaim_failure_total");
    }
  }

  // --- Realtime & Socket Metrics ---
  public onSocketConnect(): void {
    metricsRegistry.increment("realtime.socket_connect_total");
  }

  public onSocketDisconnect(): void {
    metricsRegistry.increment("realtime.socket_disconnect_total");
  }

  public onReconnectAttempt(): void {
    metricsRegistry.increment("realtime.reconnect_attempt_total");
  }

  public onReconnectSuccess(): void {
    metricsRegistry.increment("realtime.reconnect_success_total");
  }

  public onReconnectFailure(): void {
    metricsRegistry.increment("realtime.reconnect_failure_total");
  }

  // --- Gameplay Metrics ---
  public onMatchStarted(game: GameKind, playersCount: number): void {
    metricsRegistry.increment(`game.${game}.matches_started_total`);
    metricsRegistry.increment("game.all.matches_started_total");
  }

  public onMatchFinished(game: GameKind, durationMs: number): void {
    metricsRegistry.increment(`game.${game}.matches_finished_total`);
    metricsRegistry.increment("game.all.matches_finished_total");
    metricsRegistry.recordHistogram(`game.${game}.duration_ms`, durationMs);
    metricsRegistry.recordHistogram("game.all.duration_ms", durationMs);
  }

  public onMoveProcessed(game: GameKind, moveType: string, processingTimeMs: number): void {
    metricsRegistry.increment(`game.${game}.moves_total`);
    metricsRegistry.increment("game.all.moves_total");
    performanceMonitor.recordDuration("move_processing", processingTimeMs);
  }

  // --- Voice Metrics ---
  public onVoiceJoin(): void {
    metricsRegistry.increment("voice.join_total");
    const current = metricsRegistry.getGauge("voice.active_sessions");
    metricsRegistry.setGauge("voice.active_sessions", current + 1);
  }

  public onVoiceLeave(): void {
    metricsRegistry.increment("voice.leave_total");
    const current = metricsRegistry.getGauge("voice.active_sessions");
    metricsRegistry.setGauge("voice.active_sessions", Math.max(0, current - 1));
  }

  public onVoiceFailure(reason?: string): void {
    metricsRegistry.increment("voice.failure_total");
  }

  public reset(): void {
    metricsRegistry.reset();
  }
}

export const metricsCollector = new MetricsCollector();
