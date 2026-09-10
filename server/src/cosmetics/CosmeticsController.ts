/**
 * BHALYAM — Cosmetics HTTP REST Controller
 * Exposes server-authoritative cosmetics endpoints:
 *   GET  /api/cosmetics/catalog  — Public catalog listing
 *   GET  /api/cosmetics/loadout  — Current user's inventory & equipped slots
 *   POST /api/cosmetics/purchase — Atomic idempotent coin purchase
 *   POST /api/cosmetics/equip    — Equip owned/default cosmetic
 *   POST /api/cosmetics/unequip  — Restore category default
 */

import { Router, type Request, type Response } from "express";
import { callerId, requireIdentity } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import { CosmeticsService } from "./CosmeticsService.js";
import { operationalAuthConfig, getUserRole, secretsMatch } from "../security/operationalAuth.js";
import { verificationMode } from "../lib/supabaseAuth.js";
import { UnownedCosmeticError } from "./CosmeticsRepository.js";
import {
  type CosmeticCategory,
  type CosmeticGameScope,
  isKnownCosmeticId,
} from "@shared/cosmetics.js";

/**
 * Authoritative check determining if request caller has Admin or Super Admin privileges.
 *
 * Exported for direct unit testing — this function guards a real
 * privilege-escalation surface (free access to every paid cosmetic), so its
 * three branches (ops key, verified DB role, dev-mode assertion) need their
 * own coverage independent of the HTTP router around them.
 */
export function isCallerAdmin(req: Request): boolean {
  // 1. Shared operational secret key. Uses the same constant-time compare
  // `requireOperationalAuth` uses for this exact secret — a naive `===`
  // here previously leaked how many leading characters matched through
  // response timing, on a path that hands out free admin access.
  const { secret, adminUserIds } = operationalAuthConfig();
  const opsKey = req.headers["x-operational-key"];
  if (typeof opsKey === "string" && secretsMatch(opsKey.trim(), secret)) {
    return true;
  }

  // 2. Verified identity role check
  if (req.player) {
    if (adminUserIds.includes(req.player.playerId)) {
      return true;
    }
    if (req.player.kind === "member") {
      const role = getUserRole(req.player.playerId, req.player.email);
      if (role === "admin" || role === "super_admin") {
        return true;
      }
    }
  }

  // 3. In unconfigured or local development mode, accept an explicit
  // client-asserted role header. Deliberately does NOT also pattern-match
  // email/playerId substrings for "admin" — that heuristic could false-
  // positive on a legitimate identity that merely contains the substring
  // (e.g. an email alias), and the explicit header already covers the dev
  // use case cleanly.
  if (verificationMode() === "off") {
    const accountKind = req.headers["x-account-kind"];
    if (accountKind === "admin" || accountKind === "super_admin") {
      return true;
    }
  }

  return false;
}

