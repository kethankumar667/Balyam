import {
  REFERRAL_ADMIN_LIMITS,
  REFERRAL_ADMIN_NOTE_MAX,
  REFERRAL_CAMPAIGN_FIELDS,
  type ReferralAdminCampaign,
  type ReferralAdminEvent,
  type ReferralAdminOverview,
  type ReferralAdminPendingReward,
  type ReferralCampaignPatch,
} from "@shared/referrals.js";
import { logger } from "../lib/logger.js";
import type { RewardRecord } from "../rewards/types.js";

/** The slice of the PostgREST client this needs. */
export interface ReferralAdminDb {
  rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T>;
}

/** The slice of the reward gateway this needs. */
export interface ReferralAdminGateway {
  voidReward(
    rewardId: string,
    reason: string,
    actor: string,
  ): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" | "NOT_PENDING"; status?: string }>;
}

export interface ReferralAdminRewards {
  getReward(rewardId: string): Promise<RewardRecord | null>;
}

export type PatchCheck = { ok: true; patch: ReferralCampaignPatch } | { ok: false; message: string };

/**
 * Checks a requested change to the campaign before anything is sent. Only the five editable fields, each a whole number
 * within its limits, and at least one. The database checks the same rules again (`referral_admin_set_campaign`): this is
 * the friendly early answer, that is the one that cannot be skipped.
 */
export function checkCampaignPatch(input: unknown): PatchCheck {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return { ok: false, message: "Send the settings to change." };
  const patch: ReferralCampaignPatch = {};
  for (const [key, value] of Object.entries(input)) {
    if (!(REFERRAL_CAMPAIGN_FIELDS as string[]).includes(key)) return { ok: false, message: `"${key}" is not a setting that can be changed here.` };
    const field = key as keyof typeof REFERRAL_ADMIN_LIMITS;
    const { min, max, label } = REFERRAL_ADMIN_LIMITS[field];
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
      return { ok: false, message: `${label} must be a whole number from ${min} to ${max}.` };
    }
    patch[field] = value;
  }
  if (Object.keys(patch).length === 0) return { ok: false, message: "Change at least one setting." };
  return { ok: true, patch };
}

export function checkNote(input: unknown): { ok: true; note: string } | { ok: false; message: string } {
  if (typeof input !== "string" || input.trim().length === 0) return { ok: false, message: "A note is required: say why this is being changed." };
  if (input.trim().length > REFERRAL_ADMIN_NOTE_MAX) return { ok: false, message: `The note can be at most ${REFERRAL_ADMIN_NOTE_MAX} characters.` };
  return { ok: true, note: input.trim() };
}

/** What the database refuses with, in words an operator can act on. Anything else is an outage, not a refusal. */
const DATABASE_REFUSALS: Array<[RegExp, string]> = [
  [/NOTE_REQUIRED/, "A note is required: say why this is being changed."],
  [/ACTOR_REQUIRED/, "Who is making this change could not be determined."],
  [/EMPTY_CHANGE/, "Change at least one setting."],
  [/INVALID_CAMPAIGN_FIELD/, "One of those settings cannot be changed here."],
  [/INVALID_CAMPAIGN_VALUE/, "One of those values is outside the allowed range."],
  [/REFERRAL_UNAVAILABLE/, "Referrals are not set up in this environment."],
];

export function refusalFromDatabase(err: unknown): string | null {
  const text = err instanceof Error ? err.message : String(err);
  return DATABASE_REFUSALS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export type CampaignUpdate = { ok: true; campaign: ReferralAdminCampaign } | { ok: false; message: string };

export type BonusVoid =
  | { ok: true; logged: boolean }
  | { ok: false; code: "NOT_FOUND" | "NOT_REFERRAL" | "NOT_PENDING"; status?: string };

/**
 * What the operator console reads and does. Reads are views over the database; the two actions are deliberate:
 * a settings change (bounded, needs a note, records before and after) and withdrawing one pending bonus. Every
 * action is attributed to the verified operator the router passes in, never to anything the request body says.
 */
export class ReferralAdminService {
  constructor(
    private readonly db: ReferralAdminDb,
    private readonly gateway: ReferralAdminGateway,
    private readonly rewards: ReferralAdminRewards,
  ) {}

  overview(): Promise<ReferralAdminOverview> {
    return this.db.rpc<ReferralAdminOverview>("referral_admin_overview");
  }

  pending(limit: number): Promise<ReferralAdminPendingReward[]> {
    return this.db.rpc<ReferralAdminPendingReward[]>("referral_admin_pending_rewards", { p_limit: limit });
  }

  events(limit: number): Promise<ReferralAdminEvent[]> {
    return this.db.rpc<ReferralAdminEvent[]>("referral_admin_events_list", { p_limit: limit });
  }

  async updateCampaign(patch: ReferralCampaignPatch, note: string, actor: string): Promise<CampaignUpdate> {
    try {
      const campaign = await this.db.rpc<ReferralAdminCampaign>("referral_admin_set_campaign", {
        p_actor: actor, p_note: note, p_patch: patch,
      });
      logger.warn({ message: `Referral campaign changed by ${actor}: ${JSON.stringify(patch)} (${note})`, module: "REFERRALS" });
      return { ok: true, campaign };
    } catch (err) {
      const refusal = refusalFromDatabase(err);
      if (refusal) return { ok: false, message: refusal };
      throw err;
    }
  }

  /**
   * Withdraw one referral bonus that has not started being paid. Refuses anything that is not a referral bonus:
   * the reward gateway's own void would withdraw any reward by id, and this console is for referrals only.
   */
  async voidBonus(rewardId: string, reason: string, actor: string): Promise<BonusVoid> {
    const record = await this.rewards.getReward(rewardId);
    if (!record) return { ok: false, code: "NOT_FOUND" };
    if (record.rewardType !== "REFERRAL") return { ok: false, code: "NOT_REFERRAL" };

    const result = await this.gateway.voidReward(rewardId, reason, actor);
    if (!result.ok) return { ok: false, code: result.code === "NOT_FOUND" ? "NOT_FOUND" : "NOT_PENDING", ...(result.status ? { status: result.status } : {}) };

    // The bonus is withdrawn for good by now. A failure to write the console's own record is reported, not undone.
    try {
      await this.db.rpc("referral_admin_log", {
        p_actor: actor,
        p_action: "REWARD_VOIDED",
        p_detail: { rewardId, playerId: record.playerId, amount: record.amount, sourceId: record.sourceId },
        p_note: reason,
      });
      return { ok: true, logged: true };
    } catch (err) {
      logger.error({ message: `Referral bonus ${rewardId} was withdrawn by ${actor} but the console record failed: ${String(err)}`, module: "REFERRALS" });
      return { ok: true, logged: false };
    }
  }
}
