import { Router, type Request, type Response } from "express";
import { mintGuestToken, verifyGuestToken } from "./guestToken.js";
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
 * POST /api/auth/guest/renew — trade a still-valid guest token for a fresh one, SAME id.
 *
 * This is what makes the 7-day expiry mean "7 days of INACTIVITY": the client calls it when a
 * token is getting old, so a guest who keeps playing never hits the deadline.
 *
 * The bearer token is the only input; the id in the response is the one inside it, never one the
 * caller names, so this cannot be used to obtain a token for somebody else. A token that is
 * forged, signed with a different key (e.g. after a restart with no `SESSION_SECRET`) or already
 * expired gets a 401, and the client then falls back to minting a new guest.
 */
authRouter.post("/guest/renew", (req: Request, res: Response) => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const playerId = verifyGuestToken(token);
  if (!playerId) {
    res.status(401).json({ error: "This guest identity can no longer be renewed." });
    return;
  }
  const minted = mintGuestToken(playerId);
  res.status(200).json({
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
