import { logger } from "../lib/logger.js";
import type { RiskService } from "./RiskService.js";
import { DAILY_TRANSFER_CAP_BY_TIER, type TrustService } from "./TrustService.js";
import { REASON, type ReasonCode } from "./types.js";

/**
 * Who may send coins to another player, and how many per day.
 *
 * ── Why the exit is what gets controlled ──────────────────────────────
 * A farm of throwaway accounts is only worth running if what it earns can be
 * consolidated into one wallet. Coins move between players in exactly one way —
 * a Mandali transfer, or paying a Mandali coin request — so a limit here removes
 * most of the payoff without touching anyone's gameplay. It also fits what the
 * feature is for: coins move between friends who already know each other, in
 * amounts a friend would send, not in bulk.
 *
 * ── The rules ─────────────────────────────────────────────────────────
 *   RESTRICTED / UNDER_REVIEW   cannot send at all (visible to the player)
 *   otherwise                   per UTC day, by trust tier: 500 / 1,000 / 2,500 / 5,000
 *
 * The day's total is read from the wallet ledger, not counted in memory, so a
 * restart cannot reset it and a second server instance cannot double it. If the
 * ledger cannot be read the answer is "not now": a transfer waits, it is never
 * waved through on a guess.
 *
 * Receiving is never limited here. A frozen or restricted account may always be
 * paid; only what it can send out is bounded.
 */

const MS_PER_DAY = 86_400_000;
const LEDGER_PAGE = 100;
const MAX_LEDGER_PAGES = 10;

/** The slice of the economy this policy reads. */
export interface TransferLedgerSource {
  getLedger(
    identityId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<Array<{ entryType: string; amount: string; createdAt: number }>>;
}

export type TransferDecision = { ok: true } | { ok: false; code: ReasonCode; message: string };

export interface TransferPolicyDeps {
  ledger: TransferLedgerSource;
  risk: RiskService;
  trust: TrustService;
  now?: () => number;
}

export class TransferPolicy {
  private readonly ledger: TransferLedgerSource;
  private readonly risk: RiskService;
  private readonly trust: TrustService;
  private readonly now: () => number;
  private readonly queues = new Map<string, Promise<void>>();

  constructor(deps: TransferPolicyDeps) {
    this.ledger = deps.ledger;
    this.risk = deps.risk;
    this.trust = deps.trust;
    this.now = deps.now ?? Date.now;
  }

  /**
   * Runs check-then-transfer for one sender one at a time. The day's total is read
   * from the ledger, so N parallel sends would all read the same total and all
   * pass; queueing them makes each one see the sends before it. This covers one
   * server process — a second instance would need the cap enforced in the
   * transfer's own transaction.
   */
  async serialised<T>(senderId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(senderId) ?? Promise.resolve();
    const run = previous.then(work, work);
    const tail = run.then(() => undefined, () => undefined);
    this.queues.set(senderId, tail);
    try {
      return await run;
    } finally {
      if (this.queues.get(senderId) === tail) this.queues.delete(senderId);
    }
  }

  /** May `senderId` send `amount` coins right now? */
  async check(senderId: string, amount: number): Promise<TransferDecision> {
    const state = this.risk.getState(senderId);
    if (state === "RESTRICTED" || state === "UNDER_REVIEW") {
      return {
        ok: false,
        code: REASON.TRANSFER_RISK_BLOCK,
        message: "Sending coins is paused on your account for now.",
      };
    }

    try {
      const [tier, sentToday] = await Promise.all([this.trust.tierOf(senderId), this.sentToday(senderId)]);
      const cap = DAILY_TRANSFER_CAP_BY_TIER[tier];
      if (sentToday + amount > cap) {
        return {
          ok: false,
          code: REASON.TRANSFER_TIER_CAP,
          message: `You can send up to ${cap} coins a day and have sent ${sentToday}. The limit resets at midnight UTC.`,
        };
      }
      return { ok: true };
    } catch (err) {
      logger.error({
        message: `Transfer policy could not be evaluated for ${senderId}: ${err instanceof Error ? err.message : String(err)}`,
        module: "REWARDS",
      });
      return { ok: false, code: REASON.TRANSFER_UNAVAILABLE, message: "Coin transfers are temporarily unavailable. Try again in a moment." };
    }
  }

  /** The cap the transfer itself must enforce in its own transaction, for this sender now. */
  async capFor(senderId: string): Promise<{ maxCoins: string; dayStartMs: number }> {
    const tier = await this.trust.tierOf(senderId);
    return {
      maxCoins: String(DAILY_TRANSFER_CAP_BY_TIER[tier]),
      dayStartMs: Math.floor(this.now() / MS_PER_DAY) * MS_PER_DAY,
    };
  }

  /** Coins this player has sent since the start of the current UTC day, from the wallet ledger. */
  async sentToday(senderId: string): Promise<number> {
    const now = this.now();
    const dayStart = Math.floor(now / MS_PER_DAY) * MS_PER_DAY;
    let sent = 0;
    for (let page = 0; page < MAX_LEDGER_PAGES; page++) {
      // Newest first, so the first entry older than today ends the walk.
      const entries = await this.ledger.getLedger(senderId, { limit: LEDGER_PAGE, offset: page * LEDGER_PAGE });
      if (entries.length === 0) return sent;
      for (const entry of entries) {
        if (entry.createdAt < dayStart) return sent;
        if (entry.entryType === "P2P_TRANSFER_SEND") sent += Math.abs(Number(entry.amount));
      }
      if (entries.length < LEDGER_PAGE) return sent;
    }
    // Ten full pages of today's entries and still not out of today: treat as at least the cap.
    throw new Error("wallet ledger too long to total for today");
  }
}
