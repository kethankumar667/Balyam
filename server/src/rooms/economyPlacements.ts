import type { GameKind, Player } from "@shared/types.js";
import type { GameEngine } from "../games/GameEngine.js";
import type { SettlementParticipantOutcome } from "../economy/EconomyService.js";

/**
 * Deriving a settlement-ready ranking from a finished match.
 *
 * ── Why this lives in RoomManager's world, not EconomyService's ─────────
 * Phase 5's own instruction: "Do not invent game-specific ranking logic...
 * a future RoomManager adapter supplies normalized authoritative
 * placements." This is that adapter. `EconomyService.settleMatchEconomy`
 * only ever validates the SHAPE of whatever it's given (non-empty, unique
 * identities, a placement permutation) — deciding who actually placed
 * where, per game, is this file's job.
 *
 * ── Scope, stated honestly (see `docs/economy/game-settlement-map.md`) ──
 * `GameEngine` has no ranking method in its formal interface — only
 * `isOver()` and an ad-hoc, untyped `getWinner()` duck-type already used
 * by `finalizeMatch` for profile/ranking recording. Building verified,
 * per-engine multi-tier ranking for all 17 engines is real, separate work
 * this pass does not claim to have done. What IS implemented, and is
 * exactly correct for every game it covers:
 *
 *   - Solo (1 seat): the one player is placement 1. Irrelevant to the
 *     prize math — DEFAULT_SCHEDULES pays 0 at 1st for a 1-seat match
 *     (Rule 3, game-settlement-map.md §1: 100% to the World Bank).
 *   - Exactly 2 seats: `getWinnerId()` (tries `getWinner()`, falls back to
 *     `getPublicState().winnerId` — a plain state field far more engines
 *     expose; confirmed on both RPS and Ludo) names 1st, the other seat is
 *     2nd — unambiguous for any 2-seat game whose engine exposes either
 *     convention, and it's the only paid position at seatCount=2 anyway
 *     (DEFAULT_SCHEDULES: 2nd pays 0).
 *   - Ludo, 3+ seats: `finishOrder` is a real, engine-authoritative,
 *     already-broadcast field (`LudoState.finishOrder`) recording exact
 *     finish order; the one seat never added to it (the game ends at
 *     `playerOrder.length - 1` finishers) is last place.
 *   - Rummy, any seat count, all three modes: winner-takes-all, so the ranking
 *     is the winner first and everyone else after — see `rummyWinnerFirstRanking`.
 *     Checked before the generic 2-seat rule because a pool match's `winnerId`
 *     is only the last round's winner.
 *   - Dots & Boxes and Word Building, 3+ seats: ranked by their authoritative
 *     `scores`, highest first, refunding on any ambiguity at a paid place —
 *     see `scoreRanking`.
 *   - Everything else at 3+ seats: `isValidRanking: false` — refund, not a
 *     guess. This is the documented, correct behavior for an ambiguous
 *     ranking (game-settlement-map.md Rule 2), not a shortcut dressed up
 *     as one. A future pass can extend this file per-engine without
 *     touching EconomyService, RoomManager's call site, or this file's
 *     exported shape.
 *
 * ── Guest identity resolution (see economyIdentity.ts) ──
 * `SettlementParticipantOutcome.identityId` is a non-nullable `string` —
 * EconomyService's frozen contract. When a guest joins with a valid guest token
 * (verified via `verifyGuestToken`), their durable guest identity (`guest_<random>`)
 * is populated on the player and submitted in `participants`. If a guest seat
 * has no verified token or failed provisioning, `participantIdFor` returns `null`,
 * which correctly falls back to `isValidRanking: false` (refund-safe).
 */

export interface PlacementExtractionInput {
  game: GameKind;
  players: ReadonlyMap<string, Player>;
  engine: GameEngine | null;
  /**
   * Seats that left after the match was committed. They are still in `players`
   * (the committed seat count must match) but did not play to the end.
   */
  departedIds?: ReadonlySet<string>;
}

export interface PlacementExtractionResult {
  isValidRanking: boolean;
  participants: SettlementParticipantOutcome[];
  /** Why `isValidRanking` is false — for logging only, never economy-authoritative. */
  reason?: string;
}

/**
 * Kind comes from the player's own `isGuest` flag (set at join time from
 * the verified/claimed account kind), never inferred from whether
 * `identityId` happens to be set. Getting this backwards — "has an id, so
 * must be a member" — would misclassify a guest whose identity a future
 * fix DOES manage to resolve, sending them down the member wallet-credit
 * path instead of the guest voucher-escrow path: the wrong outcome even
 * though nothing was technically "unresolvable."
 */
