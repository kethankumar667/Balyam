import { logger } from "../lib/logger.js";
import { persistenceStatus } from "../persistence/index.js";
import { readPostgrestConfig } from "../persistence/postgrest.js";
import { InMemoryRewardRepository } from "./InMemoryRewardRepository.js";
import type { RewardRepository } from "./RewardRepository.js";
import type { RiskPersistence } from "./RiskService.js";
import type { RewardRecord, RewardType, RiskEventRecord, RiskStateRecord } from "./types.js";
import { SupabaseRewardRepository } from "./SupabaseRewardRepository.js";

/**
 * Choosing where rewards live, once, at boot — by the same rule progression uses.
 *
 * Rewards are money, so they follow progression's durability decision rather
 * than making a second one: if XP is in Postgres, so are the rewards that XP
 * earned; if the process is running on memory (development, or the explicit
 * ephemeral escape hatch progression logs at ERROR), rewards are too. Progression's
 * own guard is what refuses to start a production process on memory, so a
 * production deploy cannot reach the in-memory branch here by forgetting a variable.
 */

let repository: RewardRepository | null = null;

export function rewardRepository(): RewardRepository {
  if (!repository) repository = new InMemoryRewardRepository();
  return repository;
}

/** Test seam. */
export function setRewardRepository(next: RewardRepository | null): void {
  repository = next;
}

export async function initialiseRewardStore(): Promise<RewardRepository> {
  if (persistenceStatus().kind === "supabase") {
    const config = readPostgrestConfig();
    if (!config) {
      throw new Error("Progression is on Supabase but the PostgREST configuration is missing; refusing to start rewards on memory.");
    }
    const supabase = new SupabaseRewardRepository(config);
    // A missing migration must stop the boot, not a player's claim.
    await supabase.ping();
    repository = supabase;
    logger.info({ message: "Reward gateway store: Supabase Postgres", module: "REWARDS" });
    return supabase;
  }
  repository = new InMemoryRewardRepository();
  logger.warn({
    message: "Reward gateway store: memory. Pending rewards and risk decisions are lost on restart.",
    module: "REWARDS",
  });
  return repository;
}

/**
 * The repository the rest of the server holds, resolved at CALL time.
 *
 * Services are constructed when the module loads; the store is chosen in `boot()`,
 * after progression's own is proved reachable. Handing services this delegate
 * means they never hold a stale in-memory store from before that choice.
 */
class DelegatingRewardRepository implements RewardRepository {
  get kind(): "memory" | "supabase" {
    return rewardRepository().kind;
  }
  ping = (): Promise<void> => rewardRepository().ping();
  insertReward = (r: RewardRecord) => rewardRepository().insertReward(r);
  getReward = (id: string) => rewardRepository().getReward(id);
  listRewardsForPlayer = (id: string, limit?: number) => rewardRepository().listRewardsForPlayer(id, limit);
  listRewardsByType = (t: RewardType, opts?: { limit?: number; offset?: number }) => rewardRepository().listRewardsByType(t, opts);
  listDueForRelease = (now: number, stale: number, limit: number) => rewardRepository().listDueForRelease(now, stale, limit);
  claimForRelease = (id: string, now: number, stale: number) => rewardRepository().claimForRelease(id, now, stale);
  completeRelease = (id: string, ledgerEntryId: number | null, now: number) => rewardRepository().completeRelease(id, ledgerEntryId, now);
  voidPending = (id: string, reason: string, now: number) => rewardRepository().voidPending(id, reason, now);
  upsertRiskState = (r: RiskStateRecord) => rewardRepository().upsertRiskState(r);
  appendRiskEvent = (e: RiskEventRecord) => rewardRepository().appendRiskEvent(e);
  listRiskStates = () => rewardRepository().listRiskStates();
  listRiskEventsSince = (since: number, kind?: RiskEventRecord["kind"]) => rewardRepository().listRiskEventsSince(since, kind);
  listRiskEventsForPlayer = (id: string, limit?: number) => rewardRepository().listRiskEventsForPlayer(id, limit);
  purgeRiskEventsBefore = (before: number) => rewardRepository().purgeRiskEventsBefore(before);
}

export const rewardStore: RewardRepository = new DelegatingRewardRepository();

/**
 * Risk writes that wait for the progression writes queued before them, because a
 * risk row references the player's identity row and that row is created by a
 * queued profile write (see `ProgressionSync.afterPending`).
 */
export function orderedRiskPersistence(
  store: RiskPersistence,
  afterPending: <T>(work: () => Promise<T>) => Promise<T>,
): RiskPersistence {
  return {
    upsertRiskState: (record) => afterPending(() => store.upsertRiskState(record)),
    appendRiskEvent: (event) => afterPending(() => store.appendRiskEvent(event)),
  };
}
