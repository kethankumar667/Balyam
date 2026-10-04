import { PostgrestClient, type PostgrestConfig } from "../persistence/postgrest.js";
import type { RewardRepository } from "./RewardRepository.js";
import type {
  RewardRecord,
  RewardStatus,
  RewardType,
  RiskEventRecord,
  RiskState,
  RiskStateRecord,
} from "./types.js";

/**
 * The reward gateway's store, in Supabase Postgres.
 *
 * Every guarantee is in `20261012000000_reward_gateway.sql`, not here: the
 * unique `(player_id, reward_type, source_id)` index is what makes a reward
 * payable once, and every state transition is a PATCH whose filter names the
 * state it leaves (`status=eq.PENDING`). An empty response therefore means "you
 * lost the race or the transition was illegal", answered by the database under
 * whatever concurrency exists, never by a read the application did first.
 */

const ms = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : 0);
const iso = (epochMs: number): string => new Date(epochMs).toISOString();
const q = encodeURIComponent;

interface RewardRow {
  reward_id: string;
  player_id: string;
  reward_type: RewardType;
  reason_code: string;
  amount: number;
  source_id: string;
  earned_at: string;
  vesting_until: string;
  status: RewardStatus;
  risk_state: RiskState;
  ledger_entry_id: number | null;
  release_started_at: string | null;
  released_at: string | null;
  voided_reason: string | null;
  description: string;
}

interface RiskStateRow {
  player_id: string;
  state: RiskState;
  reason_codes: string[];
  updated_at: string;
  updated_by: string;
}

interface RiskEventRow {
  player_id: string;
  kind: RiskEventRecord["kind"];
  reason_code: string;
  detail: Record<string, unknown>;
  created_at: string;
}

function toRow(r: RewardRecord): RewardRow {
  return {
    reward_id: r.rewardId,
    player_id: r.playerId,
    reward_type: r.rewardType,
    reason_code: r.reasonCode,
    amount: r.amount,
    source_id: r.sourceId,
    earned_at: iso(r.earnedAt),
    vesting_until: iso(r.vestingUntil),
    status: r.status,
    risk_state: r.riskState,
    ledger_entry_id: r.ledgerEntryId,
    release_started_at: r.releaseStartedAt === null ? null : iso(r.releaseStartedAt),
    released_at: r.releasedAt === null ? null : iso(r.releasedAt),
    voided_reason: r.voidedReason,
    description: r.description.slice(0, 200),
  };
}

function fromRow(row: RewardRow): RewardRecord {
  return {
    rewardId: row.reward_id,
    playerId: row.player_id,
    rewardType: row.reward_type,
    reasonCode: row.reason_code as RewardRecord["reasonCode"],
    amount: Number(row.amount),
    sourceId: row.source_id,
    earnedAt: ms(row.earned_at),
    vestingUntil: ms(row.vesting_until),
    status: row.status,
    riskState: row.risk_state,
    ledgerEntryId: row.ledger_entry_id === null ? null : Number(row.ledger_entry_id),
    releaseStartedAt: row.release_started_at ? ms(row.release_started_at) : null,
    releasedAt: row.released_at ? ms(row.released_at) : null,
    voidedReason: row.voided_reason,
    description: row.description,
  };
}

const REWARD_MIGRATION = "20261012000000_reward_gateway.sql";
const TRANSFER_CAP_MIGRATION = "20261013000000_transfer_daily_cap.sql";
const FUND_CAP_MIGRATION = "20261014000000_fund_coin_request_daily_cap.sql";

/** PostgREST's answers for "that table or function is not in the schema". */
function isMissingObject(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /PGRST20[25]|Could not find the (table|function)/.test(message);
}