function identityKindFor(player: Player): SettlementParticipantOutcome["identityKind"] {
  if (player.isBot) return "bot";
  return player.isGuest ? "guest" : "member";
}

/** `null` means "this seat cannot be named in a settlement" — see the file header. */
function participantIdFor(player: Player): string | null {
  if (player.isBot) return player.id; // synthetic, never FK-checked — EconomyRepository.ts's own documented convention
  return player.identityId ?? null;
}

function buildParticipants(order: string[], players: ReadonlyMap<string, Player>): SettlementParticipantOutcome[] | null {
  const out: SettlementParticipantOutcome[] = [];
  for (let i = 0; i < order.length; i++) {
    const player = players.get(order[i]!);
    if (!player) return null;
    const identityId = participantIdFor(player);
    if (!identityId) return null;
    out.push({ identityId, identityKind: identityKindFor(player), placement: i + 1 });
  }
  return out;
}

/**
 * Two duck-typed conventions, tried in order — neither is part of
 * `GameEngine`'s formal interface. `getWinner()` (a method) is genuinely
 * rare: of the 17 engines, only `DotsBoxesEngine` implements it — the same
 * ad-hoc convention `finalizeMatch` already relies on for profile/ranking.
 * `getPublicState().winnerId` (a plain state FIELD) is far more common —
 * verified present on both `RpsEngine` and `LudoEngine`'s state shape, and
 * the natural place most engines record it since it's already broadcast to
 * clients. Returns `undefined` when neither is present, which correctly
 * falls through to `isValidRanking: false` below — never a guess.
 */
export function getWinnerId(engine: GameEngine): string | null | undefined {
  const viaMethod = (engine as unknown as { getWinner?: () => string | null | undefined }).getWinner?.();
  if (viaMethod !== undefined) return viaMethod;
  const state = engine.getPublicState() as { winnerId?: string | null } | null | undefined;
  return state?.winnerId;
}

function ludoFinishOrder(engine: GameEngine): string[] | null {
  const state = engine.getPublicState() as { finishOrder?: unknown; playerOrder?: unknown };
  if (!Array.isArray(state.finishOrder) || !Array.isArray(state.playerOrder)) return null;
  const finishOrder = state.finishOrder as string[];
  const playerOrder = state.playerOrder as string[];
  const remaining = playerOrder.filter((id) => !finishOrder.includes(id));
  return [...finishOrder, ...remaining];
}

/**
 * Rummy, every mode and seat count. The pot is winner-takes-all with no platform cut
 * (shared/rummy-economy.ts), so the only placement that moves coins is 1st — the seat
 * that made the show (`single`) or outlasted the table (`pool101` / `pool201`, read from
 * `matchWinnerId`, since `winnerId` there is just the last round's winner). Everyone else
 * is ordered by points, lowest first, only to complete the permutation the settlement
 * requires; a tie among them is broken by seat order and can never change a payout, which
 * is why — unlike the ranked games — a losers' tie is NOT a reason to refund.
 *
 * Refunds (`null`) remain for the cases with no single winner to name: a pool match not yet
 * over, a hand not yet scored, or a wrong show among 3+ seats, where every opponent books a
 * clean zero and choosing one of them would be a guess. A wrong show at a 2-seat table has
 * exactly one opponent, so that opponent wins.
 */
function rummyWinnerFirstRanking(engine: GameEngine, seatIds: string[]): string[] | null {
  const state = engine.getPublicState() as {
    matchMode?: unknown;
    winnerId?: unknown;
    matchOver?: unknown;
    matchWinnerId?: unknown;
    invalidDeclareBy?: unknown;
    scores?: Record<string, unknown>;
    cumulativeScores?: Record<string, unknown>;
  };
  const isPool = state.matchMode === "pool101" || state.matchMode === "pool201";
  if (!isPool && state.matchMode !== "single") return null;

  let winnerId: unknown;
  if (isPool) {
    // The match winner outlasts the table; the LAST ROUND's winner can be someone else.
    winnerId = state.matchOver === true ? state.matchWinnerId : null;
  } else {
    // `scores` only exists once the hand is scored — a winnerId alone is announced early.
    if (!state.scores) return null;
    winnerId = state.winnerId;
    if (typeof winnerId !== "string" && typeof state.invalidDeclareBy === "string" && seatIds.length === 2) {
      // A wrong show has no round winner, but with one opponent the opponent is the winner.
      winnerId = seatIds.find((id) => id !== state.invalidDeclareBy);
    }
  }
  if (typeof winnerId !== "string" || !seatIds.includes(winnerId)) return null;

  const points = (isPool ? state.cumulativeScores : state.scores) ?? {};
  const pointsOf = (id: string): number => (Number.isFinite(points[id]) ? (points[id] as number) : Number.MAX_SAFE_INTEGER);
  // Array.prototype.sort is stable, so equal scores keep seat order — a tie among the
  // losers is broken deterministically and, since only 1st is paid, never changes a payout.
  const rest = seatIds.filter((id) => id !== winnerId).sort((a, b) => pointsOf(a) - pointsOf(b));
  return [winnerId, ...rest];
}

