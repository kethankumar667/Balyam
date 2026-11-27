import { Router, type Request, type Response } from "express";
import type { DeleteGangFailure, GangService } from "./GangService.js";
import { rateLimitByCaller, callerIp } from "../lib/httpRateLimiter.js";
import { memberAvatar } from "./avatarInput.js";
import { requireSelfParam } from "../auth/identity.js";
import { sanitizePlayerName } from "@shared/playerName.js";

/** HTTP status for each way a delete can be refused. */
const DELETE_FAILURE_STATUS: Record<DeleteGangFailure, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  CONFIRMATION_MISMATCH: 400,
  FAILED: 500,
};

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

export function createGangRouter(gangService: GangService): Router {
  const router = Router();

  // Gang had no HTTP rate limiting at all — every mutating route (create,
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
  async function requireOwnerOrAdmin(gangId: string, playerId: string): Promise<boolean> {
    const members = await gangService.getMembers(gangId);
    const member = members.find((m) => m.playerId === playerId);
    const role: string = member?.role ?? "";
    return member?.state === "ACTIVE" && (role === "OWNER" || role === "ADMIN");
  }

  /**
   * Private community content — who is in the group, what it says, what it
   * spends — is for active members only. Sends the 403 itself; callers just
   * `return` when this resolves false. A guest, a signed-out browser, and a
   * signed-in stranger are all the same answer here.
   */
  async function requireActiveMember(req: Request, res: Response, gangId: string): Promise<boolean> {
    const playerInfo = extractPlayerFromReq(req);
    if (playerInfo && (await gangService.isActiveMember(gangId, playerInfo.playerId))) return true;
    res.status(403).json({ success: false, error: "Only active members can view this Gang's content." });
    return false;
  }

  // Search/Browse Gangs
  router.get("/", async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const language = typeof req.query.language === "string" ? req.query.language : undefined;
    const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;

    const results = await gangService.searchGangs({ search, language, tag });
    res.json({ success: true, gangs: results });
  });

  // Get Player's Gangs. Only the player themselves: the list includes groups hidden from search, and player ids
  // are visible to everyone at a table. (The app reads its own list from `/my`.)
  router.get("/user/:playerId", requireSelfParam(), async (req, res) => {
    const gangs = await gangService.getPlayerGangs(req.params.playerId);
    res.json({ success: true, gangs });
  });

  // Create Gang (Members Only)
  router.post("/", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({
        success: false,
        error: "Only signed-in members can create a Gang. Guests are not permitted.",
      });
      return;
    }

    const creatorId = playerInfo.playerId;
    const creatorName: string = req.body.creatorName || "Gang Founder";
    const creatorAvatar: string = memberAvatar(req.body.creatorAvatar);

    // Support both direct payload (req.body) and nested payload (req.body.payload)
    const payload = req.body.payload || (req.body.name ? req.body : null);

    if (!payload?.name || !payload?.handle) {
      res.status(400).json({ success: false, error: "Missing required Gang name or handle." });
      return;
    }

    const result = await gangService.createGang(creatorId, creatorName, creatorAvatar, payload);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, gang: result.gang });
  });

  // Get Gang by Handle
  router.get("/handle/:handle", async (req, res) => {
    const gang = await gangService.getGangByHandle(req.params.handle);
    if (!gang) {
      res.status(404).json({ error: "Gang not found." });
      return;
    }
    res.json({ gang });
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
    const result = await gangService.resolveInviteLink(token);
    res.json(result);
  });

  /**
   * GET /my — Gangs the requesting player belongs to.
   * Must be registered BEFORE /:handleOrId.
   */
  router.get("/my", async (req, res) => {
    if (!req.player) {
      res.json({ success: true, gangs: [] });
      return;
    }

    const gangs = await gangService.getPlayerGangs(req.player.playerId);
    res.json({ success: true, gangs });
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
    const { retryAfterMs } = await gangService.getCoinRequestCooldown(req.player.playerId);
    res.json({ success: true, retryAfterMs });
  });

  /**
   * GET /notifications/digests — one summary per Gang the caller belongs
   * to: what they missed, in a single item each. Must be registered BEFORE
   * /:handleOrId.
   */
  router.get("/notifications/digests", async (req, res) => {
    if (!req.player) {
      res.json({ success: true, digests: [] });
      return;
    }
    const digests = await gangService.getDigests(req.player.playerId);
    res.json({ success: true, digests });
  });

  /**
   * GET /room-invites/status?codes=ABC234,XYZ789 — where shared rooms stand
   * right now (open / full / in progress / closed). A GET on purpose: cards
   * poll it, and the mutation rate limiter must not be spent on reads. Only
   * codes that were shared into one of the caller's own Gangs are answered.
   */
  router.get("/room-invites/status", async (req, res) => {
    if (!req.player) {
      res.json({ success: true, statuses: [] });
      return;
    }
    const raw = typeof req.query.codes === "string" ? req.query.codes : "";
    const statuses = await gangService.getRoomInviteStatuses(req.player.playerId, raw.split(","));
    res.json({ success: true, statuses });
  });

  // GET /:handleOrId — Full Gang Hub Data (handle or id lookup, returns all sub-resources)
  router.get("/:handleOrId", async (req, res) => {
    const raw = req.params.handleOrId;

    // Try by handle first (strip leading @ if present)
    const handle = raw.replace(/^@/, "");
    let gang = await gangService.getGangByHandle(handle);

    // Fallback: try by opaque ID
    if (!gang) {
      gang = await gangService.getGangById(raw);
    }

    if (!gang) {
      res.status(404).json({ success: false, error: "Gang not found." });
      return;
    }

    // Anyone may see what a Gang IS (name, description, size) — that is its
    // storefront. What is INSIDE it is for members. A visitor gets the storefront
    // and empty lists, so the page can offer "Join" without exposing a thing.
    const viewer = extractPlayerFromReq(req);
    const viewerIsMember = viewer ? await gangService.isActiveMember(gang.id, viewer.playerId) : false;
    if (!viewerIsMember) {
      res.json({ success: true, gang, members: [], channels: [], memories: [], events: [] });
      return;
    }

    const [members, channels, memories, events] = await Promise.all([
      gangService.getMembers(gang.id),
      gangService.getChannels(gang.id),
      Promise.resolve(gangService.getMemories(gang.id)),
      Promise.resolve(gangService.getEvents(gang.id)),
    ]);

    res.json({ success: true, gang, members, channels, memories, events });
  });

  // Get Members
  router.get("/:id/members", async (req, res) => {
    if (!(await requireActiveMember(req, res, req.params.id))) return;
    const members = await gangService.getMembers(req.params.id);
    res.json({ members });
  });

  // Apply or Direct Join (Members Only)
  router.post(["/:id/apply", "/:id/join"], async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({
        success: false,
        error: "Only signed-in members can join a Gang. Guests are not permitted.",
      });
      return;
    }

    // This name is shown to the admins who decide the request, so it is vetted like any other name a client
    // sends that the server re-broadcasts: normalised, stripped of invisible/markup characters, capped.
    const displayName = sanitizePlayerName(req.body.displayName) || "Member";
    const avatar = memberAvatar(req.body.avatar);
    const statement = req.body.statement;
    const invitationId = typeof req.body.invitationId === "string" ? req.body.invitationId : undefined;

    const result = await gangService.applyToGang(req.params.id, playerInfo.playerId, displayName, avatar, statement, invitationId);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, pending: result.pending ?? false });
  });

  // Leave Gang
  router.post("/:id/leave", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to leave a Gang." });
      return;
    }

    const result = await gangService.leaveGang(req.params.id, playerInfo.playerId);
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
    const result = await gangService.updateGangSettings({
      gangId: req.params.id, actorId: playerInfo.playerId,
      name, emblem, description, rules, editPermission, sendPermission, joinApproval,
    });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, gang: result.gang });
  });

  /* ── Invite links ── */

  router.post("/:id/invite-links", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to create an invite link." });
      return;
    }
    const expiresInMs = typeof req.body?.expiresInMs === "number" ? req.body.expiresInMs : undefined;
    const result = await gangService.createInviteLink(req.params.id, playerInfo.playerId, expiresInMs);
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
    const requests = await gangService.getPendingJoinRequests(req.params.id);
    res.json({ success: true, requests });
  });

  // No gangId prefix — request IDs are globally unique and the RPC
  // derives the Gang from the request row itself.
  router.post("/join-requests/:requestId/decide", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to decide a join request." });
      return;
    }
    const approve = req.body?.approve === true;
    const result = await gangService.decideJoinRequest(req.params.requestId, playerInfo.playerId, approve);
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
    const result = await gangService.promoteMember(req.params.id, playerInfo.playerId, req.params.targetId);
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
    const result = await gangService.demoteMember(req.params.id, playerInfo.playerId, req.params.targetId);
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
    const officer = (await gangService.getMembers(req.params.id)).find((m) => m.playerId === playerInfo.playerId);
    const result = await gangService.kickMember(
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
    const result = await gangService.banMember(req.params.id, playerInfo.playerId, req.params.targetId);
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
    const result = await gangService.transferOwnership(req.params.id, playerInfo.playerId, newOwnerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, gang: result.gang });
  });

  // Delete a Gang (owner only). The confirmation is the Gang's own
  // handle, typed by the owner; the actor is only ever the verified caller.
  router.delete("/:id", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to delete a Gang." });
      return;
    }
    if (!playerInfo.isMember) {
      res.status(403).json({ success: false, error: "Only the owner can delete this Gang." });
      return;
    }
    const confirmHandle = typeof req.body?.confirmHandle === "string" ? req.body.confirmHandle : "";
    const result = await gangService.deleteGang(req.params.id, playerInfo.playerId, confirmHandle);
    if (result.success) {
      res.json({ success: true });
      return;
    }
    res.status(DELETE_FAILURE_STATUS[result.code]).json({ success: false, error: result.error });
  });

  // Get Channels
  router.get("/:id/channels", async (req, res) => {
    if (!(await requireActiveMember(req, res, req.params.id))) return;
    const channels = await gangService.getChannels(req.params.id);
    res.json({ channels });
  });

  // Get Channel Messages — private community content, active members only.
  router.get("/:id/channels/:channelId/messages", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !(await gangService.isActiveMember(req.params.id, playerInfo.playerId))) {
      res.status(403).json({ error: "Only active members can read this channel." });
      return;
    }

    // A member's history starts the moment they joined — what was said before
    // that is not theirs, however the group's earlier conversation went.
    const joinedAt = await gangService.getMemberJoinedAt(req.params.id, playerInfo.playerId);
    const limit = Number(req.query.limit) || 50;
    const messages = await gangService.getMessages(req.params.channelId, limit, joinedAt ?? Date.now());
    res.json({ success: true, messages });
  });

  // Share the room you are in as a joinable card in this Gang's chat.
  router.post("/:id/room-invites", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({ success: false, error: "Only signed-in members can share a room to a Gang." });
      return;
    }
    const roomCode = typeof req.body?.roomCode === "string" ? req.body.roomCode : "";
    const channelId = typeof req.body?.channelId === "string" ? req.body.channelId : undefined;
    if (!roomCode) {
      res.status(400).json({ success: false, error: "Missing room code." });
      return;
    }

    const result = await gangService.shareRoomInvite({
      gangId: req.params.id, senderId: playerInfo.playerId, roomCode, channelId,
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

  // Move my read pointer to now (I have looked at this Gang).
  router.post("/:id/read", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to track what you have read." });
      return;
    }
    const result = await gangService.markRead(req.params.id, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, previous: result.previous, current: result.current });
  });

  // How loud this Gang may be for me: ALL, INVITES_ONLY or MUTED.
  router.patch("/:id/notification-level", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to change notification settings." });
      return;
    }
    const level = typeof req.body?.level === "string" ? req.body.level : "";
    const result = await gangService.setNotificationLevel(
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

    const result = await gangService.sendMessage(
      req.params.id, req.params.channelId, playerInfo.playerId,
      senderName || "Member", memberAvatar(senderAvatar), content, replyToId, clientRequestId
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
    const result = await gangService.setMessagePin(req.params.id, req.params.messageId, playerInfo.playerId, pinned);
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
    const result = await gangService.deleteMessage(req.params.id, req.params.messageId, playerInfo.playerId);
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

    const result = gangService.reactToMessage(
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

  // Get Events
  router.get("/:id/events", async (req, res) => {
    if (!(await requireActiveMember(req, res, req.params.id))) return;
    const events = gangService.getEvents(req.params.id);
    res.json({ events });
  });

  // Get Memories (Gnapakalu)
  router.get("/:id/memories", async (req, res) => {
    if (!(await requireActiveMember(req, res, req.params.id))) return;
    const memories = gangService.getMemories(req.params.id);
    res.json({ memories });
  });

  // Transfer Coins (Send / Request) - Members Only
  router.post("/:id/coins/transfer", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({
        success: false,
        error: "Only registered members can transfer or request coins in a Gang.",
      });
      return;
    }

    const { toPlayerId, amount, type, note } = req.body;
    if (!toPlayerId || typeof amount !== "number") {
      res.status(400).json({ success: false, error: "Invalid transfer parameters." });
      return;
    }

    const result = await gangService.transferCoins(req.params.id, playerInfo.playerId, {
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
  router.get("/:id/coins/transfers", async (req, res) => {
    if (!(await requireActiveMember(req, res, req.params.id))) return;
    const joinedAt = await gangService.getMemberJoinedAt(req.params.id, extractPlayerFromReq(req)?.playerId ?? "");
    const transfers = gangService.getCoinTransfers(req.params.id, joinedAt ?? Date.now());
    res.json({ success: true, transfers });
  });

  /* ── Coin requests (the payable request card the chat feed actually renders) ── */

  router.get("/:id/coin-requests", async (req, res) => {
    if (!(await requireActiveMember(req, res, req.params.id))) return;
    const joinedAt = await gangService.getMemberJoinedAt(req.params.id, extractPlayerFromReq(req)?.playerId ?? "");
    const requests = await gangService.getCoinRequests(req.params.id, joinedAt ?? Date.now());
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
    const result = await gangService.createCoinRequest({
      gangId: req.params.id, channelId: req.params.channelId,
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

  // No gangId prefix — same reasoning as join-requests/:requestId/decide.
  router.post("/coin-requests/:requestId/fund", async (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !playerInfo.isMember) {
      res.status(403).json({ success: false, error: "Only signed-in members can pay a coin request." });
      return;
    }
    const result = await gangService.fundCoinRequest(req.params.requestId, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, request: result.request });
  });

  return router;
}