export class SupabaseRewardRepository implements RewardRepository {
  readonly kind = "supabase" as const;
  private readonly db: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.db = new PostgrestClient(config);
  }

  /**
   * Reachable, authorised and migrated — a missing table or function fails here, at
   * boot, not on a player's claim or a player's first coin send. Every gap is
   * reported at once, with the migration that closes it, so a deploy that went out
   * before its migration says exactly what to run.
   */
  async ping(): Promise<void> {
    const missing: string[] = [];
    const probeTable = async (table: string, query: string, migration: string) => {
      try {
        await this.db.select(table, query);
      } catch (err) {
        if (!isMissingObject(err)) throw err;
        missing.push(`table ${table} (${migration})`);
      }
    };
    await probeTable("reward_ledger", "select=reward_id&limit=1", REWARD_MIGRATION);
    await probeTable("account_risk", "select=player_id&limit=1", REWARD_MIGRATION);
    await probeTable("risk_events", "select=id&limit=1", REWARD_MIGRATION);

    // The capped transfer functions refuse a null cap before touching anything, so
    // calling them with nulls proves they exist without moving a coin. A function
    // that exists answers with a business error; one that does not answers PGRST202.
    const probeFunction = async (fn: string, args: Record<string, null>, migration: string) => {
      try {
        await this.db.rpc(fn, args);
      } catch (err) {
        if (isMissingObject(err)) missing.push(`function ${fn} (${migration})`);
      }
    };
    await probeFunction(
      "transfer_wallet_coins_capped",
      { p_from_identity_id: null, p_to_identity_id: null, p_amount: null, p_reason: null, p_idempotency_key: null, p_daily_cap: null, p_day_start: null },
      TRANSFER_CAP_MIGRATION,
    );
    await probeFunction(
      "fund_coin_request_capped",
      { p_request_id: null, p_payer_identity_id: null, p_idempotency_key: null, p_daily_cap: null, p_day_start: null },
      FUND_CAP_MIGRATION,
    );

    if (missing.length > 0) {
      throw new Error(
        `The database is missing ${missing.join("; ")}. Apply the named file(s) from supabase/migrations, in date order, ` +
          `then restart. See docs/runbooks/reward-gateway.md.`,
      );
    }
  }

  async insertReward(record: RewardRecord): Promise<{ inserted: boolean; record: RewardRecord }> {
    const written = await this.db.insertIgnoringDuplicates<RewardRow>(
      "reward_ledger",
      [toRow(record)],
      "player_id,reward_type,source_id",
    );
    if (written.length > 0) return { inserted: true, record: fromRow(written[0]!) };

    const existing = await this.db.select<RewardRow>(
      "reward_ledger",
      `player_id=eq.${q(record.playerId)}&reward_type=eq.${q(record.rewardType)}&source_id=eq.${q(record.sourceId)}&limit=1`,
    );
    if (existing.length === 0) throw new Error("reward insert was refused as a duplicate but the original row is gone");
    return { inserted: false, record: fromRow(existing[0]!) };
  }

  async getReward(rewardId: string): Promise<RewardRecord | null> {
    const rows = await this.db.select<RewardRow>("reward_ledger", `reward_id=eq.${q(rewardId)}&limit=1`);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async listRewardsForPlayer(playerId: string, limit = 50): Promise<RewardRecord[]> {
    const rows = await this.db.select<RewardRow>(
      "reward_ledger",
      `player_id=eq.${q(playerId)}&order=earned_at.desc&limit=${Math.min(limit, 200)}`,
    );
    return rows.map(fromRow);
  }

  async listRewardsByType(rewardType: RewardType, opts: { limit?: number; offset?: number } = {}): Promise<RewardRecord[]> {
    const rows = await this.db.select<RewardRow>(
      "reward_ledger",
      `reward_type=eq.${q(rewardType)}&order=earned_at.asc,reward_id.asc&limit=${Math.min(opts.limit ?? 500, 1000)}&offset=${opts.offset ?? 0}`,
    );
    return rows.map(fromRow);
  }

  async listDueForRelease(now: number, staleClaimBefore: number, limit: number): Promise<RewardRecord[]> {
    const pending = await this.db.select<RewardRow>(
      "reward_ledger",
      `status=eq.PENDING&vesting_until=lte.${q(iso(now))}&order=vesting_until.asc&limit=${limit}`,
    );
    const stale = await this.db.select<RewardRow>(
      "reward_ledger",
      `status=eq.RELEASING&release_started_at=lt.${q(iso(staleClaimBefore))}&order=release_started_at.asc&limit=${limit}`,
    );
    return [...pending, ...stale].slice(0, limit).map(fromRow);
  }

  async claimForRelease(rewardId: string, now: number, staleClaimBefore: number): Promise<boolean> {
    const claimed = await this.db.update<RewardRow>(
      "reward_ledger",
      { status: "RELEASING", release_started_at: iso(now) },
      `reward_id=eq.${q(rewardId)}&status=eq.PENDING&vesting_until=lte.${q(iso(now))}`,
    );
    if (claimed.length > 0) return true;
    const redriven = await this.db.update<RewardRow>(
      "reward_ledger",
      { release_started_at: iso(now) },
      `reward_id=eq.${q(rewardId)}&status=eq.RELEASING&release_started_at=lt.${q(iso(staleClaimBefore))}`,
    );
    return redriven.length > 0;
  }

  async completeRelease(rewardId: string, ledgerEntryId: number | null, now: number): Promise<boolean> {
    const done = await this.db.update<RewardRow>(
      "reward_ledger",
      { status: "RELEASED", ledger_entry_id: ledgerEntryId, released_at: iso(now) },
      `reward_id=eq.${q(rewardId)}&status=eq.RELEASING`,
    );
    return done.length > 0;
  }

  async voidPending(rewardId: string, reason: string, _now: number): Promise<boolean> {
    const voided = await this.db.update<RewardRow>(
      "reward_ledger",
      { status: "VOIDED", voided_reason: reason.slice(0, 200) },
      `reward_id=eq.${q(rewardId)}&status=eq.PENDING`,
    );
    return voided.length > 0;
  }

  /* ── risk ── */

  async upsertRiskState(record: RiskStateRecord): Promise<void> {
    const row: RiskStateRow = {
      player_id: record.playerId,
      state: record.state,
      reason_codes: record.reasonCodes,
      updated_at: iso(record.updatedAt),
      updated_by: record.updatedBy,
    };
    await this.db.upsert("account_risk", [row], "player_id");
  }

  async appendRiskEvent(event: RiskEventRecord): Promise<void> {
    const row: RiskEventRow = {
      player_id: event.playerId,
      kind: event.kind,
      reason_code: event.reasonCode,
      detail: event.detail,
      created_at: iso(event.createdAt),
    };
    await this.db.insert("risk_events", [row]);
  }

  async listRiskStates(): Promise<RiskStateRecord[]> {
    const rows = await this.db.select<RiskStateRow>("account_risk", "order=updated_at.desc&limit=5000");
    return rows.map((r) => ({
      playerId: r.player_id,
      state: r.state,
      reasonCodes: r.reason_codes ?? [],
      updatedAt: ms(r.updated_at),
      updatedBy: r.updated_by,
    }));
  }

  async listRiskEventsSince(sinceMs: number, kind?: RiskEventRecord["kind"]): Promise<RiskEventRecord[]> {
    const rows = await this.db.select<RiskEventRow>(
      "risk_events",
      `created_at=gte.${q(iso(sinceMs))}${kind ? `&kind=eq.${q(kind)}` : ""}&order=created_at.asc&limit=10000`,
    );
    return rows.map(eventFromRow);
  }

  async eraseRiskData(playerId: string): Promise<void> {
    await this.db.delete("risk_events", `player_id=eq.${q(playerId)}`);
    await this.db.delete("account_risk", `player_id=eq.${q(playerId)}`);
  }

  async purgeRiskEventsBefore(beforeMs: number): Promise<void> {
    await this.db.delete("risk_events", `created_at=lt.${q(iso(beforeMs))}`);
  }

  async listRiskEventsForPlayer(playerId: string, limit = 50): Promise<RiskEventRecord[]> {
    const rows = await this.db.select<RiskEventRow>(
      "risk_events",
      `player_id=eq.${q(playerId)}&order=created_at.desc&limit=${Math.min(limit, 200)}`,
    );
    return rows.map(eventFromRow);
  }
}

function eventFromRow(r: RiskEventRow): RiskEventRecord {
  return {
    playerId: r.player_id,
    kind: r.kind,
    reasonCode: r.reason_code,
    detail: r.detail ?? {},
    createdAt: ms(r.created_at),
  };
}