/** DEFAULT_SCHEDULES pays at most three places, and never the last seat (`min(seats - 1, 3)`). */
function paidPlaceCount(seatCount: number): number {
  return Math.min(seatCount - 1, 3);
}

/**
 * Dots & Boxes and Word Building, 3+ seats: both engines keep an
 * authoritative `scores` map (boxes claimed / points scored) and crown the top
 * score, so the standings are the scores, highest first.
 *
 * Conservative by construction — anything the payout would have to guess at
 * is a refund (`null`), exactly as before this ranking existed:
 *   - every seat needs a finite score (missing / NaN / Infinity → refund);
 *   - each PAID place must be strictly ahead of the seat below it, so a tie
 *     for 1st, 2nd or 3rd — or between the last paid place and the first
 *     unpaid one — is never broken arbitrarily. A tie among unpaid places
 *     alone changes nobody's payout and is accepted;
 *   - the engine's own declared winner, when it declares one, must be the
 *     score leader. A forfeit win (last player standing) can disagree with the
 *     scores; that is refunded rather than paid on a guess;
 *   - a seat that LEFT mid-match must not land in a paid place: it keeps the
 *     score it had, but the engine only crowns among those who stayed, so it
 *     could otherwise be paid ahead of a player who played to the end.
 */
function scoreRanking(engine: GameEngine, seatIds: string[], departedIds: ReadonlySet<string>): string[] | null {
  const scores = (engine.getPublicState() as { scores?: Record<string, unknown> } | null | undefined)?.scores;
  if (!scores || typeof scores !== "object") return null;
  if (!seatIds.every((id) => Number.isFinite(scores[id]))) return null;

  const points = (id: string): number => scores[id] as number;
  const ranked = [...seatIds].sort((a, b) => points(b) - points(a));

  for (let i = 0; i < paidPlaceCount(seatIds.length); i++) {
    if (points(ranked[i]!) === points(ranked[i + 1]!)) return null;
    if (departedIds.has(ranked[i]!)) return null;
  }

  const declaredWinner = getWinnerId(engine);
  if (declaredWinner !== undefined && declaredWinner !== ranked[0]) return null;

  return ranked;
}

const SCORE_RANKED_GAMES: ReadonlySet<GameKind> = new Set<GameKind>(["dotsboxes", "wordbuilding"]);

export function extractRankedParticipants(input: PlacementExtractionInput): PlacementExtractionResult {
  const { game, players, engine } = input;
  if (!engine) {
    return { isValidRanking: false, participants: [], reason: "no engine" };
  }

  const seatIds = Array.from(players.keys());
  let order: string[] | null = null;

  if (seatIds.length === 1) {
    order = seatIds;
  } else if (game === "rummy") {
    // Before the generic 2-seat branch: in a pool match `winnerId` is the last ROUND's winner,
    // which is not necessarily the match winner who takes the pot.
    order = rummyWinnerFirstRanking(engine, seatIds);
  } else if (seatIds.length === 2) {
    const winnerId = getWinnerId(engine);
    if (typeof winnerId === "string" && players.has(winnerId)) {
      order = [winnerId, seatIds.find((id) => id !== winnerId)!];
    }
  } else if (game === "ludo") {
    const finish = ludoFinishOrder(engine);
    if (finish && finish.length === seatIds.length) {
      order = finish;
    }
  } else if (SCORE_RANKED_GAMES.has(game)) {
    order = scoreRanking(engine, seatIds, input.departedIds ?? new Set());
  }

  if (!order) {
    return { isValidRanking: false, participants: [], reason: "no deterministic ranking available for this seat count/game" };
  }

  const participants = buildParticipants(order, players);
  if (!participants) {
    return { isValidRanking: false, participants: [], reason: "a seat in the ranking has no economy-resolvable identity" };
  }

  return { isValidRanking: true, participants };
}
