import { PostgrestClient } from "../persistence/postgrest.js";
import { isReferralCode, type ReferralAttributionResult, type ReferralProgress } from "@shared/referrals.js";
import { mintReferralIntent, readReferralIntent } from "./referralIntent.js";

export class ReferralService {
  constructor(private readonly db: PostgrestClient, private readonly signingKey: string) {
    if (signingKey.length < 32) throw new Error("Referrals require a durable SESSION_SECRET of at least 32 characters.");
  }

  async preview(code: unknown): Promise<boolean> {
    return isReferralCode(code) && await this.db.rpc<boolean>("referral_invite_valid", { p_code: code });
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

  attribute(playerId: string, token: unknown): Promise<ReferralAttributionResult> {
    const intent = readReferralIntent(token, this.signingKey);
    if (!intent) return Promise.resolve({ ok: false, code: "EXPIRED_INVITE" });
    return this.db.rpc<ReferralAttributionResult>("referral_attribute", {
      p_player_id: playerId, p_code: intent.code,
      p_accepted_at: intent.acceptedAt, p_expires_at: intent.expiresAt,
    });
  }
}
