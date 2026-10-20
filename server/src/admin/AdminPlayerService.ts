import type { AdminUserSummary, AdminUsersResponse, AdminUserDetails, AdminRecordSection, AdminSuspensionRequest, AdminSuspensionState } from "@shared/adminUsers.js";
import type { ProgressionRepository } from "../persistence/ProgressionRepository.js";
import { progressionRepository } from "../persistence/index.js";
import { PostgrestClient, PostgrestError, readPostgrestConfig } from "../persistence/postgrest.js";
import { operationalAuthConfig, listDynamicRoles } from "../security/operationalAuth.js";
import { logger } from "../lib/logger.js";

export class AdminPlayerError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export interface DirectoryQuery {
  page: number;
  pageSize: number;
  search: string;
  kind: "all" | "member" | "guest";
  role: "all" | AdminUserSummary["role"];
}

/** Sections whose first page ships with the details; every other section is counted and loaded on demand. */
const PRIMARY_SECTIONS: ReadonlySet<string> = new Set(["account", "profile", "matches", "wallet"]);
/** Rows per page of every record table on the admin player page; the client asks for the same number. */
export const DEFAULT_RECORDS_PAGE_SIZE = 10;
const ACTIVE: AdminSuspensionState = { isSuspended: false, reason: null, updatedAt: null, revision: 0 };
export const RECORD_SECTIONS = ["account", "profile", "matches", "participants", "xp", "achievements", "challenges", "progression", "wallet", "ledger", "rewards", "reward_audit", "friends", "friend_requests", "mandali", "moderation"] as const;
type RecordKey = typeof RECORD_SECTIONS[number];

export interface AdminPlayerStore {
  readonly durable: boolean;
  list(query: DirectoryQuery, roles: Record<string, AdminUserSummary["role"]>): Promise<AdminUsersResponse>;
  user(id: string): Promise<AdminUserSummary | null>;
  records(id: string, key: RecordKey, page: number, pageSize: number): Promise<AdminRecordSection>;
  suspendedPage(offset: number, limit: number): Promise<Array<{ id: string; suspension: AdminSuspensionState }>>;
  writeModeration(actor: string, id: string, request: AdminSuspensionRequest): Promise<AdminSuspensionState>;
}

function pageRecords(key: string, rows: Record<string, unknown>[], page: number, pageSize: number): AdminRecordSection {
  return { key, title: key.replace(/_/g, " "), records: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length, page, pageSize, hasMore: rows.length > page * pageSize };
}

export class MemoryAdminPlayerStore implements AdminPlayerStore {
  readonly durable = false;
  private states = new Map<string, AdminSuspensionState>();
  private audit = new Map<string, Record<string, unknown>[]>();
  constructor(private readonly repo: ProgressionRepository) {}

  async user(id: string): Promise<AdminUserSummary | null> {
    const identity = await this.repo.getIdentity(id);
    if (!identity) return null;
    const profile = await this.repo.getProfile(id);
    const matches = await this.repo.listMatchesForPlayer(id, { limit: Number.MAX_SAFE_INTEGER });
    const wins = matches.matches.filter(match => match.self.isWinner).length;
    const losses = matches.matches.filter(match => !match.self.isWinner && (match.winnerId || ["bot", "local", "unverified"].includes(match.winnerKind ?? "unknown"))).length;
    const winRate = matches.total ? Math.round(100 * wins / matches.total) : 0;
    const counts = new Map<string, number>();
    for (const match of matches.matches) counts.set(match.game, (counts.get(match.game) ?? 0) + 1);
    const favorite = [...counts].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "none";
    return { id, name: profile?.displayName || id, email: "", avatar: profile?.avatar ?? undefined,
      role: "member", accountKind: identity.kind, joinedAt: identity.createdAt ?? null,
      lastActiveAt: identity.lastSeenAt || null, matchesPlayed: matches.total,
      winRate: `${winRate}%`, rating: matches.total ? Math.max(100, 400 + wins * 25 - losses * 8 + winRate * 6) : 400, favoriteGame: favorite,
      suspension: { ...(this.states.get(id) ?? ACTIVE) } };
  }

