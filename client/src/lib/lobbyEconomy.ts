/**
 * Lobby Economy — Honest-State Derivation Helpers.
 *
 * ── WHAT THIS FILE USED TO DO, AND WHY THAT WAS WRONG ───────────────────────
 * The original version of this module computed seat cost and prize
 * distribution locally: a hardcoded `DEFAULT_SEAT_COST_COINS = 100`, a
 * hand-copied table of the seat 1-5 schedule, and an INVENTED linear
 * formula for seat counts above 5 with no backend counterpart at all. An
 * independent audit failed this outright — the frontend had become a
 * second economy authority, exactly what Economy V1's own design forbids.
 * Only seat counts 1-5 have ever had an approved prize schedule
 * (`economy_prize_schedules` in `20260826000000_economy_v1.sql`); nothing
 * here may ever invent one for any other seat count.
 *
 * ── WHAT THIS FILE DOES NOW ─────────────────────────────────────────────────
 * Zero seat-cost math. Zero prize-schedule math. Every number a caller of
 * `deriveLobbyEconomyPreview` can display comes from a `MatchCheckoutQuote`
 * — the SAME authoritative, server-computed quote `CheckoutSheet.tsx` has
 * used since before this file existed (`POST /api/economy/checkout/quote`,
 * via `useCheckoutQuote` in `hooks/useEconomy.ts`). If no quote is
 * available — still loading, or the server rejected this seat count because
 * no schedule exists for it (`UnsupportedSeatCountError`) — the caller is
 * told exactly that (`"loading"` / `"unavailable"`) and must render
 * accordingly. Nothing here ever fabricates a number to fill the gap.
 */

import type { MatchCheckoutQuote } from "./economyApi";

export type LobbyEconomyStatus = "loading" | "unavailable" | "available";

export interface LobbyEconomyPreview {
  status: LobbyEconomyStatus;
  costPerSeat: string | null;
  totalPot: string | null;
  firstPlace: string | null;
  secondPlace: string | null;
  thirdPlace: string | null;
  worldBankCut: string | null;
}

const UNAVAILABLE_PREVIEW: Omit<LobbyEconomyPreview, "status"> = {
  costPerSeat: null,
  totalPot: null,
  firstPlace: null,
  secondPlace: null,
  thirdPlace: null,
  worldBankCut: null,
};

/**
 * Shapes a `MatchCheckoutQuote` (or its absence) into what the lobby prize
 * pool UI needs — a pass-through, never a calculation. `quote` is `null`
 * exactly when the server has not (yet, or ever, for this seat count)
 * provided an authoritative figure; `isQuoteLoading` distinguishes "still
 * asking" from "asked and there is genuinely nothing to show."
 */
export function deriveLobbyEconomyPreview(
  quote: MatchCheckoutQuote | null,
  isQuoteLoading: boolean,
): LobbyEconomyPreview {
  if (quote) {
    return {
      status: "available",
      costPerSeat: quote.costPerSeat,
      totalPot: quote.totalCommitment,
      firstPlace: quote.prizeDistribution.firstPlace,
      secondPlace: quote.prizeDistribution.secondPlace,
      thirdPlace: quote.prizeDistribution.thirdPlace,
      worldBankCut: quote.worldBankContribution,
    };
  }

  return { status: isQuoteLoading ? "loading" : "unavailable", ...UNAVAILABLE_PREVIEW };
}

export type LobbyLockPhase = "idle" | "securing" | "locked";

/**
 * The lock state a lobby may show must never be inferable from "the host
 * clicked Start" alone — that only proves a commit was ATTEMPTED. This
 * derives it from `RoomPublicState.currentMatchId`, which the server sets
 * only once `commitMatchEntry` has actually succeeded (see its own doc
 * comment in `shared/types.ts`: "Null while in the lobby before a match
 * begins; populated upon successful commitMatchEntry"). While a commit is
 * in flight but not yet confirmed (`lifecycleState === "STARTING"` with no
 * `currentMatchId` yet), the table is "securing," not "locked" — a real,
 * named pending state, never presented as success.
 */
export function deriveLobbyLockPhase(
  hasConfirmedMatchId: boolean,
  lifecycleState: string | null | undefined,
): LobbyLockPhase {
  if (hasConfirmedMatchId) return "locked";
  if (lifecycleState === "STARTING") return "securing";
  return "idle";
}
