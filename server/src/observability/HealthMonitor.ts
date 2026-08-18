import { memoryMonitor } from "../reliability/MemoryMonitor.js";
import { performanceMonitor } from "./PerformanceMonitor.js";
import { metricsRegistry } from "./MetricsRegistry.js";
import { serverResourceTracker } from "../reliability/ResourceTracker.js";
import type { RoomManager } from "../rooms/RoomManager.js";

export type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  metrics?: Record<string, unknown>;
}

export interface PlatformHealthReport {
  status: HealthStatus;
  timestamp: number;
  uptimeSec: number;
  checks: HealthCheckResult[];
  activeAlerts: string[];
}

/**
 * Production Health Monitoring Engine for BHALYAM.
 */
export class HealthMonitor {
  public evaluate(roomManager?: RoomManager, startTime = Date.now()): PlatformHealthReport {
    const checks: HealthCheckResult[] = [];
    const activeAlerts: string[] = [];
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);

    // 1. Memory Health Check
    const memAnalysis = memoryMonitor.getAnalysis();
    if (memAnalysis.isLeakingSuspected || memAnalysis.heapUsageRatio > 0.90) {
      checks.push({
        name: "memory_growth",
        status: "CRITICAL",
        message: `Critical memory pressure: heap at ${Math.round(memAnalysis.heapUsageRatio * 100)}% (${memAnalysis.current.heapUsedMb}MB / ${memAnalysis.current.heapTotalMb}MB)`,
        metrics: { heapUsedMb: memAnalysis.current.heapUsedMb, ratio: memAnalysis.heapUsageRatio },
      });
      activeAlerts.push("Critical Heap Pressure");
    } else if (memAnalysis.heapUsageRatio > 0.80) {
      checks.push({
        name: "memory_growth",
        status: "WARNING",
        message: `High memory usage: heap at ${Math.round(memAnalysis.heapUsageRatio * 100)}%`,
        metrics: { heapUsedMb: memAnalysis.current.heapUsedMb, ratio: memAnalysis.heapUsageRatio },
      });
      activeAlerts.push("Elevated Heap Usage");
    } else {
      checks.push({
        name: "memory_growth",
        status: "HEALTHY",
        message: "Memory utilization within normal parameters",
        metrics: { heapUsedMb: memAnalysis.current.heapUsedMb, ratio: memAnalysis.heapUsageRatio },
      });
    }

    // 2. Recovery Health Check
    const recAttempts = metricsRegistry.getCounter("recovery.attempts_total");
    const recFailure = metricsRegistry.getCounter("recovery.failure_total");
    const recFailureRate = recAttempts > 0 ? (recFailure / recAttempts) * 100 : 0;

    if (recAttempts >= 5 && recFailureRate > 35) {
      checks.push({
        name: "recovery_resilience",
        status: "CRITICAL",
        message: `Excessive recovery failures: ${Math.round(recFailureRate)}% failure rate`,
        metrics: { attempts: recAttempts, failures: recFailure, failureRate: recFailureRate },
      });
      activeAlerts.push("High Recovery Failure Rate");
    } else if (recAttempts >= 5 && recFailureRate > 15) {
      checks.push({
        name: "recovery_resilience",
        status: "WARNING",
        message: `Elevated recovery failures: ${Math.round(recFailureRate)}% failure rate`,
        metrics: { attempts: recAttempts, failures: recFailure, failureRate: recFailureRate },
      });
      activeAlerts.push("Elevated Recovery Failures");
    } else {
      checks.push({
        name: "recovery_resilience",
        status: "HEALTHY",
        message: "Recovery framework healthy with high success rate",
        metrics: { attempts: recAttempts, failures: recFailure, failureRate: recFailureRate },
      });
    }

    // 3. Realtime Socket Reconnection Check
    const reconAttempts = metricsRegistry.getCounter("realtime.reconnect_attempt_total");
    const reconFailure = metricsRegistry.getCounter("realtime.reconnect_failure_total");
    const reconFailRate = reconAttempts > 0 ? (reconFailure / reconAttempts) * 100 : 0;

    if (reconAttempts >= 10 && reconFailRate > 25) {
      checks.push({
        name: "realtime_connectivity",
        status: "CRITICAL",
        message: `Socket reconnect failure rate critical: ${Math.round(reconFailRate)}%`,
        metrics: { reconnectAttempts: reconAttempts, failures: reconFailure },
      });
      activeAlerts.push("Socket Reconnect Degradation");
    } else if (reconAttempts >= 10 && reconFailRate > 10) {
      checks.push({
        name: "realtime_connectivity",
        status: "WARNING",
        message: `Socket reconnect failure rate elevated: ${Math.round(reconFailRate)}%`,
        metrics: { reconnectAttempts: reconAttempts, failures: reconFailure },
      });
    } else {
      checks.push({
        name: "realtime_connectivity",
        status: "HEALTHY",
        message: "Socket connection stability optimal",
      });
    }

    // 4. Performance Budgets Check
    const perfReport = performanceMonitor.getReport();
    if (perfReport.totalViolations > 0) {
      const hasCritical = Object.values(perfReport.operations).some((op) => op.status === "CRITICAL");
      checks.push({
        name: "latency_budgets",
        status: hasCritical ? "CRITICAL" : "WARNING",
        message: `Performance budget violations detected (${perfReport.totalViolations} ops exceeding target)`,
        metrics: { violations: perfReport.totalViolations },
      });
      activeAlerts.push(hasCritical ? "Critical Operation Latency" : "Elevated Operation Latency");
    } else {
      checks.push({
        name: "latency_budgets",
        status: "HEALTHY",
        message: "All operations within p95 latency budgets",
      });
    }

    // 5. Room State & Stuck Rooms Check
    if (roomManager) {
      const roomStats = roomManager.getOperationalStats();
      if (roomStats.totalRooms > 0 && roomStats.recoveringRooms > roomStats.totalRooms * 0.5) {
        checks.push({
          name: "stuck_rooms",
          status: "WARNING",
          message: `High proportion of rooms in recovery: ${roomStats.recoveringRooms} / ${roomStats.totalRooms}`,
          metrics: roomStats,
        });
        activeAlerts.push("High Recovering Room Density");
      } else {
        checks.push({
          name: "stuck_rooms",
          status: "HEALTHY",
          message: "Room lifecycle states operating normally",
          metrics: roomStats,
        });
      }
    }

    // Overall Status Computation
    let overallStatus: HealthStatus = "HEALTHY";
    if (checks.some((c) => c.status === "CRITICAL")) {
      overallStatus = "CRITICAL";
    } else if (checks.some((c) => c.status === "WARNING")) {
      overallStatus = "WARNING";
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      uptimeSec,
      checks,
      activeAlerts,
    };
  }
}

export const healthMonitor = new HealthMonitor();
