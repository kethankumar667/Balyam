import { Router, type Request, type Response } from "express";
import { partyService } from "./PartyService.js";
import { requireIdentity, requireSelfParam, callerId } from "../auth/identity.js";

/**
 * Parties — a group of players moving between games together.
 *
 * Every route is private. At baseline none were: `POST /api/parties/create`
 * with `{"leaderId":"victim_user"}` created a party led by someone who never
 * asked for one, and `POST /api/parties/player/victim_user/leave` removed them
 * from whatever party they were actually in.
 *
 * Two shapes of check here, and the difference matters:
 *   • `requireSelfParam()` where the path names a PLAYER — compare directly
 *   • an explicit lookup where the path names a PARTY or an INVITATION —
 *     the record has to be read before anyone can say whose it is
 */
const router = Router();

/** PRIVATE — start a party. You lead it; there is no other option. */
router.post("/create", requireIdentity, (req: Request, res: Response) => {
  const { leaderName, leaderAvatar, maxMembers } = req.body ?? {};
  try {
    const party = partyService.createParty(
      callerId(req),
      typeof leaderName === "string" ? leaderName : "Player",
      leaderAvatar,
      typeof maxMembers === "number" ? maxMembers : 4,
    );
    res.json({ success: true, party });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/** PRIVATE — your party and your pending invitations. */
router.get("/player/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  const me = callerId(req);
  res.json({
    success: true,
    party: partyService.getPlayerParty(me) || null,
    invitations: partyService.getPendingInvitations(me),
  });
});

/**
 * PRIVATE — invite somebody into a party you are in.
 *
 * `invitePlayer` checks that the party exists and has room, but never checked
 * that the inviter belonged to it — so anyone could pull strangers into any
 * party whose id they knew. Membership is checked here, before the call.
 */
router.post("/:partyId/invite", requireIdentity, (req: Request, res: Response) => {
  const { inviterName, inviteeId } = req.body ?? {};
  if (!inviteeId || typeof inviteeId !== "string") {
    res.status(400).json({ success: false, error: "Missing inviteeId" });
    return;
  }

  const me = callerId(req);
  const party = partyService.getParty(req.params.partyId);
  if (!party) {
    res.status(404).json({ success: false, error: "Party not found" });
    return;
  }
  if (!party.members.some((m) => m.playerId === me)) {
    res.status(403).json({ success: false, error: "You are not in that party." });
    return;
  }

  try {
    res.json({
      success: true,
      invite: partyService.invitePlayer(
        req.params.partyId,
        me,
        typeof inviterName === "string" ? inviterName : "Player",
        inviteeId,
      ),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/** PRIVATE — accept an invitation that was sent to YOU. */
router.post("/invitations/:invitationId/accept", requireIdentity, (req: Request, res: Response) => {
  const invite = partyService.getInvitation(req.params.invitationId);
  if (!invite) {
    res.status(404).json({ success: false, error: "Party invitation not found" });
    return;
  }
  if (invite.inviteeId !== callerId(req)) {
    res.status(403).json({ success: false, error: "That invitation was not sent to you." });
    return;
  }

  const { inviteeName, inviteeAvatar } = req.body ?? {};
  try {
    res.json({
      success: true,
      party: partyService.acceptInvitation(
        req.params.invitationId,
        typeof inviteeName === "string" ? inviteeName : "Player",
        inviteeAvatar,
      ),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/** PRIVATE — decline an invitation that was sent to YOU. */
router.post("/invitations/:invitationId/decline", requireIdentity, (req: Request, res: Response) => {
  const invite = partyService.getInvitation(req.params.invitationId);
  if (!invite) {
    res.status(404).json({ success: false, error: "Party invitation not found" });
    return;
  }
  if (invite.inviteeId !== callerId(req)) {
    res.status(403).json({ success: false, error: "That invitation was not sent to you." });
    return;
  }
  try {
    res.json({ success: true, invite: partyService.declineInvitation(req.params.invitationId) });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/** PRIVATE — your own ready flag. */
router.post("/player/:playerId/ready", requireSelfParam(), (req: Request, res: Response) => {
  const { isReady } = req.body ?? {};
  try {
    res.json({ success: true, party: partyService.setMemberReady(callerId(req), !!isReady) });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/**
 * PRIVATE — point the party at a game or room.
 *
 * `setPartyTarget` refuses a non-leader internally, so the guard here is about
 * the caller being who they say they are; the leadership rule stays in the
 * service where it already lives.
 */
router.post("/player/:playerId/target", requireSelfParam(), (req: Request, res: Response) => {
  const { game, roomCode, tournamentId } = req.body ?? {};
  try {
    res.json({
      success: true,
      party: partyService.setPartyTarget(callerId(req), game, roomCode, tournamentId),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/** PRIVATE — leave. Yourself, not somebody else. */
router.post("/player/:playerId/leave", requireSelfParam(), (req: Request, res: Response) => {
  partyService.leaveParty(callerId(req));
  res.json({ success: true });
});

/** PRIVATE — disband. `disbandParty` enforces that the caller leads it. */
router.post("/player/:playerId/disband", requireSelfParam(), (req: Request, res: Response) => {
  try {
    partyService.disbandParty(callerId(req));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

export default router;
