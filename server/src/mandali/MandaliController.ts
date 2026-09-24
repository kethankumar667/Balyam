import { Router, type Request } from "express";
import type { MandaliService } from "./MandaliService.js";
import { rateLimitByCaller, callerIp } from "../lib/httpRateLimiter.js";

/**
 * The caller's identity, straight from `req.player` — set exclusively by the
 * globally-mounted `attachPlayerIdentity` middleware (server/src/auth/identity.ts),
 * which verifies a guest HMAC token or a Supabase access token before setting it.
 *
 * This function used to also accept a hand-decoded (unverified) JWT payload and,
 * failing that, a bare `x-account-kind` header plus `req.body.playerId`/`creatorId`
 * — meaning anyone could claim to be any member with zero credentials. Per
 * identity.ts's own rule: a body/header id is an ARGUMENT, never evidence of who
 * is asking. Only `req.player` is trustworthy.
 */
function extractPlayerFromReq(req: Request): { playerId: string; isMember: boolean } | null {
  if (!req.player) return null;
  return {
    playerId: req.player.playerId,
    isMember: req.player.kind === "member",
  };
}

export function createMandaliRouter(mandaliService: MandaliService): Router {
  const router = Router();

  // Mandali had no HTTP rate limiting at all — every mutating route (create,
  // join, message, react, party, coin transfer) could be hammered by a
  // single caller. Reads stay unthrottled; every POST goes through one
  // shared per-caller bucket, keyed by verified identity where available and
  // falling back to IP only for the unauthenticated 401 case.
  const mutationLimiter = rateLimitByCaller({
    capacity: 20,
    refillPerSec: 0.5,
    keyOf: (req) => req.player?.playerId ?? callerIp(req),
  });
  router.use((req, res, next) => (req.method === "GET" ? next() : mutationLimiter(req, res, next)));

  /** Owner/admin gate for the new membership-management routes — checked
   * here rather than trusting the client to only show these actions to the
   * right role, since the RPC itself also re-checks (belt and suspenders,
   * not a substitute for either). */
  async function requireOwnerOrAdmin(mandaliId: string, playerId: string): Promise<boolean> {
    const members = await mandaliService.getMembers(mandaliId);
    const member = members.find((m) => m.playerId === playerId);
    const role: string = member?.role ?? "";
    return member?.state === "ACTIVE" && (role === "OWNER" || role === "ADMIN");
  }

  // Search/Browse Mandalis
  router.get("/", async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const language = typeof req.query.language === "string" ? req.query.language : undefined;
    const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;

    const results = await mandaliService.searchMandalis({ search, language, tag });
    res.json({ success: true, mandalis: results });
  });

  // Get Player's Mandalis
  router.get("/user/:playerId", async (req, res) => {
    const mandalis = await mandaliService.getPlayerMandalis(req.params.playerId);
    res.json({ success: true, mandalis });
  });

  // Create Mandali (Members Only)
  router.post("/", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({
        success: false,
        error: "Only signed-in members can create a Mandali. Guests are not permitted.",
      });
      return;
    }

    const creatorId = playerInfo.playerId;
    const creatorName: string = req.body.creatorName || "Mandali Founder";
    const creatorAvatar: string = req.body.creatorAvatar || "file_0000000084c48208b1f893419d784cf2_1.jpg";

    // Support both direct payload (req.body) and nested payload (req.body.payload)
    const payload = req.body.payload || (req.body.name ? req.body : null);

    if (!payload?.name || !payload?.handle) {
      res.status(400).json({ success: false, error: "Missing required Mandali name or handle." });
      return;
    }

    const result = await mandaliService.createMandali(creatorId, creatorName, creatorAvatar, payload);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, mandali: result.mandali });
  });

  // Get Mandali by Handle
  router.get("/handle/:handle", async (req, res) => {
    const mandali = await mandaliService.getMandaliByHandle(req.params.handle);
    if (!mandali) {
      res.status(404).json({ error: "Mandali not found." });
      return;
    }
    res.json({ mandali });
  });

  /**
   * POST /invite-links/resolve — resolve an invite token to a minimal
   * public preview (name/emblem/description only — no members, no chat).
   * A read, but a raw token in a query string ends up in logs/history, so
   * this is POST-with-body rather than GET-with-query, per the redacted-log
   * guidance this project already follows for other tokens.
   */
  router.post("/invite-links/resolve", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!token) {
      res.status(400).json({ valid: false, error: "Missing invite token." });
      return;
    }
    const result = await mandaliService.resolveInviteLink(token);
    res.json(result);
  });

  /**
   * GET /my — Mandalis the requesting player belongs to.
   * Must be registered BEFORE /:handleOrId.
   */
  router.get("/my", async (req, res) => {
    if (!req.player) {
      res.json({ success: true, mandalis: [] });
      return;
    }

    const mandalis = await mandaliService.getPlayerMandalis(req.player.playerId);
    res.json({ success: true, mandalis });
  });

  /**
   * GET /coin-request-cooldown — ms until the caller may post another coin
   * request (0 = now). Drives the countdown in the UI; the database is what
   * actually enforces the limit. Must be registered BEFORE /:handleOrId.
   */
  router.get("/coin-request-cooldown", async (req, res) => {
    if (!req.player) {
      res.json({ success: true, retryAfterMs: 0 });
      return;
    }
    const { retryAfterMs } = await mandaliService.getCoinRequestCooldown(req.player.playerId);
    res.json({ success: true, retryAfterMs });
  });

  /**
   * GET /notifications/digests — one summary per Mandali the caller belongs
   * to: what they missed, in a single item each. Must be registered BEFORE
   * /:handleOrId.
   */
  router.get("/notifications/digests", async (req, res) => {
    if (!req.player) {
      res.json({ success: true, digests: [] });
      return;
    }
    const digests = await mandaliService.getDigests(req.player.playerId);
    res.json({ success: true, digests });
  });

  /**
   * GET /room-invites/status?codes=ABC234,XYZ789 — where shared rooms stand
   * right now (open / full / in progress / closed). A GET on purpose: cards
   * poll it, and the mutation rate limiter must not be spent on reads. Only
   * codes that were shared into one of the caller's own Mandalis are answered.
   */
  router.get("/room-invites/status", async (req, res) => {
    if (!req.player) {
      res.json({ success: true, statuses: [] });
      return;
    }
    const raw = typeof req.query.codes === "string" ? req.query.codes : "";
    const statuses = await mandaliService.getRoomInviteStatuses(req.player.playerId, raw.split(","));
    res.json({ success: true, statuses });
  });

  // GET /:handleOrId — Full Mandali Hub Data (handle or id lookup, returns all sub-resources)
  router.get("/:handleOrId", async (req, res) => {
    const raw = req.params.handleOrId;

    // Try by handle first (strip leading @ if present)
    const handle = raw.replace(/^@/, "");
    let mandali = await mandaliService.getMandaliByHandle(handle);

    // Fallback: try by opaque ID
    if (!mandali) {
      mandali = await mandaliService.getMandaliById(raw);
    }

    if (!mandali) {
      res.status(404).json({ success: false, error: "Mandali not found." });
      return;
    }

    const [members, channels, parties, memories, events] = await Promise.all([
      mandaliService.getMembers(mandali.id),
      mandaliService.getChannels(mandali.id),
      Promise.resolve(mandaliService.getParties(mandali.id)),
      Promise.resolve(mandaliService.getMemories(mandali.id)),
      Promise.resolve(mandaliService.getEvents(mandali.id)),
    ]);

    res.json({ success: true, mandali, members, channels, parties, memories, events });
  });

  // Get Members
  router.get("/:id/members", async (req, res) => {
    const members = await mandaliService.getMembers(req.params.id);
    res.json({ members });
  });

  // Apply or Direct Join (Members Only)
  router.post(["/:id/apply", "/:id/join"], async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({
        success: false,
        error: "Only signed-in members can join a Mandali. Guests are not permitted.",
      });
      return;
    }

    const displayName = req.body.displayName || "Member";
    const avatar = req.body.avatar || "file_0000000084c48208b1f893419d784cf2_1.jpg";
    const statement = req.body.statement;
    const invitationId = typeof req.body.invitationId === "string" ? req.body.invitationId : undefined;

    const result = await mandaliService.applyToMandali(req.params.id, playerInfo.playerId, displayName, avatar, statement, invitationId);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, pending: result.pending ?? false });
  });

  // Leave Mandali
  router.post("/:id/leave", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to leave a Mandali." });
      return;
    }

    const result = await mandaliService.leaveMandali(req.params.id, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  });

  // Edit Group Info & Settings — name/emblem/description/rules plus the
  // edit/send/join-approval toggles. The RPC itself gates who may change
  // what; this route just forwards whatever the caller included.
  router.patch("/:id/settings", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to edit group info." });
      return;
    }
    const { name, emblem, description, rules, editPermission, sendPermission, joinApproval } = req.body ?? {};
    const result = await mandaliService.updateMandaliSettings({
      mandaliId: req.params.id, actorId: playerInfo.playerId,
      name, emblem, description, rules, editPermission, sendPermission, joinApproval,
    });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, mandali: result.mandali });
  });

  /* ── Invite links ── */

  router.post("/:id/invite-links", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to create an invite link." });
      return;
    }
    const expiresInMs = typeof req.body?.expiresInMs === "number" ? req.body.expiresInMs : undefined;
    const result = await mandaliService.createInviteLink(req.params.id, playerInfo.playerId, expiresInMs);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, invitation: result.invitation });
  });

  /* ── Join-request approval ── */

  router.get("/:id/join-requests", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !(await requireOwnerOrAdmin(req.params.id, playerInfo.playerId))) {
      res.status(403).json({ success: false, error: "Only an owner or admin can view join requests." });
      return;
    }
    const requests = await mandaliService.getPendingJoinRequests(req.params.id);
    res.json({ success: true, requests });
  });

  // No mandaliId prefix — request IDs are globally unique and the RPC
  // derives the Mandali from the request row itself.
  router.post("/join-requests/:requestId/decide", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to decide a join request." });
      return;
    }
    const approve = req.body?.approve === true;
    const result = await mandaliService.decideJoinRequest(req.params.requestId, playerInfo.playerId, approve);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  });

  /* ── Member management: promote / demote / kick / ban / transfer ownership ── */

  router.post("/:id/members/:targetId/promote", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to promote a member." });
      return;
    }
    const result = await mandaliService.promoteMember(req.params.id, playerInfo.playerId, req.params.targetId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  });

  router.post("/:id/members/:targetId/demote", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to demote a member." });
      return;
    }
    const result = await mandaliService.demoteMember(req.params.id, playerInfo.playerId, req.params.targetId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  });

  router.post("/:id/members/:targetId/kick", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to remove a member." });
      return;
    }
    const officer = (await mandaliService.getMembers(req.params.id)).find((m) => m.playerId === playerInfo.playerId);
    const result = await mandaliService.kickMember(
      req.params.id, playerInfo.playerId, officer?.displayName ?? "Officer", req.params.targetId,
      typeof req.body?.reason === "string" ? req.body.reason : "Removed by officer"
    );
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  });

  router.post("/:id/members/:targetId/ban", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to ban a member." });
      return;
    }
    const result = await mandaliService.banMember(req.params.id, playerInfo.playerId, req.params.targetId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  });

  router.post("/:id/transfer-ownership", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to transfer ownership." });
      return;
    }
    const newOwnerId = typeof req.body?.newOwnerId === "string" ? req.body.newOwnerId : "";
    if (!newOwnerId) {
      res.status(400).json({ success: false, error: "Missing newOwnerId." });
      return;
    }
    const result = await mandaliService.transferOwnership(req.params.id, playerInfo.playerId, newOwnerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, mandali: result.mandali });
  });

  // Get Channels
  router.get("/:id/channels", async (req, res) => {
    const channels = await mandaliService.getChannels(req.params.id);
    res.json({ channels });
  });

  // Get Channel Messages — private community content, active members only.
  router.get("/:id/channels/:channelId/messages", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !(await mandaliService.isActiveMember(req.params.id, playerInfo.playerId))) {
      res.status(403).json({ error: "Only active members can read this channel." });
      return;
    }

    const limit = Number(req.query.limit) || 50;
    const messages = await mandaliService.getMessages(req.params.channelId, limit);
    res.json({ success: true, messages });
  });

  // Share the room you are in as a joinable card in this Mandali's chat.
  router.post("/:id/room-invites", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({ success: false, error: "Only signed-in members can share a room to a Mandali." });
      return;
    }
    const roomCode = typeof req.body?.roomCode === "string" ? req.body.roomCode : "";
    const channelId = typeof req.body?.channelId === "string" ? req.body.channelId : undefined;
    if (!roomCode) {
      res.status(400).json({ success: false, error: "Missing room code." });
      return;
    }

    const result = await mandaliService.shareRoomInvite({
      mandaliId: req.params.id, senderId: playerInfo.playerId, roomCode, channelId,
    });
    if (!result.success) {
      if (result.retryAfterMs !== undefined) {
        res.status(429).json({ success: false, error: result.error, retryAfterMs: result.retryAfterMs });
        return;
      }
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.status(result.deduplicated ? 200 : 201).json({
      success: true, message: result.message, alreadyShared: result.deduplicated === true,
    });
  });

  // Move my read pointer to now (I have looked at this Mandali).
  router.post("/:id/read", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to track what you have read." });
      return;
    }
    const result = await mandaliService.markRead(req.params.id, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, previous: result.previous, current: result.current });
  });

  // How loud this Mandali may be for me: ALL, INVITES_ONLY or MUTED.
  router.patch("/:id/notification-level", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to change notification settings." });
      return;
    }
    const level = typeof req.body?.level === "string" ? req.body.level : "";
    const result = await mandaliService.setNotificationLevel(
      req.params.id, playerInfo.playerId, level as "ALL" | "INVITES_ONLY" | "MUTED"
    );
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, level });
  });

  // Send Message
  router.post("/:id/channels/:channelId/messages", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    const { senderName, senderAvatar, content, replyToId, clientRequestId } = req.body;
    if (!playerInfo || !content) {
      res.status(400).json({ error: "Missing sender identity or content." });
      return;
    }

    const result = await mandaliService.sendMessage(
      req.params.id, req.params.channelId, playerInfo.playerId,
      senderName || "Member", senderAvatar || "avatar_1", content, replyToId, clientRequestId
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({ message: result.message });
  });

  // Pin / unpin a message
  router.post("/:id/channels/:channelId/messages/:messageId/pin", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to pin a message." });
      return;
    }
    const pinned = req.body?.pinned !== false;
    const result = await mandaliService.setMessagePin(req.params.id, req.params.messageId, playerInfo.playerId, pinned);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  });

  // Delete for everyone / delete as admin — tombstones, never a hard delete.
  router.delete("/:id/channels/:channelId/messages/:messageId", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to delete a message." });
      return;
    }
    const result = await mandaliService.deleteMessage(req.params.id, req.params.messageId, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  });

  // React to Message
  router.post("/:id/channels/:channelId/messages/:messageId/react", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    const { emoji } = req.body;
    if (!playerInfo || !emoji) {
      res.status(400).json({ error: "Missing sender identity or emoji." });
      return;
    }

    const result = mandaliService.reactToMessage(
      req.params.id,
      req.params.channelId,
      req.params.messageId,
      playerInfo.playerId,
      emoji
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ reactions: result.reactions });
  });

  // Get Parties
  router.get("/:id/parties", (req, res) => {
    const parties = mandaliService.getParties(req.params.id);
    res.json({ parties });
  });

  // Create Party
  router.post("/:id/parties", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    const { leaderName, leaderAvatar, game, modeId, title, slots } = req.body;
    if (!playerInfo || !game) {
      res.status(400).json({ error: "Missing sender identity or game." });
      return;
    }

    const result = mandaliService.createParty(
      req.params.id,
      playerInfo.playerId,
      leaderName || "Leader",
      leaderAvatar || "avatar_1",
      game,
      modeId || "standard",
      title || `${game.toUpperCase()} Squad`,
      slots || 4
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({ party: result.party });
  });

  // Join Party
  router.post("/:id/parties/:partyId/join", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    const { displayName, avatar } = req.body;
    if (!playerInfo) {
      res.status(401).json({ error: "Sign in to join a party." });
      return;
    }

    const result = mandaliService.joinParty(
      req.params.id,
      req.params.partyId,
      playerInfo.playerId,
      displayName || "Player",
      avatar || "avatar_1"
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ party: result.party });
  });

  // Leave Party
  router.post("/:id/parties/:partyId/leave", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ error: "Sign in to leave a party." });
      return;
    }

    const result = mandaliService.leaveParty(req.params.id, req.params.partyId, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true });
  });

  // Launch Party to Game Handoff (M-10)
  router.post("/:id/parties/:partyId/launch", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ error: "Sign in to launch a party." });
      return;
    }

    const result = mandaliService.launchPartyToGame(
      req.params.id,
      req.params.partyId,
      playerInfo.playerId
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true, roomCode: result.roomCode, game: result.game });
  });

  // Get Events
  router.get("/:id/events", (req, res) => {
    const events = mandaliService.getEvents(req.params.id);
    res.json({ events });
  });

  // Get Memories (Gnapakalu)
  router.get("/:id/memories", (req, res) => {
    const memories = mandaliService.getMemories(req.params.id);
    res.json({ memories });
  });

  // Transfer Coins (Send / Request) - Members Only
  router.post("/:id/coins/transfer", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({
        success: false,
        error: "Only registered members can transfer or request coins in a Mandali.",
      });
      return;
    }

    const { toPlayerId, amount, type, note } = req.body;
    if (!toPlayerId || typeof amount !== "number") {
      res.status(400).json({ success: false, error: "Invalid transfer parameters." });
      return;
    }

    const result = await mandaliService.transferCoins(req.params.id, playerInfo.playerId, {
      toPlayerId,
      amount,
      type: type === "REQUEST" ? "REQUEST" : "SEND",
      note,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, transfer: result.transfer });
  });

  // Get Coin Transfers History
  router.get("/:id/coins/transfers", (req, res) => {
    const transfers = mandaliService.getCoinTransfers(req.params.id);
    res.json({ success: true, transfers });
  });

  /* ── Coin requests (the payable request card the chat feed actually renders) ── */

  router.get("/:id/coin-requests", async (req, res) => {
    const requests = await mandaliService.getCoinRequests(req.params.id);
    res.json({ success: true, requests });
  });

  router.post("/:id/channels/:channelId/coin-requests", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({ success: false, error: "Only signed-in members can request coins." });
      return;
    }
    const { payerId, amount, expiresInMs } = req.body;
    if (!payerId || typeof amount !== "number") {
      res.status(400).json({ success: false, error: "Invalid coin request parameters." });
      return;
    }
    const result = await mandaliService.createCoinRequest({
      mandaliId: req.params.id, channelId: req.params.channelId,
      requesterId: playerInfo.playerId, payerId, amount, expiresInMs,
    });
    if (!result.success) {
      if (result.retryAfterMs !== undefined) {
        res.status(429).json({ success: false, error: result.error, retryAfterMs: result.retryAfterMs });
        return;
      }
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, request: result.request });
  });

  // No mandaliId prefix — same reasoning as join-requests/:requestId/decide.
  router.post("/coin-requests/:requestId/fund", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({ success: false, error: "Only signed-in members can pay a coin request." });
      return;
    }
    const result = await mandaliService.fundCoinRequest(req.params.requestId, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, request: result.request });
  });

  return router;
}
