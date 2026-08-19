import type { PartyMember } from "./PartyMember";
import type { GameKind } from "../types";

export type PartyStatus =
  | "CREATED"
  | "INVITING"
  | "READY"
  | "IN_MATCH"
  | "DISBANDED";

export interface Party {
  id: string;
  leaderId: string;
  members: PartyMember[];
  maxMembers: number;
  status: PartyStatus;
  targetGame?: GameKind;
  targetRoomCode?: string;
  targetTournamentId?: string;
  createdAt: number;
  updatedAt: number;
}

export type PartyInvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface PartyInvitation {
  id: string;
  partyId: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  status: PartyInvitationStatus;
  createdAt: number;
}
