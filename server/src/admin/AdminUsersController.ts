import { Router, type Request, type Response } from "express";
import { requireOperationalAuth, getUserRole, setUserRole, type PlatformRole } from "../security/operationalAuth.js";
import { progressionRepository } from "../persistence/index.js";
import { readPostgrestConfig, PostgrestClient } from "../persistence/postgrest.js";
import { logger } from "../lib/logger.js";
import { profileService } from "../profile/ProfileService.js";
import { calculateCompetitiveRating } from "@shared/ranking/RankingRules.js";
import { GAME_DISPLAY_NAMES } from "@shared/catalog.js";
import type { GameKind } from "@shared/types.js";

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: PlatformRole;
  matchesPlayed: number;
  winRate: string;
  rating: number;
  joinedAt: number | null;
  /** Unix ms this process has seen the player active — `null` if never observed this process lifetime (a real gap of the in-process `ProfileService` store, not a fabricated value). */
  lastActiveAt: number | null;
  favoriteGame: string;
  isReal: true;
}

/**
 * Real per-player gameplay stats — the same `ProfileService`/
 * `calculateCompetitiveRating` source the public Leaderboard already reads
 * (see `LeaderboardService.getLeaderboard`). Previously this endpoint
 * hardcoded `matchesPlayed: 0`, `winRate: "0%"`/`"50%"`, `eloRating: 1200`
 * (or a made-up XP-derived formula), and `favoriteGame: "Ludo"` for every
 * single user — this replaces every one of those with the real number,
 * falling back to an honest zero/none for a player who has not completed a
 * match this process has seen, never to a plausible-looking placeholder.
 */
function realStatsFor(playerId: string): { matchesPlayed: number; winRate: string; rating: number; favoriteGame: string; lastActiveAt: number | null } {
  const stats = profileService.getStats(playerId);
  const profile = profileService.getProfile(playerId);
  return {
    matchesPlayed: stats.totalMatches,
    winRate: `${Math.round(stats.winRate)}%`,
    rating: calculateCompetitiveRating(stats),
    favoriteGame: stats.favoriteGame === "none" ? "—" : GAME_DISPLAY_NAMES[stats.favoriteGame as GameKind] ?? stats.favoriteGame,
    lastActiveAt: profile ? profile.lastSeenAt : null,
  };
}

interface ProfileDbRow {
  id: string;
  display_name?: string | null;
  avatar_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
  account_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function createAdminUsersRouter(): Router {
  const router = Router();

  router.use(requireOperationalAuth);

  router.use((_req: Request, res: Response, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  /**
   * GET /api/admin/users
   * Lists real registered user accounts from Supabase/PostgREST and progression store.
   */
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const users: AdminUserDto[] = [];
      const seenIds = new Set<string>();

      // 1. Fetch from Supabase `public.profiles` if configured
      const config = readPostgrestConfig();
      if (config) {
        try {
          const client = new PostgrestClient(config);
          const profileRows = await client.select<ProfileDbRow>(
            "profiles",
            "order=created_at.desc&limit=100",
          );

          for (const row of profileRows) {
            if (!row.id || seenIds.has(row.id)) continue;
            seenIds.add(row.id);

            const displayName =
              row.display_name?.trim() ||
              [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
              row.email?.split("@")[0] ||
              "Player";

            const email = row.email || `${row.id.substring(0, 8)}@bhalyam.io`;
            const role = getUserRole(row.id, email);

            let joinedAt: number | null = null;
            if (row.created_at) {
              const d = new Date(row.created_at);
              if (!isNaN(d.getTime())) joinedAt = d.getTime();
            }

            users.push({
              id: row.id,
              name: displayName,
              email: email,
              avatar: row.avatar_id || undefined,
              role,
              joinedAt,
              isReal: true,
              ...realStatsFor(row.id),
            });
          }
        } catch (dbErr) {
          logger.warn({
            message: `Admin users: failed to query profiles from PostgREST: ${String(dbErr)}`,
            module: "ADMIN_USERS",
          });
        }
      }

      // 2. Fetch from ProgressionRepository (player_profiles / in-memory store)
      try {
        const repo = progressionRepository();
        const progressionProfiles = await repo.listProfiles(100);
        for (const p of progressionProfiles) {
          if (!p.playerId || seenIds.has(p.playerId)) continue;
          seenIds.add(p.playerId);

          const role = getUserRole(p.playerId);
          const stats = realStatsFor(p.playerId);

          users.push({
            id: p.playerId,
            name: p.displayName || "Player",
            email: `${p.playerId.substring(0, 10)}@bhalyam.player`,
            avatar: p.avatar || undefined,
            role,
            joinedAt: p.joinedAt || null,
            isReal: true,
            ...stats,
            // ProgressionRepository's own `lastSeenAt` is durable (survives a
            // restart) — prefer it over the in-process ProfileService value
            // only when that one is unavailable, never the other way, since
            // ProfileService is the more current of the two when both exist.
            lastActiveAt: stats.lastActiveAt ?? p.lastSeenAt ?? null,
          });
        }
      } catch (repoErr) {
        logger.warn({
          message: `Admin users: failed to list profiles from ProgressionRepository: ${String(repoErr)}`,
          module: "ADMIN_USERS",
        });
      }

      res.json({ users, total: users.length });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error({ message: `GET /api/admin/users failed: ${detail}`, module: "ADMIN_USERS" });
      res.status(500).json({ error: "Internal Server Error", message: detail });
    }
  });

  /**
   * POST /api/admin/users/role
   * Elevates or updates a user's platform role (super_admin, admin, member).
   */
  router.post("/role", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const role = typeof body.role === "string" ? (body.role.trim().toLowerCase() as PlatformRole) : null;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!userId) {
      res.status(400).json({ error: "InvalidRequest", message: "userId is required." });
      return;
    }

    if (!role || !["super_admin", "admin", "member"].includes(role)) {
      res.status(400).json({
        error: "InvalidRequest",
        message: 'role must be one of "super_admin", "admin", or "member".',
      });
      return;
    }

    const assignedBy =
      req.operationalPrincipal?.kind === "admin-user"
        ? req.operationalPrincipal.email || req.operationalPrincipal.userId
        : "ops-key";

    setUserRole(userId, role, { reason, assignedBy });

    logger.info({
      message: `Admin role updated: user ${userId} granted ${role} by ${assignedBy}. Reason: ${reason || "None specified"}`,
      module: "ADMIN_USERS",
    });

    res.json({
      success: true,
      userId,
      role,
      reason: reason || undefined,
      assignedBy,
      appliedAt: Date.now(),
    });
  });

  return router;
}
