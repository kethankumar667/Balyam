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
  /** The member's shareable `BHALYAM-XXXXX` code. Absent on a server that predates codes. */
  shareCode?: string;
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
  | "VERIFY_EMAIL"
  | "INVALID_CODE"
  | "TOO_LATE"
  | "ALREADY_PLAYED"
  | "NOT_ATTACHED";

export type ReferralAttributionResult =
  | { ok: true }
  | { ok: false; code: ReferralRefusal };

export interface ReferralIntent {
  code: string;
  acceptedAt: number;
  expiresAt: number;
}

/** The long, private form of an invitation: the UUID a link carries. Kept so every link already sent still works. */
export function isReferralCode(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

// ── The shareable code ────────────────────────────────────────────────────────

export const REFERRAL_CODE_PREFIX = "BHALYAM";
/**
 * What the five characters after the prefix are drawn from: the digits 2-9 and the consonants, and nothing else.
 * No vowels means a code can never spell a word (so nothing needs an offensive-word list), and no 0/1/O/I/U keeps
 * it readable aloud. 27^5 is about 14 million codes. It carries no personal data: nothing about the member is in it.
 */
export const REFERRAL_CODE_ALPHABET = "23456789BCDFGHJKLMNPRSTVWXZ";
export const REFERRAL_CODE_LENGTH = 5;

const CODE_BODY = new RegExp(`^[${REFERRAL_CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`);

/**
 * Turns what someone typed into the canonical `BHALYAM-XXXXX`, or null if it cannot be one. Forgiving about
 * everything that does not matter (case, spaces, hyphens, dots) and about leaving the `BHALYAM` off, strict about
 * the five characters, because a code that is nearly right must not quietly become someone else's.
 */
export function normalizeReferralCode(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 64) return null;
  let compact = input.normalize("NFKC").toUpperCase().replace(/[\s\-_.]/g, "");
  if (compact.startsWith(REFERRAL_CODE_PREFIX)) compact = compact.slice(REFERRAL_CODE_PREFIX.length);
  return CODE_BODY.test(compact) ? `${REFERRAL_CODE_PREFIX}-${compact}` : null;
}

export function isShareCode(value: unknown): value is string {
  return typeof value === "string" && normalizeReferralCode(value) === value;
}

/** What an invitation link or a typed field holds: a legacy UUID, or a share code. */
export type InviteReference = { kind: "uuid" | "code"; value: string };

export function parseInviteReference(input: unknown): InviteReference | null {
  if (isReferralCode(input)) return { kind: "uuid", value: input };
  const code = normalizeReferralCode(input);
  return code ? { kind: "code", value: code } : null;
}

// ── The bonus ─────────────────────────────────────────────────────────────────

/** Coins each side earns when the new member finishes a match with another human. Tunable in `referral_campaign`. */
export const REFERRAL_BONUS_COINS = 2_000;
/** A new member may enter a code for this long after registering, and only before their first human match. */
export const REFERRAL_CODE_WINDOW_DAYS = 7;
/** At most this many friends earn the inviter a bonus in any rolling `REFERRAL_CAP_WINDOW_DAYS`. */
export const REFERRAL_ROLLING_CAP = 10;
export const REFERRAL_CAP_WINDOW_DAYS = 30;

// ── Live notices ──────────────────────────────────────────────────────────────

/** The socket event the server sends to one member's `user:<id>` room. */
export const REFERRAL_LIVE_EVENT = "referral:update";

/**
 * What happened, told to the member it concerns:
 * `friend_joined`    to the inviter, when someone joins with their code;
 * `friend_played`    to the inviter, when that friend finishes a first match with another person (bonus is on its way);
 * `bonus_on_the_way` to the invitee, at the same moment;
 * `bonus_landed`     to whoever the coins went to, when the hold ends and they reach the wallet.
 */
export type ReferralLiveKind = "friend_joined" | "friend_played" | "bonus_on_the_way" | "bonus_landed";

/** The other person's display name (the one `referral_overview` already shows), and the coins where there are some. Nothing else. */
export interface ReferralLiveEvent {
  kind: ReferralLiveKind;
  friendName: string;
  coins?: number;
  at: number;
}

// ── The operator console ──────────────────────────────────────────────────────

/**
 * What an operator may set, and how far. Tighter than the table's own limits on purpose: a typo of 20000 for 2000
 * must be refused, not paid. The database enforces the same numbers (`referral_admin_set_campaign`); the console and
 * the router read them from here so a form can say what is allowed before anything is sent.
 */
