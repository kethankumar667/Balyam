import { PostgrestClient } from "../persistence/postgrest.js";
import type { RewardGateway } from "../rewards/RewardGateway.js";
import { REASON } from "../rewards/types.js";
import { logger } from "../lib/logger.js";

/** How often the sweeper looks for friends who have just finished their first match with another person. */
export const REFERRAL_BONUS_SWEEP_MS = 60_000;
const QUALIFY_BATCH = 200;
const PAYOUT_BATCH = 50;

interface BonusDue {
  inviteeId: string;
  referrerId: string;
}

type Reservation =
  | { state: "RESERVED"; referrerId: string; inviterBonus: number; inviteeBonus: number }
  | { state: "NOT_QUALIFIED" | "NOT_ELIGIBLE" | "ISSUED" }
  | { state: "BLOCKED"; reason: string };

export interface BonusSweepTotals {
  qualified: number;
  paid: number;
  blocked: number;
  /** Left reserved for the next sweep: an account under review, or the reward store was unavailable. */
  deferred: number;
}

/**
 * Pays the referral bonus: 2,000 coins to the member who invited and 2,000 to the member who was invited,
 * once the invited member has finished a match with another person.
 *
 * The order is what makes it safe to crash anywhere:
 *   1. the database marks friends qualified (`referral_qualify_open`) and lists who is owed (`referral_bonus_due`);
 *   2. `referral_bonus_reserve` takes the inviter's lock, applies the rolling cap and records the amounts;
 *   3. each side is granted through the reward gateway, which writes a ledger row keyed
 *      `referral:<invitee>:<side>` — a second grant for the same key is a no-op, so a retry never pays twice;
 *   4. only when both grants exist does `referral_bonus_complete` close the attribution.
 * A bonus that dies between 2 and 4 stays reserved and the next sweep finishes it.
 */
export class ReferralBonusService {
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<BonusSweepTotals> | null = null;

  constructor(private readonly db: PostgrestClient, private readonly gateway: RewardGateway) {}

  startSweeper(intervalMs = REFERRAL_BONUS_SWEEP_MS): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.sweep(); }, intervalMs);
    this.timer.unref?.();
  }

  stopSweeper(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Let a sweep that is already paying finish. Nothing new starts once the timer is stopped. */
  async drain(): Promise<void> {
    await this.running?.catch(() => undefined);
  }

  /** One pass. Concurrent callers share the pass already running rather than racing it. */
  sweep(): Promise<BonusSweepTotals> {
    if (this.running) return this.running;
    const pass = this.sweepOnce()
      .catch((err): BonusSweepTotals => {
        logger.error({ message: `Referral bonus sweep failed: ${String(err)}`, module: "REFERRALS" });
        return { qualified: 0, paid: 0, blocked: 0, deferred: 0 };
      })
      .finally(() => { this.running = null; });
    this.running = pass;
    return pass;
  }

  private async sweepOnce(): Promise<BonusSweepTotals> {
    const totals: BonusSweepTotals = { qualified: 0, paid: 0, blocked: 0, deferred: 0 };
    const opened = await this.db.rpc<{ qualified: number }>("referral_qualify_open", { p_limit: QUALIFY_BATCH });
    totals.qualified = opened?.qualified ?? 0;

    const due = await this.db.rpc<BonusDue[]>("referral_bonus_due", { p_limit: PAYOUT_BATCH });
    for (const row of Array.isArray(due) ? due : []) {
      const outcome = await this.payOne(row.inviteeId);
      totals[outcome] += 1;
    }
    return totals;
  }

  private async payOne(inviteeId: string): Promise<"paid" | "blocked" | "deferred"> {
    const reservation = await this.db.rpc<Reservation>("referral_bonus_reserve", { p_invitee_id: inviteeId });
    if (reservation.state === "BLOCKED") return "blocked";
    if (reservation.state !== "RESERVED") return "deferred";

    const sides = [
      { player: reservation.referrerId, side: "inviter", amount: reservation.inviterBonus,
        reason: REASON.REFERRAL_INVITER, description: "A friend you invited finished their first match" },
      { player: inviteeId, side: "invitee", amount: reservation.inviteeBonus,
        reason: REASON.REFERRAL_INVITEE, description: "Welcome bonus for joining with a friend's code" },
    ] as const;

    for (const { player, side, amount, reason, description } of sides) {
      if (amount <= 0) continue;
      const grant = await this.gateway.grantCoins({
        playerId: player,
        identityKind: "member",
        rewardType: "REFERRAL",
        reasonCode: reason,
        amount,
        sourceId: `referral:${inviteeId}:${side}`,
        description,
      });
      // An account under review or an unavailable store leaves the bonus reserved; the next sweep retries.
      if (!grant.ok) return "deferred";
    }

    await this.db.rpc("referral_bonus_complete", { p_invitee_id: inviteeId });
    return "paid";
  }
}
