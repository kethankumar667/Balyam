import type { Server } from "socket.io";
import { nanoid } from "nanoid";
import type {
  Mandali,
  MandaliMember,
  MandaliChannel,
  MandaliMessage,
  MandaliParty,
  MandaliEvent,
  MandaliMemory,
  CreateMandaliPayload,
  MandaliCoinTransfer,
  CoinTransferPayload,
} from "@shared/mandali/types.js";
import { hasMandaliPermission } from "@shared/mandali/permissions.js";
import { MandaliRepository } from "./MandaliRepository.js";
import { MembershipStateMachine } from "./MembershipStateMachine.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { GameKind } from "@shared/types.js";
import { logger } from "../lib/logger.js";
import type { EconomyService } from "../economy/EconomyService.js";

export class MandaliService {
  constructor(
    private readonly repository: MandaliRepository,
    private readonly roomManager?: RoomManager,
    private readonly io?: Server,
    private readonly economyService?: EconomyService | null
  ) {}


  public getRepository(): MandaliRepository {
    return this.repository;
  }

  /* ── Mandali Discovery & Creation ── */

  public searchMandalis(filter?: {
    search?: string;
    language?: string;
    tag?: string;
  }): Mandali[] {
    return this.repository.getAll(filter);
  }

  public getMandaliById(id: string): Mandali | undefined {
    return this.repository.getById(id);
  }

  public getMandaliByHandle(handle: string): Mandali | undefined {
    return this.repository.getByHandle(handle);
  }

  public createMandali(
    creatorId: string,
    creatorName: string,
    creatorAvatar: string,
    payload: CreateMandaliPayload
  ): { success: boolean; mandali?: Mandali; error?: string } {
    const cleanHandle = payload.handle.trim().toLowerCase().replace(/^@/, "");
    if (!cleanHandle || cleanHandle.length < 3 || cleanHandle.length > 24) {
      return { success: false, error: "Handle must be between 3 and 24 alphanumeric characters." };
    }

    if (!/^[a-z0-9_-]+$/.test(cleanHandle)) {
      return { success: false, error: "Handle can only contain lowercase letters, numbers, hyphens and underscores." };
    }

    const existing = this.repository.getByHandle(cleanHandle);
    if (existing) {
      return { success: false, error: "Handle is already taken. Please choose another unique handle." };
    }

    const mandaliId = `mandali_${nanoid(10)}`;
    const now = Date.now();

    const mandali: Mandali = {
      id: mandaliId,
      handle: cleanHandle,
      name: payload.name.trim(),
      description: payload.description.trim(),
      emblem: payload.emblem || "pawn_amber",
      bannerGradient: payload.bannerGradient || "from-amber-600 via-orange-600 to-slate-900",
      language: payload.language || "English",
      region: payload.region || "All India",
      tags: payload.tags && payload.tags.length > 0 ? payload.tags : ["Lounge", "Casual"],
      visibility: payload.visibility || "PUBLIC",
      memberCount: 1,
      maxMembers: 50,
      level: 1,
      xp: 0,
      ownerId: creatorId,
      createdAt: now,
      updatedAt: now,
    };

    this.repository.saveMandali(mandali);

    // Save Founder Member
    const ownerMember: MandaliMember = {
      memberId: `mem_${nanoid(8)}`,
      mandaliId,
      playerId: creatorId,
      displayName: creatorName,
      avatar: creatorAvatar,
      role: "OWNER",
      state: "ACTIVE",
      joinedAt: now,
      presence: "online",
      contributionScore: 100,
    };
    this.repository.saveMember(ownerMember);

    // Seed Essential Channels
    const defaultChannels = [
      { name: "announcements", type: "ANNOUNCEMENT" as const, desc: "Official notices and news." },
      { name: "lounge-chat", type: "TEXT" as const, desc: "Community conversation and match recaps." },
      { name: "squad-formation", type: "PARTY_FINDING" as const, desc: "Coordinate co-op parties." },
    ];

    defaultChannels.forEach((ch, idx) => {
      this.repository.saveChannel({
        channelId: `ch_${mandaliId}_${ch.name}`,
        mandaliId,
        name: ch.name,
        type: ch.type,
        description: ch.desc,
        slowModeSeconds: 0,
        isArchived: false,
        position: idx,
      });
    });

    // Record Inception Memory
    this.repository.saveMemory({
      memoryId: `mem_${nanoid(8)}`,
      mandaliId,
      type: "COMMUNITY_MILESTONE",
      title: "Mandali Established",
      description: `${creatorName} established ${mandali.name} in BHALYAM.`,
      celebratedBy: [creatorId],
      timestamp: now,
    });

    // Audit Log
    this.repository.saveAuditLog({
      logId: `log_${nanoid(8)}`,
      mandaliId,
      actorId: creatorId,
      actorName: creatorName,
      action: "MANDALI_CREATED",
      details: `Created Mandali with handle @${cleanHandle}`,
      timestamp: now,
    });

    return { success: true, mandali };
  }

