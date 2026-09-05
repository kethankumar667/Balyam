import { Router, type Request, type Response } from "express";
import { requireOperationalAuth, getUserRole, setUserRole, type PlatformRole } from "../security/operationalAuth.js";
import { progressionRepository } from "../persistence/index.js";
import { readPostgrestConfig, PostgrestClient } from "../persistence/postgrest.js";
import { logger } from "../lib/logger.js";

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: PlatformRole;
  status: "active" | "warning" | "inactive" | "critical";
  matchesPlayed: number;
  winRate: string;
  eloRating: number;
  joinedDate: string;
  lastActive: string;
  favoriteGame: string;
  isReal: true;
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

            let joinedDate = "Recently";
            if (row.created_at) {
              const d = new Date(row.created_at);
              if (!isNaN(d.getTime())) {
                joinedDate = d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                });
              }
            }

            users.push({
              id: row.id,
              name: displayName,
              email: email,
              avatar: row.avatar_id || undefined,
              role,
              status: "active",
              matchesPlayed: 0,
              winRate: "0%",
              eloRating: 1200,
              joinedDate,
              lastActive: "Active today",
              favoriteGame: "Ludo",
              isReal: true,
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
          const d = new Date(p.joinedAt || Date.now());
          const joinedDate = d.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          });

          users.push({
            id: p.playerId,
            name: p.displayName || "Player",
            email: `${p.playerId.substring(0, 10)}@bhalyam.player`,
            avatar: p.avatar || undefined,
            role,
            status: "active",
            matchesPlayed: Math.floor((p.experiencePoints || 0) / 100),
            winRate: "50%",
            eloRating: 1200 + Math.min(600, Math.floor((p.experiencePoints || 0) / 10)),
            joinedDate,
            lastActive: "Recently",
            favoriteGame: "Ludo",
            isReal: true,
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
