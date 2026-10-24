export const REFERRAL_TARGET = 3;
export const REFERRAL_WINDOW_DAYS = 30;
export const REFERRAL_WINDOW_MS = REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const NOSTALGIA_PACK = [
  { id: "aura_nostalgia_gold", name: "Golden Reunion", category: "AVATAR_AURA", scope: "GLOBAL" },
  { id: "title_gang_leader", name: "Gang Leader", category: "PODIUM_TITLE", scope: "GLOBAL" },
  { id: "table_retro_school_slate", name: "School Slate", category: "TABLE_THEME", scope: "rummy" },
] as const;

export interface ReferralProgress {
  inviteCode: string;
  qualifiedFriends: number;
  pendingFriends: number;
  target: number;
  rewardGranted: boolean;
}

export type ReferralRefusal =
  | "INVALID_INVITE"
  | "EXPIRED_INVITE"
  | "SELF_REFERRAL"
  | "EXISTING_ACCOUNT"
  | "ALREADY_ATTRIBUTED"
  | "VERIFY_EMAIL";

export type ReferralAttributionResult =
  | { ok: true }
  | { ok: false; code: ReferralRefusal };

export interface ReferralIntent {
  code: string;
  acceptedAt: number;
  expiresAt: number;
}

export function isReferralCode(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}
