import type {
  GangMessage,
  GangMember,
  GangMemory,
} from "./types.js";

/**
 * Sent once per connection before any other `gang:*` event. The server
 * verifies `token` the same way HTTP requests are verified
 * (`attachPlayerIdentity` in `server/src/auth/identity.ts`) and binds the
 * result to `socket.data.gangPlayer` — every other Gang handler reads
 * identity from there, never from a payload field, so a client can no longer
 * claim to be a different member by editing `playerId`/`leaderId` in an
 * event payload.
 */
export interface GangAuthenticatePayload {
  token: string;
}

export interface GangAuthenticateResult {
  success: boolean;
  playerId?: string;
  error?: string;
}

export interface GangJoinRoomPayload {
  gangId: string;
  playerId: string;
}

export interface GangLeaveRoomPayload {
  gangId: string;
  playerId: string;
}

export interface GangSendMessagePayload {
  gangId: string;
  channelId: string;
  playerId: string;
  content: string;
  replyToId?: string;
}

export interface GangReactMessagePayload {
  gangId: string;
  channelId: string;
  messageId: string;
  playerId: string;
  emoji: string;
}

export interface GangReactionUpdatedBroadcast {
  gangId: string;
  channelId: string;
  messageId: string;
  emoji: string;
  reactions: Record<string, string[]>;
}

export interface GangPresenceChangedBroadcast {
  gangId: string;
  member: GangMember;
}

export interface GangMemoryCreatedBroadcast {
  gangId: string;
  memory: GangMemory;
}
