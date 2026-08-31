import { Router, type Request, type Response } from "express";
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { healthMonitor } from "./HealthMonitor.js";
import { performanceMonitor } from "./PerformanceMonitor.js";
import { telemetryAggregator } from "./TelemetryAggregator.js";
import { serverEventStore } from "../events/ServerEventStore.js";
import { leakDetector } from "../reliability/LeakDetector.js";

/**
 * Every `/api/operational/*` route, behind one gate.
 *
 * ── Why a factory and not eight `app.get` calls ───────────────────────
 * They used to be declared inline in `index.ts`, with the gate installed
 * separately as `app.use("/api/operational", requireOperationalAuth)` fifty
 * lines earlier. Express happened to order those correctly, so it worked — but
 * "worked" was a property of two unrelated line numbers, and the ninth route
 * somebody adds under a slightly different prefix inherits nothing.
 *
 * Here the gate is `router.use(...)` on the router that owns the routes. A
 * route added to this file is inside it by construction; there is no ordering
 * to get right and no way to add one outside.
 *
 * ── No data before authorization ──────────────────────────────────────
 * Nothing in this file gathers anything at module scope. Every snapshot,
 * evaluation and diagnostic runs inside a handler, and a handler runs only
 * after `requireOperationalAuth` has called `next()`. An anonymous request
 * costs a string comparison and produces a 401 — it never touches the room
 * table, the event store or the leak detector.
 */

/**
 * Singleton Telemetry Broadcast Hub.
 *
 * ── Scalability Architecture ──────────────────────────────────────────
 * Rather than spawning an independent `setInterval` per connected admin
 * client (which causes O(N) full room table traversals and JSON serializations
 * per second), this hub maintains a single, shared 1000ms broadcast tick.
 *
 * It computes telemetry ONCE and serializes the SSE data frame ONCE per second.
 * The formatted buffer is then fanned out to all active `Response` streams.
 * When 0 admins are connected, the timer stops completely (zero idle CPU cost).
 *
 * ── TCP Backpressure Handling ─────────────────────────────────────────
 * If a client's write buffer is full (`res.write()` returns false), the hub
 * respects the stream state and drains gracefully, preventing unbounded
 * memory buffering on slow or suspended network connections.
 */
export class TelemetryBroadcastHub {
  private activeClients = new Set<Response>();
  private pausedClients = new Set<Response>();
  private interval: NodeJS.Timeout | null = null;
  private roomManager: RoomManager | null = null;
  private lastFormattedMessage: string | null = null;

  public init(roomManager: RoomManager): void {
    this.roomManager = roomManager;
  }

  public register(res: Response): void {
    this.activeClients.add(res);

    // Owned here rather than left entirely to the caller's `req.on("close")`:
    // a response can fail (broken pipe, reset connection) without the
    // request itself ever firing `close`. `.once` on both — a response only
    // errors or closes once in its lifetime, and `deregister` is idempotent
    // (`Set.delete` on an absent entry is a no-op), so whichever of these,
    // the caller's own `req.on("close")`, or a failed write in `broadcast()`
    // fires first is the only one that does anything.
    res.once("error", () => this.deregister(res));
    res.once("close", () => this.deregister(res));

    // If we have a cached message from this tick, send it immediately
    if (this.lastFormattedMessage) {
      try {
        res.write(this.lastFormattedMessage);
      } catch {
        this.deregister(res);
        return;
      }
    } else {
      // Force initial tick
      this.broadcast();
    }

    if (!this.interval && this.activeClients.size > 0) {
      this.interval = setInterval(() => this.broadcast(), 1000);
    }
  }

  public deregister(res: Response): void {
    this.activeClients.delete(res);
    this.pausedClients.delete(res);

    if (this.activeClients.size === 0 && this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.lastFormattedMessage = null;
    }
  }

  public getSubscriberCount(): number {
    return this.activeClients.size;
  }

