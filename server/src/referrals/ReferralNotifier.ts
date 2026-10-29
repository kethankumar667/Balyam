import { REFERRAL_LIVE_EVENT, type ReferralLiveEvent } from "@shared/referrals.js";
import { logger } from "../lib/logger.js";

/** The slice of Socket.IO's `Server` this needs: address a room, emit to it. */
export interface ReferralNotifierIo {
  to(room: string): { emit(event: string, payload: unknown): unknown };
}

/** The slice of the PostgREST client this needs. */
export interface ReferralNotifierDb {
  rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T>;
}

interface EventContext {
  referrerId: string;
  inviteeName: string;
  referrerName: string;
}

const SOURCE_ID = /^referral:(.+):(inviter|invitee)$/;
/** How many invitees to remember having announced, so a repeated request cannot tell the inviter twice. */
const ANNOUNCED_LIMIT = 5_000;

/**
 * Tells a member, the moment it happens, about their referrals: a friend joined, a friend played, a bonus is
 * on its way, the coins landed.
 *
 * Each notice goes to the member's personal `user:<id>` socket room, which every signed-in tab joins (the
 * Mandali authentication already does it), so it reaches them on any page, in every tab, and quietly reaches
 * nobody when they are offline: the Referrals page and the wallet always show the same facts when they next open.
 *
 * A notice carries the other person's display name (what `referral_overview` already shows each side, privacy
 * notice 7) and coins, nothing else. It is best effort by design: nothing here throws, so a failed notice can
 * never hold up a payout, a sign-up, or a settlement.
 */
export class ReferralNotifier {
  private readonly announcedJoins = new Set<string>();

  constructor(
    private readonly io: ReferralNotifierIo | null,
    private readonly db: ReferralNotifierDb,
    private readonly now: () => number = Date.now,
  ) {}

  /** A friend joined with this member's code. Said once per invitee, however often the request is repeated. */
  async friendJoined(inviteeId: string): Promise<void> {
    if (this.announcedJoins.has(inviteeId)) return;
    if (this.announcedJoins.size >= ANNOUNCED_LIMIT) this.announcedJoins.clear();
    this.announcedJoins.add(inviteeId);
    const context = await this.contextFor(inviteeId);
    if (context) this.send(context.referrerId, { kind: "friend_joined", friendName: context.inviteeName });
  }

  /**
   * The invitee finished a first match with another person and both bonuses are now on their way (held for a day).
   * Called once per attribution, after the bonus is closed in the database.
   */
  async bonusScheduled(inviteeId: string, inviterCoins: number, inviteeCoins: number): Promise<void> {
    const context = await this.contextFor(inviteeId);
    if (!context) return;
    this.send(context.referrerId, { kind: "friend_played", friendName: context.inviteeName, coins: inviterCoins });
    this.send(inviteeId, { kind: "bonus_on_the_way", friendName: context.referrerName, coins: inviteeCoins });
  }

  /** The hold ended and a referral bonus reached a wallet. `record` is the gateway's reward row. */
  async bonusLanded(record: { playerId: string; sourceId: string; amount: number }): Promise<void> {
    const match = SOURCE_ID.exec(record.sourceId);
    if (!match) return;
    const [, inviteeId, side] = match;
    const context = await this.contextFor(inviteeId!);
    if (!context) return;
    const friendName = side === "inviter" ? context.inviteeName : context.referrerName;
    this.send(record.playerId, { kind: "bonus_landed", friendName, coins: record.amount });
  }

  private async contextFor(inviteeId: string): Promise<EventContext | null> {
    try {
      const context = await this.db.rpc<EventContext | null>("referral_event_context", { p_invitee_id: inviteeId });
      return context && typeof context.referrerId === "string" ? context : null;
    } catch (err) {
      this.warn("read who a referral notice is about", err);
      return null;
    }
  }

  private send(playerId: string, event: Omit<ReferralLiveEvent, "at">): void {
    if (!this.io) return;
    try {
      this.io.to(`user:${playerId}`).emit(REFERRAL_LIVE_EVENT, { ...event, at: this.now() } satisfies ReferralLiveEvent);
    } catch (err) {
      this.warn("send a referral notice", err);
    }
  }

  private warn(what: string, err: unknown): void {
    logger.warn({
      message: `[REFERRALS] Could not ${what}: ${err instanceof Error ? err.message : String(err)}`,
      module: "REFERRALS",
    });
  }
}
