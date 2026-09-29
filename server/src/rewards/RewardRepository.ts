import type { RiskPersistence } from "./RiskService.js";
import type {
  RewardRecord,
  RewardType,
  RiskEventRecord,
  RiskStateRecord,
} from "./types.js";

/**
 * Where rewards and risk decisions are kept.
 *
 * The contract is the one `ProgressionRepository` set: the guarantees live in
 * the store, not in whoever calls it. "This reward is paid once" is a unique
 * index and a guarded state transition, so it holds across processes and
 * restarts and does not depend on the caller having been careful.
 *
 * ── The state machine, and who may move it ─────────────────────────────
 *   PENDING   --claimForRelease-->  RELEASING  --completeRelease-->  RELEASED
 *   PENDING   --voidPending------>  VOIDED
 *
 * Every transition names the state it moves FROM, so a stale or duplicate
 * caller gets `false` instead of overwriting a newer truth. There is no way to
 * void something that is being paid and no way to pay something that was voided.
 */
export interface RewardRepository extends RiskPersistence {
  readonly kind: "memory" | "supabase";

  /** Proves the store is reachable and migrated. Throws otherwise. */
  ping(): Promise<void>;

  /**
   * Insert a new reward. `(playerId, rewardType, sourceId)` is unique: if it
   * already exists, nothing is written and the existing record comes back with
   * `inserted: false` — which is exactly what a replayed claim looks like.
   */
  insertReward(record: RewardRecord): Promise<{ inserted: boolean; record: RewardRecord }>;

  getReward(rewardId: string): Promise<RewardRecord | null>;
  /** Newest first. */
  listRewardsForPlayer(playerId: string, limit?: number): Promise<RewardRecord[]>;
  /** Every reward of one type, oldest first, for rebuilding "already claimed" at boot. */
  listRewardsByType(rewardType: RewardType, opts?: { limit?: number; offset?: number }): Promise<RewardRecord[]>;

  /**
   * Rewards ready to pay: PENDING past their vesting time, plus RELEASING claims
   * older than `staleClaimBefore` (a payment that died mid-way, safe to redrive
   * because the wallet credit is idempotent).
   */
  listDueForRelease(now: number, staleClaimBefore: number, limit: number): Promise<RewardRecord[]>;

  /** PENDING -> RELEASING. `false` if it was not PENDING (or, for a stale redrive, not RELEASING). */
  claimForRelease(rewardId: string, now: number, staleClaimBefore: number): Promise<boolean>;
  /** RELEASING -> RELEASED. */
  completeRelease(rewardId: string, ledgerEntryId: number | null, now: number): Promise<boolean>;
  /** PENDING -> VOIDED. `false` if it was already being paid or paid. */
  voidPending(rewardId: string, reason: string, now: number): Promise<boolean>;

  /* ── risk ── */
  listRiskStates(): Promise<RiskStateRecord[]>;
  listRiskEventsSince(sinceMs: number, kind?: RiskEventRecord["kind"]): Promise<RiskEventRecord[]>;
  listRiskEventsForPlayer(playerId: string, limit?: number): Promise<RiskEventRecord[]>;
  /** Retention: drop audit events older than this. Standing (`account_risk`) and rewards are never purged here. */
  purgeRiskEventsBefore(beforeMs: number): Promise<void>;
}
