import { PostgrestClient } from "../persistence/postgrest.js";
import {
  isReferralCode,
  normalizeReferralCode,
  type ReferralAttributionResult,
  type ReferralOverview,
  type ReferralProgress,
} from "@shared/referrals.js";
import { mintReferralIntent, readReferralIntent } from "./referralIntent.js";
import type { ReferralNotifier } from "./ReferralNotifier.js";

export class ReferralService {
  constructor(
    private readonly db: PostgrestClient,
    private readonly signingKey: string,
    private readonly notifier?: Pick<ReferralNotifier, "friendJoined">,
  ) {
    if (signingKey.length < 32) throw new Error("Referrals require a durable SESSION_SECRET of at least 32 characters.");
  }

  async preview(code: unknown): Promise<boolean> {
    return isReferralCode(code) && await this.db.rpc<boolean>("referral_invite_valid", { p_code: code });
  }

  /**
   * Is this typed `BHALYAM-XXXXX` code real? Answers yes or no and nothing else: the page that asks is
   * public, so it must not reveal whose code it is.
   */
  async previewShareCode(input: unknown): Promise<boolean> {
    const code = normalizeReferralCode(input);
    return code !== null && await this.db.rpc<boolean>("referral_code_valid", { p_code: code });
  }

  async accept(code: unknown): Promise<{ token: string; expiresAt: number } | null> {
    if (!isReferralCode(code) || !await this.preview(code)) return null;
    const token = mintReferralIntent(code, this.signingKey);
    const intent = readReferralIntent(token, this.signingKey)!;
    return { token, expiresAt: intent.expiresAt };
  }

  sync(playerId: string): Promise<ReferralProgress> {
    return this.db.rpc<ReferralProgress>("referral_sync", { p_player_id: playerId });
  }

  async attribute(playerId: string, token: unknown): Promise<ReferralAttributionResult> {
    const intent = readReferralIntent(token, this.signingKey);
    if (!intent) return { ok: false, code: "EXPIRED_INVITE" };
    const result = await this.db.rpc<ReferralAttributionResult>("referral_attribute", {
      p_player_id: playerId, p_code: intent.code,
      p_accepted_at: intent.acceptedAt, p_expires_at: intent.expiresAt,
    });
    this.announceJoin(playerId, result);
    return result;
  }

  /** A new member types the code of whoever invited them. The database decides; this only normalises. */
  async redeemCode(playerId: string, input: unknown): Promise<ReferralAttributionResult> {
    const code = normalizeReferralCode(input);
    if (!code) return { ok: false, code: "INVALID_CODE" };
    const result = await this.db.rpc<ReferralAttributionResult>("referral_redeem_code", { p_player_id: playerId, p_code: code });
    this.announceJoin(playerId, result);
    return result;
  }

  /** Tell the inviter. Best effort and never awaited: a notice must not slow or fail a sign-up. */
  private announceJoin(inviteeId: string, result: ReferralAttributionResult): void {
    if (result.ok) void this.notifier?.friendJoined(inviteeId);
  }

  /** "Wrong code? Remove" — allowed only until the first qualifying match. */
  detach(playerId: string): Promise<ReferralAttributionResult> {
    return this.db.rpc<ReferralAttributionResult>("referral_detach", { p_player_id: playerId });
  }

  /** Everything the Referrals page shows, in one read. */
  overview(playerId: string): Promise<ReferralOverview> {
    return this.db.rpc<ReferralOverview>("referral_overview", { p_player_id: playerId });
  }
}
