import type { Party, PartyInvitation } from "@shared/party/Party.js";
import type { PartyMember } from "@shared/party/PartyMember.js";
import type { GameKind } from "@shared/types.js";
import { PartyEngine } from "./PartyEngine.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

export class PartyService {
  private static instance: PartyService;
  private parties = new Map<string, Party>();
  // Key: playerId -> partyId
  private playerPartyMap = new Map<string, string>();
  private invitations = new Map<string, PartyInvitation>();

  private constructor() {}

  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }

  public createParty(
    leaderId: string,
    leaderName: string,
    leaderAvatar?: string,
    maxMembers = 4
  ): Party {
    // Leave existing party if any
    if (this.playerPartyMap.has(leaderId)) {
      this.leaveParty(leaderId);
    }

    const id = `party_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const leaderMember: PartyMember = {
      playerId: leaderId,
      displayName: leaderName,
      avatar: leaderAvatar,
      isLeader: true,
      isReady: true,
      joinedAt: Date.now(),
    };

    const party: Party = {
      id,
      leaderId,
      members: [leaderMember],
      maxMembers,
      status: "CREATED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.parties.set(id, party);
    this.playerPartyMap.set(leaderId, id);
    progressionSync.partySaved(party);
    return party;
  }

  public getParty(partyId: string): Party | undefined {
    return this.parties.get(partyId);
  }

  public getPlayerParty(playerId: string): Party | undefined {
    const partyId = this.playerPartyMap.get(playerId);
    if (!partyId) return undefined;
    return this.parties.get(partyId);
  }

  public invitePlayer(
    partyId: string,
    inviterId: string,
    inviterName: string,
    inviteeId: string
  ): PartyInvitation {
    const party = this.parties.get(partyId);
    if (!party) throw new Error("Party not found");
    if (party.members.length >= party.maxMembers) throw new Error("Party is full");

    const id = `pinv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const invite: PartyInvitation = {
      id,
      partyId,
      inviterId,
      inviterName,
      inviteeId,
      status: "PENDING",
      createdAt: Date.now(),
    };

    this.invitations.set(id, invite);
    if (party.status === "CREATED") {
      PartyEngine.transition(party, "INVITING");
    }
    progressionSync.invitationSaved(invite);
    progressionSync.partySaved(party);
    return invite;
  }

  /** One invitation by id, so the controller can check who it was for. */
  public getInvitation(invitationId: string): PartyInvitation | undefined {
    return this.invitations.get(invitationId);
  }

  public acceptInvitation(
    invitationId: string,
    inviteeName: string,
    inviteeAvatar?: string
  ): Party {
    const invite = this.invitations.get(invitationId);
    if (!invite) throw new Error("Party invitation not found");
    if (invite.status !== "PENDING") throw new Error("Invitation is not pending");

    const party = this.parties.get(invite.partyId);
    if (!party) throw new Error("Party no longer exists");
    if (party.members.length >= party.maxMembers) throw new Error("Party is full");

    // Leave any existing party
    if (this.playerPartyMap.has(invite.inviteeId)) {
      this.leaveParty(invite.inviteeId);
    }

    const member: PartyMember = {
      playerId: invite.inviteeId,
      displayName: inviteeName,
      avatar: inviteeAvatar,
      isLeader: false,
      isReady: false,
      joinedAt: Date.now(),
    };

    party.members.push(member);
    party.updatedAt = Date.now();
    this.playerPartyMap.set(invite.inviteeId, party.id);

    invite.status = "ACCEPTED";
    progressionSync.invitationSaved(invite);
    progressionSync.partySaved(party);
    return party;
  }

  public declineInvitation(invitationId: string): PartyInvitation {
    const invite = this.invitations.get(invitationId);
    if (!invite) throw new Error("Party invitation not found");
    invite.status = "DECLINED";
    progressionSync.invitationSaved(invite);
    return invite;
  }

  public getPendingInvitations(playerId: string): PartyInvitation[] {
    return Array.from(this.invitations.values()).filter(
      (inv) => inv.inviteeId === playerId && inv.status === "PENDING"
    );
  }

  public setMemberReady(playerId: string, isReady: boolean): Party {
    const party = this.getPlayerParty(playerId);
    if (!party) throw new Error("Player is not in a party");

    const member = party.members.find((m) => m.playerId === playerId);
    if (!member) throw new Error("Party member not found");

    member.isReady = isReady;
    party.updatedAt = Date.now();

    // Check if all members ready
    const allReady = party.members.every((m) => m.isReady);
    if (allReady && (party.status === "INVITING" || party.status === "CREATED")) {
      PartyEngine.transition(party, "READY");
    } else if (!allReady && party.status === "READY") {
      PartyEngine.transition(party, "INVITING");
    }

    progressionSync.partySaved(party);
    return party;
  }

  public setPartyTarget(
    playerId: string,
    game?: GameKind,
    roomCode?: string,
    tournamentId?: string
  ): Party {
    const party = this.getPlayerParty(playerId);
    if (!party) throw new Error("Party not found");
    if (party.leaderId !== playerId) throw new Error("Only party leader can set target");

    party.targetGame = game;
    party.targetRoomCode = roomCode;
    party.targetTournamentId = tournamentId;
    party.updatedAt = Date.now();
    progressionSync.partySaved(party);
    return party;
  }

  public leaveParty(playerId: string): void {
    const partyId = this.playerPartyMap.get(playerId);
    if (!partyId) return;

    const party = this.parties.get(partyId);
    this.playerPartyMap.delete(playerId);
    if (!party) return;

    party.members = party.members.filter((m) => m.playerId !== playerId);
    party.updatedAt = Date.now();

    if (party.members.length === 0) {
      PartyEngine.transition(party, "DISBANDED");
      this.parties.delete(partyId);
      // Deleted rather than left as an empty DISBANDED row: an empty party is
      // not a thing to restore, and the retention job should not have to.
      progressionSync.partyDeleted(partyId);
      return;
    }

    // Elect new leader if leader left
    if (party.leaderId === playerId) {
      party.leaderId = party.members[0].playerId;
      party.members[0].isLeader = true;
    }
    progressionSync.partySaved(party);
  }

  public disbandParty(leaderId: string): void {
    const party = this.getPlayerParty(leaderId);
    if (!party) return;
    if (party.leaderId !== leaderId) throw new Error("Only leader can disband party");

    for (const m of party.members) {
      this.playerPartyMap.delete(m.playerId);
    }
    PartyEngine.transition(party, "DISBANDED");
    this.parties.delete(party.id);
    progressionSync.partyDeleted(party.id);
  }

  /** Restore parties, their membership index and pending invitations. */
  public hydrate(parties: Party[], invitations: PartyInvitation[]): void {
    for (const party of parties) {
      this.parties.set(party.id, party);
      for (const member of party.members) {
        this.playerPartyMap.set(member.playerId, party.id);
      }
    }
    for (const invite of invitations) {
      // An invitation whose party did not survive is not an invitation.
      if (this.parties.has(invite.partyId)) this.invitations.set(invite.id, invite);
    }
  }

  public clear(): void {
    this.parties.clear();
    this.playerPartyMap.clear();
    this.invitations.clear();
  }
}

export const partyService = PartyService.getInstance();
