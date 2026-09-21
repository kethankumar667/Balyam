import { Router, type Request } from "express";
import type { MandaliService } from "./MandaliService.js";

function extractPlayerFromReq(req: Request): { playerId: string; isMember: boolean } | null {
  if (req.player) {
    return {
      playerId: req.player.playerId,
      isMember: req.player.kind === "member",
    };
  }

  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    try {
      const token = auth.slice(7);
      const [, payloadB64] = token.split(".");
      if (payloadB64) {
        const json = Buffer.from(payloadB64, "base64url").toString("utf8");
        const payload = JSON.parse(json) as { sub?: string };
        if (payload.sub) {
          return { playerId: payload.sub, isMember: true };
        }
      }
    } catch {
      // ignore
    }
  }

  const accountKind = req.headers["x-account-kind"];
  const bodyPlayerId = typeof req.body?.playerId === "string" ? req.body.playerId : null;
  const creatorId = typeof req.body?.creatorId === "string" ? req.body.creatorId : null;
  const id = bodyPlayerId || creatorId;

  if (id) {
    const isMember = accountKind === "member" || (!id.startsWith("guest_") && !id.startsWith("bg_"));
    return { playerId: id, isMember };
  }

  return null;
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
   * Reads playerId from the JWT Bearer token's `sub` claim (base64 decode —
   * no full verification needed here since this only returns community metadata
   * visible to all members anyway). Must be registered BEFORE /:handleOrId.
   */
  router.get("/my", (req, res) => {
    let playerId: string | null = null;

    const auth = req.headers["authorization"];
    if (auth && auth.startsWith("Bearer ")) {
      try {
        const token = auth.slice(7);
        const [, payloadB64] = token.split(".");
        if (payloadB64) {
          const json = Buffer.from(payloadB64, "base64url").toString("utf8");
          const payload = JSON.parse(json) as { sub?: string };
          playerId = payload.sub ?? null;
        }
      } catch {
        // malformed token — return empty
      }
    }

    if (!playerId) {
      res.json({ success: true, mandalis: [] });
      return;
    }

    const mandalis = mandaliService.getPlayerMandalis(playerId);
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

    const playerId = playerInfo.playerId || req.body.playerId;
    const displayName = req.body.displayName || "Member";
    const avatar = req.body.avatar || "file_0000000084c48208b1f893419d784cf2_1.jpg";
    const statement = req.body.statement;

    const result = mandaliService.applyToMandali(
      req.params.id,
      playerId,
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
    const playerId = playerInfo?.playerId || req.body.playerId;
    if (!playerId) {
      res.status(400).json({ success: false, error: "Missing playerId." });
      return;
    }

    const result = mandaliService.leaveMandali(req.params.id, playerId);
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

  // Get Channel Messages
  router.get("/:id/channels/:channelId/messages", (req, res) => {
    const limit = Number(req.query.limit) || 50;
    const messages = mandaliService.getMessages(req.params.channelId, limit);
    res.json({ messages });
  });

  // Send Message
  router.post("/:id/channels/:channelId/messages", (req, res) => {
    const { senderId, senderName, senderAvatar, content, replyToId } = req.body;
    if (!senderId || !content) {
      res.status(400).json({ error: "Missing senderId or content." });
      return;
    }

    const result = mandaliService.sendMessage(
      req.params.id,
      req.params.channelId,
      senderId,
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
    const { playerId, emoji } = req.body;
    if (!playerId || !emoji) {
      res.status(400).json({ error: "Missing playerId or emoji." });
      return;
    }

    const result = mandaliService.reactToMessage(
      req.params.id,
      req.params.channelId,
      req.params.messageId,
      playerId,
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
    const { leaderId, leaderName, leaderAvatar, game, modeId, title, slots } = req.body;
    if (!leaderId || !game) {
      res.status(400).json({ error: "Missing required party parameters." });
      return;
    }

    const result = mandaliService.createParty(
      req.params.id,
      leaderId,
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
    const { playerId, displayName, avatar } = req.body;
    if (!playerId) {
      res.status(400).json({ error: "Missing playerId." });
      return;
    }

    const result = mandaliService.joinParty(
      req.params.id,
      req.params.partyId,
      playerId,
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
    const { playerId } = req.body;
    if (!playerId) {
      res.status(400).json({ error: "Missing playerId." });
      return;
    }

    const result = mandaliService.leaveParty(req.params.id, req.params.partyId, playerId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true });
  });

  // Launch Party to Game Handoff (M-10)
  router.post("/:id/parties/:partyId/launch", (req, res) => {
    const { leaderId } = req.body;
    if (!leaderId) {
      res.status(400).json({ error: "Missing leaderId." });
      return;
    }

    const result = mandaliService.launchPartyToGame(
      req.params.id,
      req.params.partyId,
      leaderId
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
