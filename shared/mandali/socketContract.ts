import type {
  MandaliMessage,
  MandaliParty,
  MandaliMember,
  MandaliMemory,
} from "./types.js";

export interface MandaliJoinRoomPayload {
  mandaliId: string;
  playerId: string;
}

export interface MandaliLeaveRoomPayload {
  mandaliId: string;
  playerId: string;
}

export interface MandaliSendMessagePayload {
  mandaliId: string;
  channelId: string;
  playerId: string;
  content: string;
  replyToId?: string;
}

export interface MandaliReactMessagePayload {
  mandaliId: string;
  channelId: string;
  messageId: string;
  playerId: string;
  emoji: string;
}

export interface MandaliPartyCreatePayload {
  mandaliId: string;
  playerId: string;
  game: string;
  modeId: string;
  title: string;
  slots: number;
}

export interface MandaliPartyJoinPayload {
  mandaliId: string;
  partyId: string;
  playerId: string;
}

export interface MandaliPartyLeavePayload {
  mandaliId: string;
  partyId: string;
  playerId: string;
}

export interface MandaliPartyLaunchPayload {
  mandaliId: string;
  partyId: string;
  leaderId: string;
}

export interface MandaliPartyLaunchedBroadcast {
  mandaliId: string;
  partyId: string;
  roomCode: string;
  game: string;
  members: { playerId: string; name: string }[];
}

export interface MandaliReactionUpdatedBroadcast {
  mandaliId: string;
  channelId: string;
  messageId: string;
  emoji: string;
  reactions: Record<string, string[]>;
}

export interface MandaliPresenceChangedBroadcast {
  mandaliId: string;
  member: MandaliMember;
}

export interface MandaliMemoryCreatedBroadcast {
  mandaliId: string;
  memory: MandaliMemory;
}
