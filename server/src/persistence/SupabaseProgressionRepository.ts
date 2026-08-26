import { PostgrestClient, type PostgrestConfig } from "./postgrest.js";
import type {
  Applied,
  AchievementUnlock,
  ChallengeClaimRecord,
  FriendEdge,
  FriendRequestRecord,
  IdentityRecord,
  MatchPage,
  MatchParticipantRecord,
  MatchSummaryRecord,
  MatchTrendBucket,
  PartyInvitationRecord,
  PartyRecord,
  ProfileRecord,
  ProgressionRepository,
  RewardAuditRecord,
  SeasonClaimRecord,
  SeasonSnapshotRecord,
  SeasonStatsRecord,
  TournamentRecordRow,
  XpLedgerEntry,
} from "./ProgressionRepository.js";

/**
 * The repository, in Supabase Postgres.
 *
 * ── Where the guarantees actually live ────────────────────────────────
 * Not here. Every "this must not happen twice" in this file is a unique index
 * in `supabase/migrations/20260818000000_progression_persistence.sql`, and
 * this class's job is to ask the database for its verdict rather than to reach
 * one itself. That is the difference between an idempotency check and an
 * idempotency guarantee: a `select` followed by an `insert` is two statements
 * with a race between them, and the race is won by whoever double-clicked.
 *
 * So `appendXp`, `claimChallenge`, `claimSeasonTier`, `unlockAchievement`,
 * `addFriend` and `recordMatch` all go through `insertIgnoringDuplicates`,
 * whose return value is the set of rows the database actually wrote. Empty
 * means the constraint refused it. There is no window.
 *
 * ── Timestamps ────────────────────────────────────────────────────────
 * The domain speaks epoch milliseconds; Postgres speaks `timestamptz`. The
 * conversion is here and only here, so no service ever holds a value whose
 * units depend on which repository answered.
 */

const ms = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : 0);
const iso = (epochMs: number): string => new Date(epochMs).toISOString();

