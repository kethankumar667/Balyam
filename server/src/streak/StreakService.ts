/**
 * 30-Day Daily Login Streak Service
 *
 * Coordinates streak evaluation, database persistence (Supabase / in-memory fallback),
 * and wallet coin disbursement through EconomyService with strict idempotency.
 */

import { logger } from "../lib/logger.js";
import { type EconomyService } from "../economy/EconomyService.js";
import { type CosmeticsService } from "../cosmetics/CosmeticsService.js";
import { type PlayerIdentityKind } from "../persistence/EconomyRepository.js";
import { type RewardGateway } from "../rewards/RewardGateway.js";
import { REASON } from "../rewards/types.js";
import {
  type DailyStreakClaimResult,
  type DailyStreakState,
} from "@shared/streak-types.js";
import {
  evaluateStreakClaim,
  buildStreakState,
  getUtcDateString,
  type StoredStreakRecord,
} from "./StreakEngine.js";
import { PostgrestClient, readPostgrestConfig, type PostgrestConfig } from "../persistence/postgrest.js";

interface LoginStreakRow {
  player_id: string;
  current_streak: number;
  longest_streak: number;
  cycle_count: number;
  last_claimed_date: string | null;
  last_claimed_at: string | null;
  shields_remaining: number;
  claim_history: Array<{
    date: string;
    claimedAt: number;
    day: number;
    coins: number;
    cycle: number;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface StreakServiceOptions {
  economyService?: EconomyService | null;
  cosmeticsService?: CosmeticsService | null;
  /** The one door coins come through. Streak coins are never credited to a wallet any other way. */
  rewardGateway?: RewardGateway | null;
  postgrestConfig?: PostgrestConfig | null;
  now?: () => number;
}

export class StreakService {
  private readonly memoryStore = new Map<string, StoredStreakRecord>();
  private readonly postgrest: PostgrestClient | null;
  private readonly economyService: EconomyService | null;
  private readonly cosmeticsService: CosmeticsService | null;
  private readonly rewardGateway: RewardGateway | null;
  private readonly now: () => number;

  constructor(options: StreakServiceOptions = {}) {
    this.economyService = options.economyService ?? null;
    this.cosmeticsService = options.cosmeticsService ?? null;
    this.rewardGateway = options.rewardGateway ?? null;
    this.now = options.now ?? Date.now;

    const config = options.postgrestConfig !== undefined
      ? options.postgrestConfig
      : readPostgrestConfig();

    this.postgrest = config ? new PostgrestClient(config) : null;
  }

  /**
   * Internal loader: reads from memory cache or queries PostgREST if available.
   */
  private async loadRecord(playerId: string): Promise<StoredStreakRecord | null> {
    if (!playerId) return null;

    // Check memory store first
    const cached = this.memoryStore.get(playerId);
    if (cached) return cached;

    if (!this.postgrest) return null;

    try {
      const rows = await this.postgrest.select<LoginStreakRow>(
        "login_streaks",
        `player_id=eq.${encodeURIComponent(playerId)}`,
      );
      if (rows.length === 0) return null;

      const row = rows[0];
      const record: StoredStreakRecord = {
        playerId: row.player_id,
        currentStreak: row.current_streak ?? 0,
        longestStreak: row.longest_streak ?? 0,
        cycleCount: row.cycle_count ?? 0,
        lastClaimedDate: row.last_claimed_date ?? null,
        lastClaimedAt: row.last_claimed_at ? new Date(row.last_claimed_at).getTime() : null,
        shieldsRemaining: row.shields_remaining ?? 0,
        claimHistory: Array.isArray(row.claim_history) ? row.claim_history : [],
      };

      this.memoryStore.set(playerId, record);
      return record;
    } catch (err) {
      logger.warn({
        message: `Failed to query login_streaks from Supabase for ${playerId}: ${String(err)}`,
        module: "STREAK",
      });
      return null;
    }
  }

  /**
   * Internal persistence: writes to memory store and upserts to PostgREST if configured.
   */
  private async persistRecord(record: StoredStreakRecord): Promise<void> {
    this.memoryStore.set(record.playerId, record);

    if (!this.postgrest) return;

    try {
      const row: Partial<LoginStreakRow> = {
        player_id: record.playerId,
        current_streak: record.currentStreak,
        longest_streak: record.longestStreak,
        cycle_count: record.cycleCount,
        last_claimed_date: record.lastClaimedDate,
        last_claimed_at: record.lastClaimedAt ? new Date(record.lastClaimedAt).toISOString() : null,
        shields_remaining: record.shieldsRemaining,
        claim_history: record.claimHistory.slice(-60), // Keep recent 60 claims
        updated_at: new Date(this.now()).toISOString(),
      };

      await this.postgrest.upsert("login_streaks", [row], "player_id");
    } catch (err) {
      logger.error({
        message: `Failed to persist login_streaks to Supabase for ${record.playerId}: ${String(err)}`,
        module: "STREAK",
      });
    }
  }

  /**
   * Retrieves current wallet balance for the given player identity.
   */
  private async getWalletBalance(playerId: string): Promise<string> {
    if (!this.economyService) return "0";
    try {
      const wallet = await this.economyService.getWallet(playerId);
      return wallet?.balance ?? "0";
    } catch {
      return "0";
    }
  }

  /**
   * Returns authoritative daily streak state for a player.
   */
  async getStreak(playerId: string): Promise<DailyStreakState> {
    const timestamp = this.now();
    const record = await this.loadRecord(playerId);
    const state = buildStreakState(record, timestamp);
    return {
      ...state,
      playerId,
    };
  }

  /**
   * Executes authoritative claim for the current UTC day.
   *
   * The idempotency key is always derived here from `playerId` + the
   * server's own UTC date — never from client input. A caller-supplied key
   * used to be honored as a fallback, which let a client defeat the "one
   * claim per day" gate entirely: firing several concurrent requests, each
   * with its own distinct key, raced past the day-based check (which reads
   * stale, not-yet-persisted state) and each independently passed the
   * wallet layer's per-key idempotency log, crediting coins multiple times
   * for a single day. Keying deterministically on player+day lets that same
   * wallet-layer log (see `adminAdjustWalletLocked`'s mutex + idempotency
   * check) collapse every concurrent claim for the day into one credit.
   */
  async claimStreak(
    playerId: string,
    identityKind: PlayerIdentityKind = "guest",
  ): Promise<DailyStreakClaimResult> {
    const serverTimestamp = this.now();
    const currentUtcDate = getUtcDateString(serverTimestamp);

    if (!playerId || playerId.trim().length === 0) {
      const emptyState = buildStreakState(null, serverTimestamp);
      return {
        success: false,
        code: "UNAUTHENTICATED",
        message: "A valid player identity is required to claim daily streak rewards.",
        claimedDay: 1,
        reward: null,
        coinsAwarded: 0,
        newStreak: 0,
        cycleCompleted: false,
        cycleCount: 0,
        shieldUsed: false,
        walletBalance: "0",
        updatedState: emptyState,
      };
    }

    const existingRecord = await this.loadRecord(playerId);
    const evalResult = evaluateStreakClaim(existingRecord, serverTimestamp);

    // If claim cannot proceed (e.g. already claimed today or clock issue)
    if (!evalResult.canClaim) {
      const currentState = buildStreakState(existingRecord, serverTimestamp);
      const balance = await this.getWalletBalance(playerId);
      return {
        success: false,
        code: evalResult.code,
        message: evalResult.message,
        claimedDay: evalResult.claimedDay,
        reward: evalResult.reward,
        coinsAwarded: 0,
        newStreak: evalResult.newStreak,
        cycleCompleted: evalResult.cycleCompleted,
        cycleCount: evalResult.newCycleCount,
        shieldUsed: false,
        walletBalance: balance,
        updatedState: {
          ...currentState,
          playerId,
        },
      };
    }

    // Coins go through the reward gateway: a row with a reason and the player's
    // risk state, paid at once for a signed-in member in good standing, after a day otherwise.
    // Nothing here credits a wallet directly.
    let updatedWalletBalance = "0";
    let pendingUntil: number | undefined;
    let payingNow = false;

    /** The claim was NOT consumed: the player can try again, and is told why. */
    const notPaid = async (message: string): Promise<DailyStreakClaimResult> => {
      const currentState = buildStreakState(existingRecord, serverTimestamp);
      const balance = await this.getWalletBalance(playerId);
      return {
        success: false,
        code: "ERROR",
        message,
        claimedDay: evalResult.claimedDay,
        reward: evalResult.reward,
        coinsAwarded: 0,
        newStreak: evalResult.newStreak,
        cycleCompleted: false,
        cycleCount: evalResult.newCycleCount,
        shieldUsed: false,
        walletBalance: balance,
        updatedState: {
          ...currentState,
          playerId,
        },
      };
    };

    if (evalResult.coinsAwarded > 0) {
      if (!this.rewardGateway) {
        // No gateway, no coins — and no pretending. The day is not burned.
        return notPaid("Coin rewards are temporarily unavailable. Please try again later.");
      }
      const grant = await this.rewardGateway.grantCoins({
        playerId,
        identityKind,
        rewardType: "DAILY_STREAK",
        reasonCode: REASON.STREAK_DAY,
        amount: evalResult.coinsAwarded,
        // The server's UTC date, never client input: one reward per player per day.
        sourceId: currentUtcDate,
        description: `Daily login streak reward: Day ${evalResult.claimedDay}`,
      });
      if (!grant.ok) {
        // Reported honestly, and the streak record is NOT advanced, so the player
        // does not lose their day for coins that were never recorded.
        return notPaid(grant.message);
      }
      if (grant.record.status === "VOIDED") return notPaid("This reward was withdrawn.");
      if (grant.record.status === "PENDING") pendingUntil = grant.record.vestingUntil;
      // Being paid right now (or a payment that will be retried): on its way, no promised hour.
      else if (grant.record.status === "RELEASING") payingNow = true;
    }
    updatedWalletBalance = await this.getWalletBalance(playerId);

    // Prepare updated stored record
    const updatedHistory = existingRecord?.claimHistory
      ? [...existingRecord.claimHistory]
      : [];

    if (evalResult.newHistoryEntry) {
      updatedHistory.push(evalResult.newHistoryEntry);
    }

    const updatedRecord: StoredStreakRecord = {
      playerId,
      currentStreak: evalResult.newStreak,
      longestStreak: evalResult.newLongestStreak,
      cycleCount: evalResult.newCycleCount,
      lastClaimedDate: currentUtcDate,
      lastClaimedAt: serverTimestamp,
      shieldsRemaining: evalResult.newShieldsRemaining,
      claimHistory: updatedHistory,
    };

    await this.persistRecord(updatedRecord);

    // Authoritative achievement cosmetic grant: Day 7 milestone -> title_early_bird
    if (evalResult.claimedDay === 7 && this.cosmeticsService) {
      void this.cosmeticsService.grantCosmeticEntitlement({
        userId: playerId,
        cosmeticId: "title_early_bird",
        sourceType: "STREAK_MILESTONE",
        sourceReference: `streak:cycle-${evalResult.newCycleCount}:day-7`,
      }).catch((err) => {
        logger.warn({
          message: `Failed to grant Day 7 milestone cosmetic title_early_bird to ${playerId}: ${String(err)}`,
          module: "STREAK",
        });
      });
    }

    const updatedState = buildStreakState(updatedRecord, serverTimestamp);

    logger.info({
      message: `Streak reward claimed successfully for player ${playerId} (Day ${evalResult.claimedDay}, +${evalResult.coinsAwarded} coins, streak ${evalResult.newStreak})`,
      module: "STREAK",
    });

    return {
      success: true,
      code: evalResult.code,
      message: pendingUntil
        ? `${evalResult.message} Your coins arrive in about 24 hours.`
        : payingNow
          ? `${evalResult.message} Your coins are on their way.`
          : evalResult.message,
      claimedDay: evalResult.claimedDay,
      reward: evalResult.reward,
      coinsAwarded: evalResult.coinsAwarded,
      newStreak: evalResult.newStreak,
      cycleCompleted: evalResult.cycleCompleted,
      cycleCount: evalResult.newCycleCount,
      shieldUsed: evalResult.shieldUsed,
      walletBalance: updatedWalletBalance,
      ...(pendingUntil !== undefined ? { pendingUntil } : {}),
      updatedState: {
        ...updatedState,
        playerId,
      },
    };
  }
}
