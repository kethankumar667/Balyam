import type { Server } from "socket.io";
import { nanoid } from "nanoid";
import type {
  Gang,
  GangMember,
  GangChannel,
  GangMessage,
  GangEvent,
  GangMemory,
  CreateGangPayload,
  GangCoinTransfer,
  CoinTransferPayload,
} from "@shared/gang/types.js";
import { hasGangPermission } from "@shared/gang/permissions.js";
import { GAME_DISPLAY_NAMES } from "@shared/catalog.js";
import type { RoomInviteMetadata } from "@shared/gang/types.js";
import type {
  GangActivityEvent,
  GangDeletedEvent,
  GangDigest,
  NotificationLevel,
  RoomInviteState,
  RoomInviteStatus,
} from "@shared/gang/notifications.js";
import type { GangPresenceChangedBroadcast } from "@shared/gang/socketContract.js";
import { GANG_COIN_AMOUNT, GANG_COIN_REQUEST_COOLDOWN_MS } from "@shared/gang/coinRules.js";
import { GangRepository } from "./GangRepository.js";
import { MembershipStateMachine } from "./MembershipStateMachine.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { GameKind } from "@shared/types.js";
import { logger } from "../lib/logger.js";

/** The two live facts presence is made from. Supplied at boot; see `setPresenceSources`. */
export interface GangPresenceSources {
  /** Has this person any open, signed-in connection right now? */
  isConnected(playerId: string): boolean;
  /** Everyone seated in a game that is under way, and which game. */
  activeGames(): ReadonlyMap<string, GameKind>;
  /** For each of those people, the room code an audience can join, when their room takes one. */
  watchRooms?(): ReadonlyMap<string, string>;
}

/** What a member's dot says. "Away" is not worked out: nothing here can tell idle from engaged. */
interface GangPresence {
  presence: "online" | "in-game" | "offline";
  activeGame?: GameKind;
  watchCode?: string;
}
import type { EconomyService } from "../economy/EconomyService.js";
import type { TransferPolicy } from "../rewards/TransferPolicy.js";
import { InsufficientFundsError, TransferCapExceededError, WalletFrozenError } from "../persistence/EconomyRepository.js";

const ROOM_INVITE_DEDUPE_MS = 10 * 60 * 1000;
const ROOM_INVITE_MAX_PER_HOUR = 6;
const HOUR_MS = 60 * 60 * 1000;
const ACTIVITY_PREVIEW_LENGTH = 120;
const MEMBER_CACHE_TTL_MS = 30 * 1000;
const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,10}$/;
const MAX_STATUS_CODES = 20;

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
  return renameLegacyWord(withoutCode ?? (jsonMessage ? pgMessage : fallback));
}

/**
 * The deployed database functions still word their refusals with the feature's
 * old name ("only members of this Mandali can pay its coin requests"), and an
 * applied migration cannot be edited. The text is shown to players, so the old
 * word is swapped here, once, rather than in every caller.
 */
function renameLegacyWord(text: string): string {
  return text.replace(/\bMandalis\b/g, "Gangs").replace(/\bMandali\b/g, "Gang");
}

/** What the host is told when they try to leave without handing the group to someone. */
export const HOST_MUST_HAND_OVER = "You are the host. Make someone else the host before you leave.";

export type DeleteGangFailure = "NOT_FOUND" | "FORBIDDEN" | "CONFIRMATION_MISMATCH" | "FAILED";
export type DeleteGangResult =
  | { success: true }
  | { success: false; code: DeleteGangFailure; error: string };

/** What someone types to confirm: case, spacing and a leading @ are not part of the handle. */
function normaliseHandle(typed: string): string {
  return typed.trim().toLowerCase().replace(/^@/, "");
}

/** Map the database function's own refusals onto the codes callers act on. */
function deleteFailure(err: unknown): DeleteGangResult {
  const raw = err instanceof Error ? err.message : String(err);
  // The database raises this exact text (`raise exception 'MANDALI_NOT_FOUND: ...'`); it is matched, not chosen.
  if (raw.includes("MANDALI_NOT_FOUND")) {
    return { success: false, code: "NOT_FOUND", error: "This Gang no longer exists." };
  }
  if (raw.includes("FORBIDDEN")) {
    return { success: false, code: "FORBIDDEN", error: "Only the owner can delete this Gang." };
  }
  logger.error({ message: `[GANG] Delete failed: ${raw}`, module: "GANG" });
  return { success: false, code: "FAILED", error: "Could not delete this Gang. Nothing was changed. Please try again." };
}

export class GangService {
  private readonly memberIdCache = new Map<string, { ids: string[]; at: number }>();
  private presenceSources: GangPresenceSources | null = null;
  /** The last presence each person was announced with. Absent means "not here", so only changes are sent. */
  private readonly lastPresence = new Map<string, GangPresence>();

  constructor(
    private readonly repository: GangRepository,
    private readonly roomManager?: RoomManager,
    private readonly io?: Server,
    private readonly economyService?: EconomyService | null
  ) {}

  /**
   * Daily-cap and risk rules for sending coins. Set at boot. Both paths that move
   * coins between players — sending, and paying a request — consult it, because
   * paying a request goes through a database function that never reaches the
   * economy service, so a check placed only there would miss it.
   */
  private transferPolicy: TransferPolicy | null = null;

  public setTransferPolicy(policy: TransferPolicy | null): void {
    this.transferPolicy = policy;
  }

  public getRepository(): GangRepository {
    return this.repository;
  }

  /** Push an event to everyone currently viewing this Gang. No-op without a socket server (unit tests). */
  private emitToGang(gangId: string, event: string, payload: unknown): void {
    this.io?.to(`gang:${gangId}`).emit(event as any, payload);
  }

  /**
   * Tell open clients that something about this Gang changed (members,
   * roles, settings, pins, deletions) so they refresh instead of showing a
   * stale view until a manual reload. Clients treat it as "refetch", not as
   * data, so a missed or duplicated event can never corrupt their state.
   */
  private notifyChanged(gangId: string, reason: string): void {
    this.memberIdCache.delete(gangId);
    this.emitToGang(gangId, "gang:changed", { gangId, reason });
  }

