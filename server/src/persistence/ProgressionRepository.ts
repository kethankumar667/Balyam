/**
 * The seam between what BHALYAM remembers and where it keeps it.
 *
 * ── Why an interface and not "just call Supabase" ─────────────────────
 * Two reasons, and neither is architectural taste.
 *
 * First: 769 server tests run today with no infrastructure, and that is a
 * property worth keeping. A domain service that imports a Postgres client
 * cannot be tested without one, and the honest end state of that is a test
 * suite everybody skips.
 *
 * Second: the ONE thing every method below has to get right is what happens
 * when the same write arrives twice. In Postgres that is a unique constraint;
 * in memory it is a `Map.has` check. Those are different mechanisms with the
 * same contract, and a contract only exists if something states it. This file
 * states it, and `__tests__/repositoryContract.test.ts` runs the identical
 * suite against both implementations so they cannot drift.
 *
 * ── The `applied` convention ──────────────────────────────────────────
 * Every write that must not happen twice returns `{ applied: boolean }`:
 *
 *     applied: true   the write happened, this call caused it
 *     applied: false  the write was already there; nothing changed
 *
 * `false` is NOT an error. A retried reward claim, a replayed match
 * completion, a double-clicked button — all of them arrive at `false`, and the
 * caller's job is to return the same success it returned the first time rather
 * than to award anything again. Throwing would make the caller responsible for
 * distinguishing "duplicate" from "database is down", which is exactly the
 * distinction that gets muddled at 2am.
 *
 * ── What is deliberately NOT here ─────────────────────────────────────
 * Active room state. No method touches a room, a seat, a hand or a board.
 * Rooms are minutes long, are written many times a second by the realtime
 * loop, and are meant to die with the process. Only a finished match's summary
 * crosses this boundary.
 */

export type PlayerKind = "member" | "guest";

export interface IdentityRecord {
  playerId: string;
  kind: PlayerKind;
  /** The Supabase user id for a member; `null` for a guest. */
  authUserId: string | null;
  lastSeenAt: number;
}

export interface ProfileRecord {
  playerId: string;
  displayName: string;
  avatar?: string | null;
  level: number;
  experiencePoints: number;
  joinedAt: number;
  lastSeenAt: number;
}

export type XpSourceKind = "match" | "challenge" | "season_tier" | "achievement" | "manual";

export interface XpLedgerEntry {
  playerId: string;
  amount: number;
  reason: string;
  sourceKind: XpSourceKind;
  /**
   * Identifies the thing that caused the award. `(playerId, sourceKind,
   * sourceId)` is the idempotency key — a match id, a challenge id plus its
   * period, a season tier. A caller that cannot name one has an award it
   * cannot deduplicate, which is a bug in the caller.
   */
  sourceId: string;
  createdAt: number;
}

export interface AchievementUnlock {
  playerId: string;
  achievementId: string;
  unlockedAt: number;
}

export interface ChallengeClaimRecord {
  playerId: string;
  challengeId: string;
  /** Which day or week this claim belongs to. See the table comment. */
  periodKey: string;
  xpAwarded: number;
  claimedAt: number;
}

export interface FriendEdge {
  playerId: string;
  friendPlayerId: string;
  displayName?: string | null;
  avatar?: string | null;
  createdAt: number;
}