export function createCosmeticsRouter(cosmeticsService: CosmeticsService): Router {
  const router = Router();

  /**
   * GET /api/cosmetics/catalog
   * Public endpoint returning all active cosmetics in the catalog.
   */
  router.get("/catalog", async (_req: Request, res: Response) => {
    try {
      const catalog = await cosmeticsService.getCatalog();
      res.json(catalog);
    } catch (err) {
      logger.error({
        message: `GET /api/cosmetics/catalog failed: ${String(err)}`,
        module: "COSMETICS_API",
      });
      res.status(500).json({ error: "Failed to load cosmetics catalog." });
    }
  });

  /**
   * GET /api/cosmetics/loadout
   * Returns current user's owned cosmetics, equipped slots, and resolved fallbacks.
   * Admin and Super Admin users automatically receive all catalog items as owned for free.
   */
  router.get("/loadout", requireIdentity, async (req: Request, res: Response) => {
    try {
      const userId = callerId(req);
      const isAdmin = isCallerAdmin(req);
      const state = await cosmeticsService.getUserLoadout(userId, isAdmin);
      res.json(state);
    } catch (err) {
      logger.error({
        message: `GET /api/cosmetics/loadout failed: ${String(err)}`,
        module: "COSMETICS_API",
      });
      res.status(500).json({ error: "Failed to load user loadout." });
    }
  });

  /**
   * POST /api/cosmetics/purchase
   * Executes atomic server-authoritative cosmetic purchase.
   * Caller identity is derived exclusively from verified session middleware.
   */
  router.post("/purchase", requireIdentity, async (req: Request, res: Response) => {
    try {
      const userId = callerId(req);
      const { cosmeticId, idempotencyKey } = req.body as { cosmeticId?: unknown; idempotencyKey?: unknown };

      if (typeof cosmeticId !== "string" || !isKnownCosmeticId(cosmeticId)) {
        res.status(400).json({
          success: false,
          code: "INVALID_COSMETIC",
          message: "A valid cosmetic identifier is required.",
        });
        return;
      }

      if (typeof idempotencyKey !== "string" || idempotencyKey.trim().length === 0) {
        res.status(400).json({
          success: false,
          code: "ERROR",
          message: "A valid idempotencyKey is required.",
        });
        return;
      }

      // Admins and Super Admins have free access to all catalog cosmetics without purchase
      if (isCallerAdmin(req)) {
        res.json({
          success: true,
          applied: false,
          code: "ALREADY_OWNED",
          cosmeticId,
          message: "Admins have free access to all cosmetics without purchase.",
        });
        return;
      }

      const result = await cosmeticsService.purchaseCosmetic(userId, cosmeticId, idempotencyKey);
      res.json(result);
    } catch (err) {
      logger.error({
        message: `POST /api/cosmetics/purchase failed: ${String(err)}`,
        module: "COSMETICS_API",
      });
      res.status(500).json({
        success: false,
        code: "ERROR",
        message: "Internal server error completing purchase.",
      });
    }
  });

  /**
   * POST /api/cosmetics/equip
   * Equips an owned or default cosmetic into a specific (category, game_scope) slot.
   * Admin and Super Admin users can equip any cosmetic item for free.
   */
  router.post("/equip", requireIdentity, async (req: Request, res: Response) => {
    try {
      const userId = callerId(req);
      const isAdmin = isCallerAdmin(req);
      const { category, scope, cosmeticId } = req.body as {
        category?: CosmeticCategory;
        scope?: CosmeticGameScope;
        cosmeticId?: string;
      };

      if (!category || !scope || !cosmeticId) {
        res.status(400).json({ error: "Missing required fields: category, scope, cosmeticId" });
        return;
      }

      const result = await cosmeticsService.equipCosmetic(userId, category, scope, cosmeticId, isAdmin);
      res.json(result);
    } catch (err) {
      if (err instanceof UnownedCosmeticError) {
        res.status(403).json({ error: err.message });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({
        message: `POST /api/cosmetics/equip failed: ${msg}`,
        module: "COSMETICS_API",
      });
      res.status(500).json({ error: "Failed to equip cosmetic." });
    }
  });

  /**
   * POST /api/cosmetics/unequip
   * Restores default cosmetic for the specified (category, game_scope) slot.
   */
  router.post("/unequip", requireIdentity, async (req: Request, res: Response) => {
    try {
      const userId = callerId(req);
      const { category, scope } = req.body as {
        category?: CosmeticCategory;
        scope?: CosmeticGameScope;
      };

      if (!category || !scope) {
        res.status(400).json({ error: "Missing required fields: category, scope" });
        return;
      }

      const result = await cosmeticsService.unequipCosmetic(userId, category, scope);
      res.json(result);
    } catch (err) {
      logger.error({
        message: `POST /api/cosmetics/unequip failed: ${String(err)}`,
        module: "COSMETICS_API",
      });
      res.status(500).json({ error: "Failed to unequip cosmetic." });
    }
  });

  return router;
}