  async list(query: DirectoryQuery, roles: Record<string, AdminUserSummary["role"]>): Promise<AdminUsersResponse> {
    const users: AdminUserSummary[] = [];
    for (let offset = 0; ; offset += 250) {
      const identities = await this.repo.listIdentities(250, offset);
      for (const identity of identities) {
        const user = await this.user(identity.playerId);
        if (user) users.push({ ...user, role: user.accountKind === "guest" ? "member" : roles[user.id] ?? "member" });
      }
      if (identities.length < 250) break;
    }
    const search = query.search.toLowerCase();
    const filtered = users.filter(user => (query.kind === "all" || user.accountKind === query.kind)
      && (query.role === "all" || user.role === query.role)
      && [user.id, user.name, user.email].some(value => value.toLowerCase().includes(search)));
    return { users: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
      total: filtered.length, page: query.page, pageSize: query.pageSize };
  }

  async records(id: string, key: RecordKey, page: number, pageSize: number): Promise<AdminRecordSection> {
    const asRows = (rows: unknown[]): Record<string, unknown>[] => rows.map(row => ({ ...(row as Record<string, unknown>) }));
    switch (key) {
      case "profile": {
        const profile = await this.repo.getProfile(id);
        return pageRecords(key, profile ? asRows([profile]) : [], page, pageSize);
      }
      case "matches": case "participants": {
        const result = await this.repo.listMatchesForPlayer(id, { limit: pageSize, offset: (page - 1) * pageSize });
        const rows = key === "matches" ? result.matches : result.matches.map(match => ({ matchId: match.id, ...match.self }));
        return { key, title: key, records: asRows(rows), total: result.total, page, pageSize, hasMore: result.total > page * pageSize };
      }
      case "xp": return pageRecords(key, asRows(await this.repo.listXp(id, Number.MAX_SAFE_INTEGER)), page, pageSize);
      case "achievements": return pageRecords(key, asRows(await this.repo.listAchievements(id)), page, pageSize);
      case "challenges": return pageRecords(key, asRows(await this.repo.listChallengeClaims(id)), page, pageSize);
      case "reward_audit": return pageRecords(key, asRows(await this.repo.listRewardAudit(id, Number.MAX_SAFE_INTEGER)), page, pageSize);
      case "friends": return pageRecords(key, asRows(await this.repo.listFriends(id)), page, pageSize);
      case "friend_requests": return pageRecords(key, asRows(await this.repo.listFriendRequests(id)), page, pageSize);
      case "moderation": return pageRecords(key, [...(this.audit.get(id) ?? [])].reverse(), page, pageSize);
      default: return { ...pageRecords(key, [], page, pageSize), total: null, unavailable: "Not recorded by this process-lifetime inspection store." };
    }
  }

  async suspendedPage(offset: number, limit: number): Promise<Array<{ id: string; suspension: AdminSuspensionState }>> {
    return [...this.states].filter(([, state]) => state.isSuspended).sort(([left], [right]) => left.localeCompare(right))
      .slice(offset, offset + limit).map(([id, suspension]) => ({ id, suspension: { ...suspension } }));
  }

  async writeModeration(actor: string, id: string, request: AdminSuspensionRequest): Promise<AdminSuspensionState> {
    const current = this.states.get(id) ?? ACTIVE;
    if (current.revision !== request.expectedRevision) throw new AdminPlayerError(409, "Suspension revision changed. Refresh before retrying.");
    const state = { isSuspended: request.action === "suspend", reason: request.reason, updatedAt: Date.now(), revision: current.revision + 1 };
    const audit = { actor, action: request.action, reason: request.reason, revision: state.revision, createdAt: state.updatedAt };
    this.states.set(id, state);
    this.audit.set(id, [...(this.audit.get(id) ?? []), audit]);
    return { ...state };
  }
}

