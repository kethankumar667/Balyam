import type { GameKind } from "@shared/types.js";

/**
 * The vocabulary of the reward gateway. One place, so a ledger row, an admin
 * screen and a test all name the same states and reasons the same way.
 */

/**
 * How much a player's rewards are trusted right now. Escalation past WATCHLIST is
 * never automatic: a machine may quietly stop paying XP, a person decides
 * whether to hold coins. Every move is reversible and leaves an audit event.
 */
export type RiskState = "NORMAL" | "WATCHLIST" | "RESTRICTED" | "UNDER_REVIEW";

export const RISK_STATES: readonly RiskState[] = ["NORMAL", "WATCHLIST", "RESTRICTED", "UNDER_REVIEW"];

export function isRiskState(value: unknown): value is RiskState {
  return typeof value === "string" && (RISK_STATES as readonly string[]).includes(value);
}

/** Explainable, never a hidden float: each tier is a checklist the player could read. */
export type TrustTier = 1 | 2 | 3 | 4;

export type RewardType =
  | "LEVEL_MILESTONE"
  | "DAILY_STREAK"
  | "ACHIEVEMENT"
  | "TOURNAMENT"
  | "SEASONAL"
  | "REFERRAL"
  | "MANDALI";

/**
 * PENDING   earned, waiting out its vesting period; the only state an operator can void
 * RELEASING claimed by the sweeper and being paid; a crash here is recovered, never re-paid
 * RELEASED  in the wallet
 * VOIDED    withdrawn by an operator before it was paid
 */
export type RewardStatus = "PENDING" | "RELEASING" | "RELEASED" | "VOIDED";

/**
 * Why something was allowed, reduced, delayed or refused. Attached to every
 * ledger row and every refusal, so "why did I get 0 XP?" and "why is this coin
 * pending?" always have an answer that is not "the algorithm".
 */
export const REASON = {
  // XP decisions
  FULL_TABLE: "FULL_TABLE",
  PRACTICE_TABLE: "PRACTICE_TABLE",
  REPEAT_TABLE: "REPEAT_TABLE",
  TOO_SHORT: "TOO_SHORT",
  PACE_LIMIT: "PACE_LIMIT",
  RISK_PRACTICE_ONLY: "RISK_PRACTICE_ONLY",
  // coin rewards
  MILESTONE_LEVEL: "MILESTONE_LEVEL",
  STREAK_DAY: "STREAK_DAY",
  VESTING: "VESTING",
  VESTED: "VESTED",
  // refusals
  NOT_MEMBER: "NOT_MEMBER",
  NO_ECONOMY: "NO_ECONOMY",
  NEEDS_HUMAN_MATCHES: "NEEDS_HUMAN_MATCHES",
  RISK_UNDER_REVIEW: "RISK_UNDER_REVIEW",
  REWARD_STORE_UNAVAILABLE: "REWARD_STORE_UNAVAILABLE",
  ALREADY_GRANTED: "ALREADY_GRANTED",
  // transfers
  TRANSFER_TIER_CAP: "TRANSFER_TIER_CAP",
  TRANSFER_RISK_BLOCK: "TRANSFER_RISK_BLOCK",
  TRANSFER_UNAVAILABLE: "TRANSFER_UNAVAILABLE",
  // operator actions
  OPERATOR_SET: "OPERATOR_SET",
  OPERATOR_VOID: "OPERATOR_VOID",
  AUTO_ABNORMAL_SESSIONS: "AUTO_ABNORMAL_SESSIONS",
} as const;

export type ReasonCode = (typeof REASON)[keyof typeof REASON];

/** One coin reward, from the moment it is earned to the moment it reaches (or never reaches) the wallet. */
export interface RewardRecord {
  rewardId: string;
  playerId: string;
  rewardType: RewardType;
  reasonCode: ReasonCode;
  /** Coins. A whole number: rewards never split. */
  amount: number;
  /** What earned it — a level, a streak day. With `rewardType` it is the idempotency key. */
  sourceId: string;
  earnedAt: number;
  vestingUntil: number;
  status: RewardStatus;
  /** The player's risk state when it was earned. Kept as evidence; it is not re-read to decide anything. */
  riskState: RiskState;
  /** The wallet ledger entry that paid it. `null` until released. */
  ledgerEntryId: number | null;
  /** When the sweeper claimed it for payment. Lets a claim that died mid-payment be recovered. */
  releaseStartedAt: number | null;
  releasedAt: number | null;
  voidedReason: string | null;
  description: string;
}

export interface RiskStateRecord {
  playerId: string;
  state: RiskState;
  reasonCodes: string[];
  updatedAt: number;
  /** Who moved it: `system` for the automatic WATCHLIST rule, otherwise an operator principal. */
  updatedBy: string;
}

export type RiskEventKind = "STATE_CHANGED" | "ABNORMAL_SESSION" | "REWARD_VOIDED";

export interface RiskEventRecord {
  playerId: string;
  kind: RiskEventKind;
  reasonCode: string;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface TrustAssessment {
  tier: TrustTier;
  /** Every criterion checked, met or not, so the answer to "why not tier 3?" is on the screen. */
  reasons: Array<{ label: string; met: boolean; detail: string }>;
  metrics: {
    accountAgeDays: number;
    completedMatches: number;
    distinctOpponents: number;
    activeMandalis: number;
  };
}

/** Per-game floor, in ms, below which a "match" cannot have been a real game. */
export type MinDurationTable = Record<GameKind, number>;
