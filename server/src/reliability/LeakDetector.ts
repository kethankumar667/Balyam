import { serverResourceTracker } from "./ResourceTracker.js";
import { memoryMonitor } from "./MemoryMonitor.js";
import { serverLifecycleRegistry } from "./LifecycleRegistry.js";
import { serverEventStore } from "../events/ServerEventStore.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { Server } from "socket.io";

export interface LeakDiagnosticItem {
  severity: "low" | "medium" | "high" | "critical";
  category: "socket" | "timer" | "room" | "memory" | "webrtc" | "listener";
  message: string;
  count: number;
  details?: Record<string, unknown>;
}

export interface LeakDiagnosticsReport {
  timestamp: number;
  healthy: boolean;
  score: number; // 0..100
  items: LeakDiagnosticItem[];
  resourceCounts: Record<string, number>;
  memory: ReturnType<typeof memoryMonitor.getAnalysis>;
}

/**
 * Server-side Leak Detection Engine for BHALYAM.
 */
export class LeakDetector {
  /**
   * Runs an end-to-end diagnostic audit of active server resources.
   */
  public runDiagnostics(roomManager?: RoomManager, io?: Server): LeakDiagnosticsReport {
    const items: LeakDiagnosticItem[] = [];
    const now = Date.now();

    // 1. Audit Tracked Resources & Dangling Timers
    const audit = serverResourceTracker.runAudit();
    if (audit.danglingTimers.length > 0) {
      items.push({
        severity: "high",
        category: "timer",
        message: `Found ${audit.danglingTimers.length} dangling timers exceeding 1h lifespan`,
        count: audit.danglingTimers.length,
        details: { timers: audit.danglingTimers.slice(0, 5) },
      });
    }

    // 2. Audit Sockets vs Room Mappings
    if (io && roomManager) {
      const totalSockets = io.engine.clientsCount;
      const roomCounts = roomManager.getOperationalStats();

      // If there are many sockets connected with 0 rooms for prolonged time
      if (totalSockets > 50 && roomCounts.totalRooms === 0) {
        items.push({
          severity: "medium",
          category: "socket",
          message: `Unusually high unseated socket count: ${totalSockets} sockets with 0 active rooms`,
          count: totalSockets,
        });
      }
    }

    // 3. Audit Memory Growth
    const memory = memoryMonitor.getAnalysis();
    if (memory.isLeakingSuspected) {
      items.push({
        severity: "critical",
        category: "memory",
        message: `Suspected memory leak: heap growing at ${memory.growthRateMbPerMin} MB/min`,
        count: Math.round(memory.deltaMb),
        details: {
          currentMb: memory.current.heapUsedMb,
          baselineMb: memory.baseline.heapUsedMb,
          growthRateMbPerMin: memory.growthRateMbPerMin,
        },
      });
    } else if (memory.heapUsageRatio > 0.85) {
      items.push({
        severity: "high",
        category: "memory",
        message: `Heap usage high: ${Math.round(memory.heapUsageRatio * 100)}% of total allocation`,
        count: memory.current.heapUsedMb,
      });
    }

    // 4. Audit Lifecycle & Event Store Alignment
    const eventStats = serverEventStore.getStats();
    const lifecycleStats = serverLifecycleRegistry.getStats();
    if (eventStats.totalRooms > lifecycleStats.totalRooms + 50) {
      items.push({
        severity: "low",
        category: "room",
        message: `Event store has ${eventStats.totalRooms} rooms while active registry has ${lifecycleStats.totalRooms}`,
        count: eventStats.totalRooms - lifecycleStats.totalRooms,
      });
    }

    // Compute Health Score
    let deduction = 0;
    for (const it of items) {
      if (it.severity === "critical") deduction += 40;
      else if (it.severity === "high") deduction += 20;
      else if (it.severity === "medium") deduction += 10;
      else if (it.severity === "low") deduction += 5;
    }
    const score = Math.max(0, 100 - deduction);

    return {
      timestamp: now,
      healthy: score >= 80,
      score,
      items,
      resourceCounts: {
        ...audit.byType,
        totalEventRooms: eventStats.totalRooms,
        totalEvents: eventStats.totalEvents,
        activeLifecycleRooms: lifecycleStats.totalRooms,
        activeLifecycleTimers: lifecycleStats.activeTimers,
      },
      memory,
    };
  }
}

export const leakDetector = new LeakDetector();
