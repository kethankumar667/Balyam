import { metricsRegistry } from "./MetricsRegistry.js";
import { performanceMonitor } from "./PerformanceMonitor.js";
import { memoryMonitor } from "../reliability/MemoryMonitor.js";
import { serverResourceTracker } from "../reliability/ResourceTracker.js";
import { serverLifecycleRegistry } from "../reliability/LifecycleRegistry.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { GameKind } from "@shared/types.js";

export interface GameTelemetrySummary {
  game: GameKind;
  matchesStarted: number;
  matchesFinished: number;
  matchesAbandoned: number;
  completionRate: number; // 0..100%
  abandonRate: number; // 0..100%
  avgDurationSec: number;
  p95DurationSec: number;
  totalMoves: number;
}

export interface PlatformTelemetrySnapshot {
  timestamp: number;
  uptimeSec: number;
  rooms: {
    active: number;
    createdTotal: number;
    closedTotal: number;
    abandonedTotal: number;
    byLifecycle: Record<string, number>;
  };
  recovery: {
    attemptsTotal: number;
    successTotal: number;
    failureTotal: number;
    successRate: number; // 0..100%
    reclaimSuccessTotal: number;
    reclaimFailureTotal: number;
    avgDurationMs: number;
    p95DurationMs: number;
  };
  realtime: {
    connectedSockets: number;
    connectTotal: number;
    disconnectTotal: number;
    reconnectTotal: number;
    reconnectSuccessTotal: number;
    reconnectSuccessRate: number; // 0..100%
  };
  voice: {
    activeSessions: number;
    joinTotal: number;
    leaveTotal: number;
    failureTotal: number;
  };
  performance: ReturnType<typeof performanceMonitor.getReport>;
  memory: ReturnType<typeof memoryMonitor.getAnalysis>;
}

export class TelemetryAggregator {
  public getSnapshot(roomManager?: RoomManager, startTime = Date.now()): PlatformTelemetrySnapshot {
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const roomStats = roomManager ? roomManager.getOperationalStats() : {
      totalRooms: 0,
      recoveringRooms: 0,
      pausedRooms: 0,
      inProgressRooms: 0,
      lobbyRooms: 0,
      completedRooms: 0,
    };

    // Recovery calculations
    const recAttempts = metricsRegistry.getCounter("recovery.attempts_total");
    const recSuccess = metricsRegistry.getCounter("recovery.success_total");
    const recFailure = metricsRegistry.getCounter("recovery.failure_total");
    const recHist = metricsRegistry.getHistogramSnapshot("recovery.duration_ms");
    const recSuccessRate = recAttempts > 0 ? Math.round((recSuccess / recAttempts) * 100) : 100;

    // Realtime calculations
    const sockConnect = metricsRegistry.getCounter("realtime.socket_connect_total");
    const sockDisconnect = metricsRegistry.getCounter("realtime.socket_disconnect_total");
    const reconAttempts = metricsRegistry.getCounter("realtime.reconnect_attempt_total");
    const reconSuccess = metricsRegistry.getCounter("realtime.reconnect_success_total");
    const reconSuccessRate = reconAttempts > 0 ? Math.round((reconSuccess / reconAttempts) * 100) : 100;

    return {
      timestamp: Date.now(),
      uptimeSec,
      rooms: {
        active: roomStats.totalRooms,
        createdTotal: metricsRegistry.getCounter("rooms.created_total"),
        closedTotal: metricsRegistry.getCounter("rooms.closed_total"),
        abandonedTotal: metricsRegistry.getCounter("rooms.abandoned_total"),
        byLifecycle: {
          IN_PROGRESS: roomStats.inProgressRooms,
          RECOVERING: roomStats.recoveringRooms,
          PAUSED: roomStats.pausedRooms,
          LOBBY: roomStats.lobbyRooms,
          COMPLETED: roomStats.completedRooms,
        },
      },
      recovery: {
        attemptsTotal: recAttempts,
        successTotal: recSuccess,
        failureTotal: recFailure,
        successRate: recSuccessRate,
        reclaimSuccessTotal: metricsRegistry.getCounter("recovery.reclaim_success_total"),
        reclaimFailureTotal: metricsRegistry.getCounter("recovery.reclaim_failure_total"),
        avgDurationMs: recHist.avg,
        p95DurationMs: recHist.p95,
      },
      realtime: {
        connectedSockets: serverResourceTracker.getCountByType("socket"),
        connectTotal: sockConnect,
        disconnectTotal: sockDisconnect,
        reconnectTotal: reconAttempts,
        reconnectSuccessTotal: reconSuccess,
        reconnectSuccessRate: reconSuccessRate,
      },
      voice: {
        activeSessions: metricsRegistry.getGauge("voice.active_sessions"),
        joinTotal: metricsRegistry.getCounter("voice.join_total"),
        leaveTotal: metricsRegistry.getCounter("voice.leave_total"),
        failureTotal: metricsRegistry.getCounter("voice.failure_total"),
      },
      performance: performanceMonitor.getReport(),
      memory: memoryMonitor.getAnalysis(),
    };
  }

  public getGamesTelemetry(): GameTelemetrySummary[] {
    const games: GameKind[] = [
      "ludo",
      "uno",
      "rummy",
      "handcricket",
      "snl",
      "rps",
      "wordbuilding",
      "dotsboxes",
      "stargame",
      "bingo",
      "namesplaceanimal",
      "tambola",
      "carrom",
      "chess",
      "snake",
      "spacewar",
      "blockblast",
    ];

    return games.map((game) => {
      const started = metricsRegistry.getCounter(`game.${game}.matches_started_total`);
      const finished = metricsRegistry.getCounter(`game.${game}.matches_finished_total`);
      const abandoned = metricsRegistry.getCounter(`game.${game}.abandoned_total`);
      const totalDecided = finished + abandoned;
      const completionRate = started > 0 ? Math.round((finished / started) * 100) : 100;
      const abandonRate = totalDecided > 0 ? Math.round((abandoned / totalDecided) * 100) : 0;
      const hist = metricsRegistry.getHistogramSnapshot(`game.${game}.duration_ms`);
      const totalMoves = metricsRegistry.getCounter(`game.${game}.moves_total`);

      return {
        game,
        matchesStarted: started,
        matchesFinished: finished,
        matchesAbandoned: abandoned,
        completionRate,
        abandonRate,
        avgDurationSec: Math.round(hist.avg / 1000),
        p95DurationSec: Math.round(hist.p95 / 1000),
        totalMoves,
      };
    });
  }
}

export const telemetryAggregator = new TelemetryAggregator();
