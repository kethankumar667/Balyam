import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card, Player, Rank } from "@shared/types.js";
import { RummyEngine } from "../../RummyEngine.js";
import { bestArrangementForScoring } from "../../score.js";
import { DEFAULT_TUNING } from "../tuning.js";

/** For tuning runs: RUMMY_TUNING='{"dropUntilTurn":-1}' replaces named defaults for this process only. */
if (process.env.RUMMY_TUNING) Object.assign(DEFAULT_TUNING, JSON.parse(process.env.RUMMY_TUNING));

/**
 * Strength, measured. The coach plays whole deals through `engine.getHint` (the same call the Hint button
 * makes) against the engine's own bot, in both seats, on shared seeds. If the advice were only plausible-
 * sounding this is where it would show: it would lose points to a bot that has no card counting at all.
 *
 * Set RUMMY_TOURNAMENT_DEALS to play more deals (the default keeps the suite quick).
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seat = (id: string): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player;

interface RummyInternals {
  s: {
    phase: string;
    hands: Map<string, Card[]>;
    wildJoker: { rank: Rank };
    playerOrder: string[];
    turnIndex: number;
    winnerId: string | null;
    scores: Record<string, number>;
  };
}

interface DealResult {
  winner: "coach" | "bot" | "none";
  coachPoints: number;
  /** What the table paid in total other than the coach (the winner collects it). */
  othersPoints: number;
  /** Zero-sum result for the coach: the winner collects every loser's points, a loser pays its own. */
  money: number;
  /** Times the coach named an action the engine refused: must stay zero. */
  refused: number;
  coachDropped: boolean;
}

/** Plays the coach's advice as the move it names; falls back to the bot only if it names none. */
function coachMove(engine: RummyEngine, id: string): boolean {
  const action = engine.getHint(id)?.action;
  if (!action) {
    engine.applyAutoMove(id);
    return true;
  }
  switch (action.type) {
    case "draw":
      return engine.applyMove({ playerId: id, type: "draw", data: { from: action.from } }).ok;
    case "discard":
      return engine.applyMove({ playerId: id, type: "discard", data: { cardId: action.cardId } }).ok;
    case "declare":
      return engine.applyMove({ playerId: id, type: "declare", data: { discardCardId: action.discardCardId, melds: action.melds } }).ok;
    case "drop":
      return engine.applyMove({ playerId: id, type: "drop" }).ok;
  }
}

function playDeal(seed: number, seats: number, coachIndex: number): DealResult {
  vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));
  const engine = new RummyEngine();
  engine.init(Array.from({ length: seats }, (_, i) => (i === coachIndex ? "coach" : `bot${i}`)).map(seat));
  const s = (engine as unknown as RummyInternals).s;
  let refused = 0;
  let coachDropped = false;

  for (let ply = 0; ply < 400 && s.phase === "playing"; ply++) {
    const actor = s.playerOrder[s.turnIndex];
    if (actor !== "coach") {
      engine.applyAutoMove(actor);
      continue;
    }
    const action = engine.getHint(actor)?.action;
    coachDropped = coachDropped || action?.type === "drop";
    if (!coachMove(engine, actor)) {
      refused += 1;
      engine.applyAutoMove(actor);
    }
  }
  vi.restoreAllMocks();

  if (s.phase === "arranging") engine.finalizeArrangingRound();
  const points = (id: string): number => s.scores[id] ?? bestArrangementForScoring(s.hands.get(id) ?? [], s.wildJoker.rank).points;
  const coachPoints = points("coach");
  const othersPoints = s.playerOrder.filter((id) => id !== "coach").reduce((sum, id) => sum + points(id), 0);
  const winner = s.winnerId === "coach" ? "coach" : s.winnerId ? "bot" : "none";
  const money = winner === "coach" ? othersPoints : -coachPoints;
  return { winner, coachPoints, othersPoints, money, refused, coachDropped };
}

describe("coach tournament: the coach's advice played out against the bot", () => {
  const deals = Number(process.env.RUMMY_TOURNAMENT_DEALS ?? 24);
  const seats = Number(process.env.RUMMY_TOURNAMENT_SEATS ?? 2);
  /** Different bases give different deals, so parallel processes add up to one large sample. */
  const seedBase = Number(process.env.RUMMY_TOURNAMENT_SEED ?? 52_000);

  it("never names an action the engine refuses, and comes out ahead of the bots over the same deals", () => {
    let coachWins = 0;
    let botWins = 0;
    let coachPoints = 0;
    let money = 0;
    let refused = 0;
    let drops = 0;
    for (let i = 0; i < deals; i++) {
      // Rotate the coach through every seat so no seat's turn order favours it.
      const result = playDeal(seedBase + Math.floor(i / seats), seats, i % seats);
      if (result.winner === "coach") coachWins += 1;
      if (result.winner === "bot") botWins += 1;
      coachPoints += result.coachPoints;
      money += result.money;
      refused += result.refused;
      if (result.coachDropped) drops += 1;
    }

    console.info(
      `[coach tournament] ${seats} players: coach won ${coachWins}, bots won ${botWins} of ${deals} deals; ` +
        `coach paid ${coachPoints} points, net ${money > 0 ? "+" : ""}${money} (zero-sum); coach dropped ${drops}; refused actions ${refused}`,
    );
    expect(refused).toBe(0);
    // Only a head-to-head has a guaranteed answer: with more seats the coach may share the table with
    // several bots, and a small sample can swing either way, so those runs report rather than assert.
    if (seats === 2) expect(money).toBeGreaterThan(0);
  }, 3_600_000);
});