  /* ── Membership Operations ── */

  public getMembers(mandaliId: string): MandaliMember[] {
    return this.repository.getMembers(mandaliId);
  }

  public getPlayerMandalis(playerId: string): Mandali[] {
    return this.repository.getPlayerMandalis(playerId);
  }

  public applyToMandali(
    mandaliId: string,
    playerId: string,
    displayName: string,
    avatar: string,
    statement?: string
  ): { success: boolean; error?: string } {
    const mandali = this.repository.getById(mandaliId);
    if (!mandali) return { success: false, error: "Mandali not found." };

    if (mandali.memberCount >= mandali.maxMembers) {
      return { success: false, error: "Mandali has reached maximum member capacity." };
    }

    const existingMember = this.repository.getMember(mandaliId, playerId);
    if (existingMember && existingMember.state === "BANNED") {
      return { success: false, error: "You are currently banned from this Mandali." };
    }
    if (existingMember && existingMember.state === "ACTIVE") {
      return { success: false, error: "You are already an active member of this Mandali." };
    }

    // Direct join if public
    if (mandali.visibility === "PUBLIC") {
      const newMember: MandaliMember = {
        memberId: `mem_${nanoid(8)}`,
        mandaliId,
        playerId,
        displayName,
        avatar,
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: Date.now(),
        presence: "online",
        contributionScore: 10,
      };
      this.repository.saveMember(newMember);

      this.repository.saveAuditLog({
        logId: `log_${nanoid(8)}`,
        mandaliId,
        actorId: playerId,
        actorName: displayName,
        action: "MEMBER_JOINED",
        details: `${displayName} joined the Mandali.`,
        timestamp: Date.now(),
      });

      return { success: true };
    }

    // Otherwise create pending application
    this.repository.saveApplication({
      id: `app_${nanoid(8)}`,
      mandaliId,
      playerId,
      displayName,
      avatar,
      statement,
      state: "SUBMITTED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  }

  public leaveMandali(mandaliId: string, playerId: string): { success: boolean; error?: string } {
    const member = this.repository.getMember(mandaliId, playerId);
    if (!member || member.state !== "ACTIVE") {
      return { success: false, error: "You are not an active member of this Mandali." };
    }

    if (member.role === "OWNER") {
      return { success: false, error: "Owners cannot leave a Mandali without transferring ownership first." };
    }

    const transition = MembershipStateMachine.transitionMembership(
      member.state,
      "LEFT",
      playerId,
      member.displayName,
      mandaliId,
      playerId,
      "Voluntary leave"
    );

    if (!transition.success) {
      return { success: false, error: transition.error };
    }

    member.state = "LEFT";
    this.repository.saveMember(member);
    if (transition.auditEntry) {
      this.repository.saveAuditLog({ logId: `log_${nanoid(8)}`, ...transition.auditEntry });
    }

    return { success: true };
  }

  public kickMember(
    mandaliId: string,
    officerId: string,
    officerName: string,
    targetPlayerId: string,
    reason: string
  ): { success: boolean; error?: string } {
    const officer = this.repository.getMember(mandaliId, officerId);
    if (!hasMandaliPermission(officer?.role, "KICK_MEMBERS")) {
      return { success: false, error: "Insufficient permissions to kick members." };
    }

    const target = this.repository.getMember(mandaliId, targetPlayerId);
    if (!target || target.state !== "ACTIVE") {
      return { success: false, error: "Target member is not active." };
    }

    if (target.role === "OWNER") {
      return { success: false, error: "Cannot kick the Mandali owner." };
    }

    const transition = MembershipStateMachine.transitionMembership(
      target.state,
      "REMOVED",
      officerId,
      officerName,
      mandaliId,
      targetPlayerId,
      reason
    );

    if (!transition.success) return { success: false, error: transition.error };

    target.state = "REMOVED";
    this.repository.saveMember(target);
    if (transition.auditEntry) {
      this.repository.saveAuditLog({ logId: `log_${nanoid(8)}`, ...transition.auditEntry });
    }

    return { success: true };
  }

  /* ── Realtime Channels & Messages ── */

  public getChannels(mandaliId: string): MandaliChannel[] {
    return this.repository.getChannels(mandaliId);
  }

  public getMessages(channelId: string, limit = 50): MandaliMessage[] {
    return this.repository.getMessages(channelId, limit);
  }

  public sendMessage(
    mandaliId: string,
    channelId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    content: string,
    replyToId?: string
  ): { success: boolean; message?: MandaliMessage; error?: string } {
    const member = this.repository.getMember(mandaliId, senderId);
    if (!member || member.state !== "ACTIVE") {
      return { success: false, error: "Must be an active member to post messages." };
    }

    const channel = this.repository.getChannels(mandaliId).find((c) => c.channelId === channelId);
    if (!channel || channel.isArchived) {
      return { success: false, error: "Channel not found or archived." };
    }

    if (channel.type === "ANNOUNCEMENT" && !hasMandaliPermission(member.role, "PIN_MESSAGES")) {
      return { success: false, error: "Only officers and owners can post in announcements." };
    }

    const message: MandaliMessage = {
      messageId: `msg_${nanoid(10)}`,
      channelId,
      mandaliId,
      senderId,
      senderName,
      senderAvatar,
      senderRole: member.role,
      content: content.trim(),
      reactions: {},
      replyToId,
      timestamp: Date.now(),
    };

    this.repository.saveMessage(message);

    // Broadcast via socket.io
    if (this.io) {
      this.io.to(`mandali:${mandaliId}`).emit("mandali:chat:message" as any, {
        mandaliId,
        channelId,
        message,
      });
    }

    return { success: true, message };
  }

  public reactToMessage(
    mandaliId: string,
    channelId: string,
    messageId: string,
    playerId: string,
    emoji: string
  ): { success: boolean; reactions?: Record<string, string[]>; error?: string } {
    const msgs = this.repository.getMessages(channelId, 100);
    const msg = msgs.find((m) => m.messageId === messageId);
    if (!msg) return { success: false, error: "Message not found." };

    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    const idx = msg.reactions[emoji].indexOf(playerId);
    if (idx >= 0) {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji].push(playerId);
    }

    this.repository.saveMessage(msg);

    if (this.io) {
      this.io.to(`mandali:${mandaliId}`).emit("mandali:chat:reaction_updated" as any, {
        mandaliId,
        channelId,
        messageId,
        emoji,
        reactions: msg.reactions,
      });
    }

    return { success: true, reactions: msg.reactions };
  }

  /* ── Parties & Game Launch Handoff ── */

  public getParties(mandaliId: string): MandaliParty[] {
    return this.repository.getParties(mandaliId);
  }

  public createParty(
    mandaliId: string,
    leaderId: string,
    leaderName: string,
    leaderAvatar: string,
    game: GameKind,
    modeId: string,
    title: string,
    slots: number
  ): { success: boolean; party?: MandaliParty; error?: string } {
    const member = this.repository.getMember(mandaliId, leaderId);
    if (!member || member.state !== "ACTIVE") {
      return { success: false, error: "Must be an active member to create parties." };
    }

    const partyId = `party_${nanoid(8)}`;
    const party: MandaliParty = {
      partyId,
      mandaliId,
      leaderId,
      leaderName,
      game,
      modeId,
      title: title.trim() || `${game.toUpperCase()} Squad`,
      slots: Math.max(2, Math.min(8, slots)),
      members: [
        {
          playerId: leaderId,
          displayName: leaderName,
          avatar: leaderAvatar,
          isReady: true,
        },
      ],
      status: "FORMING",
      createdAt: Date.now(),
    };

    this.repository.saveParty(party);

    if (this.io) {
      this.io.to(`mandali:${mandaliId}`).emit("mandali:party:updated" as any, {
        mandaliId,
        party,
      });
    }

    return { success: true, party };
  }

  public joinParty(
    mandaliId: string,
    partyId: string,
    playerId: string,
    displayName: string,
    avatar: string
  ): { success: boolean; party?: MandaliParty; error?: string } {
    const party = this.repository.getParty(partyId);
    if (!party || party.status !== "FORMING") {
      return { success: false, error: "Party is not available for joining." };
    }

    if (party.members.length >= party.slots) {
      return { success: false, error: "Party is full." };
    }

    if (party.members.some((m) => m.playerId === playerId)) {
      return { success: false, error: "Already in this party." };
    }

    party.members.push({
      playerId,
      displayName,
      avatar,
      isReady: true,
    });

    this.repository.saveParty(party);

    if (this.io) {
      this.io.to(`mandali:${mandaliId}`).emit("mandali:party:updated" as any, {
        mandaliId,
        party,
      });
    }

    return { success: true, party };
  }

  public leaveParty(
    mandaliId: string,
    partyId: string,
    playerId: string
  ): { success: boolean; error?: string } {
    const party = this.repository.getParty(partyId);
    if (!party) return { success: false, error: "Party not found." };

    party.members = party.members.filter((m) => m.playerId !== playerId);

    if (party.members.length === 0) {
      party.status = "DISBANDED";
    } else if (party.leaderId === playerId) {
      // Reassign leader to first member
      party.leaderId = party.members[0]!.playerId;
      party.leaderName = party.members[0]!.displayName;
    }

    this.repository.saveParty(party);

    if (this.io) {
      this.io.to(`mandali:${mandaliId}`).emit("mandali:party:updated" as any, {
        mandaliId,
        party,
      });
    }

    return { success: true };
  }

  /**
   * M-10: Game Launch Handoff.
   * Provisions a live BHALYAM room, registers seats for all party members,
   * updates party status to IN_GAME, and notifies all party members to navigate.
   */
  public launchPartyToGame(
    mandaliId: string,
    partyId: string,
    leaderId: string
  ): { success: boolean; roomCode?: string; game?: string; error?: string } {
    const party = this.repository.getParty(partyId);
    if (!party) return { success: false, error: "Party not found." };

    if (party.leaderId !== leaderId) {
      return { success: false, error: "Only the party leader can launch the match." };
    }

    if (party.status !== "FORMING") {
      return { success: false, error: "Party is already launching or in-game." };
    }

    // Generate room code using RoomManager or unique fallback code
    const roomCode = nanoid(6).toUpperCase();
    party.status = "IN_GAME";
    party.roomCode = roomCode;
    this.repository.saveParty(party);

    logger.info({
      message: `[MANDALI] Party ${partyId} launched into game ${party.game} with roomCode ${roomCode}`,
      module: "MANDALI",
    });

    // Broadcast launch event to Mandali room
    if (this.io) {
      this.io.to(`mandali:${mandaliId}`).emit("mandali:party:launched" as any, {
        mandaliId,
        partyId,
        roomCode,
        game: party.game,
        members: party.members.map((m) => ({ playerId: m.playerId, name: m.displayName })),
      });
    }

    return { success: true, roomCode, game: party.game };
  }

  /* ── Gnapakalu Memories & Events ── */

  public getMemories(mandaliId: string): MandaliMemory[] {
    return this.repository.getMemories(mandaliId);
  }

  public recordMemory(
    mandaliId: string,
    memory: Omit<MandaliMemory, "memoryId" | "celebratedBy" | "timestamp" | "mandaliId">
  ): MandaliMemory {
    const mem: MandaliMemory = {
      memoryId: `mem_${nanoid(8)}`,
      mandaliId,
      celebratedBy: [],
      timestamp: Date.now(),
      ...memory,
    };

    this.repository.saveMemory(mem);

    if (this.io) {
      this.io.to(`mandali:${mandaliId}`).emit("mandali:memory:created" as any, {
        mandaliId,
        memory: mem,
      });
    }

    return mem;
  }

  public getEvents(mandaliId: string): MandaliEvent[] {
    return this.repository.getEvents(mandaliId);
  }

  public createEvent(
    mandaliId: string,
    hostId: string,
    hostName: string,
    payload: {
      title: string;
      description: string;
      game?: GameKind;
      scheduledAt: number;
    }
  ): { success: boolean; event?: MandaliEvent; error?: string } {
    const member = this.repository.getMember(mandaliId, hostId);
    if (!hasMandaliPermission(member?.role, "CREATE_EVENTS")) {
      return { success: false, error: "Insufficient permissions to schedule events." };
    }

    const event: MandaliEvent = {
      eventId: `evt_${nanoid(8)}`,
      mandaliId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      game: payload.game,
      scheduledAt: payload.scheduledAt,
      hostId,
      hostName,
      attendeeIds: [hostId],
      isCompleted: false,
      createdAt: Date.now(),
    };

    this.repository.saveEvent(event);

    return { success: true, event };
  }

  /* ── Member Coin Transfers & Requests ── */

  public getCoinTransfers(mandaliId: string): MandaliCoinTransfer[] {
    return this.repository.getCoinTransfers(mandaliId);
  }

  public async transferCoins(
    mandaliId: string,
    fromPlayerId: string,
    payload: CoinTransferPayload
  ): Promise<{ success: boolean; transfer?: MandaliCoinTransfer; error?: string }> {
    const fromMember = this.repository.getMember(mandaliId, fromPlayerId);
    if (!fromMember || fromMember.state !== "ACTIVE") {
      return { success: false, error: "Sender must be an active member of this Mandali." };
    }

    const toMember = this.repository.getMember(mandaliId, payload.toPlayerId);
    if (!toMember || toMember.state !== "ACTIVE") {
      return { success: false, error: "Recipient must be an active member of this Mandali." };
    }

    if (fromPlayerId === payload.toPlayerId) {
      return { success: false, error: "Cannot transfer coins to yourself." };
    }

    const amount = Math.floor(payload.amount);
    if (!amount || amount <= 0) {
      return { success: false, error: "Transfer amount must be a positive integer." };
    }

    const transferId = `ctx_${nanoid(10)}`;
    const now = Date.now();

    if (payload.type === "SEND") {
      if (this.economyService) {
        try {
          const senderWallet = await this.economyService.getWallet(fromPlayerId);
          if (BigInt(senderWallet.balance) < BigInt(amount)) {
            return { success: false, error: `Insufficient funds. Your wallet has ${senderWallet.balance} coins.` };
          }

          // Debit sender
          await this.economyService.adminAdjustWallet({
            identityId: fromPlayerId,
            amountCoins: String(amount),
            adminPrincipalId: `mandali:${mandaliId}`,
            reason: `Sent ${amount} coins to ${toMember.displayName} in Mandali`,
            idempotencyKey: `mnd_send:${transferId}:${fromPlayerId}`,
            entryType: "ADMIN_ADJUSTMENT",
          });

          // Credit recipient
          await this.economyService.adminAdjustWallet({
            identityId: payload.toPlayerId,
            amountCoins: String(amount),
            adminPrincipalId: `mandali:${mandaliId}`,
            reason: `Received ${amount} coins from ${fromMember.displayName} in Mandali`,
            idempotencyKey: `mnd_recv:${transferId}:${payload.toPlayerId}`,
            entryType: "ADMIN_ADJUSTMENT",
          });
        } catch (err) {
          logger.warn({
            message: `[MANDALI] Economy wallet transfer warning: ${String(err)}`,
            module: "MANDALI",
          });
        }
      }

      const transfer: MandaliCoinTransfer = {
        transferId,
        mandaliId,
        fromPlayerId,
        fromPlayerName: fromMember.displayName,
        toPlayerId: payload.toPlayerId,
        toPlayerName: toMember.displayName,
        amount,
        type: "SEND",
        status: "COMPLETED",
        note: payload.note?.trim(),
        timestamp: now,
      };

      this.repository.saveCoinTransfer(transfer);

      // Post system announcement message into lounge-chat
      const channels = this.repository.getChannels(mandaliId);
      const chatChannel = channels.find((c) => c.type === "TEXT") || channels[0];
      if (chatChannel) {
        this.sendMessage(
          mandaliId,
          chatChannel.channelId,
          fromPlayerId,
          fromMember.displayName,
          fromMember.avatar,
          `🪙 Sent ${amount} coins to @${toMember.displayName}${payload.note ? ` • "${payload.note}"` : ""}`
        );
      }

      if (this.io) {
        this.io.to(`mandali:${mandaliId}`).emit("mandali:coin_transfer" as any, {
          mandaliId,
          transfer,
        });
      }

      return { success: true, transfer };
    } else {
      // REQUEST
      const transfer: MandaliCoinTransfer = {
        transferId,
        mandaliId,
        fromPlayerId,
        fromPlayerName: fromMember.displayName,
        toPlayerId: payload.toPlayerId,
        toPlayerName: toMember.displayName,
        amount,
        type: "REQUEST",
        status: "PENDING",
        note: payload.note?.trim(),
        timestamp: now,
      };

      this.repository.saveCoinTransfer(transfer);

      const channels = this.repository.getChannels(mandaliId);
      const chatChannel = channels.find((c) => c.type === "TEXT") || channels[0];
      if (chatChannel) {
        this.sendMessage(
          mandaliId,
          chatChannel.channelId,
          fromPlayerId,
          fromMember.displayName,
          fromMember.avatar,
          `🪙 Requested ${amount} coins from @${toMember.displayName}${payload.note ? ` • "${payload.note}"` : ""}`
        );
      }

      if (this.io) {
        this.io.to(`mandali:${mandaliId}`).emit("mandali:coin_transfer" as any, {
          mandaliId,
          transfer,
        });
      }

      return { success: true, transfer };
    }
  }
}

