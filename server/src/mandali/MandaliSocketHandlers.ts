import type { Server, Socket } from "socket.io";
import type { MandaliService } from "./MandaliService.js";
import type {
  MandaliJoinRoomPayload,
  MandaliLeaveRoomPayload,
  MandaliSendMessagePayload,
  MandaliReactMessagePayload,
  MandaliPartyCreatePayload,
  MandaliPartyJoinPayload,
  MandaliPartyLeavePayload,
  MandaliPartyLaunchPayload,
} from "@shared/mandali/socketContract.js";
import type { GameKind } from "@shared/types.js";
import { logger } from "../lib/logger.js";

export function registerMandaliSocketHandlers(
  _io: Server,
  socket: Socket,
  mandaliService: MandaliService
): void {
  // Join the Mandali broadcast room
  socket.on("mandali:join_room", (payload: MandaliJoinRoomPayload) => {
    if (!payload?.mandaliId) return;
    const roomName = `mandali:${payload.mandaliId}`;
    socket.join(roomName);
    logger.info({
      message: `[MANDALI_SOCKET] Socket ${socket.id} joined room ${roomName}`,
      module: "MANDALI_SOCKET",
    });
  });

  // Leave the Mandali broadcast room
  socket.on("mandali:leave_room", (payload: MandaliLeaveRoomPayload) => {
    if (!payload?.mandaliId) return;
    const roomName = `mandali:${payload.mandaliId}`;
    socket.leave(roomName);
    logger.info({
      message: `[MANDALI_SOCKET] Socket ${socket.id} left room ${roomName}`,
      module: "MANDALI_SOCKET",
    });
  });

  // Send a chat message within a Mandali channel
  socket.on("mandali:chat:send", (payload: MandaliSendMessagePayload, ack?: (res: unknown) => void) => {
    try {
      if (!payload?.mandaliId || !payload?.channelId || !payload?.playerId || !payload?.content) {
        ack?.({ success: false, error: "Invalid chat payload" });
        return;
      }
      const member = mandaliService.getRepository().getMember(payload.mandaliId, payload.playerId);
      const senderName = member?.displayName || "Player";
      const senderAvatar = member?.avatar || "avatar_1";

      const result = mandaliService.sendMessage(
        payload.mandaliId,
        payload.channelId,
        payload.playerId,
        senderName,
        senderAvatar,
        payload.content,
        payload.replyToId
      );
      ack?.(result);
    } catch (err) {
      logger.error({
        message: `Failed to send mandali message: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI_SOCKET",
      });
      ack?.({ success: false, error: "Internal error sending message" });
    }
  });

  // Add or remove a reaction to a message
  socket.on("mandali:chat:react", (payload: MandaliReactMessagePayload, ack?: (res: unknown) => void) => {
    try {
      if (!payload?.mandaliId || !payload?.channelId || !payload?.messageId || !payload?.playerId || !payload?.emoji) {
        ack?.({ success: false, error: "Invalid reaction payload" });
        return;
      }
      const result = mandaliService.reactToMessage(
        payload.mandaliId,
        payload.channelId,
        payload.messageId,
        payload.playerId,
        payload.emoji
      );
      ack?.(result);
    } catch (err) {
      logger.error({
        message: `Failed to react to mandali message: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI_SOCKET",
      });
      ack?.({ success: false, error: "Internal error updating reaction" });
    }
  });

  // Create a game party
  socket.on("mandali:party:create", (payload: MandaliPartyCreatePayload, ack?: (res: unknown) => void) => {
    try {
      if (!payload?.mandaliId || !payload?.playerId || !payload?.game) {
        ack?.({ success: false, error: "Invalid party creation payload" });
        return;
      }
      const member = mandaliService.getRepository().getMember(payload.mandaliId, payload.playerId);
      const leaderName = member?.displayName || "Leader";
      const leaderAvatar = member?.avatar || "avatar_1";

      const result = mandaliService.createParty(
        payload.mandaliId,
        payload.playerId,
        leaderName,
        leaderAvatar,
        payload.game as GameKind,
        payload.modeId || "casual",
        payload.title || "Squad",
        payload.slots || 4
      );
      ack?.(result);
    } catch (err) {
      logger.error({
        message: `Failed to create mandali party: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI_SOCKET",
      });
      ack?.({ success: false, error: "Internal error creating party" });
    }
  });

  // Join a game party
  socket.on("mandali:party:join", (payload: MandaliPartyJoinPayload, ack?: (res: unknown) => void) => {
    try {
      if (!payload?.mandaliId || !payload?.partyId || !payload?.playerId) {
        ack?.({ success: false, error: "Invalid party join payload" });
        return;
      }
      const member = mandaliService.getRepository().getMember(payload.mandaliId, payload.playerId);
      const displayName = member?.displayName || "Player";
      const avatar = member?.avatar || "avatar_1";

      const result = mandaliService.joinParty(
        payload.mandaliId,
        payload.partyId,
        payload.playerId,
        displayName,
        avatar
      );
      ack?.(result);
    } catch (err) {
      logger.error({
        message: `Failed to join mandali party: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI_SOCKET",
      });
      ack?.({ success: false, error: "Internal error joining party" });
    }
  });

  // Leave a game party
  socket.on("mandali:party:leave", (payload: MandaliPartyLeavePayload, ack?: (res: unknown) => void) => {
    try {
      if (!payload?.mandaliId || !payload?.partyId || !payload?.playerId) {
        ack?.({ success: false, error: "Invalid party leave payload" });
        return;
      }
      const result = mandaliService.leaveParty(payload.mandaliId, payload.partyId, payload.playerId);
      ack?.(result);
    } catch (err) {
      logger.error({
        message: `Failed to leave mandali party: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI_SOCKET",
      });
      ack?.({ success: false, error: "Internal error leaving party" });
    }
  });

  // Launch a game party (M-10 Handoff)
  socket.on("mandali:party:launch", (payload: MandaliPartyLaunchPayload, ack?: (res: unknown) => void) => {
    try {
      if (!payload?.mandaliId || !payload?.partyId || !payload?.leaderId) {
        ack?.({ success: false, error: "Invalid party launch payload" });
        return;
      }
      const result = mandaliService.launchPartyToGame(
        payload.mandaliId,
        payload.partyId,
        payload.leaderId
      );
      ack?.(result);
    } catch (err) {
      logger.error({
        message: `Failed to launch mandali party: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI_SOCKET",
      });
      ack?.({ success: false, error: "Internal error launching party" });
    }
  });
}
