import { Router, type Request, type Response } from "express";
import { friendsService } from "./FriendsService.js";
import { friendRequestsService } from "./FriendRequestsService.js";
import { presenceService } from "./PresenceService.js";
import {
  requireIdentity,
  requireSelfParam,
  requireParticipantParams,
  callerId,
} from "../auth/identity.js";

/**
 * Friends, requests and presence.
 *
 * Nothing here is public. A friends list is a list of other people, a request
 * is a message between two named parties, and presence says where somebody is
 * right now — none of it is leaderboard data, and all of it was readable and
 * writable by anyone at baseline.
 *
 * The forged-sender case is the one to keep in mind while reading:
 *
 *     POST /api/social/requests/send  {"senderId":"victim_user", ...}   -> 200
 *
 * A stranger sent a friend request AS the victim. `senderId` is gone from the
 * body entirely — it is the verified caller now, so there is nothing left to
 * forge.
 */
const router = Router();

/** PRIVATE — your friends. */
router.get("/friends/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  res.json({ success: true, friends: friendsService.getFriends(callerId(req)) });
});

/** PRIVATE — drop someone from YOUR list. */
router.post("/friends/:playerId/remove", requireSelfParam(), (req: Request, res: Response) => {
  const { friendPlayerId } = req.body ?? {};
  if (!friendPlayerId || typeof friendPlayerId !== "string") {
    res.status(400).json({ success: false, error: "Missing friendPlayerId" });
    return;
  }
  res.json({ success: true, removed: friendsService.removeFriend(callerId(req), friendPlayerId) });
});

/** PRIVATE — requests in both directions. */
router.get("/requests/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  const me = callerId(req);
  res.json({
    success: true,
    incoming: friendRequestsService.getIncomingRequests(me),
    outgoing: friendRequestsService.getOutgoingRequests(me),
  });
});

/**
 * PRIVATE — send a request.
 *
 * The sender is the caller, full stop. `senderName` and `senderAvatar` stay in
 * the body because they are how the caller chooses to present themselves, and
 * misrepresenting your own display name is a moderation question rather than
 * an authorization one.
 */
router.post("/requests/send", requireIdentity, (req: Request, res: Response) => {
  const { senderName, recipientId, senderAvatar } = req.body ?? {};
  if (!recipientId || typeof recipientId !== "string") {
    res.status(400).json({ success: false, error: "Missing recipientId" });
    return;
  }
  try {
    const request = friendRequestsService.sendRequest(
      callerId(req),
      typeof senderName === "string" ? senderName : "Player",
      recipientId,
      senderAvatar,
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/**
 * PRIVATE — accept a request addressed to you.
 *
 * The id in the path names a record, so ownership has to be looked up rather
 * than compared against a path segment: the caller must be that request's
 * RECIPIENT. Accepting on someone else's behalf would have let an attacker
 * force a friendship — and a friendship is what unlocks reading the other
 * person's shared history below.
 */
router.post("/requests/:requestId/accept", requireIdentity, (req: Request, res: Response) => {
  const request = friendRequestsService.getRequest(req.params.requestId);
  if (!request) {
    res.status(404).json({ success: false, error: "Friend request not found" });
    return;
  }
  if (request.recipientId !== callerId(req)) {
    res.status(403).json({ success: false, error: "That request was not sent to you." });
    return;
  }

  const { recipientName, recipientAvatar } = req.body ?? {};
  try {
    res.json({
      success: true,
      request: friendRequestsService.acceptRequest(
        req.params.requestId,
        typeof recipientName === "string" ? recipientName : "Player",
        recipientAvatar,
      ),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/**
 * PRIVATE — decline a request addressed to you.
 *
 * Same ownership rule as accept. Declining someone else's incoming request is
 * a smaller harm than accepting one, but it is still acting as them.
 */
router.post("/requests/:requestId/decline", requireIdentity, (req: Request, res: Response) => {
  const request = friendRequestsService.getRequest(req.params.requestId);
  if (!request) {
    res.status(404).json({ success: false, error: "Friend request not found" });
    return;
  }
  if (request.recipientId !== callerId(req)) {
    res.status(403).json({ success: false, error: "That request was not sent to you." });
    return;
  }
  try {
    res.json({ success: true, request: friendRequestsService.declineRequest(req.params.requestId) });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/** PRIVATE — set YOUR presence. Setting someone else's is impersonation. */
router.post("/presence/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  const { status, activityDetail } = req.body ?? {};
  res.json({ success: true, presence: presenceService.setPresence(callerId(req), status, activityDetail) });
});

/**
 * PRIVATE — look up presence for a set of players.
 *
 * Needs an identity but not ownership: seeing that a friend is online is the
 * feature. Requiring SOME identity is what stops an anonymous scraper from
 * mapping who is online across the whole player base.
 */
router.post("/presence/query", requireIdentity, (req: Request, res: Response) => {
  const { playerIds } = req.body ?? {};
  res.json({
    success: true,
    presences: presenceService.getPresences(Array.isArray(playerIds) ? playerIds : []),
  });
});

/**
 * PRIVATE — head-to-head history between two players.
 *
 * Belongs to both of them and to nobody else, so the caller must be one of the
 * two. A third party asking about two strangers gets a 403.
 */
router.get(
  "/shared-history/:p1/:p2",
  requireParticipantParams("p1", "p2"),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      history: friendsService.getSharedHistory(req.params.p1, req.params.p2),
    });
  },
);

export default router;
