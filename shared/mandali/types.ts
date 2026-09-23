import type { GameKind } from "../types.js";

export type MandaliVisibility = "PUBLIC" | "DISCOVERABLE" | "INVITE_ONLY" | "HIDDEN";

export type MandaliRole =
  | "OWNER"
  | "LEADER"
  | "OFFICER"
  | "EVENT_HOST"
  | "MODERATOR"
  | "MEMBER"
  | "TRIAL";

export type ApplicationState =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";

export type InvitationState =
  | "CREATED"
  | "SENT"
  | "ACCEPTED"
  | "DECLINED"
  | "REVOKED"
  | "EXPIRED";

export type MembershipState =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "LEFT"
  | "REMOVED"
  | "BANNED";

export type RoleAssignmentState = "PROPOSED" | "ACTIVE" | "REVOKED" | "EXPIRED";

export type OwnershipTransferState =
  | "REQUESTED"
  | "VERIFIED"
  | "EFFECTIVE"
  | "CANCELLED"
  | "FAILED";

export type ChannelType = "ANNOUNCEMENT" | "TEXT" | "PARTY_FINDING";

export type PartyStatus = "FORMING" | "LAUNCHING" | "IN_GAME" | "DISBANDED";

export type MemorySourceType = "GAME_VICTORY" | "EVENT_MILESTONE" | "COMMUNITY_MILESTONE" | "ANNIVERSARY";

export interface Mandali {
  id: string;
  handle: string; // e.g. "ludo-kings" (without @)
  name: string;
  description: string;
  emblem: string; // Icon or avatar identifier
  bannerGradient?: string;
  language: string; // e.g. "Telugu", "Hindi", "English"
  region: string;
  tags: string[]; // e.g. ["Casual", "Ludo Masters", "Cricket"]
  visibility: MandaliVisibility;
  memberCount: number;
  maxMembers: number; // default 50
  level: number;
  xp: number;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  /** Durable-mode only (undefined in the in-memory dev fallback) — "Group
   * Settings & Permissions" from the WhatsApp-parity spec. */
  rules?: string;
  editPermission?: "ADMIN" | "ALL";
  sendPermission?: "ADMIN" | "ALL";
  joinApproval?: boolean;
}

export interface MandaliMember {
  memberId: string;
  mandaliId: string;
  playerId: string;
  displayName: string;
  avatar: string;
  role: MandaliRole;
  state: MembershipState;
  joinedAt: number;
  presence: "online" | "in-game" | "idle" | "offline";
  activeGame?: GameKind;
  contributionScore: number;
}