  private broadcast(): void {
    if (!this.roomManager || this.activeClients.size === 0) return;

    try {
      const stats = this.roomManager.getOperationalDetailedStats();
      const rooms = this.roomManager.getOperationalRoomSummaries();
      const recovery = this.roomManager.getOperationalRecoverySummary();
      const payload = {
        timestamp: Date.now(),
        platform: stats,
        rooms,
        recovery,
      };
      this.lastFormattedMessage = `event: platform_tick\ndata: ${JSON.stringify(payload)}\n\n`;
    } catch {
      return;
    }

    for (const res of this.activeClients) {
      if (this.pausedClients.has(res)) {
        continue; // Wait for drain
      }

      try {
        const canWriteMore = res.write(this.lastFormattedMessage);
        if (!canWriteMore) {
          this.pausedClients.add(res);
          res.once("drain", () => {
            this.pausedClients.delete(res);
          });
        }
      } catch {
        this.deregister(res);
      }
    }
  }
}

export const telemetryBroadcastHub = new TelemetryBroadcastHub();

export interface OperationalRouterDeps {
  roomManager: RoomManager;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  /** Process boot time in epoch ms, for uptime in the reports. */
  startTime: number;
}

export function createOperationalRouter(deps: OperationalRouterDeps): Router {
  const { roomManager, io, startTime } = deps;
  telemetryBroadcastHub.init(roomManager);
  const router = Router();

  // The gate, first and on the router itself.
  router.use(requireOperationalAuth);

  /**
   * Operational answers are a snapshot of one moment on one instance and must
   * not be held by a proxy, a CDN or a browser's back button. `no-store`
   * rather than `no-cache`: the latter still permits storage.
   */
  router.use((_req: Request, res: Response, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/health", (_req: Request, res: Response) => {
    const report = healthMonitor.evaluate(roomManager, startTime);
    res.status(report.status === "CRITICAL" ? 503 : 200).json(report);
  });

  router.get("/performance", (_req: Request, res: Response) => {
    res.json(performanceMonitor.getReport());
  });

  router.get("/metrics", (_req: Request, res: Response) => {
    res.json(telemetryAggregator.getSnapshot(roomManager, startTime));
  });

  router.get("/stream", (req: Request, res: Response) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n\n");

    telemetryBroadcastHub.register(res);

    req.on("close", () => {
      telemetryBroadcastHub.deregister(res);
    });
  });

  router.get("/recovery", (_req: Request, res: Response) => {
    const snapshot = telemetryAggregator.getSnapshot(roomManager, startTime);
    const liveRecovery = roomManager.getOperationalRecoverySummary();
    res.json({
      recovery: snapshot.recovery,
      recoveringRooms: snapshot.rooms.byLifecycle["RECOVERING"] || 0,
      activeGraceCount: liveRecovery.activeGraceCount,
      seats: liveRecovery.seats,
      timestamp: snapshot.timestamp,
    });
  });

  router.get("/games", (_req: Request, res: Response) => {
    res.json({ games: telemetryAggregator.getGamesTelemetry() });
  });

  router.get("/rooms", (_req: Request, res: Response) => {
    // `platform` added alongside the pre-existing `rooms` field (never
    // removed) so the REST fallback poller can show the same real
    // recovery/host-migration/abandonment counters the SSE stream already
    // does, instead of the hardcoded placeholder values it used before.
    res.json({
      rooms: roomManager.getOperationalRoomSummaries(),
      platform: roomManager.getOperationalDetailedStats(),
    });
  });

  router.get("/timeline/:code", (req: Request, res: Response) => {
    const exportData = serverEventStore.export(req.params.code);
    if (!exportData) {
      // Says nothing about whether the room exists — only that we have no
      // timeline for that code. An authorized caller can tell the difference
      // from `/rooms`; an unauthorized one never reaches this line.
      res.status(404).json({ error: "No timeline available for that room code" });
      return;
    }
    res.json(exportData);
  });

  router.get("/leaks", (_req: Request, res: Response) => {
    res.json(leakDetector.runDiagnostics(roomManager, io));
  });

  /**
   * Who the gate decided you are. Useful on its own — an operator checking
   * that a rotated key or a new allowlist entry actually took effect should
   * not have to infer it from whether some other endpoint returned data.
   */
  router.get("/whoami", (req: Request, res: Response) => {
    res.json({ principal: req.operationalPrincipal ?? null });
  });

  return router;
}
