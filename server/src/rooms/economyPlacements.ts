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
 *   - Everything else at 3+ seats: `isValidRanking: false` — refund, not a
 *     guess. This is the documented, correct behavior for an ambiguous
 *     ranking (game-settlement-map.md Rule 2), not a shortcut dressed up
 *     as one. A future pass can extend this file per-engine without
 *     touching EconomyService, RoomManager's call site, or this file's
 *     exported shape.
 *
 * ── The unresolvable-guest limitation (see roommanager-integration-map.md) ──
 * `SettlementParticipantOutcome.identityId` is a non-nullable `string` —
 * EconomyService's frozen contract. A guest seat's durable identity cannot
 * be resolved today (no guest-token channel through the socket layer; see
 * `economyIdentity.ts`), so there is no valid string to submit for one, at
 * ANY placement — including a non-paid one, since the array must still
 * name every seat. A match containing any such seat is therefore always
 * `isValidRanking: false`, regardless of who actually won. Documented as
 * the top production risk in the Phase 7 completion report, not hidden.
 */

export interface PlacementExtractionInput {
  game: GameKind;
  players: ReadonlyMap<string, Player>;
  engine: GameEngine | null;
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
function getWinnerId(engine: GameEngine): string | null | undefined {
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

export function extractRankedParticipants(input: PlacementExtractionInput): PlacementExtractionResult {
  const { game, players, engine } = input;
  if (!engine) {
    return { isValidRanking: false, participants: [], reason: "no engine" };
  }

  const seatIds = Array.from(players.keys());
  let order: string[] | null = null;

  if (seatIds.length === 1) {
    order = seatIds;
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