  /**
   * Who is an active member right now — the audience for activity events.
   * Cached briefly (a busy chat would otherwise query membership on every
   * message) and cleared the moment membership changes, so someone who is
   * removed stops receiving events immediately rather than after the TTL.
   */
  private async activeMemberIds(gangId: string): Promise<string[]> {
    if (!this.repository.isDurable()) {
      return this.repository.getMembers(gangId).filter((m) => m.state === "ACTIVE").map((m) => m.playerId);
    }
    const cached = this.memberIdCache.get(gangId);
    if (cached && Date.now() - cached.at < MEMBER_CACHE_TTL_MS) return cached.ids;
    const ids = (await this.repository.getMembersDurable(gangId)).map((m) => m.playerId);
    this.memberIdCache.set(gangId, { ids, at: Date.now() });
    return ids;
  }

  /**
   * Tell every active member — wherever they are in the app — that something
   * new was said, so their notification centre can summarise it. Each
   * authenticated socket sits in its own `user:<id>` room; sending to the
   * current members' rooms means a removed member simply is not addressed.
   */
  private async emitActivity(message: GangMessage): Promise<void> {
    if (!this.io) return;
    try {
      const ids = await this.activeMemberIds(message.gangId);
      if (ids.length === 0) return;
      const event: GangActivityEvent = {
        gangId: message.gangId,
        channelId: message.channelId,
        messageId: message.messageId,
        senderId: message.senderId,
        senderName: message.senderName,
        kind: message.kind ?? "TEXT",
        preview: message.content.slice(0, ACTIVITY_PREVIEW_LENGTH),
        at: message.timestamp,
        ...(message.roomCode ? { roomCode: message.roomCode, roomInvite: message.roomInvite } : {}),
      };
      this.io.to(ids.map((id) => `user:${id}`)).emit("gang:activity" as any, event);
    } catch (err) {
      logger.warn({
        message: `[GANG] Could not fan out activity: ${err instanceof Error ? err.message : String(err)}`,
        module: "GANG",
      });
    }
  }

  /* ── Gang Discovery & Creation ── */

  public async searchGangs(filter?: {
    search?: string;
    language?: string;
    tag?: string;
  }): Promise<Gang[]> {
    return this.repository.isDurable() ? this.repository.getAllDurable(filter) : this.repository.getAll(filter);
  }

  public async getGangById(id: string): Promise<Gang | undefined> {
    return this.repository.isDurable() ? this.repository.getByIdDurable(id) : this.repository.getById(id);
  }

  public async getGangByHandle(handle: string): Promise<Gang | undefined> {
    return this.repository.isDurable() ? this.repository.getByHandleDurable(handle) : this.repository.getByHandle(handle);
  }

