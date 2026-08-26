import { Router, type Request, type Response } from "express";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { progressionRepository, persistenceStatus } from "../persistence/index.js";
import { logger } from "../lib/logger.js";

/**
 * `/api/admin/dashboard/*` — Supabase-backed admin metrics.
 *
 * ── Why this is not `OperationalController.ts` ─────────────────────────
 * That file is every `/api/operational/*` route, and its own header comment
 * says what it is for: realtime, in-process state — `RoomManager`, the health
 * monitor, the event store. Nothing in it reads a database. This file is the
 * opposite: everything it returns comes from `ProgressionRepository`, and it
 * touches `RoomManager` not at all. Live room state (Active Matches on the
 * dashboard, the Live Rooms table) stays sourced from `/api/operational/rooms`
 * on the client — merging that in here would be the exact thing
 * `docs/runbooks/persistence.md` says not to do: "Active room state... stays
 * in RoomManager's memory."
 *
 * ── Failure is not a metric ─────────────────────────────────────────────
 * If the repository throws — a network blip, Supabase down, RLS refusing the
 * service role — this responds 503, not 200 with zeros. A dashboard that
 * quietly shows "0 registered users" when the real answer is "the database is
 * unreachable" is worse than one that shows nothing, because zero is a
 * plausible number and unreachable is not supposed to look like one.
 */

const DAY_MS = 86_400_000;
const TREND_DAYS = 7;
const RECENT_MATCHES_LIMIT = 10;

function startOfUtcToday(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function createDashboardRouter(): Router {
  const router = Router();

  router.use(requireOperationalAuth);

  router.use((_req: Request, res: Response, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/summary", async (_req: Request, res: Response) => {
    const progression = persistenceStatus();
    try {
      const repo = progressionRepository();
      const now = Date.now();

      const [totalRegisteredUsers, activeUsersLast24h, matchesCompletedToday, matchTrend, recentMatches] =
        await Promise.all([
          repo.countRegisteredMembers(),
          repo.countActiveIdentitiesSince(now - DAY_MS),
          repo.countMatchesFinishedSince(startOfUtcToday()),
          repo.matchTrend(TREND_DAYS),
          repo.listRecentMatches(RECENT_MATCHES_LIMIT),
        ]);

      res.json({
        progression,
        kpis: { totalRegisteredUsers, activeUsersLast24h, matchesCompletedToday },
        matchTrend,
        recentMatches,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error({ message: `Dashboard summary query failed: ${detail}`, module: "ADMIN_DASHBOARD" });
      res.status(503).json({ error: "Dashboard data unavailable", detail, progression });
    }
  });

  return router;
}
