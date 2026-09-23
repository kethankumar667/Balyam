import { Router, type Request } from "express";
import type { MandaliService } from "./MandaliService.js";

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

  // Search/Browse Mandalis
  router.get("/", (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const language = typeof req.query.language === "string" ? req.query.language : undefined;
    const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;

    const results = mandaliService.searchMandalis({ search, language, tag });
    res.json({ success: true, mandalis: results });
  });

  // Get Player's Mandalis
  router.get("/user/:playerId", (req, res) => {
    const playerId = req.params.playerId;
    const mandalis = mandaliService.getPlayerMandalis(playerId);
    res.json({ success: true, mandalis });
  });

  // Create Mandali (Members Only)
  router.post("/", (req, res) => {
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

    const result = mandaliService.createMandali(
      creatorId,
      creatorName,
      creatorAvatar,
      payload
    );

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, mandali: result.mandali });
  });


  // Get Mandali by Handle
  router.get("/handle/:handle", (req, res) => {
    const mandali = mandaliService.getMandaliByHandle(req.params.handle);
    if (!mandali) {
      res.status(404).json({ error: "Mandali not found." });
      return;
    }
    res.json({ mandali });
  });

  /**
   * GET /my — Mandalis the requesting player belongs to.
   * Must be registered BEFORE /:handleOrId.
   */
  router.get("/my", (req, res) => {
    if (!req.player) {
      res.json({ success: true, mandalis: [] });
      return;
    }

    const mandalis = mandaliService.getPlayerMandalis(req.player.playerId);
    res.json({ success: true, mandalis });
  });


  // GET /:handleOrId — Full Mandali Hub Data (handle or id lookup, returns all sub-resources)
  router.get("/:handleOrId", (req, res) => {

    const raw = req.params.handleOrId;

    // Try by handle first (strip leading @ if present)
    const handle = raw.replace(/^@/, "");
    let mandali = mandaliService.getMandaliByHandle(handle);

    // Fallback: try by opaque ID
    if (!mandali) {
      mandali = mandaliService.getMandaliById(raw);
    }

    if (!mandali) {
      res.status(404).json({ success: false, error: "Mandali not found." });
      return;
    }

    const members = mandaliService.getMembers(mandali.id);
    const channels = mandaliService.getChannels(mandali.id);
    const parties = mandaliService.getParties(mandali.id);
    const memories = mandaliService.getMemories(mandali.id);
    const events = mandaliService.getEvents(mandali.id);

    res.json({ success: true, mandali, members, channels, parties, memories, events });
  });


  // Get Members
  router.get("/:id/members", (req, res) => {
    const members = mandaliService.getMembers(req.params.id);
    res.json({ members });
  });

  // Apply or Direct Join (Members Only)
  router.post(["/:id/apply", "/:id/join"], (req, res) => {
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

    const result = mandaliService.applyToMandali(
      req.params.id,
      playerInfo.playerId,
      displayName,
      avatar,
      statement
    );

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  });

  // Leave Mandali
  router.post("/:id/leave", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo) {
      res.status(401).json({ success: false, error: "Sign in to leave a Mandali." });
      return;
    }

    const result = mandaliService.leaveMandali(req.params.id, playerInfo.playerId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  });

  // Get Channels
  router.get("/:id/channels", (req, res) => {
    const channels = mandaliService.getChannels(req.params.id);
    res.json({ channels });
  });

  // Get Channel Messages — private community content, active members only.
  router.get("/:id/channels/:channelId/messages", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    if (!playerInfo || !mandaliService.isActiveMember(req.params.id, playerInfo.playerId)) {
      res.status(403).json({ error: "Only active members can read this channel." });
      return;
    }

    const limit = Number(req.query.limit) || 50;
    const messages = mandaliService.getMessages(req.params.channelId, limit);
    res.json({ messages });
  });

  // Send Message
  router.post("/:id/channels/:channelId/messages", (req, res) => {
    const playerInfo = extractPlayerFromReq(req);
    const { senderName, senderAvatar, content, replyToId } = req.body;
    if (!playerInfo || !content) {
      res.status(400).json({ error: "Missing sender identity or content." });
      return;
    }

    const result = mandaliService.sendMessage(
      req.params.id,
      req.params.channelId,
      playerInfo.playerId,
      senderName || "Member",
      senderAvatar || "avatar_1",
      content,
      replyToId
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({ message: result.message });
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

  return router;
}
