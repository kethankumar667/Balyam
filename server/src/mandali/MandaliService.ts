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
import { MANDALI_COIN_AMOUNT, MANDALI_COIN_REQUEST_COOLDOWN_MS } from "@shared/mandali/coinRules.js";
import { MandaliRepository } from "./MandaliRepository.js";
import { MembershipStateMachine } from "./MembershipStateMachine.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { GameKind } from "@shared/types.js";
import { logger } from "../lib/logger.js";
import type { EconomyService } from "../economy/EconomyService.js";
import { InsufficientFundsError, WalletFrozenError } from "../persistence/EconomyRepository.js";

/** Every free-text field here is stored and re-broadcast to other members — cap it, don't trust client-side limits alone. */
function clampText(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

/**
 * Every durable RPC raises a Postgres exception shaped `CODE: human message`
 * (e.g. `FORBIDDEN: only the owner may promote or demote`). `PostgrestError`
 * (postgrest.ts) stores the whole PostgREST JSON error body as its
 * `.message`, so the human text has to be pulled out of that body's own
 * `"message"` field first — matching `SupabaseEconomyRepository.mapError`'s
 * approach of pattern-testing `err.message` directly rather than assuming
 * it is already the plain RAISE EXCEPTION text. An unrecognisable failure
 * (network, timeout, a bug) falls back to a generic message instead of
 * leaking a raw driver error to the client.
 */
function durableErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const jsonMessage = raw.match(/"message"\s*:\s*"([^"]*)"/)?.[1];
  const pgMessage = jsonMessage ?? raw;
  const withoutCode = pgMessage.match(/^[A-Z_]+:\s*(.+)$/)?.[1];
  return withoutCode ?? (jsonMessage ? pgMessage : fallback);
}

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

  /** Push an event to everyone currently viewing this Mandali. No-op without a socket server (unit tests). */
  private emitToMandali(mandaliId: string, event: string, payload: unknown): void {
    this.io?.to(`mandali:${mandaliId}`).emit(event as any, payload);
  }

  /**
   * Tell open clients that something about this Mandali changed (members,
   * roles, settings, pins, deletions) so they refresh instead of showing a
   * stale view until a manual reload. Clients treat it as "refetch", not as
   * data, so a missed or duplicated event can never corrupt their state.
   */
  private notifyChanged(mandaliId: string, reason: string): void {
    this.emitToMandali(mandaliId, "mandali:changed", { mandaliId, reason });
  }

  /* ── Mandali Discovery & Creation ── */

  public async searchMandalis(filter?: {
    search?: string;
    language?: string;
    tag?: string;
  }): Promise<Mandali[]> {
    return this.repository.isDurable() ? this.repository.getAllDurable(filter) : this.repository.getAll(filter);
  }

  public async getMandaliById(id: string): Promise<Mandali | undefined> {
    return this.repository.isDurable() ? this.repository.getByIdDurable(id) : this.repository.getById(id);
  }

  public async getMandaliByHandle(handle: string): Promise<Mandali | undefined> {
    return this.repository.isDurable() ? this.repository.getByHandleDurable(handle) : this.repository.getByHandle(handle);
  }

  public async createMandali(
    creatorId: string,
    creatorName: string,
    creatorAvatar: string,
    payload: CreateMandaliPayload
  ): Promise<{ success: boolean; mandali?: Mandali; error?: string }> {
    const cleanHandle = payload.handle.trim().toLowerCase().replace(/^@/, "");
    if (!cleanHandle || cleanHandle.length < 3 || cleanHandle.length > 24) {
      return { success: false, error: "Handle must be between 3 and 24 alphanumeric characters." };
    }

    if (!/^[a-z0-9_-]+$/.test(cleanHandle)) {
      return { success: false, error: "Handle can only contain lowercase letters, numbers, hyphens and underscores." };
    }

    if (this.repository.isDurable()) {
      try {
        const mandali = await this.repository.createMandaliDurable({
          mandaliId: `mandali_${nanoid(10)}`,
          handle: cleanHandle,
          name: clampText(payload.name, 60),
          emblem: payload.emblem || "pawn_amber",
          description: clampText(payload.description, 500),
          ownerIdentityId: creatorId,
          ownerDisplayName: creatorName,
          ownerAvatar: creatorAvatar,
          bannerGradient: payload.bannerGradient,
          language: payload.language,
          region: payload.region,
          tags: payload.tags,
          visibility: payload.visibility,
        });
        return { success: true, mandali };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not create Mandali.") };
      }
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
      name: clampText(payload.name, 60),
      description: clampText(payload.description, 500),
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

  public async updateMandaliSettings(args: {
    mandaliId: string; actorId: string; name?: string; emblem?: string; description?: string;
    rules?: string; editPermission?: "ADMIN" | "ALL"; sendPermission?: "ADMIN" | "ALL"; joinApproval?: boolean;
  }): Promise<{ success: boolean; mandali?: Mandali; error?: string }> {
    const guard = this.requireDurable("Editing group info");
    if (guard) return guard;
    try {
      const mandali = await this.repository.updateMandaliSettingsDurable({
        mandaliId: args.mandaliId, actorIdentityId: args.actorId, name: args.name, emblem: args.emblem,
        description: args.description, rules: args.rules, editPermission: args.editPermission,
        sendPermission: args.sendPermission, joinApproval: args.joinApproval,
      });
      this.notifyChanged(args.mandaliId, "settings");
      return { success: true, mandali };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not update group info.") };
    }
  }

  /* ── Membership Operations ── */

  public async getMembers(mandaliId: string): Promise<MandaliMember[]> {
    return this.repository.isDurable() ? this.repository.getMembersDurable(mandaliId) : this.repository.getMembers(mandaliId);
  }

  /** Server-side membership gate — the only trustworthy way to answer "can this caller see private community content?" */
  public async isActiveMember(mandaliId: string, playerId: string): Promise<boolean> {
    const member = this.repository.isDurable()
      ? await this.repository.getMemberDurable(mandaliId, playerId)
      : this.repository.getMember(mandaliId, playerId);
    return member?.state === "ACTIVE";
  }

  public async getPlayerMandalis(playerId: string): Promise<Mandali[]> {
    return this.repository.isDurable()
      ? this.repository.getPlayerMandalisDurable(playerId)
      : this.repository.getPlayerMandalis(playerId);
  }

  public async applyToMandali(
    mandaliId: string,
    playerId: string,
    displayName: string,
    avatar: string,
    statement?: string,
    invitationId?: string
  ): Promise<{ success: boolean; pending?: boolean; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        const result = await this.repository.createJoinRequestDurable({
          requestId: `jr_${nanoid(10)}`,
          mandaliId,
          requesterIdentityId: playerId,
          requesterDisplayName: displayName,
          requesterAvatar: avatar,
          invitationId,
        });
        this.notifyChanged(mandaliId, result.autoApproved ? "member-joined" : "join-requested");
        return { success: true, pending: !result.autoApproved };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not join this Mandali.") };
      }
    }

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
      statement: statement ? clampText(statement, 300) : statement,
      state: "SUBMITTED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  }

  public async leaveMandali(mandaliId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        await this.repository.transitionMembershipDurable(mandaliId, playerId, playerId, "LEAVE");
        this.notifyChanged(mandaliId, "member-left");
        return { success: true };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not leave this Mandali.") };
      }
    }

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

  public async kickMember(
    mandaliId: string,
    officerId: string,
    officerName: string,
    targetPlayerId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        await this.repository.transitionMembershipDurable(mandaliId, officerId, targetPlayerId, "KICK");
        this.notifyChanged(mandaliId, "member-removed");
        return { success: true };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not remove this member.") };
      }
    }

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

  /* ── Promote / demote / ban / transfer ownership ──
   * Net-new actions with no prior implementation at all (not even dead
   * in-memory code) — durable-only. Building a second, parallel in-memory
   * implementation of ownership-transfer's "exactly one owner" invariant
   * for a storage mode that only ever existed as a dev/test fallback is
   * not a good trade; the error names the real reason rather than pretending
   * to support it. */
  private requireDurable(action: string): { success: false; error: string } | null {
    if (this.repository.isDurable()) return null;
    return { success: false, error: `${action} requires durable storage to be configured.` };
  }

  public async promoteMember(mandaliId: string, actorId: string, targetId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Promoting a member");
    if (guard) return guard;
    try {
      await this.repository.transitionMembershipDurable(mandaliId, actorId, targetId, "PROMOTE");
      this.notifyChanged(mandaliId, "member-promoted");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not promote this member.") };
    }
  }

  public async demoteMember(mandaliId: string, actorId: string, targetId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Demoting a member");
    if (guard) return guard;
    try {
      await this.repository.transitionMembershipDurable(mandaliId, actorId, targetId, "DEMOTE");
      this.notifyChanged(mandaliId, "member-demoted");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not demote this member.") };
    }
  }

  public async banMember(mandaliId: string, actorId: string, targetId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Banning a member");
    if (guard) return guard;
    try {
      await this.repository.transitionMembershipDurable(mandaliId, actorId, targetId, "BAN");
      this.notifyChanged(mandaliId, "member-banned");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not ban this member.") };
    }
  }

  public async transferOwnership(mandaliId: string, currentOwnerId: string, newOwnerId: string): Promise<{ success: boolean; mandali?: Mandali; error?: string }> {
    const guard = this.requireDurable("Transferring ownership");
    if (guard) return guard;
    try {
      const mandali = await this.repository.transferOwnershipDurable(mandaliId, currentOwnerId, newOwnerId);
      this.notifyChanged(mandaliId, "ownership-transferred");
      return { success: true, mandali };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not transfer ownership.") };
    }
  }

  /* ── Invite links & join-request approval ── */

  public async createInviteLink(
    mandaliId: string, issuerId: string, expiresInMs = 7 * 24 * 60 * 60 * 1000
  ): Promise<{ success: boolean; invitation?: import("@shared/mandali/types.js").MandaliInviteLink; error?: string }> {
    const guard = this.requireDurable("Creating an invite link");
    if (guard) return guard;
    try {
      const invitation = await this.repository.createInviteLinkDurable(
        `inv_${nanoid(10)}`, mandaliId, issuerId, Date.now() + expiresInMs
      );
      return { success: true, invitation };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not create an invite link.") };
    }
  }

  public async resolveInviteLink(token: string) {
    if (!this.repository.isDurable()) {
      return { valid: false as const };
    }
    return this.repository.resolveInviteLinkDurable(token);
  }

  public async getPendingJoinRequests(mandaliId: string): Promise<import("@shared/mandali/types.js").MandaliJoinRequestRecord[]> {
    if (!this.repository.isDurable()) return [];
    return this.repository.getJoinRequestsDurable(mandaliId, "PENDING");
  }

  public async decideJoinRequest(
    requestId: string, reviewerId: string, approve: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Deciding a join request");
    if (guard) return guard;
    try {
      const decided = await this.repository.decideJoinRequestDurable(requestId, reviewerId, approve);
      this.notifyChanged(decided.mandaliId, approve ? "member-joined" : "join-declined");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not decide this join request.") };
    }
  }

  /* ── Realtime Channels & Messages ── */

  public async getChannels(mandaliId: string): Promise<MandaliChannel[]> {
    return this.repository.isDurable() ? this.repository.getChannelsDurable(mandaliId) : this.repository.getChannels(mandaliId);
  }

  public async getMessages(channelId: string, limit = 50): Promise<MandaliMessage[]> {
    return this.repository.isDurable() ? this.repository.getMessagesDurable(channelId, limit) : this.repository.getMessages(channelId, limit);
  }

  public async sendMessage(
    mandaliId: string,
    channelId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    content: string,
    replyToId?: string,
    clientRequestId?: string
  ): Promise<{ success: boolean; message?: MandaliMessage; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        const { message } = await this.repository.sendMessageDurable({
          messageId: `msg_${nanoid(10)}`, mandaliId, channelId, senderIdentityId: senderId,
          content: clampText(content, 2000), replyToId, clientRequestId,
        });
        if (this.io) {
          this.io.to(`mandali:${mandaliId}`).emit("mandali:chat:message" as any, { mandaliId, channelId, message });
        }
        return { success: true, message };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not send this message.") };
      }
    }

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
      content: clampText(content, 1000),
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

  public async setMessagePin(mandaliId: string, messageId: string, actorId: string, pinned: boolean): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Pinning a message");
    if (guard) return guard;
    try {
      await this.repository.setMessagePinDurable(messageId, actorId, pinned);
      this.notifyChanged(mandaliId, "message-pinned");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not update this message's pin state.") };
    }
  }

  public async deleteMessage(mandaliId: string, messageId: string, actorId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Deleting a message");
    if (guard) return guard;
    try {
      await this.repository.deleteMessageDurable(messageId, actorId);
      this.notifyChanged(mandaliId, "message-deleted");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not delete this message.") };
    }
  }

  /* ── Coin requests (payable request cards) ──
   * Distinct from the existing transferCoins()'s SEND/REQUEST below — that
   * method's SEND path is the existing, already-tested atomic wallet
   * transfer and stays untouched; its REQUEST path is a fire-and-forget
   * notice with no way to actually pay it. These two methods are the new,
   * payable coin-request feature: create a request naming one designated
   * payer, and let that payer fund it via the same atomic transfer RPC. */
  public async createCoinRequest(args: {
    mandaliId: string; channelId: string; requesterId: string; payerId: string;
    amount: number; expiresInMs?: number;
  }): Promise<{
    success: boolean; request?: import("@shared/mandali/types.js").MandaliCoinRequest;
    error?: string; retryAfterMs?: number;
  }> {
    const guard = this.requireDurable("Requesting coins");
    if (guard) return guard;
    if (Math.floor(args.amount) !== MANDALI_COIN_AMOUNT) {
      return { success: false, error: `Coin requests are always ${MANDALI_COIN_AMOUNT} coins.` };
    }
    try {
      const request = await this.repository.createCoinRequestDurable({
        requestId: `cr_${nanoid(10)}`, mandaliId: args.mandaliId, channelId: args.channelId,
        requesterIdentityId: args.requesterId, payerIdentityId: args.payerId, amount: MANDALI_COIN_AMOUNT,
        expiresAt: Date.now() + (args.expiresInMs ?? 24 * 60 * 60 * 1000),
        cooldownSeconds: MANDALI_COIN_REQUEST_COOLDOWN_MS / 1000,
      });
      // The card is created inside the database function, so the normal chat
      // broadcast in sendMessage never fires for it. Without this, only the
      // requester (who refetches) ever sees the card and nobody else is told
      // they were asked. Carry the request too: a card with no request record
      // renders as plain text with no Pay button.
      const message = request.messageId
        ? await this.repository.getMessageByIdDurable(request.messageId).catch(() => undefined)
        : undefined;
      this.emitToMandali(args.mandaliId, "mandali:coin_request:updated", { mandaliId: args.mandaliId, request, message });
      return { success: true, request };
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const retrySeconds = Number(raw.match(/COOLDOWN:\s*retry_after_seconds=(\d+)/)?.[1]);
      if (Number.isFinite(retrySeconds)) {
        return {
          success: false,
          retryAfterMs: retrySeconds * 1000,
          error: "You have already requested coins recently. You can ask again when the timer ends.",
        };
      }
      return { success: false, error: durableErrorMessage(err, "Could not create this coin request.") };
    }
  }

  /**
   * How long until this person may post another coin request. Read-only, for
   * the countdown in the UI — the database still enforces the limit
   * atomically, so a stale answer here can never let a request through.
   */
  public async getCoinRequestCooldown(identityId: string): Promise<{ retryAfterMs: number }> {
    if (!this.repository.isDurable()) return { retryAfterMs: 0 };
    const lastAt = await this.repository.getLastCoinRequestAtDurable(identityId);
    if (lastAt === null) return { retryAfterMs: 0 };
    return { retryAfterMs: Math.max(0, lastAt + MANDALI_COIN_REQUEST_COOLDOWN_MS - Date.now()) };
  }

  public async fundCoinRequest(
    requestId: string, payerId: string
  ): Promise<{ success: boolean; request?: import("@shared/mandali/types.js").MandaliCoinRequest; error?: string }> {
    const guard = this.requireDurable("Paying a coin request");
    if (guard) return guard;
    try {
      const { request } = await this.repository.fundCoinRequestDurable(requestId, payerId, `mnd_coin_req:${requestId}`);
      this.emitToMandali(request.mandaliId, "mandali:coin_request:updated", { mandaliId: request.mandaliId, request });
      return { success: true, request };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not pay this coin request.") };
    }
  }

  public async getCoinRequests(mandaliId: string): Promise<import("@shared/mandali/types.js").MandaliCoinRequest[]> {
    if (!this.repository.isDurable()) return [];
    return this.repository.getCoinRequestsDurable(mandaliId);
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
      title: clampText(title, 60) || `${game.toUpperCase()} Squad`,
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
      title: clampText(payload.title, 100),
      description: clampText(payload.description, 500),
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
    // Asking for coins goes through createCoinRequest (payable card, 4-hour
    // limit). Accepting REQUEST here would be a side door around that limit.
    if (payload.type !== "SEND") {
      return { success: false, error: "Use Request Coins to ask a member for coins." };
    }

    // In durable mode the in-memory member map is empty (members live in
    // Postgres), so reading it here would reject every real member.
    const durable = this.repository.isDurable();
    const fromMember = durable
      ? await this.repository.getMemberDurable(mandaliId, fromPlayerId)
      : this.repository.getMember(mandaliId, fromPlayerId);
    if (!fromMember || fromMember.state !== "ACTIVE") {
      return { success: false, error: "Sender must be an active member of this Mandali." };
    }

    const toMember = durable
      ? await this.repository.getMemberDurable(mandaliId, payload.toPlayerId)
      : this.repository.getMember(mandaliId, payload.toPlayerId);
    if (!toMember || toMember.state !== "ACTIVE") {
      return { success: false, error: "Recipient must be an active member of this Mandali." };
    }

    if (fromPlayerId === payload.toPlayerId) {
      return { success: false, error: "Cannot transfer coins to yourself." };
    }

    const amount = Math.floor(payload.amount);
    if (amount !== MANDALI_COIN_AMOUNT) {
      return { success: false, error: `Coins can only be sent in ${MANDALI_COIN_AMOUNT}-coin transfers.` };
    }

    const transferId = `ctx_${nanoid(10)}`;

    // Coins are real wallet balance, not a Mandali-internal fiction — if
    // there is no economy layer wired in, a "successful" send would just
    // be a lie (the transfer record would show coins moving that never
    // did). Fail honestly instead of silently no-op'ing.
    if (!this.economyService) {
      return { success: false, error: "Coin transfers are temporarily unavailable." };
    }

    try {
      // Atomic — debits fromPlayerId and credits toPlayerId in ONE
      // transaction (see transfer_wallet_coins). Previously this made two
      // independent adminAdjustWallet calls (a credit-only primitive),
      // which credited BOTH wallets instead of moving coins between them.
      await this.economyService.transferWalletCoins({
        fromIdentityId: fromPlayerId,
        toIdentityId: payload.toPlayerId,
        amountCoins: String(amount),
        reason: payload.note || `Mandali coin transfer in ${mandaliId}`,
        idempotencyKey: `mnd_transfer:${transferId}`,
      });
    } catch (err) {
      logger.warn({
        message: `[MANDALI] Coin transfer failed: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI",
      });
      // Two shapes reach here: the Supabase RPC's raw "INSUFFICIENT_FUNDS: ..."
      // exception text, and the in-memory repository's typed error classes
      // with human-readable messages — check both.
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof InsufficientFundsError || message.includes("INSUFFICIENT_FUNDS")) {
        return { success: false, error: "Insufficient funds for this transfer." };
      }
      if (err instanceof WalletFrozenError || message.includes("WALLET_FROZEN")) {
        return { success: false, error: "One of these wallets is frozen and cannot transfer coins." };
      }
      return { success: false, error: "Coin transfer failed. Please try again." };
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
      note: payload.note ? clampText(payload.note, 280) : payload.note,
      timestamp: Date.now(),
    };

    this.repository.saveCoinTransfer(transfer);

    // Post system announcement message into lounge-chat
    const channels = durable
      ? await this.repository.getChannelsDurable(mandaliId)
      : this.repository.getChannels(mandaliId);
    const chatChannel = channels.find((c) => c.type === "TEXT") || channels[0];
    if (chatChannel) {
      void this.sendMessage(
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
  }
}
