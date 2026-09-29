import type { TrustAssessment, TrustTier } from "./types.js";

/**
 * How much a member's rewards and transfers are trusted, as a checklist a player
 * could read — never an opaque score.
 *
 * ── Why tiers, and why these four numbers ─────────────────────────────
 * Every tier asks for the same four things, in larger amounts:
 *
 *   account age         a farm account is new; time is the one thing it cannot fake
 *   real-people matches games with another signed-in person that were long enough
 *                       to have been played
 *   distinct opponents  a person plays many people; a farm plays one or two
 *   active Mandalis     belonging to communities of people who know each other
 *
 * Distinct opponents is the strongest signal and costs no personal data: it is a
 * count over matches the server already holds. Throwaway guests are not counted
 * (they cost nothing to make) and neither are matches too short to have been
 * played (see `MatchHistoryService.getOpponentStats`).
 *
 * ── What a tier changes ───────────────────────────────────────────────
 * The daily transfer cap and how long a daily reward waits. It never changes
 * whether someone can play. The thresholds are constants here on purpose:
 * tuning them is a one-line change, reviewed like any other.
 */

interface Criterion {
  key: "age" | "matches" | "opponents" | "mandalis";
  min: number;
}

/** What each tier above 1 requires. Tier 1 is every signed-in member. */
export const TIER_REQUIREMENTS: Record<2 | 3 | 4, Criterion[]> = {
  2: [
    { key: "age", min: 3 },
    { key: "matches", min: 5 },
    { key: "opponents", min: 3 },
  ],
  3: [
    { key: "age", min: 30 },
    { key: "matches", min: 25 },
    { key: "opponents", min: 10 },
    { key: "mandalis", min: 1 },
  ],
  4: [
    { key: "age", min: 90 },
    { key: "matches", min: 100 },
    { key: "opponents", min: 50 },
    { key: "mandalis", min: 3 },
  ],
};

export const DAILY_TRANSFER_CAP_BY_TIER: Record<TrustTier, number> = {
  1: 500,
  2: 1_000,
  3: 2_500,
  4: 5_000,
};

export type TrustMetrics = TrustAssessment["metrics"];

const LABELS: Record<Criterion["key"], (min: number) => string> = {
  age: (n) => `Account at least ${n} days old`,
  matches: (n) => `${n} matches with real people`,
  opponents: (n) => `Played ${n} different people`,
  mandalis: (n) => (n === 1 ? "Member of an active Mandali" : `Member of ${n} active Mandalis`),
};

function valueOf(metrics: TrustMetrics, key: Criterion["key"]): number {
  switch (key) {
    case "age":
      return metrics.accountAgeDays;
    case "matches":
      return metrics.completedMatches;
    case "opponents":
      return metrics.distinctOpponents;
    case "mandalis":
      return metrics.activeMandalis;
  }
}

function check(metrics: TrustMetrics, tier: 2 | 3 | 4): TrustAssessment["reasons"] {
  return TIER_REQUIREMENTS[tier].map((c) => {
    const have = valueOf(metrics, c.key);
    return {
      label: `Tier ${tier}: ${LABELS[c.key](c.min)}`,
      met: have >= c.min,
      detail: `You have ${Math.floor(have)}`,
    };
  });
}

/** Pure: the same numbers always give the same tier and the same reasons. */
export function assessTrust(metrics: TrustMetrics): TrustAssessment {
  let tier: TrustTier = 1;
  for (const candidate of [2, 3, 4] as const) {
    if (check(metrics, candidate).every((r) => r.met)) tier = candidate;
    else break;
  }
  // Show what earned the current tier, then what the next one still needs.
  const reasons: TrustAssessment["reasons"] = [];
  if (tier > 1) reasons.push(...check(metrics, tier as 2 | 3 | 4));
  if (tier < 4) reasons.push(...check(metrics, (tier + 1) as 2 | 3 | 4));
  return { tier, reasons, metrics };
}

export interface TrustProviders {
  accountAgeDays(playerId: string): number;
  opponentStats(playerId: string): { realPeopleMatches: number; distinctOpponents: number };
  activeMandalis(playerId: string): Promise<number>;
}

const NO_DATA: TrustProviders = {
  accountAgeDays: () => 0,
  opponentStats: () => ({ realPeopleMatches: 0, distinctOpponents: 0 }),
  activeMandalis: async () => 0,
};

/**
 * The data sources are injected at boot so this module imports none of the
 * services it reads from (the gateway is imported by them, and a cycle here
 * would be the price of a convenience).
 */
export class TrustService {
  private providers: TrustProviders = NO_DATA;

  setProviders(providers: TrustProviders): void {
    this.providers = providers;
  }

  async assess(playerId: string): Promise<TrustAssessment> {
    const { realPeopleMatches, distinctOpponents } = this.providers.opponentStats(playerId);
    let mandalis = 0;
    try {
      mandalis = await this.providers.activeMandalis(playerId);
    } catch {
      // Community data being unreachable lowers the ceiling to tier 2; it never raises it.
      mandalis = 0;
    }
    return assessTrust({
      accountAgeDays: this.providers.accountAgeDays(playerId),
      completedMatches: realPeopleMatches,
      distinctOpponents,
      activeMandalis: mandalis,
    });
  }

  async tierOf(playerId: string): Promise<TrustTier> {
    return (await this.assess(playerId)).tier;
  }
}

export const trustService = new TrustService();
