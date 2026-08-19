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

export interface OperationalRouterDeps {
  roomManager: RoomManager;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  /** Process boot time in epoch ms, for uptime in the reports. */
  startTime: number;
}

export function createOperationalRouter(deps: OperationalRouterDeps): Router {
  const { roomManager, io, startTime } = deps;
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

  router.get("/recovery", (_req: Request, res: Response) => {
    const snapshot = telemetryAggregator.getSnapshot(roomManager, startTime);
    res.json({
      recovery: snapshot.recovery,
      recoveringRooms: snapshot.rooms.byLifecycle["RECOVERING"] || 0,
      timestamp: snapshot.timestamp,
    });
  });

  router.get("/games", (_req: Request, res: Response) => {
    res.json({ games: telemetryAggregator.getGamesTelemetry() });
  });

  router.get("/rooms", (_req: Request, res: Response) => {
    res.json({ rooms: roomManager.getOperationalRoomSummaries() });
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
