import { Router, type Request, type Response } from "express";
import { MandaliService } from "./MandaliService.js";
import { MandaliLimitError, MandaliNotFoundError, MandaliForbiddenError } from "./MandaliRepository.js";
import type { MandaliAccount } from "./account.js";
import { logger } from "../lib/logger.js";

/**
 * Mandali HTTP controller.
 *
 * Every route sits behind requireStrictMandaliAccount — there is no public
 * Mandali surface, no guest path, no dev-mode promotion. The actor is the
 * provider-derived account from res.locals, never anything in the body.
 *
 * Error discipline (per the implementation plan):
 *   400 validation, 404 inaccessible/absent private objects, 403 forbidden
 *   on visible objects, 429 limits, 503 unavailable durability. PostgREST
 *   details never reach a body.
 */
export function createMandaliRouter(
  service: MandaliService,
  flagsEnabled: () => boolean,
  requireStrictAccount: (enabled: () => boolean) => import("express").RequestHandler,
): Router {
  const router = Router();

  /** The one credential shape this router accepts, resolved by the guard. */
  const account = (res: Response): MandaliAccount => res.locals.mandaliAccount;

  router.use(requireStrictAccount(flagsEnabled));

  /** POST /api/mandali — create a group; you are its owner atomically. */
  router.post("/", (req: Request, res: Response) => {
    void (async () => {
      try {
        const group = await service.createGroup(account(res).userId, req.body ?? {});
        res.status(201).json({ group });
      } catch (err) {
        if (err instanceof MandaliLimitError) {
          res.status(429).json({ error: "LimitReached", message: err.message });
          return;
        }
        if (err instanceof Error && err.name === "Error" && /Name must be/.test(err.message)) {
          res.status(400).json({ error: "InvalidInput", message: err.message });
          return;
        }
        logger.error({ message: `mandali create failed: ${String(err)}`, module: "MANDALI" });
        res.status(503).json({ error: "Unavailable", message: "Could not create the mandali. Try again." });
      }
    })();
  });

  /** GET /api/mandali — groups the caller belongs to. */
  router.get("/", (_req: Request, res: Response) => {
    void (async () => {
      try {
        const groups = await service.listMyGroups(account(res).userId);
        res.json({ groups });
      } catch (err) {
        logger.error({ message: `mandali list failed: ${String(err)}`, module: "MANDALI" });
        res.status(503).json({ error: "Unavailable", message: "Could not load your mandalis. Try again." });
      }
    })();
  });

  /** GET /api/mandali/:id — snapshot for an approved member; 404 otherwise. */
  router.get("/:id", (req: Request, res: Response) => {
    void (async () => {
      try {
        const snapshot = await service.getSnapshot(req.params.id, account(res).userId);
        res.json(snapshot);
      } catch (err) {
        if (err instanceof MandaliNotFoundError) {
          res.status(404).json({ error: "NotFound", message: "Mandali not found." });
          return;
        }
        logger.error({ message: `mandali snapshot failed: ${String(err)}`, module: "MANDALI" });
        res.status(503).json({ error: "Unavailable", message: "Could not load the mandali. Try again." });
      }
    })();
  });

  return router;
}
