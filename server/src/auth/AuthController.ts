import { Router, type Request, type Response } from "express";
import { mintGuestToken } from "./guestToken.js";
import { requireIdentity } from "./identity.js";

/**
 * Where a guest gets an identity, and where any caller can ask who they are.
 *
 * Two routes, both small, both deliberately outside every other router: the
 * thing that issues credentials must not sit behind a guard that needs one.
 */
export const authRouter = Router();

/**
 * POST /api/auth/guest — mint a guest identity.
 *
 * Takes no input. That is the security property, not an omission: a body
 * naming the id it wanted would let an attacker request a token for
 * `victim_user`, and every ownership check downstream would then be satisfied
 * by a forged claim. The id is 128 bits of server-side randomness, so nobody
 * arrives at anyone else's by asking or by guessing.
 *
 * Cheap enough to be worth no rate limit of its own today — it is one HMAC and
 * allocates nothing server-side, since the token is derived rather than
 * stored. That changes when guest identities become rows (P0-3), and the note
 * is here so it is not rediscovered then.
 */
authRouter.post("/guest", (_req: Request, res: Response) => {
  const minted = mintGuestToken();
  res.status(201).json({
    playerId: minted.playerId,
    token: minted.token,
    expiresAt: minted.expiresAt,
    kind: "guest",
  });
});

/**
 * GET /api/auth/me — who the server thinks you are.
 *
 * Worth having for the same reason `/api/operational/whoami` is: a client that
 * cannot tell whether its token is being accepted has no way to distinguish
 * "you are not allowed to do that" from "you are not who you think you are",
 * and those need different fixes.
 */
authRouter.get("/me", requireIdentity, (req: Request, res: Response) => {
  res.json({ player: req.player });
});
