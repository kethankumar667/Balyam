import type { RewardRepository } from "./RewardRepository.js";
import type { RewardRecord, RewardType, RiskEventRecord, RiskStateRecord } from "./types.js";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const sourceKey = (r: { playerId: string; rewardType: string; sourceId: string }): string =>
  `${r.playerId}|${r.rewardType}|${r.sourceId}`;

/**
 * The reference implementation and the development store. It enforces the same
 * rules the Postgres schema does (unique source, guarded transitions), so a test
 * against it means something and the two implementations can share one contract
 * suite.
 */
export class InMemoryRewardRepository implements RewardRepository {
  readonly kind = "memory" as const;

  private rewards = new Map<string, RewardRecord>();
  private bySource = new Map<string, string>();
  private riskStates = new Map<string, RiskStateRecord>();
  private riskEvents: RiskEventRecord[] = [];

  async ping(): Promise<void> {
    /* always reachable */
  }

  async insertReward(record: RewardRecord): Promise<{ inserted: boolean; record: RewardRecord }> {
    const key = sourceKey(record);
    const existingId = this.bySource.get(key);
    if (existingId) return { inserted: false, record: clone(this.rewards.get(existingId)!) };
    this.rewards.set(record.rewardId, clone(record));
    this.bySource.set(key, record.rewardId);
    return { inserted: true, record: clone(record) };
  }

  async getReward(rewardId: string): Promise<RewardRecord | null> {
    const r = this.rewards.get(rewardId);
    return r ? clone(r) : null;
  }

  async listRewardsForPlayer(playerId: string, limit = 50): Promise<RewardRecord[]> {
    return [...this.rewards.values()]
      .filter((r) => r.playerId === playerId)
      .sort((a, b) => b.earnedAt - a.earnedAt)
      .slice(0, limit)
      .map(clone);
  }

  async listRewardsByType(rewardType: RewardType, opts: { limit?: number; offset?: number } = {}): Promise<RewardRecord[]> {
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 500;
    return [...this.rewards.values()]
      .filter((r) => r.rewardType === rewardType)
      .sort((a, b) => a.earnedAt - b.earnedAt || a.rewardId.localeCompare(b.rewardId))
      .slice(offset, offset + limit)
      .map(clone);
  }

  async listDueForRelease(now: number, staleClaimBefore: number, limit: number): Promise<RewardRecord[]> {
    return [...this.rewards.values()]
      .filter(
        (r) =>
          (r.status === "PENDING" && r.vestingUntil <= now) ||
          (r.status === "RELEASING" && (r.releaseStartedAt ?? 0) < staleClaimBefore),
      )
      .sort((a, b) => a.vestingUntil - b.vestingUntil)
      .slice(0, limit)
      .map(clone);
  }

  async claimForRelease(rewardId: string, now: number, staleClaimBefore: number): Promise<boolean> {
    const r = this.rewards.get(rewardId);
    if (!r) return false;
    const claimable =
      (r.status === "PENDING" && r.vestingUntil <= now) ||
      (r.status === "RELEASING" && (r.releaseStartedAt ?? 0) < staleClaimBefore);
    if (!claimable) return false;
    r.status = "RELEASING";
    r.releaseStartedAt = now;
    return true;
  }

  async completeRelease(rewardId: string, ledgerEntryId: number | null, now: number): Promise<boolean> {
    const r = this.rewards.get(rewardId);
    if (!r || r.status !== "RELEASING") return false;
    r.status = "RELEASED";
    r.ledgerEntryId = ledgerEntryId;
    r.releasedAt = now;
    return true;
  }

  async voidPending(rewardId: string, reason: string, _now: number): Promise<boolean> {
    const r = this.rewards.get(rewardId);
    if (!r || r.status !== "PENDING") return false;
    r.status = "VOIDED";
    r.voidedReason = reason;
    return true;
  }

  /* ── risk ── */

  async upsertRiskState(record: RiskStateRecord): Promise<void> {
    this.riskStates.set(record.playerId, clone(record));
  }

  async appendRiskEvent(event: RiskEventRecord): Promise<void> {
    this.riskEvents.push(clone(event));
  }

  async listRiskStates(): Promise<RiskStateRecord[]> {
    return [...this.riskStates.values()].map(clone);
  }

  async listRiskEventsSince(sinceMs: number, kind?: RiskEventRecord["kind"]): Promise<RiskEventRecord[]> {
    return this.riskEvents.filter((e) => e.createdAt >= sinceMs && (!kind || e.kind === kind)).map(clone);
  }

  async eraseRiskData(playerId: string): Promise<void> {
    this.riskStates.delete(playerId);
    this.riskEvents = this.riskEvents.filter((e) => e.playerId !== playerId);
  }

  async purgeRiskEventsBefore(beforeMs: number): Promise<void> {
    this.riskEvents = this.riskEvents.filter((e) => e.createdAt >= beforeMs);
  }

  async listRiskEventsForPlayer(playerId: string, limit = 50): Promise<RiskEventRecord[]> {
    return this.riskEvents
      .filter((e) => e.playerId === playerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(clone);
  }
}
