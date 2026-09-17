/**
 * Mandali — private player circles.
 *
 * One shared contract for both sides: the server refuses what these types
 * say is impossible, and the client renders only what they say exists. The
 * lifecycle states mirror the implementation plan's financial and membership
 * contracts exactly — a request can be funded exactly once, membership is
 * never granted without approval, and every state is explicit rather than
 * inferred from absence.
 */

/** A private group. Created atomically with its owner's membership. */
export interface Mandali {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
}

/** Owner > admin > member. Admins can never act on the owner or peer admins. */
export type MandaliRole = "OWNER" | "ADMIN" | "MEMBER";

/**
 * Joining is always PENDING -> APPROVED | REJECTED | WITHDRAWN.
 * Approval and membership creation are one transaction; a link or code never
 * grants membership by itself.
 */
export type MandaliJoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export interface MandaliMembership {
  id: string;
  mandaliId: string;
  userId: string;
  role: MandaliRole;
  status: MandaliJoinRequestStatus;
  joinedAt: string | null;
}

/** One conversation per group; server assigns ordering and ids. */
export type MandaliMessageKind = "TEXT" | "SYSTEM" | "COIN_REQUEST" | "GAME_SHARE";

export interface MandaliMessage {
  id: string;
  mandaliId: string;
  authorUserId: string | null;
  kind: MandaliMessageKind;
  body: string | null;
  /** Structured payload for COIN_REQUEST / GAME_SHARE cards; opaque to TEXT. */
  card: MandaliCoinRequestCard | MandaliGameShareCard | null;
  createdAt: string;
}

export interface MandaliCoinRequestCard {
  requestId: string;
  amount: number;
  /** OPEN -> FUNDED | CANCELLED | EXPIRED. Immutable amount; a change means a new request. */
  status: "OPEN" | "FUNDED" | "CANCELLED" | "EXPIRED";
  expiresAt: string;
}

export interface MandaliGameShareCard {
  roomCode: string;
  game: string;
  sharedBy: string;
}

/**
 * Public member view — what any approved member may see. Wallet balances are
 * never part of any Mandali payload.
 */
export interface MandaliMemberView {
  userId: string;
  role: MandaliRole;
  displayName: string | null;
  joinedAt: string | null;
}

/** Membership episode visibility floor: new members see history from here on. */
export interface MandaliSnapshot {
  mandali: Mandali;
  callerRole: MandaliRole;
  members: MandaliMemberView[];
}