export class SupabaseAdminPlayerStore implements AdminPlayerStore {
  readonly durable = true;
  constructor(private readonly db: PostgrestClient) {}
  list(query: DirectoryQuery, roles: Record<string, AdminUserSummary["role"]>): Promise<AdminUsersResponse> {
    return this.db.rpc("admin_player_directory", { p_page: query.page, p_page_size: query.pageSize,
      p_search: query.search, p_kind: query.kind, p_role: query.role, p_roles: roles });
  }
  user(id: string): Promise<AdminUserSummary | null> { return this.db.rpc("admin_player_summary", { p_id: id }); }
  records(id: string, key: RecordKey, page: number, pageSize: number): Promise<AdminRecordSection> {
    return this.db.rpc("admin_player_records", { p_id: id, p_section: key, p_page: page, p_page_size: pageSize });
  }
  async suspendedPage(offset: number, limit: number): Promise<Array<{ id: string; suspension: AdminSuspensionState }>> {
    return this.db.rpc("admin_suspended_players", { p_offset: offset, p_limit: limit });
  }
  async writeModeration(actor: string, id: string, request: AdminSuspensionRequest): Promise<AdminSuspensionState> {
    const result = await this.db.rpc<{ status: number; suspension?: AdminSuspensionState }>("admin_moderate_player", {
      p_actor: actor, p_id: id, p_action: request.action, p_reason: request.reason, p_expected_revision: request.expectedRevision,
    });
    if (result.status !== 200 || !result.suspension) throw new AdminPlayerError(result.status, "Moderation was not applied. Refresh before retrying.");
    return result.suspension;
  }
}