export interface MandaliApplication {
  id: string;
  mandaliId: string;
  playerId: string;
  displayName: string;
  avatar: string;
  statement?: string;
  state: ApplicationState;
  reviewedBy?: string;
  reviewReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MandaliInvitation {
  id: string;
  mandaliId: string;
  inviterId: string;
  inviteePlayerId: string;
  state: InvitationState;
  createdAt: number;
  expiresAt: number;
}

export interface MandaliChannel {
  channelId: string;
  mandaliId: string;
  name: string; // e.g. "announcements", "lounge-chat", "party-squad"
  type: ChannelType;
  description: string;
  slowModeSeconds: number;
  isArchived: boolean;
  position: number;
}

export type MandaliMessageKind = "TEXT" | "SYSTEM" | "COIN_REQUEST";

export interface MandaliMessage {
  messageId: string;
  channelId: string;
  mandaliId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: MandaliRole;
  content: string;
  reactions: Record<string, string[]>; // emoji -> array of playerIds
  replyToId?: string;
  pinned?: boolean;
  timestamp: number;
  edited?: boolean;
  kind?: MandaliMessageKind;
}

export interface MandaliPartyMember {
  playerId: string;
  displayName: string;
  avatar: string;
  isReady: boolean;
}

export interface MandaliParty {
  partyId: string;
  mandaliId: string;
  leaderId: string;
  leaderName: string;
  game: GameKind;
  modeId: string;
  title: string;
  slots: number; // max players allowed (e.g. 2, 4)
  members: MandaliPartyMember[];
  status: PartyStatus;
  roomCode?: string; // set upon game launch handoff
  createdAt: number;
}

export interface MandaliEvent {
  eventId: string;
  mandaliId: string;
  title: string;
  description: string;
  game?: GameKind;
  modeId?: string;
  scheduledAt: number;
  hostId: string;
  hostName: string;
  capacity?: number;
  attendeeIds: string[];
  isCompleted: boolean;
  createdAt: number;
}

export interface MandaliMemory {
  memoryId: string;
  mandaliId: string;
  type: MemorySourceType;
  title: string;
  description: string;
  game?: GameKind;
  matchId?: string;
  highlightStat?: string; // e.g. "Won by 48 runs" or "Sub-20 turns speedrun"
  celebratedBy: string[]; // playerIds of players who gave props
  timestamp: number;
}

export interface MandaliAuditLog {
  logId: string;
  mandaliId: string;
  actorId: string;
  actorName: string;
  action: string;
  subjectId?: string;
  reason?: string;
  details: string;
  timestamp: number;
}

export interface CreateMandaliPayload {
  name: string;
  handle: string;
  description: string;
  emblem?: string;
  bannerGradient?: string;
  language?: string;
  region?: string;
  tags?: string[];
  visibility?: MandaliVisibility;
}

export type CoinTransferType = "SEND" | "REQUEST";
export type CoinTransferStatus = "COMPLETED" | "PENDING" | "DECLINED";

export interface MandaliCoinTransfer {
  transferId: string;
  mandaliId: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;
  type: CoinTransferType;
  status: CoinTransferStatus;
  note?: string;
  timestamp: number;
}

export interface CoinTransferPayload {
  toPlayerId: string;
  amount: number;
  type: CoinTransferType;
  note?: string;
}

/**
 * The durable membership/group model backing the WhatsApp-parity work
 * (invite links, promote/demote/kick/ban/transfer, pinned/deleted messages,
 * payable coin-request cards) — see `supabase/migrations/
 * 20261001000000_mandali_persistence_foundation.sql`.
 *
 * Deliberately separate from the pre-existing scaffolding types above
 * (`MandaliInvitation`, `MandaliApplication`) rather than reshaping them:
 * those model direct player-to-player invites and a broader application
 * workflow that were never wired to any reachable route, while these model
 * exactly what shipped — a shareable hashed-token link, a simple
 * approve/reject request, and a single-payer coin request.
 */

/** The durable role model is OWNER/ADMIN/MEMBER — see the migration's own
 * header for why this collapses the wider `MandaliRole` union above. */
export type MandaliRoleV2 = "OWNER" | "ADMIN" | "MEMBER";

export type MandaliMembershipStateV2 = "ACTIVE" | "LEFT" | "REMOVED" | "BANNED";

export interface MandaliInviteLink {
  id: string;
  mandaliId: string;
  /** The raw, shareable token — present only in the response to the create
   * call. Never re-derivable afterward; only its hash is persisted. */
  token?: string;
  issuerIdentityId: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  useCount: number;
  useLimit: number;
  expiresAt: number;
  createdAt: number;
}

export interface MandaliJoinRequestRecord {
  id: string;
  mandaliId: string;
  requesterIdentityId: string;
  invitationId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";
  reviewerIdentityId?: string | null;
  createdAt: number;
  decidedAt?: number | null;
}

export type MandaliCoinRequestStatus = "OPEN" | "FUNDED" | "CANCELLED" | "EXPIRED";

export interface MandaliCoinRequest {
  id: string;
  mandaliId: string;
  messageId?: string | null;
  /** Asks for coins — receives the transfer once funded. */
  requesterIdentityId: string;
  /** The one designated recipient of the ask — pays. */
  payerIdentityId: string;
  amount: number;
  status: MandaliCoinRequestStatus;
  expiresAt: number;
  createdAt: number;
  decidedAt?: number | null;
}

