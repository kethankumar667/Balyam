import { metricsRegistry, type HistogramSnapshot } from "./MetricsRegistry.js";

export interface PerformanceBudget {
  targetP95Ms: number;
  criticalP95Ms: number;
}

export const PERFORMANCE_BUDGETS: Record<string, PerformanceBudget> = {
  room_create: { targetP95Ms: 50, criticalP95Ms: 150 },
  room_join: { targetP95Ms: 50, criticalP95Ms: 150 },
  move_processing: { targetP95Ms: 25, criticalP95Ms: 100 },
  turn_processing: { targetP95Ms: 50, criticalP95Ms: 200 },
  recovery_duration: { targetP95Ms: 2000, criticalP95Ms: 5000 },
  voice_join_duration: { targetP95Ms: 1000, criticalP95Ms: 3000 },
};

export interface PerformanceReport {
  timestamp: number;
  operations: Record<
    string,
    {
      snapshot: HistogramSnapshot;
      budget: PerformanceBudget | null;
      budgetBreached: boolean;
      status: "PASS" | "WARN" | "CRITICAL";
    }
  >;
  totalViolations: number;
}

/**
 * Performance & Latency Monitor for BHALYAM Realtime Operations.
 */
export class PerformanceMonitor {
  /**
   * Records execution duration for a named operation.
   */
  public recordDuration(operation: string, durationMs: number): void {
    metricsRegistry.recordHistogram(`perf.${operation}`, durationMs);
  }

  /**
   * Measures synchronous or asynchronous block execution.
   */
  public async measure<T>(operation: string, fn: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordDuration(operation, duration);
    }
  }

  /**
   * Generates a performance analysis report comparing against performance budgets.
   */
  public getReport(): PerformanceReport {
    const operations: PerformanceReport["operations"] = {};
    let totalViolations = 0;

    const opKeys = [
      "room_create",
      "room_join",
      "move_processing",
      "turn_processing",
      "recovery_duration",
      "voice_join_duration",
    ];

    for (const key of opKeys) {
      const snapshot = metricsRegistry.getHistogramSnapshot(`perf.${key}`);
      const budget = PERFORMANCE_BUDGETS[key] ?? null;

      let status: "PASS" | "WARN" | "CRITICAL" = "PASS";
      let budgetBreached = false;

      if (budget && snapshot.count > 0) {
        if (snapshot.p95 > budget.criticalP95Ms) {
          status = "CRITICAL";
          budgetBreached = true;
          totalViolations++;
        } else if (snapshot.p95 > budget.targetP95Ms) {
          status = "WARN";
          budgetBreached = true;
          totalViolations++;
        }
      }

      operations[key] = {
        snapshot,
        budget,
        budgetBreached,
        status,
      };
    }

    return {
      timestamp: Date.now(),
      operations,
      totalViolations,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
