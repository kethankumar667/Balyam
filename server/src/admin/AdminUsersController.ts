import { Router, type Request, type Response } from "express";
import { requireOperationalAuth, getUserRole, setUserRole, type PlatformRole } from "../security/operationalAuth.js";
import { logger } from "../lib/logger.js";
import type { AdminUserSummary } from "@shared/adminUsers.js";
import { installAdminPlayerRoutes } from "./AdminPlayerController.js";
import { adminPlayerService } from "./AdminPlayerService.js";

export type AdminUserDto = AdminUserSummary;

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
  installAdminPlayerRoutes(router);

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

    // Only super_admin (or the machine ops-key) may change platform roles —
    // otherwise a caller holding only the lesser "admin" tier could grant
    // itself super_admin with no further check, defeating the whole point
    // of having a separate lesser tier.
    const callerRole =
      req.operationalPrincipal?.kind === "admin-user"
        ? getUserRole(req.operationalPrincipal.userId)
        : null;
    if (req.operationalPrincipal?.kind !== "ops-key" && callerRole !== "super_admin") {
      res.status(403).json({
        error: "Forbidden",
        message: "Only super_admin may change platform roles.",
      });
      return;
    }

    const assignedBy =
      req.operationalPrincipal?.kind === "admin-user"
        ? req.operationalPrincipal.email || req.operationalPrincipal.userId
        : "ops-key";

    if (adminPlayerService().isModerationPending(userId) || adminPlayerService().isDenied(userId)) {
      res.status(409).json({ error: "Conflict", message: "Resume this identity and finish moderation before changing its role." });
      return;
    }
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
