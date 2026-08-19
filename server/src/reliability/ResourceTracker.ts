import { SERVER_LIMITS } from "./ServerLimits.js";
import { logger } from "../lib/logger.js";

export type ResourceType = "socket" | "timer" | "interval" | "room" | "webrtc_session" | "engine";

export interface TrackedResource {
  id: string;
  type: ResourceType;
  tag: string;
  roomId?: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface ResourceAuditReport {
  timestamp: number;
  totalTracked: number;
  byType: Record<ResourceType, number>;
  danglingTimers: TrackedResource[];
  warnings: string[];
}

/**
 * Server-side Resource Tracker for monitoring lifecycle and preventing memory leaks.
 */
export class ServerResourceTracker {
  private resources: Map<string, TrackedResource> = new Map();
  private timersByRef: WeakMap<NodeJS.Timeout, string> = new WeakMap();

  /**
   * Registers a managed server resource.
   */
  public register(
    type: ResourceType,
    id: string,
    tag: string,
    roomId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const key = `${type}:${id}`;
    const resource: TrackedResource = {
      id,
      type,
      tag,
      roomId,
      createdAt: Date.now(),
      metadata,
    };
    this.resources.set(key, resource);

    // Warn if active rooms quota is exceeded
    if (type === "room" && this.getCountByType("room") > SERVER_LIMITS.MAX_ACTIVE_ROOMS) {
      logger.warn({
        message: `High active room count: ${this.getCountByType("room")} > ${SERVER_LIMITS.MAX_ACTIVE_ROOMS}`,
        module: "RELIABILITY",
      });
    }
  }

  /**
   * Unregisters a tracked resource upon its disposal.
   */
  public unregister(type: ResourceType, id: string): boolean {
    const key = `${type}:${id}`;
    return this.resources.delete(key);
  }

  /**
   * Registers a NodeJS Timer with source tracking.
   */
  public trackTimer(timer: NodeJS.Timeout, tag: string, roomId?: string): NodeJS.Timeout {
    const timerId = `tmr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.timersByRef.set(timer, timerId);
    this.register("timer", timerId, tag, roomId);
    return timer;
  }

  /**
   * Untracks a NodeJS Timer when cleared.
   */
  public untrackTimer(timer: NodeJS.Timeout): void {
    const timerId = this.timersByRef.get(timer);
    if (timerId) {
      this.unregister("timer", timerId);
    }
  }

  /**
   * Returns current active resource counts grouped by type.
   */
  public getCountByType(type: ResourceType): number {
    let count = 0;
    for (const r of this.resources.values()) {
      if (r.type === type) count++;
    }
    return count;
  }

  /**
   * Returns counts of all active resource categories.
   */
  public getActiveCounts(): Record<ResourceType, number> {
    const counts: Record<ResourceType, number> = {
      socket: 0,
      timer: 0,
      interval: 0,
      room: 0,
      webrtc_session: 0,
      engine: 0,
    };
    for (const r of this.resources.values()) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Scans for long-running dangling timers or zombie resources.
   */
  public runAudit(): ResourceAuditReport {
    const now = Date.now();
    const byType = this.getActiveCounts();
    const danglingTimers: TrackedResource[] = [];
    const warnings: string[] = [];

    for (const r of this.resources.values()) {
      if ((r.type === "timer" || r.type === "interval") && now - r.createdAt > SERVER_LIMITS.MAX_TIMER_DURATION_MS) {
        danglingTimers.push(r);
        warnings.push(`Dangling timer detected: id=${r.id}, tag=${r.tag}, roomId=${r.roomId}, age=${Math.round((now - r.createdAt) / 1000)}s`);
      }
    }

    return {
      timestamp: now,
      totalTracked: this.resources.size,
      byType,
      danglingTimers,
      warnings,
    };
  }

  /**
   * Resets all tracked resources (for test isolation).
   */
  public reset(): void {
    this.resources.clear();
  }
}

export const serverResourceTracker = new ServerResourceTracker();
