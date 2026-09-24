import type { RoomInviteMetadata } from "./types.js";

/**
 * Mandali notifications and shared-room status — the shapes both sides agree on.
 *
 * The idea: a Mandali someone was away from becomes ONE notification that
 * describes what they missed (a digest), never one per message. A room shared
 * into chat is different — it is something to act on, so it is its own item.
 */

/** How loud a Mandali may be for one member. */
export type NotificationLevel = "ALL" | "INVITES_ONLY" | "MUTED";

export interface MandaliDigestSender {
  name: string;
  count: number;
}

export interface MandaliDigestInvite {
  messageId: string;
  roomCode: string;
  senderName: string;
  metadata: Partial<RoomInviteMetadata>;
  at: string;
}

/** Everything one member missed in one Mandali, summarised. */
export interface MandaliDigest {
  mandaliId: string;
  handle: string;
  name: string;
  emblem: string;
  level: NotificationLevel;
  lastReadAt: string;
  /** Capped at 1000 by the server; show "999+" when it reaches that. */
  unreadCount: number;
  /** How many different people wrote it. */
  senderCount: number;
  /** Up to three, most active first. */
  topSenders: MandaliDigestSender[];
  latest: { senderName: string; kind: string; preview: string; at: string } | null;
  /** Unread room invites (newest first, up to five) — shown separately from the digest. */
  invites: MandaliDigestInvite[];
}

/**
 * Where a shared room stands right now.
 *  - OPEN         lobby with a free seat
 *  - FULL         lobby, every seat taken
 *  - IN_PROGRESS  the match has started
 *  - CLOSED       finished, or the room no longer exists
 */
export type RoomInviteState = "OPEN" | "FULL" | "IN_PROGRESS" | "CLOSED";

export interface RoomInviteStatus {
  code: string;
  state: RoomInviteState;
  players: number;
  maxPlayers: number;
  /** True when the asking member already holds a seat in this room. */
  youAreIn: boolean;
}

/**
 * Sent to everyone who was in a Mandali when its owner deletes it — to the
 * Mandali's own room and to each member's personal room, so it reaches them
 * whether they were reading the chat or somewhere else in the app. Carries the
 * name because by the time it arrives there is nothing left to look it up in.
 */
export interface MandaliDeletedEvent {
  mandaliId: string;
  name: string;
}

/** Sent to every connected member of a Mandali when something new is said in it. */
export interface MandaliActivityEvent {
  mandaliId: string;
  channelId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  kind: string;
  preview: string;
  at: number;
  roomCode?: string;
  roomInvite?: Partial<RoomInviteMetadata>;
}