  public async createGang(
    creatorId: string,
    creatorName: string,
    creatorAvatar: string,
    payload: CreateGangPayload
  ): Promise<{ success: boolean; gang?: Gang; error?: string }> {
    const cleanHandle = payload.handle.trim().toLowerCase().replace(/^@/, "");
    if (!cleanHandle || cleanHandle.length < 3 || cleanHandle.length > 24) {
      return { success: false, error: "Handle must be between 3 and 24 alphanumeric characters." };
    }

    if (!/^[a-z0-9_-]+$/.test(cleanHandle)) {
      return { success: false, error: "Handle can only contain lowercase letters, numbers, hyphens and underscores." };
    }

    if (this.repository.isDurable()) {
      try {
        const gang = await this.repository.createGangDurable({
          gangId: `gang_${nanoid(10)}`,
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
        return { success: true, gang };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not create Gang.") };
      }
    }

    const existing = this.repository.getByHandle(cleanHandle);
    if (existing) {
      return { success: false, error: "Handle is already taken. Please choose another unique handle." };
    }

    const gangId = `gang_${nanoid(10)}`;
    const now = Date.now();

    const gang: Gang = {
      id: gangId,
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

    this.repository.saveGang(gang);

    // Save Founder Member
    const ownerMember: GangMember = {
      memberId: `mem_${nanoid(8)}`,
      gangId,
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
        channelId: `ch_${gangId}_${ch.name}`,
        gangId,
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
      gangId,
      type: "COMMUNITY_MILESTONE",
      title: "Gang Established",
      description: `${creatorName} established ${gang.name} in BHALYAM.`,
      celebratedBy: [creatorId],
      timestamp: now,
    });

    // Audit Log
    this.repository.saveAuditLog({
      logId: `log_${nanoid(8)}`,
      gangId,
      actorId: creatorId,
      actorName: creatorName,
      // The audit log's stored action value; the SQL `create_mandali_with_owner` writes the same one.
      action: "MANDALI_CREATED",
      details: `Created Gang with handle @${cleanHandle}`,
      timestamp: now,
    });

    return { success: true, gang };
  }

  public async updateGangSettings(args: {
    gangId: string; actorId: string; name?: string; emblem?: string; description?: string;
    rules?: string; editPermission?: "ADMIN" | "ALL"; sendPermission?: "ADMIN" | "ALL"; joinApproval?: boolean;
  }): Promise<{ success: boolean; gang?: Gang; error?: string }> {
    const guard = this.requireDurable("Editing group info");
    if (guard) return guard;
    try {
      const gang = await this.repository.updateGangSettingsDurable({
        gangId: args.gangId, actorIdentityId: args.actorId, name: args.name, emblem: args.emblem,
        description: args.description, rules: args.rules, editPermission: args.editPermission,
        sendPermission: args.sendPermission, joinApproval: args.joinApproval,
      });
      this.notifyChanged(args.gangId, "settings");
      return { success: true, gang };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not update group info.") };
    }
  }

  /* ── Membership Operations ── */

  public async getMembers(gangId: string): Promise<GangMember[]> {
    const members = this.repository.isDurable()
      ? await this.repository.getMembersDurable(gangId)
      : this.repository.getMembers(gangId);
    return this.withLivePresence(members);
  }

  /**
   * Where presence comes from. Set at boot with the two live facts the rest of the
   * server already owns — who has a connection open, and who is seated in a game that
   * is under way — so presence is never stored and never stale after a restart.
   */
  public setPresenceSources(sources: GangPresenceSources): void {
    this.presenceSources = sources;
  }

  /** Online, in a game, or not here — right now. Without sources (a test, a tool) everyone reads as not here. */
  private presenceOf(
    playerId: string,
    games: ReadonlyMap<string, GameKind>,
    watch: ReadonlyMap<string, string> = new Map(),
  ): GangPresence {
    const activeGame = games.get(playerId);
    if (activeGame) {
      const watchCode = watch.get(playerId);
      return watchCode ? { presence: "in-game", activeGame, watchCode } : { presence: "in-game", activeGame };
    }
    return { presence: this.presenceSources?.isConnected(playerId) ? "online" : "offline" };
  }

  private withLivePresence(members: GangMember[]): GangMember[] {
    const games = this.presenceSources?.activeGames() ?? new Map<string, GameKind>();
    const watch = this.presenceSources?.watchRooms?.() ?? new Map<string, string>();
    return members.map((member) => {
      const { activeGame: _stale, watchCode: _staleCode, ...rest } = member;
      return { ...rest, ...this.presenceOf(member.playerId, games, watch) };
    });
  }

  /**
   * Re-check these people and tell their Gangs about anyone whose presence changed.
   *
   * Only a change is sent: a person first seen not-here is not "going offline", and a
   * check that finds the same answer says nothing. The group's live room is joined only
   * by people looking at that Gang, so this costs nothing for groups nobody has open.
   */
  public async refreshPresence(playerIds: readonly string[]): Promise<void> {
    if (!this.io) return;
    const games = this.presenceSources?.activeGames() ?? new Map<string, GameKind>();
    const watch = this.presenceSources?.watchRooms?.() ?? new Map<string, string>();
    for (const playerId of new Set(playerIds)) {
      const now = this.presenceOf(playerId, games, watch);
      const before = this.lastPresence.get(playerId) ?? { presence: "offline" as const };
      if (before.presence === now.presence && before.activeGame === now.activeGame && before.watchCode === now.watchCode) continue;
      if (now.presence === "offline") this.lastPresence.delete(playerId);
      else this.lastPresence.set(playerId, now);
      try {
        for (const gang of await this.getPlayerGangs(playerId)) {
          const member = (await this.getMembers(gang.id)).find((m) => m.playerId === playerId);
          if (!member) continue;
          const broadcast: GangPresenceChangedBroadcast = { gangId: gang.id, member };
          this.io.to(`gang:${gang.id}`).emit("gang:presence:changed" as never, broadcast as never);
        }
      } catch (err) {
        logger.warn({
          message: `[GANG] presence fan-out skipped for a member: ${err instanceof Error ? err.message : String(err)}`,
          module: "GANG",
        });
      }
    }
  }

  /** Everyone whose presence is currently something other than "not here" — the people worth re-checking. */
  public presenceWatchList(): string[] {
    return [...this.lastPresence.keys()];
  }

  /** Server-side membership gate — the only trustworthy way to answer "can this caller see private community content?" */
  public async isActiveMember(gangId: string, playerId: string): Promise<boolean> {
    const member = this.repository.isDurable()
      ? await this.repository.getMemberDurable(gangId, playerId)
      : this.repository.getMember(gangId, playerId);
    return member?.state === "ACTIVE";
  }

  public async getPlayerGangs(playerId: string): Promise<Gang[]> {
    return this.repository.isDurable()
      ? this.repository.getPlayerGangsDurable(playerId)
      : this.repository.getPlayerGangs(playerId);
  }

  public async applyToGang(
    gangId: string,
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
          gangId,
          requesterIdentityId: playerId,
          requesterDisplayName: displayName,
          requesterAvatar: avatar,
          invitationId,
        });
        this.notifyChanged(gangId, result.autoApproved ? "member-joined" : "join-requested");
        if (result.autoApproved) void this.announceJoin(gangId, playerId);
        return { success: true, pending: !result.autoApproved };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not join this Gang.") };
      }
    }

    const gang = this.repository.getById(gangId);
    if (!gang) return { success: false, error: "Gang not found." };

    if (gang.memberCount >= gang.maxMembers) {
      return { success: false, error: "Gang has reached maximum member capacity." };
    }

    const existingMember = this.repository.getMember(gangId, playerId);
    if (existingMember && existingMember.state === "BANNED") {
      return { success: false, error: "You are currently banned from this Gang." };
    }
    if (existingMember && existingMember.state === "ACTIVE") {
      return { success: false, error: "You are already an active member of this Gang." };
    }

    // Direct join if public
    if (gang.visibility === "PUBLIC") {
      const newMember: GangMember = {
        memberId: `mem_${nanoid(8)}`,
        gangId,
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
        gangId,
        actorId: playerId,
        actorName: displayName,
        action: "MEMBER_JOINED",
        details: `${displayName} joined the Gang.`,
        timestamp: Date.now(),
      });

      this.memberIdCache.delete(gangId);
      void this.announceJoin(gangId, playerId);
      return { success: true };
    }

    // Otherwise create pending application
    this.repository.saveApplication({
      id: `app_${nanoid(8)}`,
      gangId,
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

  public async leaveGang(gangId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        await this.repository.transitionMembershipDurable(gangId, playerId, playerId, "LEAVE");
        this.notifyChanged(gangId, "member-left");
        this.evictFromGangRoom(gangId, playerId);
        return { success: true };
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        if (raw.includes("OWNER_MUST_TRANSFER")) return { success: false, error: HOST_MUST_HAND_OVER };
        return { success: false, error: durableErrorMessage(err, "Could not leave this Gang.") };
      }
    }

    const member = this.repository.getMember(gangId, playerId);
    if (!member || member.state !== "ACTIVE") {
      return { success: false, error: "You are not an active member of this Gang." };
    }

    if (member.role === "OWNER") {
      return { success: false, error: HOST_MUST_HAND_OVER };
    }

    const transition = MembershipStateMachine.transitionMembership(
      member.state,
      "LEFT",
      playerId,
      member.displayName,
      gangId,
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

    this.notifyChanged(gangId, "member-left");
    this.evictFromGangRoom(gangId, playerId);
    return { success: true };
  }

  public async kickMember(
    gangId: string,
    officerId: string,
    officerName: string,
    targetPlayerId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        await this.repository.transitionMembershipDurable(gangId, officerId, targetPlayerId, "KICK");
        this.notifyChanged(gangId, "member-removed");
        this.evictFromGangRoom(gangId, targetPlayerId);
        return { success: true };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not remove this member.") };
      }
    }

    const officer = this.repository.getMember(gangId, officerId);
    if (!hasGangPermission(officer?.role, "KICK_MEMBERS")) {
      return { success: false, error: "Insufficient permissions to kick members." };
    }

    const target = this.repository.getMember(gangId, targetPlayerId);
    if (!target || target.state !== "ACTIVE") {
      return { success: false, error: "Target member is not active." };
    }

    if (target.role === "OWNER") {
      return { success: false, error: "Cannot kick the Gang owner." };
    }

    const transition = MembershipStateMachine.transitionMembership(
      target.state,
      "REMOVED",
      officerId,
      officerName,
      gangId,
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

  public async promoteMember(gangId: string, actorId: string, targetId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Promoting a member");
    if (guard) return guard;
    try {
      await this.repository.transitionMembershipDurable(gangId, actorId, targetId, "PROMOTE");
      this.notifyChanged(gangId, "member-promoted");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not promote this member.") };
    }
  }

  public async demoteMember(gangId: string, actorId: string, targetId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Demoting a member");
    if (guard) return guard;
    try {
      await this.repository.transitionMembershipDurable(gangId, actorId, targetId, "DEMOTE");
      this.notifyChanged(gangId, "member-demoted");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not demote this member.") };
    }
  }

  public async banMember(gangId: string, actorId: string, targetId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Banning a member");
    if (guard) return guard;
    try {
      await this.repository.transitionMembershipDurable(gangId, actorId, targetId, "BAN");
      this.notifyChanged(gangId, "member-banned");
      this.evictFromGangRoom(gangId, targetId);
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not ban this member.") };
    }
  }

  public async transferOwnership(gangId: string, currentOwnerId: string, newOwnerId: string): Promise<{ success: boolean; gang?: Gang; error?: string }> {
    const guard = this.requireDurable("Transferring ownership");
    if (guard) return guard;
    try {
      const gang = await this.repository.transferOwnershipDurable(gangId, currentOwnerId, newOwnerId);
      this.notifyChanged(gangId, "ownership-transferred");
      return { success: true, gang };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not transfer ownership.") };
    }
  }

  /**
   * Delete a Gang for good. Permanent, and it takes the conversation with it.
   *
   * Three independent guards, in this order so a stranger learns nothing:
   *   1. the caller must be the owner — checked here for a fast, quiet refusal,
   *      and again inside the database function, which is the real arbiter
   *      (ownership can change between this read and that call);
   *   2. the caller must have typed the Gang's handle, so a stale screen or
   *      a stray request cannot delete the wrong group;
   *   3. only then is anything removed.
   *
   * Members are told AFTER the delete succeeds and BEFORE their sockets are
   * pulled out of the room — the other way round the announcement would reach
   * nobody who was watching the chat.
   */
  public async deleteGang(gangId: string, actorId: string, confirmHandle: string): Promise<DeleteGangResult> {
    const gang = await this.getGangById(gangId);
    if (!gang) return { success: false, code: "NOT_FOUND", error: "This Gang no longer exists." };
    if (gang.ownerId !== actorId) {
      return { success: false, code: "FORBIDDEN", error: "Only the owner can delete this Gang." };
    }
    if (normaliseHandle(confirmHandle) !== gang.handle.toLowerCase()) {
      return { success: false, code: "CONFIRMATION_MISMATCH", error: "Type the Gang's handle exactly to confirm." };
    }

    let name = gang.name;
    let memberIds: string[];
    try {
      if (this.repository.isDurable()) {
        const deleted = await this.repository.deleteGangDurable(gangId, actorId);
        name = deleted.name || name;
        memberIds = deleted.memberIds;
      } else {
        memberIds = this.repository.getMembers(gangId).filter((m) => m.state === "ACTIVE").map((m) => m.playerId);
      }
    } catch (err) {
      return deleteFailure(err);
    }

    this.repository.purgeGang(gangId);
    this.memberIdCache.delete(gangId);
    this.announceDeleted({ gangId, name }, memberIds);
    logger.info({ message: `[GANG] ${gangId} deleted by its owner (${memberIds.length} members)`, module: "GANG" });
    return { success: true };
  }

  /**
   * End someone's live access to a Gang after they leave or are removed.
   * Their membership is already gone, but every tab or device they have open is
   * still sitting in the Gang's room and would keep receiving the chat until
   * it reconnected. All of a person's authenticated sockets share their
   * personal `user:<id>` room, so one call reaches every one of them.
   */
  private evictFromGangRoom(gangId: string, playerId: string): void {
    try {
      this.io?.in(`user:${playerId}`).socketsLeave(`gang:${gangId}`);
    } catch (err) {
      this.logSocketFailure("evict a member from the Gang room", err);
    }
  }

  /**
   * Both socket helpers run AFTER the change is already committed. A failure here
   * must not turn a completed leave or delete into an error response, so it is
   * logged and swallowed.
   */
  private announceDeleted(event: GangDeletedEvent, memberIds: string[]): void {
    if (!this.io) return;
    try {
      const room = `gang:${event.gangId}`;
      this.io.to([room, ...memberIds.map((id) => `user:${id}`)]).emit("gang:deleted" as any, event);
      this.io.in(room).socketsLeave(room);
    } catch (err) {
      this.logSocketFailure("announce a deleted Gang", err);
    }
  }

  private logSocketFailure(what: string, err: unknown): void {
    logger.warn({
      message: `[GANG] Could not ${what}: ${err instanceof Error ? err.message : String(err)}`,
      module: "GANG",
    });
  }

  /* ── Invite links & join-request approval ── */

  public async createInviteLink(
    gangId: string, issuerId: string, expiresInMs = 7 * 24 * 60 * 60 * 1000
  ): Promise<{ success: boolean; invitation?: import("@shared/gang/types.js").GangInviteLink; error?: string }> {
    const guard = this.requireDurable("Creating an invite link");
    if (guard) return guard;
    try {
      const invitation = await this.repository.createInviteLinkDurable(
        `inv_${nanoid(10)}`, gangId, issuerId, Date.now() + expiresInMs
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

  public async getPendingJoinRequests(gangId: string): Promise<import("@shared/gang/types.js").GangJoinRequestRecord[]> {
    if (!this.repository.isDurable()) return [];
    return this.repository.getJoinRequestsDurable(gangId, "PENDING");
  }

  public async decideJoinRequest(
    requestId: string, reviewerId: string, approve: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Deciding a join request");
    if (guard) return guard;
    try {
      const decided = await this.repository.decideJoinRequestDurable(requestId, reviewerId, approve);
      this.notifyChanged(decided.gangId, approve ? "member-joined" : "join-declined");
      if (approve) void this.announceJoin(decided.gangId, decided.requesterIdentityId);
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not decide this join request.") };
    }
  }

  /* ── Realtime Channels & Messages ── */

  public async getChannels(gangId: string): Promise<GangChannel[]> {
    return this.repository.isDurable() ? this.repository.getChannelsDurable(gangId) : this.repository.getChannels(gangId);
  }

  /** `sinceMs`: a member sees only what was said from the moment they joined. */
  public async getMessages(channelId: string, limit = 50, sinceMs?: number): Promise<GangMessage[]> {
    return this.repository.isDurable()
      ? this.repository.getMessagesDurable(channelId, limit, sinceMs)
      : this.repository.getMessages(channelId, limit, sinceMs);
  }

  /** When this person's current membership began, or `null` if they are not an active member. */
  public async getMemberJoinedAt(gangId: string, playerId: string): Promise<number | null> {
    const member = this.repository.isDurable()
      ? await this.repository.getMemberDurable(gangId, playerId)
      : this.repository.getMember(gangId, playerId);
    return member?.state === "ACTIVE" ? member.joinedAt : null;
  }

  /**
   * Tell the group someone joined: a line in the main chat (live for anyone
   * reading it, stored for anyone who reads later) and an activity event so
   * members elsewhere in the app are told too. Never throws — a join has
   * already succeeded and must not be undone by a failed announcement.
   */
  private async announceJoin(gangId: string, playerId: string): Promise<void> {
    try {
      let message: GangMessage;
      if (this.repository.isDurable()) {
        const member = await this.repository.getMemberDurable(gangId, playerId);
        const name = clampText(member?.displayName ?? "A new member", 40);
        ({ message } = await this.repository.postSystemMessageDurable({
          messageId: `sys_${nanoid(10)}`, gangId, actorIdentityId: playerId, content: `${name} joined the Gang`,
        }));
      } else {
        const member = this.repository.getMember(gangId, playerId);
        const channel = this.repository.getChannels(gangId).find((c) => c.type === "TEXT" && !c.isArchived);
        if (!member || !channel) return;
        message = {
          messageId: `sys_${nanoid(10)}`, channelId: channel.channelId, gangId, senderId: playerId,
          senderName: member.displayName, senderAvatar: member.avatar, senderRole: member.role,
          content: `${clampText(member.displayName, 40)} joined the Gang`, reactions: {},
          timestamp: Date.now(), kind: "SYSTEM",
        };
        this.repository.saveMessage(message);
      }
      if (this.io) {
        this.io.to(`gang:${gangId}`).emit("gang:chat:message" as any, {
          gangId, channelId: message.channelId, message,
        });
      }
      void this.emitActivity(message);
    } catch (err) {
      logger.warn({
        message: `[GANG] Could not announce a new member: ${err instanceof Error ? err.message : String(err)}`,
        module: "GANG",
      });
    }
  }

  public async sendMessage(
    gangId: string,
    channelId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    content: string,
    replyToId?: string,
    clientRequestId?: string
  ): Promise<{ success: boolean; message?: GangMessage; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        const { message } = await this.repository.sendMessageDurable({
          messageId: `msg_${nanoid(10)}`, gangId, channelId, senderIdentityId: senderId,
          content: clampText(content, 2000), replyToId, clientRequestId,
        });
        if (this.io) {
          this.io.to(`gang:${gangId}`).emit("gang:chat:message" as any, { gangId, channelId, message });
        }
        void this.emitActivity(message);
        return { success: true, message };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not send this message.") };
      }
    }

    const member = this.repository.getMember(gangId, senderId);
    if (!member || member.state !== "ACTIVE") {
      return { success: false, error: "Must be an active member to post messages." };
    }

    const channel = this.repository.getChannels(gangId).find((c) => c.channelId === channelId);
    if (!channel || channel.isArchived) {
      return { success: false, error: "Channel not found or archived." };
    }

    if (channel.type === "ANNOUNCEMENT" && !hasGangPermission(member.role, "PIN_MESSAGES")) {
      return { success: false, error: "Only officers and owners can post in announcements." };
    }

    const message: GangMessage = {
      messageId: `msg_${nanoid(10)}`,
      channelId,
      gangId,
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
      this.io.to(`gang:${gangId}`).emit("gang:chat:message" as any, {
        gangId,
        channelId,
        message,
      });
    }
    void this.emitActivity(message);

    return { success: true, message };
  }

  /* ── Shared rooms ── */

  private roomInviteState(summary: NonNullable<ReturnType<RoomManager["getRoomSummary"]>> | null): RoomInviteState {
    if (!summary) return "CLOSED";
    if (summary.phase === "playing") return "IN_PROGRESS";
    if (summary.phase === "finished" || summary.sealed) return "CLOSED";
    return summary.players >= summary.maxPlayers ? "FULL" : "OPEN";
  }

  /**
   * Post the room the sender is sitting in into a Gang's chat as a
   * joinable card. Only someone actually in the room may share it, only while
   * it is still a lobby with a free seat — a card for a room nobody can enter
   * is just noise.
   */
  public async shareRoomInvite(args: {
    gangId: string; senderId: string; roomCode: string; channelId?: string;
  }): Promise<{
    success: boolean; message?: GangMessage; deduplicated?: boolean; error?: string; retryAfterMs?: number;
  }> {
    if (!this.roomManager) return { success: false, error: "Sharing a room is not available right now." };

    const code = args.roomCode.trim().toUpperCase();
    if (!ROOM_CODE_PATTERN.test(code)) return { success: false, error: "That does not look like a room code." };

    const summary = this.roomManager.getRoomSummary(code);
    if (!summary) return { success: false, error: "That room is not open any more." };
    if (!this.roomManager.isIdentityInRoom(code, args.senderId)) {
      return { success: false, error: "You can only share a room you are in." };
    }
    if (summary.sealed) return { success: false, error: "This room is private and cannot take new players." };
    if (summary.phase !== "lobby") return { success: false, error: "That match has already started, so it cannot be shared." };
    if (summary.players >= summary.maxPlayers) {
      return { success: false, error: "Your room is full, so nobody could join from the chat." };
    }

    const durable = this.repository.isDurable();
    const channels = durable
      ? await this.repository.getChannelsDurable(args.gangId)
      : this.repository.getChannels(args.gangId);
    const channel =
      (args.channelId ? channels.find((c) => c.channelId === args.channelId) : undefined) ??
      channels.find((c) => c.type === "TEXT");
    if (!channel) return { success: false, error: "This Gang has no chat channel to post in." };

    const metadata: RoomInviteMetadata = {
      game: summary.game,
      gameName: GAME_DISPLAY_NAMES[summary.game] ?? summary.game,
      maxPlayers: summary.maxPlayers,
      ...(summary.name ? { roomName: clampText(summary.name, 40) } : {}),
      ...(summary.hostName ? { hostName: clampText(summary.hostName, 20) } : {}),
    };

    let message: GangMessage;
    let deduplicated = false;

    if (durable) {
      try {
        const result = await this.repository.postRoomInviteDurable({
          messageId: `msg_${nanoid(10)}`, gangId: args.gangId, channelId: channel.channelId,
          senderIdentityId: args.senderId, roomCode: code, metadata,
        });
        message = result.message;
        deduplicated = result.deduplicated;
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        const retrySeconds = Number(raw.match(/RATE_LIMITED:\s*retry_after_seconds=(\d+)/)?.[1]);
        if (Number.isFinite(retrySeconds)) {
          return {
            success: false,
            retryAfterMs: retrySeconds * 1000,
            error: `You have shared a lot of rooms here lately. Try again in ${Math.ceil(retrySeconds / 60)} minutes.`,
          };
        }
        return { success: false, error: durableErrorMessage(err, "Could not share this room.") };
      }
    } else {
      const member = this.repository.getMember(args.gangId, args.senderId);
      if (!member || member.state !== "ACTIVE") return { success: false, error: "Only members can share a room here." };

      const now = Date.now();
      const existing = this.repository.findRecentRoomInvite(args.gangId, code, now - ROOM_INVITE_DEDUPE_MS);
      if (existing) {
        return { success: true, message: existing, deduplicated: true };
      }
      const { count, oldest } = this.repository.countRoomInvitesBy(args.gangId, args.senderId, now - HOUR_MS);
      if (count >= ROOM_INVITE_MAX_PER_HOUR && oldest !== null) {
        const retryAfterMs = oldest + HOUR_MS - now;
        return {
          success: false,
          retryAfterMs,
          error: `You have shared a lot of rooms here lately. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
        };
      }

      message = {
        messageId: `msg_${nanoid(10)}`,
        channelId: channel.channelId,
        gangId: args.gangId,
        senderId: args.senderId,
        senderName: member.displayName,
        senderAvatar: member.avatar,
        senderRole: member.role,
        content: `🎮 ${metadata.gameName} room ${code} — tap Join to play`,
        reactions: {},
        timestamp: now,
        kind: "ROOM_INVITE",
        roomCode: code,
        roomInvite: metadata,
      };
      this.repository.saveMessage(message);
    }

    if (!deduplicated) {
      this.io?.to(`gang:${args.gangId}`).emit("gang:chat:message" as any, {
        gangId: args.gangId, channelId: channel.channelId, message,
      });
      void this.emitActivity(message);
    }
    return { success: true, message, deduplicated };
  }

  /**
   * Live standing of rooms that were shared into Gangs this person belongs
   * to. A code that was never shared to them is simply not answered — this is
   * not a lookup for arbitrary rooms.
   */
  public async getRoomInviteStatuses(playerId: string, rawCodes: readonly string[]): Promise<RoomInviteStatus[]> {
    if (!this.roomManager) return [];
    const codes = Array.from(
      new Set(rawCodes.map((c) => c.trim().toUpperCase()).filter((c) => ROOM_CODE_PATTERN.test(c)))
    ).slice(0, MAX_STATUS_CODES);
    if (codes.length === 0) return [];

    const visible = this.repository.isDurable()
      ? await this.repository.getVisibleInviteCodesDurable(playerId, codes)
      : this.repository.getVisibleInviteCodes(playerId, codes);

    return codes
      .filter((code) => visible.has(code))
      .map((code) => {
        const summary = this.roomManager!.getRoomSummary(code);
        return {
          code,
          state: this.roomInviteState(summary),
          players: summary?.players ?? 0,
          maxPlayers: summary?.maxPlayers ?? 0,
          youAreIn: this.roomManager!.isIdentityInRoom(code, playerId),
        };
      });
  }

  /* ── Notifications: read state and the digest ── */

  public async getDigests(playerId: string): Promise<GangDigest[]> {
    return this.repository.isDurable() ? this.repository.getDigestsDurable(playerId) : this.repository.getDigests(playerId);
  }

  public async markRead(
    gangId: string, playerId: string
  ): Promise<{ success: boolean; previous?: number; current?: number; error?: string }> {
    if (this.repository.isDurable()) {
      try {
        return { success: true, ...(await this.repository.markReadDurable(gangId, playerId)) };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not update your read status.") };
      }
    }
    const member = this.repository.getMember(gangId, playerId);
    if (!member || member.state !== "ACTIVE") return { success: false, error: "You are not a member of this Gang." };
    return { success: true, ...this.repository.markRead(gangId, playerId) };
  }

  public async setNotificationLevel(
    gangId: string, playerId: string, level: NotificationLevel
  ): Promise<{ success: boolean; error?: string }> {
    if (!["ALL", "INVITES_ONLY", "MUTED"].includes(level)) return { success: false, error: "Unknown notification setting." };
    if (this.repository.isDurable()) {
      try {
        await this.repository.setNotificationLevelDurable(gangId, playerId, level);
        return { success: true };
      } catch (err) {
        return { success: false, error: durableErrorMessage(err, "Could not change this setting.") };
      }
    }
    const member = this.repository.getMember(gangId, playerId);
    if (!member || member.state !== "ACTIVE") return { success: false, error: "You are not a member of this Gang." };
    this.repository.setNotificationLevel(gangId, playerId, level);
    return { success: true };
  }

  public async setMessagePin(gangId: string, messageId: string, actorId: string, pinned: boolean): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Pinning a message");
    if (guard) return guard;
    try {
      await this.repository.setMessagePinDurable(messageId, actorId, pinned);
      this.notifyChanged(gangId, "message-pinned");
      return { success: true };
    } catch (err) {
      return { success: false, error: durableErrorMessage(err, "Could not update this message's pin state.") };
    }
  }

  public async deleteMessage(gangId: string, messageId: string, actorId: string): Promise<{ success: boolean; error?: string }> {
    const guard = this.requireDurable("Deleting a message");
    if (guard) return guard;
    try {
      await this.repository.deleteMessageDurable(messageId, actorId);
      this.notifyChanged(gangId, "message-deleted");
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
   * payable coin-request feature: create a request addressed to one member,
   * and let any active member of the group fund it via the same atomic
   * transfer RPC (see 20261011000000_mandali_coin_request_any_member_pays). */
  public async createCoinRequest(args: {
    gangId: string; channelId: string; requesterId: string; payerId: string;
    amount: number; expiresInMs?: number;
  }): Promise<{
    success: boolean; request?: import("@shared/gang/types.js").GangCoinRequest;
    error?: string; retryAfterMs?: number;
  }> {
    const guard = this.requireDurable("Requesting coins");
    if (guard) return guard;
    if (Math.floor(args.amount) !== GANG_COIN_AMOUNT) {
      return { success: false, error: `Coin requests are always ${GANG_COIN_AMOUNT} coins.` };
    }
    try {
      const request = await this.repository.createCoinRequestDurable({
        requestId: `cr_${nanoid(10)}`, gangId: args.gangId, channelId: args.channelId,
        requesterIdentityId: args.requesterId, payerIdentityId: args.payerId, amount: GANG_COIN_AMOUNT,
        expiresAt: Date.now() + (args.expiresInMs ?? 24 * 60 * 60 * 1000),
        cooldownSeconds: GANG_COIN_REQUEST_COOLDOWN_MS / 1000,
      });
      // The card is created inside the database function, so the normal chat
      // broadcast in sendMessage never fires for it. Without this, only the
      // requester (who refetches) ever sees the card and nobody else is told
      // they were asked. Carry the request too: a card with no request record
      // renders as plain text with no Pay button.
      const message = request.messageId
        ? await this.repository.getMessageByIdDurable(request.messageId).catch(() => undefined)
        : undefined;
      this.emitToGang(args.gangId, "gang:coin_request:updated", { gangId: args.gangId, request, message });
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
    return { retryAfterMs: Math.max(0, lastAt + GANG_COIN_REQUEST_COOLDOWN_MS - Date.now()) };
  }

  public async fundCoinRequest(
    requestId: string, payerId: string
  ): Promise<{ success: boolean; request?: import("@shared/gang/types.js").GangCoinRequest; error?: string }> {
    const guard = this.requireDurable("Paying a coin request");
    if (guard) return guard;
    // One payment at a time per payer, so the day's cap is read after the last one landed.
    const run = () => this.fundCoinRequestChecked(requestId, payerId);
    return this.transferPolicy ? this.transferPolicy.serialised(payerId, run) : run();
  }

  private async fundCoinRequestChecked(
    requestId: string, payerId: string
  ): Promise<{ success: boolean; request?: import("@shared/gang/types.js").GangCoinRequest; error?: string }> {
    // Standing is checked here; the daily total is checked by the database, under the
    // payer's wallet lock and against the request's own amount. That also means a
    // replay of a request that already landed is answered "already paid", not "limit
    // reached", because the database only checks an OPEN request.
    const standing = this.transferPolicy?.checkStanding(payerId);
    if (standing && !standing.ok) return { success: false, error: standing.message };
    let dailyCap: { maxCoins: string; dayStartMs: number } | undefined;
    try {
      dailyCap = await this.transferPolicy?.capFor(payerId);
    } catch {
      return { success: false, error: "Coin transfers are temporarily unavailable. Try again in a moment." };
    }
    try {
      const { alreadyFunded, request } = await this.repository.fundCoinRequestDurable(requestId, payerId, `mnd_coin_req:${requestId}`, dailyCap);
      // Now that anyone in the group can pay, two people can tap at once. The
      // database lets only the first through; the second must hear that
      // someone beat them to it, not a success that implies their coins moved.
      // A retry by the person who did pay is still a plain success.
      if (alreadyFunded && request.fundedByIdentityId && request.fundedByIdentityId !== payerId) {
        return { success: false, request, error: "Someone in the group has already paid this request." };
      }
      this.emitToGang(request.gangId, "gang:coin_request:updated", { gangId: request.gangId, request });
      // Only the call that actually moved the coins announces it; a harmless retry stays quiet.
      if (!alreadyFunded) {
        this.notifyWalletsChanged(request.gangId, request.id, [request.requesterIdentityId, payerId], {
          amount: request.amount,
          requesterIdentityId: request.requesterIdentityId,
          fundedByIdentityId: payerId,
        });
      }
      return { success: true, request };
    } catch (err) {
      if (err instanceof TransferCapExceededError || (err instanceof Error && err.message.includes("TRANSFER_CAP_EXCEEDED"))) {
        return { success: false, error: "You have reached today's limit for sending coins. It resets at midnight UTC." };
      }
      return { success: false, error: durableErrorMessage(err, "Could not pay this coin request.") };
    }
  }

  /**
   * Tell the wallets whose balance just changed, wherever they are in the app.
   *
   * The group broadcast above only reaches people who have that Gang open (they join its
   * room when they view it). A requester who went back to the home screen would otherwise not
   * learn that a friend paid until they next opened the wallet. Every signed-in socket is in its
   * own `user:<id>` room (see GangSocketHandlers), so this reaches all of that person's devices.
   */
  private notifyWalletsChanged(
    gangId: string,
    requestId: string,
    identityIds: readonly string[],
    /** What happened, so the app can celebrate it: who asked, who paid and how much. Nothing private beyond what the group already sees on the card. */
    detail?: { amount: number; requesterIdentityId: string; fundedByIdentityId: string },
  ): void {
    for (const identityId of new Set(identityIds)) {
      this.io
        ?.to(`user:${identityId}`)
        .emit("gang:wallet_changed" as never, { gangId, requestId, reason: "coin_request_funded", ...detail } as never);
    }
  }

  public async getCoinRequests(
    gangId: string, sinceMs?: number
  ): Promise<import("@shared/gang/types.js").GangCoinRequest[]> {
    if (!this.repository.isDurable()) return [];
    const requests = await this.repository.getCoinRequestsDurable(gangId);
    return sinceMs === undefined ? requests : requests.filter((r) => r.createdAt >= sinceMs);
  }

  public reactToMessage(
    gangId: string,
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
      this.io.to(`gang:${gangId}`).emit("gang:chat:reaction_updated" as any, {
        gangId,
        channelId,
        messageId,
        emoji,
        reactions: msg.reactions,
      });
    }

    return { success: true, reactions: msg.reactions };
  }

  /* ── Gnapakalu Memories & Events ── */

  public getMemories(gangId: string): GangMemory[] {
    return this.repository.getMemories(gangId);
  }

  public recordMemory(
    gangId: string,
    memory: Omit<GangMemory, "memoryId" | "celebratedBy" | "timestamp" | "gangId">
  ): GangMemory {
    const mem: GangMemory = {
      memoryId: `mem_${nanoid(8)}`,
      gangId,
      celebratedBy: [],
      timestamp: Date.now(),
      ...memory,
    };

    this.repository.saveMemory(mem);

    if (this.io) {
      this.io.to(`gang:${gangId}`).emit("gang:memory:created" as any, {
        gangId,
        memory: mem,
      });
    }

    return mem;
  }

  public getEvents(gangId: string): GangEvent[] {
    return this.repository.getEvents(gangId);
  }

  public createEvent(
    gangId: string,
    hostId: string,
    hostName: string,
    payload: {
      title: string;
      description: string;
      game?: GameKind;
      scheduledAt: number;
    }
  ): { success: boolean; event?: GangEvent; error?: string } {
    const member = this.repository.getMember(gangId, hostId);
    if (!hasGangPermission(member?.role, "CREATE_EVENTS")) {
      return { success: false, error: "Insufficient permissions to schedule events." };
    }

    const event: GangEvent = {
      eventId: `evt_${nanoid(8)}`,
      gangId,
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

  public getCoinTransfers(gangId: string, sinceMs?: number): GangCoinTransfer[] {
    const transfers = this.repository.getCoinTransfers(gangId);
    return sinceMs === undefined ? transfers : transfers.filter((t) => t.timestamp >= sinceMs);
  }

  public async transferCoins(
    gangId: string,
    fromPlayerId: string,
    payload: CoinTransferPayload
  ): Promise<{ success: boolean; transfer?: GangCoinTransfer; error?: string }> {
    // Asking for coins goes through createCoinRequest (payable card, 4-hour
    // limit). Accepting REQUEST here would be a side door around that limit.
    if (payload.type !== "SEND") {
      return { success: false, error: "Use Request Coins to ask a member for coins." };
    }

    // In durable mode the in-memory member map is empty (members live in
    // Postgres), so reading it here would reject every real member.
    const durable = this.repository.isDurable();
    const fromMember = durable
      ? await this.repository.getMemberDurable(gangId, fromPlayerId)
      : this.repository.getMember(gangId, fromPlayerId);
    if (!fromMember || fromMember.state !== "ACTIVE") {
      return { success: false, error: "Sender must be an active member of this Gang." };
    }

    const toMember = durable
      ? await this.repository.getMemberDurable(gangId, payload.toPlayerId)
      : this.repository.getMember(gangId, payload.toPlayerId);
    if (!toMember || toMember.state !== "ACTIVE") {
      return { success: false, error: "Recipient must be an active member of this Gang." };
    }

    if (fromPlayerId === payload.toPlayerId) {
      return { success: false, error: "Cannot transfer coins to yourself." };
    }

    const amount = Math.floor(payload.amount);
    if (amount !== GANG_COIN_AMOUNT) {
      return { success: false, error: `Coins can only be sent in ${GANG_COIN_AMOUNT}-coin transfers.` };
    }

    const transferId = `ctx_${nanoid(10)}`;

    // Coins are real wallet balance, not a Gang-internal fiction — if
    // there is no economy layer wired in, a "successful" send would just
    // be a lie (the transfer record would show coins moving that never
    // did). Fail honestly instead of silently no-op'ing.
    if (!this.economyService) {
      return { success: false, error: "Coin transfers are temporarily unavailable." };
    }

    // One send at a time per sender, so the day's cap is read after the last one landed.
    const policy = this.transferPolicy;
    const economy = this.economyService;
    return policy
      ? policy.serialised(fromPlayerId, () => this.sendCoinsChecked(economy, policy, gangId, fromPlayerId, fromMember, toMember, payload, amount, transferId))
      : this.sendCoinsChecked(economy, null, gangId, fromPlayerId, fromMember, toMember, payload, amount, transferId);
  }

  private async sendCoinsChecked(
    economy: NonNullable<GangService["economyService"]>,
    policy: TransferPolicy | null,
    gangId: string,
    fromPlayerId: string,
    fromMember: GangMember,
    toMember: GangMember,
    payload: { toPlayerId: string; note?: string },
    amount: number,
    transferId: string,
  ): Promise<{ success: boolean; transfer?: GangCoinTransfer; error?: string }> {
    const verdict = await policy?.check(fromPlayerId, amount);
    if (verdict && !verdict.ok) return { success: false, error: verdict.message };
    // The check above gives the friendly message; this is what actually holds when
    // sends race, because the transfer enforces it under the sender's wallet lock.
    let dailyCap: { maxCoins: string; dayStartMs: number } | undefined;
    try {
      dailyCap = await policy?.capFor(fromPlayerId);
    } catch {
      return { success: false, error: "Coin transfers are temporarily unavailable. Try again in a moment." };
    }

    try {
      // Atomic — debits fromPlayerId and credits toPlayerId in ONE
      // transaction (see transfer_wallet_coins). Previously this made two
      // independent adminAdjustWallet calls (a credit-only primitive),
      // which credited BOTH wallets instead of moving coins between them.
      await economy.transferWalletCoins({
        fromIdentityId: fromPlayerId,
        toIdentityId: payload.toPlayerId,
        amountCoins: String(amount),
        reason: payload.note || `Gang coin transfer in ${gangId}`,
        idempotencyKey: `mnd_transfer:${transferId}`,
        ...(dailyCap ? { dailyCap } : {}),
      });
    } catch (err) {
      logger.warn({
        message: `[GANG] Coin transfer failed: ${err instanceof Error ? err.message : String(err)}`,
        module: "GANG",
      });
      // Two shapes reach here: the Supabase RPC's raw "INSUFFICIENT_FUNDS: ..."
      // exception text, and the in-memory repository's typed error classes
      // with human-readable messages — check both.
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof TransferCapExceededError || message.includes("TRANSFER_CAP_EXCEEDED")) {
        return { success: false, error: "You have reached today's limit for sending coins. It resets at midnight UTC." };
      }
      if (err instanceof InsufficientFundsError || message.includes("INSUFFICIENT_FUNDS")) {
        return { success: false, error: "Insufficient funds for this transfer." };
      }
      if (err instanceof WalletFrozenError || message.includes("WALLET_FROZEN")) {
        return { success: false, error: "One of these wallets is frozen and cannot transfer coins." };
      }
      return { success: false, error: "Coin transfer failed. Please try again." };
    }

    const transfer: GangCoinTransfer = {
      transferId,
      gangId,
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
    const channels = this.repository.isDurable()
      ? await this.repository.getChannelsDurable(gangId)
      : this.repository.getChannels(gangId);
    const chatChannel = channels.find((c) => c.type === "TEXT") || channels[0];
    if (chatChannel) {
      void this.sendMessage(
        gangId,
        chatChannel.channelId,
        fromPlayerId,
        fromMember.displayName,
        fromMember.avatar,
        `🪙 Sent ${amount} coins to @${toMember.displayName}${payload.note ? ` • "${payload.note}"` : ""}`
      );
    }

    if (this.io) {
      this.io.to(`gang:${gangId}`).emit("gang:coin_transfer" as any, {
        gangId,
        transfer,
      });
    }

    return { success: true, transfer };
  }
}
