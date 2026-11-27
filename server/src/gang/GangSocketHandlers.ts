import type { Server, Socket } from "socket.io";
import type { GangService } from "./GangService.js";
import type {
  GangAuthenticatePayload,
  GangAuthenticateResult,
  GangJoinRoomPayload,
  GangLeaveRoomPayload,
  GangSendMessagePayload,
  GangReactMessagePayload,
} from "@shared/gang/socketContract.js";
import type { GameKind } from "@shared/types.js";
import { resolvePlayerIdentity, type PlayerIdentity } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import { adminPlayerService } from "../admin/AdminPlayerService.js";

interface GangSocketData {
  gangPlayer?: PlayerIdentity;
}

/**
 * Every handler below used to trust `payload.playerId` / `payload.leaderId`
 * verbatim — a client could claim to be any Gang member with zero
 * credentials, since nothing compared that claim against who the socket
 * actually authenticated as. This mirrors the same bug the HTTP side had
 * before `GangController.ts`'s `extractPlayerFromReq` was locked to
 * `req.player`, except the socket transport had no equivalent of `req.player`
 * to lock to at all.
 *
 * `gang:authenticate` is the fix: the client sends its bearer token once
 * per connection (the same token `apiFetch` already attaches to HTTP calls),
 * verified here with the identical `resolvePlayerIdentity` the HTTP
 * middleware uses, and the result is bound to `socket.data.gangPlayer` —
 * per-connection state Socket.IO clears automatically on disconnect. Every
 * other handler below reads identity from there, never from the payload;
 * a payload's `playerId`/`leaderId` field is kept only where the wire
 * contract still carries it for logging/display, and is never used for
 * authorization or as the actor written to the database.
 *
 * This does not force the shared, unauthenticated game socket
 * (`client/src/lib/socket.ts`) through a global auth gate — only the
 * `gang:*` events below check `socket.data.gangPlayer`. Ordinary room
 * gameplay is untouched.
 */
function requireAuthenticatedActor(
  socket: Socket,
  ack: ((res: unknown) => void) | undefined,
): string | null {
  const data = socket.data as GangSocketData;
  const playerId = data.gangPlayer?.playerId;
  if (adminPlayerService().isDenied(playerId)) {
    ack?.({ success: false, error: "This identity is suspended." });
    socket.disconnect(true);
    return null;
  }
  if (!playerId) {
    ack?.({ success: false, error: "Not authenticated. Emit gang:authenticate first." });
    return null;
  }
  return playerId;
}

export function registerGangSocketHandlers(
  _io: Server,
  socket: Socket,
  gangService: GangService
): void {
  // Authenticate this connection for Gang actions. Must be emitted before
  // any other gang:* event; everything else refuses until this succeeds.
  socket.on(
    "gang:authenticate",
    async (payload: GangAuthenticatePayload, ack?: (res: GangAuthenticateResult) => void) => {
      try {
        const identity = await resolvePlayerIdentity(payload?.token);
        if (!identity) {
          ack?.({ success: false, error: "Invalid or expired credential" });
          return;
        }
        adminPlayerService().assertAllowed(identity.playerId);
        if (socket.connected === false) return;
        // Re-authenticating as someone else must not keep the last person's
        // rooms: their personal feed and every Gang chat they had joined.
        const previous = (socket.data as GangSocketData).gangPlayer;
        if (previous && previous.playerId !== identity.playerId) {
          for (const room of [...socket.rooms]) {
            if (room === `user:${previous.playerId}` || room.startsWith("gang:")) void socket.leave(room);
          }
        }
        (socket.data as GangSocketData).gangPlayer = identity;
        // A personal room, so "something new in one of your Gangs" can reach
        // this person anywhere in the app — not only while a hub page is open.
        void socket.join(`user:${identity.playerId}`);
        // Coming online is told at once; going offline and starting a game are noticed by the sweep.
        void gangService.refreshPresence([identity.playerId]);
        ack?.({ success: true, playerId: identity.playerId });
      } catch (err) {
        logger.error({
          message: `Gang socket authentication failed: ${err instanceof Error ? err.message : String(err)}`,
          module: "GANG_SOCKET",
        });
        ack?.({ success: false, error: "Internal error authenticating" });
      }
    }
  );

  // Join the Gang broadcast room
  socket.on("gang:join_room", async (payload: GangJoinRoomPayload) => {
    const actorId = requireAuthenticatedActor(socket, undefined);
    if (!actorId || !payload?.gangId) return;
    // The room carries the group's live conversation. Being authenticated is
    // not being a member: a guest, or a member of some other Gang, gets
    // nothing from this one.
    try {
      if (!(await gangService.isActiveMember(payload.gangId, actorId))) return;
    } catch {
      return;
    }
    if (adminPlayerService().isDenied(actorId) || socket.connected === false) return;
    const roomName = `gang:${payload.gangId}`;
    socket.join(roomName);
    logger.info({
      message: `[GANG_SOCKET] Socket ${socket.id} joined room ${roomName}`,
      module: "GANG_SOCKET",
    });
  });

  // Leave the Gang broadcast room
  socket.on("gang:leave_room", (payload: GangLeaveRoomPayload) => {
    if (!payload?.gangId) return;
    const roomName = `gang:${payload.gangId}`;
    socket.leave(roomName);
    logger.info({
      message: `[GANG_SOCKET] Socket ${socket.id} left room ${roomName}`,
      module: "GANG_SOCKET",
    });
  });

  // Send a chat message within a Gang channel
  socket.on("gang:chat:send", async (payload: GangSendMessagePayload, ack?: (res: unknown) => void) => {
    try {
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.gangId || !payload?.channelId || !payload?.content) {
        ack?.({ success: false, error: "Invalid chat payload" });
        return;
      }
      const member = gangService.getRepository().getMember(payload.gangId, actorId);
      const senderName = member?.displayName || "Player";
      const senderAvatar = member?.avatar || "avatar_1";

      const result = await gangService.sendMessage(
        payload.gangId,
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
        message: `Failed to send gang message: ${err instanceof Error ? err.message : String(err)}`,
        module: "GANG_SOCKET",
      });
      ack?.({ success: false, error: "Internal error sending message" });
    }
  });

  // Add or remove a reaction to a message
  socket.on("gang:chat:react", (payload: GangReactMessagePayload, ack?: (res: unknown) => void) => {
    try {
      const actorId = requireAuthenticatedActor(socket, ack);
      if (!actorId) return;
      if (!payload?.gangId || !payload?.channelId || !payload?.messageId || !payload?.emoji) {
        ack?.({ success: false, error: "Invalid reaction payload" });
        return;
      }
      const result = gangService.reactToMessage(
        payload.gangId,
        payload.channelId,
        payload.messageId,
        actorId,
        payload.emoji
      );
      ack?.(result);
    } catch (err) {
      logger.error({
        message: `Failed to react to gang message: ${err instanceof Error ? err.message : String(err)}`,
        module: "GANG_SOCKET",
      });
      ack?.({ success: false, error: "Internal error updating reaction" });
    }
  });
}
