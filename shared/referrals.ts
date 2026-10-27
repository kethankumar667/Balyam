import { SCHOOL_SLATE_ID, SCHOOL_SLATE_SCOPES } from "./cosmetics.js";
import type { CosmeticCategory, CosmeticGameScope } from "./cosmetics.js";

export const REFERRAL_TARGET = 3;
export const REFERRAL_WINDOW_DAYS = 30;
export const REFERRAL_WINDOW_MS = REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const NOSTALGIA_PACK = [
  { id: "aura_nostalgia_gold", name: "Golden Reunion", category: "AVATAR_AURA", scope: "GLOBAL" },
  { id: "title_gang_leader", name: "Gang Leader", category: "PODIUM_TITLE", scope: "GLOBAL" },
  { id: SCHOOL_SLATE_ID, name: "School Slate", category: "TABLE_THEME", scope: "rummy" },
] as const;

export interface PackEquipTarget {
  id: string;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
}

/**
 * Every slot "Equip pack" fills. The slate is a look for six games and each game keeps its own slot, so one pack
 * item is several equips; the aura and the title are global and stay one each.
 */
export function packEquipTargets(): PackEquipTarget[] {
  return NOSTALGIA_PACK.flatMap((item): PackEquipTarget[] =>
    item.id === SCHOOL_SLATE_ID
      ? SCHOOL_SLATE_SCOPES.map((scope) => ({ id: item.id, category: item.category, scope }))
      : [{ id: item.id, category: item.category, scope: item.scope }],
  );
}

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
