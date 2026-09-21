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
