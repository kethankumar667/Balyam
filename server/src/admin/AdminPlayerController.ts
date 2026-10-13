import type { Router, Request, Response, NextFunction } from "express";
import type { AdminSuspensionRequest } from "@shared/adminUsers.js";
import { operationalAuthConfig } from "../security/operationalAuth.js";
import { AdminPlayerError, adminPlayerService, type DirectoryQuery } from "./AdminPlayerService.js";

function requireHumanSuperadmin(req: Request, res: Response, next: NextFunction): void {
  const principal = req.operationalPrincipal;
  if (principal?.kind !== "admin-user" || !operationalAuthConfig().adminUserIds.includes(principal.userId)
    || adminPlayerService().isDenied(principal.userId)) {
    res.status(403).json({ error: "Forbidden", message: "A verified human superadmin is required." });
    return;
  }
  next();
}

function pageNumber(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw new AdminPlayerError(400, "Invalid pagination.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) throw new AdminPlayerError(400, "Invalid pagination.");
  return parsed;
}

function fail(res: Response, error: unknown): void {
  const status = error instanceof AdminPlayerError ? error.status : 503;
  res.status(status).json({ error: status === 503 ? "StoreUnavailable" : "RequestRefused",
    message: error instanceof AdminPlayerError ? error.message : "Recorded data is temporarily unavailable." });
}

export function installAdminPlayerRoutes(router: Router): void {
  router.get("/", requireHumanSuperadmin, async (req, res) => {
    try {
      const kind = req.query.kind ?? "all";
      const role = req.query.role ?? "all";
      const search = req.query.search ?? "";
      if (typeof kind !== "string" || !["all", "member", "guest"].includes(kind)
        || typeof role !== "string" || !["all", "super_admin", "admin", "member"].includes(role)
        || typeof search !== "string" || search.length > 100) throw new AdminPlayerError(400, "Invalid directory filters.");
      const query: DirectoryQuery = { page: pageNumber(req.query.page, 1, 1000000), pageSize: pageNumber(req.query.pageSize, 10, 100),
        search: search.trim(), kind: kind as DirectoryQuery["kind"], role: role as DirectoryQuery["role"] };
      res.json(await adminPlayerService().list(query));
    } catch (error) { fail(res, error); }
  });
  router.get("/:id", requireHumanSuperadmin, async (req, res) => {
    try { res.json(await adminPlayerService().details(req.params.id)); }
    catch (error) { fail(res, error); }
  });
  router.get("/:id/records/:section", requireHumanSuperadmin, async (req, res) => {
    try { res.json(await adminPlayerService().records(req.params.id, req.params.section,
      pageNumber(req.query.page, 1, 1000000), pageNumber(req.query.pageSize, 20, 100))); }
    catch (error) { fail(res, error); }
  });
  router.post("/:id/suspension", requireHumanSuperadmin, async (req, res) => {
    try {
      const principal = req.operationalPrincipal;
      if (principal?.kind !== "admin-user") throw new AdminPlayerError(403, "A verified human superadmin is required.");
      const suspension = await adminPlayerService().moderate(principal.userId, req.params.id, req.body as AdminSuspensionRequest);
      res.json({ suspension });
    } catch (error) { fail(res, error); }
  });
}