export class SupabaseProgressionRepository implements ProgressionRepository {
  readonly kind = "supabase" as const;
  private readonly db: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.db = new PostgrestClient(config);
  }

  /**
   * Reachable, authorised, and migrated.
   *
   * Selecting one row from the newest table proves all three at once: a wrong
   * URL fails to connect, a publishable key is refused by RLS, and a project
   * that never ran the migration answers "relation does not exist". Each of
   * those is a different fix, and finding out at boot beats finding out when a
   * player claims their first reward.
   */
  async ping(): Promise<void> {
    await this.db.select("player_identities", "select=player_id&limit=1");
  }

  /* ── identities ── */

  async upsertIdentity(record: IdentityRecord): Promise<void> {
    await this.db.upsert(
      "player_identities",
      [
        {
          player_id: record.playerId,
          kind: record.kind,
          auth_user_id: record.authUserId,
          last_seen_at: iso(record.lastSeenAt),
        },
      ],
      "player_id",
    );
  }

  async getIdentity(playerId: string): Promise<IdentityRecord | null> {
    const [row] = await this.db.select<{
      player_id: string;
      kind: "member" | "guest";
      auth_user_id: string | null;
      last_seen_at: string;
    }>("player_identities", `player_id=eq.${encodeURIComponent(playerId)}&limit=1`);
    if (!row) return null;
    return {
      playerId: row.player_id,
      kind: row.kind,
      authUserId: row.auth_user_id,
      lastSeenAt: ms(row.last_seen_at),
    };
  }

  /* ── profiles ── */

  async upsertProfile(record: ProfileRecord): Promise<void> {
    await this.db.upsert(
      "player_profiles",
      [
        {
          player_id: record.playerId,
          display_name: record.displayName,
          avatar: record.avatar ?? null,
          level: record.level,
          experience_points: record.experiencePoints,
          joined_at: iso(record.joinedAt),
          last_seen_at: iso(record.lastSeenAt),
        },
      ],
      "player_id",
    );
  }

  private static toProfile(row: {
    player_id: string;
    display_name: string;
    avatar: string | null;
    level: number;
    experience_points: number;
    joined_at: string;
    last_seen_at: string;
  }): ProfileRecord {
    return {
      playerId: row.player_id,
      displayName: row.display_name,
      avatar: row.avatar,
      level: row.level,
      experiencePoints: Number(row.experience_points),
      joinedAt: ms(row.joined_at),
      lastSeenAt: ms(row.last_seen_at),
    };
  }

  async getProfile(playerId: string): Promise<ProfileRecord | null> {
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toProfile>[0]>(
      "player_profiles",
      `player_id=eq.${encodeURIComponent(playerId)}&limit=1`,
    );
    return rows[0] ? SupabaseProgressionRepository.toProfile(rows[0]) : null;
  }

  async listProfiles(limit = 100): Promise<ProfileRecord[]> {
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toProfile>[0]>(
      "player_profiles",
      `order=experience_points.desc,player_id.asc&limit=${limit}`,
    );
    return rows.map(SupabaseProgressionRepository.toProfile);
  }

  /* ── xp ── */

  async appendXp(entry: XpLedgerEntry): Promise<Applied> {
    const written = await this.db.insertIgnoringDuplicates(
      "xp_ledger",
      [
        {
          player_id: entry.playerId,
          amount: entry.amount,
          reason: entry.reason.slice(0, 200),
          source_kind: entry.sourceKind,
          source_id: entry.sourceId,
          created_at: iso(entry.createdAt),
        },
      ],
      "player_id,source_kind,source_id",
    );
    return { applied: written.length > 0 };
  }

  async totalXp(playerId: string): Promise<number> {
    // No SUM through PostgREST without a view, and the ledger per player is
    // small — bounded by matches played, not by table size. If that stops
    // being true, the answer is a materialised total on player_profiles, which
    // already exists as `experience_points`.
    const rows = await this.db.select<{ amount: number }>(
      "xp_ledger",
      `player_id=eq.${encodeURIComponent(playerId)}&select=amount`,
    );
    return rows.reduce((sum, r) => sum + Number(r.amount), 0);
  }

  async listXp(playerId: string, limit = 50): Promise<XpLedgerEntry[]> {
    const rows = await this.db.select<{
      player_id: string;
      amount: number;
      reason: string;
      source_kind: XpLedgerEntry["sourceKind"];
      source_id: string;
      created_at: string;
    }>(
      "xp_ledger",
      `player_id=eq.${encodeURIComponent(playerId)}&order=created_at.desc&limit=${limit}`,
    );
    return rows.map((r) => ({
      playerId: r.player_id,
      amount: Number(r.amount),
      reason: r.reason,
      sourceKind: r.source_kind,
      sourceId: r.source_id,
      createdAt: ms(r.created_at),
    }));
  }

  /* ── achievements ── */

  async unlockAchievement(record: AchievementUnlock): Promise<Applied> {
    const written = await this.db.insertIgnoringDuplicates(
      "player_achievements",
      [
        {
          player_id: record.playerId,
          achievement_id: record.achievementId,
          unlocked_at: iso(record.unlockedAt),
        },
      ],
      "player_id,achievement_id",
    );
    return { applied: written.length > 0 };
  }

  async listAchievements(playerId: string): Promise<AchievementUnlock[]> {
    const rows = await this.db.select<{
      player_id: string;
      achievement_id: string;
      unlocked_at: string;
    }>(
      "player_achievements",
      `player_id=eq.${encodeURIComponent(playerId)}&order=unlocked_at.desc`,
    );
    return rows.map((r) => ({
      playerId: r.player_id,
      achievementId: r.achievement_id,
      unlockedAt: ms(r.unlocked_at),
    }));
  }

  /* ── challenges ── */

  async claimChallenge(record: ChallengeClaimRecord): Promise<Applied> {
    const written = await this.db.insertIgnoringDuplicates(
      "challenge_claims",
      [
        {
          player_id: record.playerId,
          challenge_id: record.challengeId,
          period_key: record.periodKey,
          xp_awarded: record.xpAwarded,
          claimed_at: iso(record.claimedAt),
        },
      ],
      "player_id,challenge_id,period_key",
    );
    return { applied: written.length > 0 };
  }

  async listChallengeClaims(playerId: string, periodKey?: string): Promise<ChallengeClaimRecord[]> {
    const filter = periodKey ? `&period_key=eq.${encodeURIComponent(periodKey)}` : "";
    const rows = await this.db.select<{
      player_id: string;
      challenge_id: string;
      period_key: string;
      xp_awarded: number;
      claimed_at: string;
    }>("challenge_claims", `player_id=eq.${encodeURIComponent(playerId)}${filter}`);
    return rows.map((r) => ({
      playerId: r.player_id,
      challengeId: r.challenge_id,
      periodKey: r.period_key,
      xpAwarded: r.xp_awarded,
      claimedAt: ms(r.claimed_at),
    }));
  }

  /* ── friends ── */

  async addFriend(edge: FriendEdge): Promise<Applied> {
    if (edge.playerId === edge.friendPlayerId) return { applied: false };
    const written = await this.db.insertIgnoringDuplicates(
      "friends",
      [
        {
          player_id: edge.playerId,
          friend_player_id: edge.friendPlayerId,
          display_name: edge.displayName ?? null,
          avatar: edge.avatar ?? null,
          created_at: iso(edge.createdAt),
        },
      ],
      "player_id,friend_player_id",
    );
    return { applied: written.length > 0 };
  }

  async removeFriend(playerId: string, friendPlayerId: string): Promise<boolean> {
    await this.db.delete(
      "friends",
      `player_id=eq.${encodeURIComponent(playerId)}&friend_player_id=eq.${encodeURIComponent(friendPlayerId)}`,
    );
    return true;
  }

  async listFriends(playerId: string): Promise<FriendEdge[]> {
    const rows = await this.db.select<{
      player_id: string;
      friend_player_id: string;
      display_name: string | null;
      avatar: string | null;
      created_at: string;
    }>("friends", `player_id=eq.${encodeURIComponent(playerId)}&order=created_at.desc`);
    return rows.map((r) => ({
      playerId: r.player_id,
      friendPlayerId: r.friend_player_id,
      displayName: r.display_name,
      avatar: r.avatar,
      createdAt: ms(r.created_at),
    }));
  }

  /* ── friend requests ── */

  async saveFriendRequest(record: FriendRequestRecord): Promise<void> {
    await this.db.upsert(
      "friend_requests",
      [
        {
          id: record.id,
          sender_id: record.senderId,
          recipient_id: record.recipientId,
          sender_name: record.senderName ?? null,
          sender_avatar: record.senderAvatar ?? null,
          status: record.status,
          created_at: iso(record.createdAt),
          updated_at: iso(record.updatedAt),
        },
      ],
      "id",
    );
  }

  private static toRequest(row: {
    id: string;
    sender_id: string;
    recipient_id: string;
    sender_name: string | null;
    sender_avatar: string | null;
    status: FriendRequestRecord["status"];
    created_at: string;
    updated_at: string;
  }): FriendRequestRecord {
    return {
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar,
      status: row.status,
      createdAt: ms(row.created_at),
      updatedAt: ms(row.updated_at),
    };
  }

  async getFriendRequest(id: string): Promise<FriendRequestRecord | null> {
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toRequest>[0]>(
      "friend_requests",
      `id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? SupabaseProgressionRepository.toRequest(rows[0]) : null;
  }

  async listFriendRequests(playerId: string): Promise<FriendRequestRecord[]> {
    const p = encodeURIComponent(playerId);
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toRequest>[0]>(
      "friend_requests",
      `or=(sender_id.eq.${p},recipient_id.eq.${p})&order=created_at.desc`,
    );
    return rows.map(SupabaseProgressionRepository.toRequest);
  }

  /* ── parties ── */

  async saveParty(record: PartyRecord): Promise<void> {
    await this.db.upsert(
      "parties",
      [
        {
          id: record.id,
          leader_id: record.leaderId,
          max_members: record.maxMembers,
          status: record.status,
          target_game: record.targetGame ?? null,
          target_room_code: record.targetRoomCode ?? null,
          target_tournament_id: record.targetTournamentId ?? null,
          created_at: iso(record.createdAt),
          updated_at: iso(record.updatedAt),
        },
      ],
      "id",
    );

    // Membership is replaced wholesale rather than diffed. A party is at most
    // eight rows, and "delete then insert" cannot leave a member behind the way
    // an incremental diff can when the in-memory copy and the table disagree.
    await this.db.delete("party_members", `party_id=eq.${encodeURIComponent(record.id)}`);
    await this.db.upsert(
      "party_members",
      record.members.map((m) => ({
        party_id: record.id,
        player_id: m.playerId,
        display_name: m.displayName ?? null,
        avatar: m.avatar ?? null,
        is_leader: m.isLeader,
        is_ready: m.isReady,
        joined_at: iso(m.joinedAt),
      })),
      "party_id,player_id",
    );
  }

  async deleteParty(partyId: string): Promise<void> {
    // party_members and party_invitations cascade.
    await this.db.delete("parties", `id=eq.${encodeURIComponent(partyId)}`);
  }

  private async hydrateParty(row: {
    id: string;
    leader_id: string;
    max_members: number;
    status: PartyRecord["status"];
    target_game: string | null;
    target_room_code: string | null;
    target_tournament_id: string | null;
    created_at: string;
    updated_at: string;
  }): Promise<PartyRecord> {
    const members = await this.db.select<{
      player_id: string;
      display_name: string | null;
      avatar: string | null;
      is_leader: boolean;
      is_ready: boolean;
      joined_at: string;
    }>("party_members", `party_id=eq.${encodeURIComponent(row.id)}&order=joined_at.asc`);

    return {
      id: row.id,
      leaderId: row.leader_id,
      maxMembers: row.max_members,
      status: row.status,
      targetGame: row.target_game,
      targetRoomCode: row.target_room_code,
      targetTournamentId: row.target_tournament_id,
      createdAt: ms(row.created_at),
      updatedAt: ms(row.updated_at),
      members: members.map((m) => ({
        playerId: m.player_id,
        displayName: m.display_name,
        avatar: m.avatar,
        isLeader: m.is_leader,
        isReady: m.is_ready,
        joinedAt: ms(m.joined_at),
      })),
    };
  }

  async getParty(partyId: string): Promise<PartyRecord | null> {
    const [row] = await this.db.select<Parameters<typeof this.hydrateParty>[0]>(
      "parties",
      `id=eq.${encodeURIComponent(partyId)}&limit=1`,
    );
    return row ? this.hydrateParty(row) : null;
  }

  async listParties(): Promise<PartyRecord[]> {
    const rows = await this.db.select<Parameters<typeof this.hydrateParty>[0]>("parties", "");
    return Promise.all(rows.map((r) => this.hydrateParty(r)));
  }

  async saveInvitation(record: PartyInvitationRecord): Promise<void> {
    await this.db.upsert(
      "party_invitations",
      [
        {
          id: record.id,
          party_id: record.partyId,
          inviter_id: record.inviterId,
          invitee_id: record.inviteeId,
          inviter_name: record.inviterName ?? null,
          status: record.status,
          created_at: iso(record.createdAt),
        },
      ],
      "id",
    );
  }

  private static toInvitation(row: {
    id: string;
    party_id: string;
    inviter_id: string;
    invitee_id: string;
    inviter_name: string | null;
    status: PartyInvitationRecord["status"];
    created_at: string;
  }): PartyInvitationRecord {
    return {
      id: row.id,
      partyId: row.party_id,
      inviterId: row.inviter_id,
      inviteeId: row.invitee_id,
      inviterName: row.inviter_name,
      status: row.status,
      createdAt: ms(row.created_at),
    };
  }

  async getInvitation(id: string): Promise<PartyInvitationRecord | null> {
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toInvitation>[0]>(
      "party_invitations",
      `id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? SupabaseProgressionRepository.toInvitation(rows[0]) : null;
  }

  async listInvitations(playerId: string): Promise<PartyInvitationRecord[]> {
    const p = encodeURIComponent(playerId);
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toInvitation>[0]>(
      "party_invitations",
      `or=(invitee_id.eq.${p},inviter_id.eq.${p})&order=created_at.desc`,
    );
    return rows.map(SupabaseProgressionRepository.toInvitation);
  }

  /* ── matches ── */

  /**
   * Record a finished match, exactly once.
   *
   * The summary insert is the gate. `match_summaries_natural_key_idx` covers
   * `(room_code, started_at)`, so a host failover or a replayed completion
   * writes nothing and returns `applied: false` — and, importantly, the
   * participant rows are then not written either, which is what stops a
   * duplicate from inflating anybody's win count.
   */
  async recordMatch(record: MatchSummaryRecord): Promise<Applied> {
    const written = await this.db.insertIgnoringDuplicates<{ id: string }>(
      "match_summaries",
      [
        {
          id: record.id,
          room_code: record.roomCode.trim().toUpperCase(),
          game: record.game,
          started_at: iso(record.startedAt),
          finished_at: iso(record.finishedAt),
          duration_ms: record.durationMs,
          winner_id: record.winnerId ?? null,
          participant_count: record.participants.length,
        },
      ],
      "room_code,started_at",
    );
    if (written.length === 0) return { applied: false };

    await this.db.upsert(
      "match_participants",
      record.participants.map((p) => ({
        match_id: record.id,
        player_id: p.playerId,
        display_name: p.displayName ?? null,
        avatar: p.avatar ?? null,
        is_winner: p.isWinner,
        is_bot: p.isBot,
        placement: p.placing ?? null,
      })),
      "match_id,player_id",
    );
    return { applied: true };
  }

  /**
   * A player's recent matches.
   *
   * ── Why two plain reads and not one embedded read ─────────────────────
   * This used PostgREST's embedded-resource syntax
   * (`select=*,match_summaries!inner(...)`) to fetch the summary nested inside
   * each participant row. One round trip instead of two — and a hard
   * dependency on a feature only PostgREST has.
   *
   * That mattered the moment anyone tried to VERIFY this code: the embedded
   * syntax cannot be exercised against a plain PostgreSQL, so the one method
   * standing between "the schema works" and "the application works" was also
   * the least portable. Two ordinary reads cost one extra round trip on a
   * screen that loads twenty rows, and make the whole repository runnable
   * against any Postgres — which is what turned P0-3's restart durability from
   * an intention into a measurement.
   */
  async listMatchesForPlayer(
    playerId: string,
    opts: { limit?: number; offset?: number; game?: string } = {},
  ): Promise<MatchPage> {
    const { limit = 20, offset = 0, game } = opts;
    const p = encodeURIComponent(playerId);

    const mine = await this.db.select<{
      match_id: string;
      player_id: string;
      display_name: string | null;
      avatar: string | null;
      is_winner: boolean;
      is_bot: boolean;
      placement: number | null;
    }>("match_participants", `player_id=eq.${p}`);

    if (mine.length === 0) return { total: 0, matches: [] };

    const ids = mine.map((r) => r.match_id);
    const gameFilter = game ? `&game=eq.${encodeURIComponent(game)}` : "";
    const summaries = await this.db.select<{
      id: string;
      room_code: string;
      game: string;
      started_at: string;
      finished_at: string;
      duration_ms: number;
      winner_id: string | null;
      participant_count: number;
    }>(
      "match_summaries",
      `id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})${gameFilter}&order=finished_at.desc`,
    );

    const selfByMatch = new Map(mine.map((r) => [r.match_id, r]));

    return {
      total: summaries.length,
      matches: summaries.slice(offset, offset + limit).map((m) => {
        const row = selfByMatch.get(m.id)!;
        const self: MatchParticipantRecord = {
          playerId: row.player_id,
          displayName: row.display_name,
          avatar: row.avatar,
          isWinner: row.is_winner,
          isBot: row.is_bot,
          placing: row.placement,
        };
        return {
          id: m.id,
          roomCode: m.room_code,
          game: m.game,
          startedAt: ms(m.started_at),
          finishedAt: ms(m.finished_at),
          durationMs: Number(m.duration_ms),
          winnerId: m.winner_id,
          // The other participants are a read this screen does not need: the
          // profile list shows your own result, not the whole table.
          participants: [self],
          self,
        };
      }),
    };
  }

  /* ── tournaments ── */

  async upsertTournamentRecord(record: TournamentRecordRow): Promise<void> {
    await this.db.upsert(
      "tournament_records",
      [
        {
          tournament_id: record.tournamentId,
          player_id: record.playerId,
          tournament_name: record.tournamentName ?? null,
          game: record.game ?? null,
          placement: record.placing ?? null,
          status: record.status,
          recorded_at: iso(record.recordedAt),
        },
      ],
      "tournament_id,player_id",
    );
  }

  async listTournamentRecords(playerId: string): Promise<TournamentRecordRow[]> {
    const rows = await this.db.select<{
      tournament_id: string;
      player_id: string;
      tournament_name: string | null;
      game: string | null;
      placement: number | null;
      status: TournamentRecordRow["status"];
      recorded_at: string;
    }>(
      "tournament_records",
      `player_id=eq.${encodeURIComponent(playerId)}&order=recorded_at.desc`,
    );
    return rows.map((r) => ({
      tournamentId: r.tournament_id,
      playerId: r.player_id,
      tournamentName: r.tournament_name,
      game: r.game,
      placing: r.placement,
      status: r.status,
      recordedAt: ms(r.recorded_at),
    }));
  }

  /* ── seasons ── */

  async upsertSeasonStats(record: SeasonStatsRecord): Promise<void> {
    await this.db.upsert(
      "season_stats",
      [
        {
          season_id: record.seasonId,
          player_id: record.playerId,
          season_xp: record.seasonXP,
          season_level: record.seasonLevel,
          season_wins: record.seasonWins,
          season_matches: record.seasonMatches,
          tournament_wins: record.tournamentWins,
        },
      ],
      "season_id,player_id",
    );
  }

  private static toSeasonStats(row: {
    season_id: string;
    player_id: string;
    season_xp: number;
    season_level: number;
    season_wins: number;
    season_matches: number;
    tournament_wins: number;
  }): SeasonStatsRecord {
    return {
      seasonId: row.season_id,
      playerId: row.player_id,
      seasonXP: Number(row.season_xp),
      seasonLevel: row.season_level,
      seasonWins: row.season_wins,
      seasonMatches: row.season_matches,
      tournamentWins: row.tournament_wins,
    };
  }

  async getSeasonStats(seasonId: string, playerId: string): Promise<SeasonStatsRecord | null> {
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toSeasonStats>[0]>(
      "season_stats",
      `season_id=eq.${encodeURIComponent(seasonId)}&player_id=eq.${encodeURIComponent(playerId)}&limit=1`,
    );
    return rows[0] ? SupabaseProgressionRepository.toSeasonStats(rows[0]) : null;
  }

  async listSeasonStats(seasonId: string, limit = 50): Promise<SeasonStatsRecord[]> {
    const rows = await this.db.select<Parameters<typeof SupabaseProgressionRepository.toSeasonStats>[0]>(
      "season_stats",
      `season_id=eq.${encodeURIComponent(seasonId)}&order=season_xp.desc,player_id.asc&limit=${limit}`,
    );
    return rows.map(SupabaseProgressionRepository.toSeasonStats);
  }

  async claimSeasonTier(record: SeasonClaimRecord): Promise<Applied> {
    const written = await this.db.insertIgnoringDuplicates(
      "season_reward_claims",
      [
        {
          season_id: record.seasonId,
          player_id: record.playerId,
          tier_id: record.tierId,
          xp_awarded: record.xpAwarded,
          claimed_at: iso(record.claimedAt),
        },
      ],
      "season_id,player_id,tier_id",
    );
    return { applied: written.length > 0 };
  }

  async listSeasonClaims(seasonId: string, playerId: string): Promise<SeasonClaimRecord[]> {
    const rows = await this.db.select<{
      season_id: string;
      player_id: string;
      tier_id: string;
      xp_awarded: number;
      claimed_at: string;
    }>(
      "season_reward_claims",
      `season_id=eq.${encodeURIComponent(seasonId)}&player_id=eq.${encodeURIComponent(playerId)}`,
    );
    return rows.map((r) => ({
      seasonId: r.season_id,
      playerId: r.player_id,
      tierId: r.tier_id,
      xpAwarded: r.xp_awarded,
      claimedAt: ms(r.claimed_at),
    }));
  }

  async saveSeasonSnapshot(record: SeasonSnapshotRecord): Promise<void> {
    await this.db.upsert(
      "season_snapshots",
      [
        {
          season_id: record.seasonId,
          captured_at: iso(record.capturedAt),
          reason: record.reason,
          standings: record.standings,
        },
      ],
      "season_id,captured_at",
    );
  }

  async getLatestSeasonSnapshot(seasonId: string): Promise<SeasonSnapshotRecord | null> {
    const [row] = await this.db.select<{
      season_id: string;
      captured_at: string;
      reason: string;
      standings: unknown;
    }>(
      "season_snapshots",
      `season_id=eq.${encodeURIComponent(seasonId)}&order=captured_at.desc&limit=1`,
    );
    if (!row) return null;
    return {
      seasonId: row.season_id,
      capturedAt: ms(row.captured_at),
      reason: row.reason,
      standings: row.standings,
    };
  }

  /* ── audit ── */

  async recordRewardDecision(record: RewardAuditRecord): Promise<void> {
    // The unique index is partial on `outcome = 'granted'`, so duplicates and
    // refusals append freely — seeing how often they happen is the point of
    // auditing them — while a second GRANT for the same key cannot land.
    await this.db.insertIgnoringDuplicates(
      "reward_audit",
      [
        {
          player_id: record.playerId,
          reward_kind: record.rewardKind,
          reward_ref: record.rewardRef,
          xp_delta: record.xpDelta,
          idempotency_key: record.idempotencyKey,
          outcome: record.outcome,
          detail: record.detail ?? null,
          created_at: iso(record.createdAt),
        },
      ],
      "idempotency_key",
    );
  }

  async listRewardAudit(playerId: string, limit = 50): Promise<RewardAuditRecord[]> {
    const rows = await this.db.select<{
      player_id: string;
      reward_kind: RewardAuditRecord["rewardKind"];
      reward_ref: string;
      xp_delta: number;
      idempotency_key: string;
      outcome: RewardAuditRecord["outcome"];
      detail: string | null;
      created_at: string;
    }>(
      "reward_audit",
      `player_id=eq.${encodeURIComponent(playerId)}&order=created_at.desc&limit=${limit}`,
    );
    return rows.map((r) => ({
      playerId: r.player_id,
      rewardKind: r.reward_kind,
      rewardRef: r.reward_ref,
      xpDelta: r.xp_delta,
      idempotencyKey: r.idempotency_key,
      outcome: r.outcome,
      detail: r.detail,
      createdAt: ms(r.created_at),
    }));
  }

  /* ── dashboard aggregates ── */

  async countRegisteredMembers(): Promise<number> {
    return this.db.count("player_identities", "kind=eq.member");
  }

  async countActiveIdentitiesSince(sinceMs: number): Promise<number> {
    return this.db.count("player_identities", `last_seen_at=gte.${iso(sinceMs)}`);
  }

  async countMatchesFinishedSince(sinceMs: number): Promise<number> {
    return this.db.count("match_summaries", `finished_at=gte.${iso(sinceMs)}`);
  }

  /**
   * No `GROUP BY` through PostgREST without a view — this pulls just the one
   * column needed for the trailing window and buckets it here, the same trade
   * `totalXp` above makes for a `SUM`.
   */
  async matchTrend(days: number): Promise<MatchTrendBucket[]> {
    const startOfWindow = startOfUtcDay(new Date());
    startOfWindow.setUTCDate(startOfWindow.getUTCDate() - (days - 1));

    const rows = await this.db.select<{ finished_at: string }>(
      "match_summaries",
      `finished_at=gte.${startOfWindow.toISOString()}&select=finished_at`,
    );

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      buckets.set(dayKey(new Date(startOfWindow.getTime() + i * DAY_MS)), 0);
    }
    for (const r of rows) {
      const day = r.finished_at.slice(0, 10);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([date, count]) => ({ date, count }));
  }

  /**
   * The most recent finished matches across every player. Two reads, not an
   * embedded one — same reasoning as `listMatchesForPlayer` above: portable to
   * plain PostgreSQL, which is what makes this method verifiable at all.
   */
  async listRecentMatches(limit: number): Promise<MatchSummaryRecord[]> {
    const summaries = await this.db.select<{
      id: string;
      room_code: string;
      game: string;
      started_at: string;
      finished_at: string;
      duration_ms: number;
      winner_id: string | null;
      participant_count: number;
    }>("match_summaries", `order=finished_at.desc&limit=${limit}`);
    if (summaries.length === 0) return [];

    const ids = summaries.map((s) => s.id);
    const participants = await this.db.select<{
      match_id: string;
      player_id: string;
      display_name: string | null;
      avatar: string | null;
      is_winner: boolean;
      is_bot: boolean;
      placement: number | null;
    }>("match_participants", `match_id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})`);

    const byMatch = new Map<string, MatchParticipantRecord[]>();
    for (const p of participants) {
      const list = byMatch.get(p.match_id) ?? [];
      list.push({
        playerId: p.player_id,
        displayName: p.display_name,
        avatar: p.avatar,
        isWinner: p.is_winner,
        isBot: p.is_bot,
        placing: p.placement,
      });
      byMatch.set(p.match_id, list);
    }

    return summaries.map((m) => ({
      id: m.id,
      roomCode: m.room_code,
      game: m.game,
      startedAt: ms(m.started_at),
      finishedAt: ms(m.finished_at),
      durationMs: Number(m.duration_ms),
      winnerId: m.winner_id,
      participants: byMatch.get(m.id) ?? [],
    }));
  }
}

const DAY_MS = 86_400_000;

function startOfUtcDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