export const REFERRAL_ADMIN_LIMITS = {
  inviterBonus: { min: 0, max: 10_000, label: "Inviter bonus (coins)" },
  inviteeBonus: { min: 0, max: 10_000, label: "Invitee bonus (coins)" },
  rollingCap: { min: 0, max: 100, label: "Friends rewarded per window" },
  capWindowDays: { min: 1, max: 365, label: "Cap window (days)" },
  codeWindowDays: { min: 1, max: 60, label: "Days a new member may add a code" },
} as const;

export type ReferralCampaignField = keyof typeof REFERRAL_ADMIN_LIMITS;
export const REFERRAL_CAMPAIGN_FIELDS = Object.keys(REFERRAL_ADMIN_LIMITS) as ReferralCampaignField[];
/** A change to the campaign: any of the fields above, each a whole number within its limits. */
export type ReferralCampaignPatch = Partial<Record<ReferralCampaignField, number>>;
export const REFERRAL_ADMIN_NOTE_MAX = 200;

export interface ReferralAdminCampaign extends Record<ReferralCampaignField, number> {
  enabled: boolean;
  bonusStartsAt: number;
}

export interface ReferralAdminFunnel {
  invitesCreated: number;
  joined: number;
  viaCode: number;
  viaLink: number;
  qualified: number;
  waiting: number;
  expired: number;
  bonusReserved: number;
  bonusIssued: number;
  bonusBlockedCap: number;
}

export interface ReferralAdminLiability {
  pendingCoins: number;
  pendingCount: number;
  releasedCoins: number;
  releasedCount: number;
  voidedCoins: number;
  voidedCount: number;
}

export interface ReferralAdminOverview {
  campaign: ReferralAdminCampaign;
  funnel: ReferralAdminFunnel;
  liability: ReferralAdminLiability;
  topReferrers: Array<{ playerId: string; displayName: string; joined: number; qualified: number }>;
  serverNow: number;
}

/** A bonus still in its hold, which an operator can withdraw. */
export interface ReferralAdminPendingReward {
  rewardId: string;
  playerId: string;
  displayName: string;
  side: "inviter" | "invitee";
  inviteeId: string;
  amount: number;
  status: "PENDING" | "RELEASING";
  earnedAt: number;
  vestingUntil: number;
}

export interface ReferralAdminEvent {
  id: number;
  actor: string;
  action: "CAMPAIGN_UPDATED" | "REWARD_VOIDED";
  detail: Record<string, unknown>;
  note: string;
  at: number;
}

export type ReferralFriendStatus = "JOINED" | "QUALIFIED" | "EXPIRED";

/**
 * Where one side's bonus stands. NONE: the match that unlocks it has not happened. PENDING: unlocked, being issued.
 * VESTING: issued and waiting out the anti-abuse hold. CREDITED: in the wallet. BLOCKED: not paid (a cap or a review).
 * VOIDED: withdrawn by an operator.
 */
export type ReferralBonusState = "NONE" | "PENDING" | "VESTING" | "CREDITED" | "BLOCKED" | "VOIDED";

export interface ReferralBonusView {
  state: ReferralBonusState;
  amount: number;
  /** When a VESTING bonus reaches the wallet (epoch ms). */
  vestingUntil: number | null;
  creditedAt: number | null;
  blockedReason: "CAP" | "REVIEW" | null;
}

/** A friend who signed up with the member's code or link. Never an email, birthday or match detail. */
export interface ReferralFriend {
  ordinal: number;
  displayName: string;
  avatarId: string | null;
  joinedAt: number;
  expiresAt: number;
  qualifiedAt: number | null;
  status: ReferralFriendStatus;
  via: "link" | "code";
  yourBonus: ReferralBonusView;
  theirBonus: ReferralBonusView;
}

/** The member who referred this one, shown to the invitee. */
export interface ReferralReferrer {
  displayName: string;
  avatarId: string | null;
  joinedAt: number;
  qualifiedAt: number | null;
  status: ReferralFriendStatus;
  via: "link" | "code";
  yourBonus: ReferralBonusView;
  /** A mistyped code can be taken back until the first qualifying match. */
  canDetach: boolean;
}

export interface ReferralOverview {
  shareCode: string;
  inviteCode: string;
  campaign: {
    inviterBonus: number;
    inviteeBonus: number;
    windowDays: number;
    rollingCap: number;
    capWindowDays: number;
    codeWindowDays: number;
    target: number;
  };
  totals: {
    joined: number;
    qualified: number;
    waiting: number;
    expired: number;
    bonusCredited: number;
    bonusPending: number;
  };
  friends: ReferralFriend[];
  referredBy: ReferralReferrer | null;
  pack: { granted: boolean; qualifiedFriends: number; target: number };
  /** Whether this member may still type a referral code (new account, none attached, no human match yet). */
  canEnterCode: boolean;
  serverNow: number;
}
