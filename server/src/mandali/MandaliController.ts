import { Router } from "express";
import type { MandaliService } from "./MandaliService.js";

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

  // Create Mandali
  router.post("/", (req, res) => {
    const { creatorId, creatorName, creatorAvatar, payload } = req.body;
    if (!creatorId || !creatorName || !payload?.name || !payload?.handle) {
      res.status(400).json({ error: "Missing required Mandali creation fields." });
      return;
    }

    const result = mandaliService.createMandali(
      creatorId,
      creatorName,
      creatorAvatar || "avatar_1",
      payload
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({ mandali: result.mandali });
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

  // Get Mandali by ID
  router.get("/:id", (req, res) => {
    const mandali = mandaliService.getMandaliById(req.params.id);
    if (!mandali) {
      res.status(404).json({ error: "Mandali not found." });
      return;
    }
    res.json({ mandali });
  });

  // Get Members
  router.get("/:id/members", (req, res) => {
    const members = mandaliService.getMembers(req.params.id);
    res.json({ members });
  });

  // Apply or Direct Join
  router.post("/:id/apply", (req, res) => {
    const { playerId, displayName, avatar, statement } = req.body;
    if (!playerId || !displayName) {
      res.status(400).json({ error: "Missing playerId or displayName." });
      return;
    }

    const result = mandaliService.applyToMandali(
      req.params.id,
      playerId,
      displayName,
      avatar || "avatar_1",
      statement
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true });
  });

  // Leave Mandali
  router.post("/:id/leave", (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
      res.status(400).json({ error: "Missing playerId." });
      return;
    }

    const result = mandaliService.leaveMandali(req.params.id, playerId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
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

  return router;
}