export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface FriendRequestRecord {
  id: string;
  senderId: string;
  recipientId: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  status: FriendRequestStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Mirrors `shared/party/Party.ts` exactly, including `IN_MATCH` rather than
 * the `IN_GAME` this file first invented. A persistence layer with its own
 * near-synonym for a domain state is a translation table waiting to be got
 * wrong, and the compiler catches the drift only if the two are the same type
 * or literally identical unions.
 */
export type PartyStatus = "CREATED" | "INVITING" | "READY" | "IN_MATCH" | "DISBANDED";

export interface PartyMemberRecord {
  playerId: string;
  displayName?: string | null;
  avatar?: string | null;
  isLeader: boolean;
  isReady: boolean;
  joinedAt: number;
}

export interface PartyRecord {
  id: string;
  leaderId: string;
  maxMembers: number;
  status: PartyStatus;
  targetGame?: string | null;
  targetRoomCode?: string | null;
  targetTournamentId?: string | null;
  members: PartyMemberRecord[];
  createdAt: number;
  updatedAt: number;
}

/** Mirrors `PartyInvitationStatus` in shared/party/Party.ts. */
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface PartyInvitationRecord {
  id: string;
  partyId: string;
  inviterId: string;
  inviteeId: string;
  inviterName?: string | null;
  status: InvitationStatus;
  createdAt: number;
}

export interface MatchParticipantRecord {
  playerId: string;
  displayName?: string | null;
  avatar?: string | null;
  isWinner: boolean;
  isBot: boolean;
  placing?: number | null;
}

export interface MatchSummaryRecord {
  /** Stable id. Derived from the natural key so a replay produces the same one. */
  id: string;
  roomCode: string;
  game: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  winnerId?: string | null;
  participants: MatchParticipantRecord[];
}

export type TournamentRecordStatus =
  | "REGISTERED"
  | "CHECKED_IN"
  | "ELIMINATED"
  | "WINNER"
  | "WITHDRAWN";

export interface TournamentRecordRow {
  tournamentId: string;
  playerId: string;
  tournamentName?: string | null;
  game?: string | null;
  placing?: number | null;
  status: TournamentRecordStatus;
  recordedAt: number;
}

export interface SeasonStatsRecord {
  seasonId: string;
  playerId: string;
  seasonXP: number;
  seasonLevel: number;
  seasonWins: number;
  seasonMatches: number;
  tournamentWins: number;
}

export interface SeasonClaimRecord {
  seasonId: string;
  playerId: string;
  tierId: string;
  xpAwarded: number;
  claimedAt: number;
}

export interface SeasonSnapshotRecord {
  seasonId: string;
  capturedAt: number;
  reason: string;
  standings: unknown;
}

export type RewardKind = "challenge" | "season_tier" | "achievement" | "match";
export type RewardOutcome = "granted" | "duplicate" | "refused";

export interface RewardAuditRecord {
  playerId: string;
  rewardKind: RewardKind;
  rewardRef: string;
  xpDelta: number;
  /** Unique per granted reward. See `reward_audit_idempotency_idx`. */
  idempotencyKey: string;
  outcome: RewardOutcome;
  detail?: string | null;
  createdAt: number;
}

export interface Applied {
  applied: boolean;
}

export interface MatchPage {
  matches: Array<MatchSummaryRecord & { self: MatchParticipantRecord }>;
  total: number;
}

/** One bucket of the completed-match trend: a UTC calendar day and how many matches finished in it. */
export interface MatchTrendBucket {
  /** YYYY-MM-DD, UTC. */
  date: string;
  count: number;
}

export interface ProgressionRepository {
  /** Which implementation this is. Reported by `/health`, logged at boot. */
  readonly kind: "memory" | "supabase";

  /**
   * Prove the store is reachable and the schema is present.
   *
   * Called once at boot. A repository that cannot answer this must say so
   * loudly at start-up rather than at the first player's first reward.
   */
  ping(): Promise<void>;

  /* identities */
  upsertIdentity(record: IdentityRecord): Promise<void>;
  getIdentity(playerId: string): Promise<IdentityRecord | null>;

  /* profiles */
  upsertProfile(record: ProfileRecord): Promise<void>;
  getProfile(playerId: string): Promise<ProfileRecord | null>;
  listProfiles(limit?: number): Promise<ProfileRecord[]>;

  /* xp */
  appendXp(entry: XpLedgerEntry): Promise<Applied>;
  totalXp(playerId: string): Promise<number>;
  listXp(playerId: string, limit?: number): Promise<XpLedgerEntry[]>;

  /* achievements */
  unlockAchievement(record: AchievementUnlock): Promise<Applied>;
  listAchievements(playerId: string): Promise<AchievementUnlock[]>;

  /* challenges */
  claimChallenge(record: ChallengeClaimRecord): Promise<Applied>;
  listChallengeClaims(playerId: string, periodKey?: string): Promise<ChallengeClaimRecord[]>;

  /* friends */
  addFriend(edge: FriendEdge): Promise<Applied>;
  removeFriend(playerId: string, friendPlayerId: string): Promise<boolean>;
  listFriends(playerId: string): Promise<FriendEdge[]>;

  /* friend requests */
  saveFriendRequest(record: FriendRequestRecord): Promise<void>;
  getFriendRequest(id: string): Promise<FriendRequestRecord | null>;
  listFriendRequests(playerId: string): Promise<FriendRequestRecord[]>;

  /* parties */
  saveParty(record: PartyRecord): Promise<void>;
  deleteParty(partyId: string): Promise<void>;
  getParty(partyId: string): Promise<PartyRecord | null>;
  listParties(): Promise<PartyRecord[]>;
  saveInvitation(record: PartyInvitationRecord): Promise<void>;
  getInvitation(id: string): Promise<PartyInvitationRecord | null>;
  listInvitations(playerId: string): Promise<PartyInvitationRecord[]>;

  /* matches */
  recordMatch(record: MatchSummaryRecord): Promise<Applied>;
  listMatchesForPlayer(
    playerId: string,
    opts?: { limit?: number; offset?: number; game?: string },
  ): Promise<MatchPage>;

  /* tournaments */
  upsertTournamentRecord(record: TournamentRecordRow): Promise<void>;
  listTournamentRecords(playerId: string): Promise<TournamentRecordRow[]>;

  /* seasons */
  upsertSeasonStats(record: SeasonStatsRecord): Promise<void>;
  getSeasonStats(seasonId: string, playerId: string): Promise<SeasonStatsRecord | null>;
  listSeasonStats(seasonId: string, limit?: number): Promise<SeasonStatsRecord[]>;
  claimSeasonTier(record: SeasonClaimRecord): Promise<Applied>;
  listSeasonClaims(seasonId: string, playerId: string): Promise<SeasonClaimRecord[]>;
  saveSeasonSnapshot(record: SeasonSnapshotRecord): Promise<void>;
  getLatestSeasonSnapshot(seasonId: string): Promise<SeasonSnapshotRecord | null>;

  /* audit */
  recordRewardDecision(record: RewardAuditRecord): Promise<void>;
  listRewardAudit(playerId: string, limit?: number): Promise<RewardAuditRecord[]>;

  /**
   * Admin-wide aggregates. Unlike everything above, these are not scoped to
   * one player — they exist for the operations console, not for a player's own
   * screens, and answer "how many" and "which recently" across everybody.
   */

  /** How many `player_identities` rows are real accounts (`kind = 'member'`), not guests. */
  countRegisteredMembers(): Promise<number>;

  /** How many identities — member or guest — were seen at or after `sinceMs`. */
  countActiveIdentitiesSince(sinceMs: number): Promise<number>;

  /** How many matches finished at or after `sinceMs`. */
  countMatchesFinishedSince(sinceMs: number): Promise<number>;

  /**
   * Completed-match counts bucketed by UTC calendar day, oldest first, for the
   * trailing `days` days including today. A day with zero matches still gets a
   * bucket — the caller never has to fabricate a gap.
   */
  matchTrend(days: number): Promise<MatchTrendBucket[]>;

  /** The most recently finished matches, across every player, newest first. */
  listRecentMatches(limit: number): Promise<MatchSummaryRecord[]>;
}

/**
 * A stable match id derived from the natural key.
 *
 * The point is that a replayed completion produces the SAME id, so the unique
 * index on `(room_code, started_at)` and the primary key on `id` agree with
 * each other. An id from `Math.random()` would let the same match in twice
 * under two ids and the constraint would catch it only by luck.
 */
export function matchIdFor(roomCode: string, startedAt: number): string {
  return `m_${roomCode.trim().toUpperCase()}_${startedAt}`;
}

/** The idempotency key for a reward. Includes the kind so kinds cannot collide. */
export function rewardKeyFor(
  playerId: string,
  kind: RewardKind,
  ref: string,
): string {
  return `${kind}:${playerId}:${ref}`;
}