export class AdminPlayerService {
  private denied = new Set<string>();
  private listeners = new Set<(id: string) => void>();
  private pending = new Set<string>();
  constructor(private readonly store: AdminPlayerStore, private readonly superadmins: () => string[] = () => operationalAuthConfig().adminUserIds) {}
  isDenied(id: string | null | undefined): boolean { return Boolean(id && this.denied.has(id)); }
  isModerationPending(id: string): boolean { return this.pending.has(id); }
  assertAllowed(id: string | null | undefined): void {
    if (this.isDenied(id)) throw new AdminPlayerError(403, "This identity is suspended.");
  }
  onSuspend(listener: (id: string) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async hydrate(): Promise<void> {
    const denied = new Set<string>();
    for (let offset = 0; ; offset += 250) {
      const rows = await this.store.suspendedPage(offset, 250);
      for (const row of rows) denied.add(row.id);
      if (rows.length < 250) break;
    }
    this.denied = denied;
  }
  private roles(): Record<string, AdminUserSummary["role"]> {
    return Object.fromEntries([...listDynamicRoles().filter(row => row.role === "admin").map(row => [row.userId, row.role]),
      ...this.superadmins().map(id => [id, "super_admin"])]);
  }
  list(query: DirectoryQuery): Promise<AdminUsersResponse> { return this.store.list(query, this.roles()); }
  async details(id: string): Promise<AdminUserDetails> {
    const user = await this.store.user(id);
    if (!user) throw new AdminPlayerError(404, "Identity not found.");
    const sections = await Promise.all(RECORD_SECTIONS.map(key => this.section(id, key)));
    return { user: { ...user, role: user.accountKind === "guest" ? "member" : this.roles()[id] ?? "member" }, sections,
      coverage: [this.store.durable ? "Recorded durable data only." : "Process-lifetime data only; not durable. Registered accounts never seen by this process are unavailable.",
        "Never-recorded or lost historical account-to-seat associations cannot be recreated.",
        "Rating is derived from recorded wins and known losses; unrecorded recovery bonuses and unknown historical outcomes are excluded."] };
  }
  /**
   * One section as the details page needs it. The primary ones ship their first page; the rest are only
   * counted (one row asked for, none sent) and flagged `deferred`, so opening a player no longer reads and
   * sends sixteen pages of which most are never looked at.
   */
  private async section(id: string, key: RecordKey): Promise<AdminRecordSection> {
    if (PRIMARY_SECTIONS.has(key)) return this.store.records(id, key, 1, DEFAULT_RECORDS_PAGE_SIZE);
    const counted = await this.store.records(id, key, 1, 1);
    const base = { ...counted, records: [], pageSize: DEFAULT_RECORDS_PAGE_SIZE };
    if (counted.unavailable || counted.total === null) return { ...base, hasMore: false };
    return { ...base, hasMore: counted.total > DEFAULT_RECORDS_PAGE_SIZE, deferred: counted.total > 0 };
  }
  /**
   * Personal data (email, birthday, …) is masked on the admin page until an operator asks to see it. The
   * ask is made here so that it leaves a trace: who looked at whose data, and when. It is a structured log
   * line, not a table; a durable audit row would need a migration of its own.
   */
  async recordPersonalDataAccess(actor: string, id: string): Promise<{ revealedAt: number }> {
    if (!await this.store.user(id)) throw new AdminPlayerError(404, "Identity not found.");
    logger.info({ message: `Personal data of ${id} shown to ${actor}`, module: "ADMIN_PLAYER_PII" });
    return { revealedAt: Date.now() };
  }
  async records(id: string, key: string, page: number, pageSize: number): Promise<AdminRecordSection> {
    if (!RECORD_SECTIONS.includes(key as RecordKey)) throw new AdminPlayerError(404, "Unknown record section.");
    if (!await this.store.user(id)) throw new AdminPlayerError(404, "Identity not found.");
    return this.store.records(id, key as RecordKey, page, pageSize);
  }
  async moderate(actor: string, id: string, request: AdminSuspensionRequest): Promise<AdminSuspensionState> {
    if (!this.superadmins().includes(actor) || actor === id || this.superadmins().includes(id)) throw new AdminPlayerError(403, "Protected identity or unauthorized actor.");
    if (!request || !["suspend", "resume"].includes(request.action) || typeof request.reason !== "string"
      || request.reason.trim().length < 3 || request.reason.trim().length > 500 || /[\u0000-\u001f\u007f]/.test(request.reason)
      || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0 || request.expectedRevision > 2147483646) throw new AdminPlayerError(400, "Provide an action, a 3-500 character reason and a supported nonnegative revision.");
    if (this.pending.has(id)) throw new AdminPlayerError(409, "Moderation is already in progress.");
    this.pending.add(id);
    try {
      if (!await this.store.user(id)) throw new AdminPlayerError(404, "Identity not found.");
      if (this.superadmins().includes(id) || !this.superadmins().includes(actor)) throw new AdminPlayerError(403, "Protected identity or unauthorized actor.");
      const wasDenied = this.isDenied(id);
      if (request.action === "suspend") this.denied.add(id);
      let state: AdminSuspensionState;
      try {
        state = await this.store.writeModeration(actor, id, { ...request, reason: request.reason.trim() });
      } catch (error) {
        const definitive = (error instanceof AdminPlayerError || error instanceof PostgrestError) && error.status >= 400 && error.status < 500;
        if (!wasDenied && definitive) this.denied.delete(id);
        if (!definitive && request.action === "suspend") {
          for (const listener of this.listeners) listener(id);
        }
        throw error;
      }
      if (state.isSuspended) {
        this.denied.add(id);
        for (const listener of this.listeners) listener(id);
      } else this.denied.delete(id);
      return state;
    } finally { this.pending.delete(id); }
  }
}

let singleton: AdminPlayerService | null = null;
export function adminPlayerService(): AdminPlayerService {
  if (!singleton) {
    const config = readPostgrestConfig();
    singleton = new AdminPlayerService(config ? new SupabaseAdminPlayerStore(new PostgrestClient(config)) : new MemoryAdminPlayerStore(progressionRepository()));
  }
  return singleton;
}
export function setAdminPlayerService(service: AdminPlayerService | null): void { singleton = service; }