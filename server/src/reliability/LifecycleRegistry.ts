import { serverResourceTracker } from "./ResourceTracker.js";
import { serverEventStore } from "../events/ServerEventStore.js";
import { logger } from "../lib/logger.js";

export type TimerKind =
  | "cleanup"
  | "takeover"
  | "turn"
  | "simulation"
  | "rematch"
  | "rematch_start"
  | "bot_delay";

interface RoomResourceBundle {
  code: string;
  timers: Map<string, NodeJS.Timeout>;
  intervals: Map<string, NodeJS.Timeout>;
  createdAt: number;
}

/**
 * Server Lifecycle Registry.
 * Guarantees zero orphaned timers, simulation loops, or state bundles when rooms are torn down.
 */
export class ServerLifecycleRegistry {
  private bundles: Map<string, RoomResourceBundle> = new Map();

  /**
   * Registers a new room bundle.
   */
  public registerRoom(code: string): void {
    const normalized = code.trim().toUpperCase();
    if (this.bundles.has(normalized)) return;

    this.bundles.set(normalized, {
      code: normalized,
      timers: new Map(),
      intervals: new Map(),
      createdAt: Date.now(),
    });
    serverResourceTracker.register("room", normalized, "room_created", normalized);
  }

  /**
   * Binds a timer to a room's lifecycle.
   */
  public bindTimer(
    code: string,
    key: string,
    timer: NodeJS.Timeout,
    kind: TimerKind
  ): NodeJS.Timeout {
    const normalized = code.trim().toUpperCase();
    let bundle = this.bundles.get(normalized);
    if (!bundle) {
      this.registerRoom(normalized);
      bundle = this.bundles.get(normalized)!;
    }

    // If an existing timer was already assigned to this key, cancel it first to prevent leaks
    const existing = bundle.timers.get(key);
    if (existing) {
      clearTimeout(existing);
      serverResourceTracker.untrackTimer(existing);
    }

    bundle.timers.set(key, timer);
    serverResourceTracker.trackTimer(timer, `${kind}:${key}`, normalized);
    return timer;
  }

  /**
   * Unbinds and clears a specific timer.
   */
  public unbindTimer(code: string, key: string): void {
    const normalized = code.trim().toUpperCase();
    const bundle = this.bundles.get(normalized);
    if (!bundle) return;

    const timer = bundle.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      serverResourceTracker.untrackTimer(timer);
      bundle.timers.delete(key);
    }
  }

  /**
   * Binds an interval (e.g. simulation loop) to a room.
   */
  public bindInterval(code: string, key: string, interval: NodeJS.Timeout): NodeJS.Timeout {
    const normalized = code.trim().toUpperCase();
    let bundle = this.bundles.get(normalized);
    if (!bundle) {
      this.registerRoom(normalized);
      bundle = this.bundles.get(normalized)!;
    }

    const existing = bundle.intervals.get(key);
    if (existing) {
      clearInterval(existing);
      serverResourceTracker.untrackTimer(existing);
    }

    bundle.intervals.set(key, interval);
    serverResourceTracker.trackTimer(interval, `interval:${key}`, normalized);
    return interval;
  }

  /**
   * Unbinds and stops an interval.
   */
  public unbindInterval(code: string, key: string): void {
    const normalized = code.trim().toUpperCase();
    const bundle = this.bundles.get(normalized);
    if (!bundle) return;

    const interval = bundle.intervals.get(key);
    if (interval) {
      clearInterval(interval);
      serverResourceTracker.untrackTimer(interval);
      bundle.intervals.delete(key);
    }
  }

  /**
   * Exhaustively disposes all resources associated with a room.
   */
  public cleanupRoom(code: string): void {
    const normalized = code.trim().toUpperCase();
    const bundle = this.bundles.get(normalized);
    if (!bundle) return;

    // Clear all bound timers
    for (const [key, timer] of bundle.timers.entries()) {
      clearTimeout(timer);
      serverResourceTracker.untrackTimer(timer);
    }
    bundle.timers.clear();

    // Clear all bound intervals
    for (const [key, interval] of bundle.intervals.entries()) {
      clearInterval(interval);
      serverResourceTracker.untrackTimer(interval);
    }
    bundle.intervals.clear();

    // Remove room from tracker and store
    serverResourceTracker.unregister("room", normalized);
    serverEventStore.clear(normalized);
    this.bundles.delete(normalized);

    logger.info({
      message: `LifecycleRegistry: completely purged all resources for room ${normalized}`,
      module: "RELIABILITY",
      roomCode: normalized,
    });
  }

  /**
   * Returns bundle summary statistics.
   */
  public getStats(): { totalRooms: number; activeTimers: number; activeIntervals: number } {
    let activeTimers = 0;
    let activeIntervals = 0;

    for (const bundle of this.bundles.values()) {
      activeTimers += bundle.timers.size;
      activeIntervals += bundle.intervals.size;
    }

    return {
      totalRooms: this.bundles.size,
      activeTimers,
      activeIntervals,
    };
  }

  /**
   * Resets registry for test isolation.
   */
  public reset(): void {
    for (const code of [...this.bundles.keys()]) {
      this.cleanupRoom(code);
    }
    this.bundles.clear();
  }
}

export const serverLifecycleRegistry = new ServerLifecycleRegistry();
