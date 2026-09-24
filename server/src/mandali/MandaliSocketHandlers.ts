import type { Server, Socket } from "socket.io";
import type { MandaliService } from "./MandaliService.js";
import type {
  MandaliAuthenticatePayload,
  MandaliAuthenticateResult,
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
import { resolvePlayerIdentity, type PlayerIdentity } from "../auth/identity.js";
import { logger } from "../lib/logger.js";

interface MandaliSocketData {
  mandaliPlayer?: PlayerIdentity;
}

/**
 * Every handler below used to trust `payload.playerId` / `payload.leaderId`
 * verbatim — a client could claim to be any Mandali member with zero
 * credentials, since nothing compared that claim against who the socket
 * actually authenticated as. This mirrors the same bug the HTTP side had
 * before `MandaliController.ts`'s `extractPlayerFromReq` was locked to
 * `req.player`, except the socket transport had no equivalent of `req.player`
 * to lock to at all.
 *
 * `mandali:authenticate` is the fix: the client sends its bearer token once
 * per connection (the same token `apiFetch` already attaches to HTTP calls),
 * verified here with the identical `resolvePlayerIdentity` the HTTP
 * middleware uses, and the result is bound to `socket.data.mandaliPlayer` —
 * per-connection state Socket.IO clears automatically on disconnect. Every
 * other handler below reads identity from there, never from the payload;
 * a payload's `playerId`/`leaderId` field is kept only where the wire
 * contract still carries it for logging/display, and is never used for
 * authorization or as the actor written to the database.
 *
 * This does not force the shared, unauthenticated game socket
 * (`client/src/lib/socket.ts`) through a global auth gate — only the
 * `mandali:*` events below check `socket.data.mandaliPlayer`. Ordinary room
 * gameplay is untouched.
 */
function requireAuthenticatedActor(
  socket: Socket,
  ack: ((res: unknown) => void) | undefined,
): string | null {
  const data = socket.data as MandaliSocketData;
  const playerId = data.mandaliPlayer?.playerId;
  if (!playerId) {
    ack?.({ success: false, error: "Not authenticated. Emit mandali:authenticate first." });
    return null;
  }
  return playerId;
}

export function registerMandaliSocketHandlers(
  _io: Server,
  socket: Socket,
  mandaliService: MandaliService
): void {
  // Authenticate this connection for Mandali actions. Must be emitted before
  // any other mandali:* event; everything else refuses until this succeeds.
  socket.on(
    "mandali:authenticate",
    async (payload: MandaliAuthenticatePayload, ack?: (res: MandaliAuthenticateResult) => void) => {
      try {
        const identity = await resolvePlayerIdentity(payload?.token);
        if (!identity) {
          ack?.({ success: false, error: "Invalid or expired credential" });
          return;
        }
        // Re-authenticating as someone else must not keep the last person's
        // rooms: their personal feed and every Mandali chat they had joined.
        const previous = (socket.data as MandaliSocketData).mandaliPlayer;
        if (previous && previous.playerId !== identity.playerId) {
          for (const room of [...socket.rooms]) {
            if (room === `user:${previous.playerId}` || room.startsWith("mandali:")) void socket.leave(room);
          }
        }
        (socket.data as MandaliSocketData).mandaliPlayer = identity;
        // A personal room, so "something new in one of your Mandalis" can reach
        // this person anywhere in the app — not only while a hub page is open.
        void socket.join(`user:${identity.playerId}`);
        ack?.({ success: true, playerId: identity.playerId });
      } catch (err) {
        logger.error({
          message: `Mandali socket authentication failed: ${err instanceof Error ? err.message : String(err)}`,
          module: "MANDALI_SOCKET",
        });
        ack?.({ success: false, error: "Internal error authenticating" });
      }
    }
  );

  // Join the Mandali broadcast room
  socket.on("mandali:join_room", async (payload: MandaliJoinRoomPayload) => {
    const actorId = requireAuthenticatedActor(socket, undefined);
    if (!actorId || !payload?.mandaliId) return;
    // The room carries the group's live conversation. Being authenticated is
    // not being a member: a guest, or a member of some other Mandali, gets
    // nothing from this one.
    try {
      if (!(await mandaliService.isActiveMember(payload.mandaliId, actorId))) return;
    } catch {
      return;
    }
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
  socket.on("mandali:chat:send", async (payload: MandaliSendMessagePayload, ack?: (res: unknown) => void) => {
    try {
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.mandaliId || !payload?.channelId || !payload?.content) {
        ack?.({ success: false, error: "Invalid chat payload" });
        return;
      }
      const member = mandaliService.getRepository().getMember(payload.mandaliId, actorId);
      const senderName = member?.displayName || "Player";
      const senderAvatar = member?.avatar || "avatar_1";

      const result = await mandaliService.sendMessage(
        payload.mandaliId,
        payload.channelId,
        actorId,
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
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.mandaliId || !payload?.channelId || !payload?.messageId || !payload?.emoji) {
        ack?.({ success: false, error: "Invalid reaction payload" });
        return;
      }
      const result = mandaliService.reactToMessage(
        payload.mandaliId,
        payload.channelId,
        payload.messageId,
        actorId,
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
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.mandaliId || !payload?.game) {
        ack?.({ success: false, error: "Invalid party creation payload" });
        return;
      }
      const member = mandaliService.getRepository().getMember(payload.mandaliId, actorId);
      const leaderName = member?.displayName || "Leader";
      const leaderAvatar = member?.avatar || "avatar_1";

      const result = mandaliService.createParty(
        payload.mandaliId,
        actorId,
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
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.mandaliId || !payload?.partyId) {
        ack?.({ success: false, error: "Invalid party join payload" });
        return;
      }
      const member = mandaliService.getRepository().getMember(payload.mandaliId, actorId);
      const displayName = member?.displayName || "Player";
      const avatar = member?.avatar || "avatar_1";

      const result = mandaliService.joinParty(
        payload.mandaliId,
        payload.partyId,
        actorId,
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
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.mandaliId || !payload?.partyId) {
        ack?.({ success: false, error: "Invalid party leave payload" });
        return;
      }
      const result = mandaliService.leaveParty(payload.mandaliId, payload.partyId, actorId);
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
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.mandaliId || !payload?.partyId) {
        ack?.({ success: false, error: "Invalid party launch payload" });
        return;
      }
      const result = mandaliService.launchPartyToGame(
        payload.mandaliId,
        payload.partyId,
        actorId
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
