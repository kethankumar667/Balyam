import { afterEach, describe, it, vi } from "vitest";
import type { Card, Player, Rank } from "@shared/types.js";
import { RummyEngine } from "../../RummyEngine.js";
import { bestArrangementForScoring } from "../../score.js";
import { dropVerdict, evaluateHand } from "../advisor.js";
import { DEFAULT_TUNING } from "../tuning.js";
import type { AdvisorTable } from "../types.js";
import { unseenCounts } from "../unseen.js";

/**
 * How the drop rule's constants were chosen, kept so they can be chosen again.
 *
 * For each first turn it records what the advisor predicted playing on would cost, then plays the deal out
 * (never dropping) and records what the coach really paid. If the prediction is honest, the two agree; the
 * drop line belongs where the real cost crosses the drop penalty. Skipped unless RUMMY_CALIBRATE=1, because it
 * plays hundreds of deals.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const enabled = process.env.RUMMY_CALIBRATE === "1";
// The coach must play every deal out, so its own drop advice is switched off while measuring what dropping would save.
if (enabled) Object.assign(DEFAULT_TUNING, { dropUntilTurn: -1 });

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

interface Internals {
  s: {
    phase: string;
    hands: Map<string, Card[]>;
    wildJoker: { rank: Rank };
    playerOrder: string[];
    turnIndex: number;
    scores: Record<string, number>;
  };
  advisorTableFor(id: string, hand: readonly Card[]): AdvisorTable;
}

interface Sample {
  needed: number;
  deadwood: number;
  predicted: number;
  winChance: number;
  actual: number;
}

function playDeal(seed: number, seats: number, coachIndex: number): Sample | null {
  vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));
  const ids = Array.from({ length: seats }, (_, i) => (i === coachIndex ? "coach" : `bot${i}`));
  const engine = new RummyEngine();
  engine.init(ids.map(seat));
  const inner = engine as unknown as Internals;
  const s = inner.s;
  let sample: Omit<Sample, "actual"> | null = null;

  for (let ply = 0; ply < 600 && s.phase === "playing"; ply++) {
    const actor = s.playerOrder[s.turnIndex];
    if (actor !== "coach") {
      engine.applyAutoMove(actor);
      continue;
    }
    const hand = s.hands.get("coach") ?? [];
    if (!sample && hand.length === 13) {
      const table = inner.advisorTableFor("coach", hand);
      const unseen = unseenCounts({ hand, openPile: table.openPile, cutCard: table.cutCard, heldByOpponents: [] });
      const current = evaluateHand(hand, table.wild, unseen);
      const verdict = dropVerdict(current, table.opponents.length, 0, DEFAULT_TUNING);
      if (verdict) sample = { needed: current.needed, deadwood: current.deadwood, predicted: verdict.playCost, winChance: verdict.winChance };
    }
    const action = engine.getHint(actor)?.action;
    const ok =
      action?.type === "draw" ? engine.applyMove({ playerId: actor, type: "draw", data: { from: action.from } }).ok
      : action?.type === "discard" ? engine.applyMove({ playerId: actor, type: "discard", data: { cardId: action.cardId } }).ok
      : action?.type === "declare" ? engine.applyMove({ playerId: actor, type: "declare", data: { discardCardId: action.discardCardId, melds: action.melds } }).ok
      : false;
    if (!ok) engine.applyAutoMove(actor);
  }
  vi.restoreAllMocks();

  if (s.phase === "arranging") engine.finalizeArrangingRound();
  const actual = s.scores["coach"] ?? bestArrangementForScoring(s.hands.get("coach") ?? [], s.wildJoker.rank).points;
  return sample ? { ...sample, actual } : null;
}

function report(label: string, samples: Sample[]): void {
  const buckets = new Map<number, Sample[]>();
  for (const sample of samples) {
    const key = Math.min(6, Math.floor(sample.predicted / 8));
    buckets.set(key, [...(buckets.get(key) ?? []), sample]);
  }
  const lines = [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, list]) => {
      const mean = (pick: (s: Sample) => number): number => list.reduce((sum, s) => sum + pick(s), 0) / list.length;
      return `  predicted ${key * 8}-${key * 8 + 8}: n=${list.length} actual mean ${mean((s) => s.actual).toFixed(1)} (needed ${mean((s) => s.needed).toFixed(1)}, deadwood ${mean((s) => s.deadwood).toFixed(0)}, win ${mean((s) => s.winChance).toFixed(2)})`;
    });
  const overall = samples.reduce((sum, s) => sum + s.actual, 0) / samples.length;
  console.info(`[drop calibration] ${label}: ${samples.length} first turns, actual mean ${overall.toFixed(1)}\n${lines.join("\n")}`);
}

describe.skipIf(!enabled)("drop calibration", () => {
  for (const seats of [2, 4]) {
    it(`${seats} players`, () => {
      const deals = Number(process.env.RUMMY_CALIBRATE_DEALS ?? 40);
      const samples: Sample[] = [];
      for (let i = 0; i < deals; i++) {
        const sample = playDeal(77_000 + i, seats, i % seats);
        if (sample) samples.push(sample);
      }
      report(`${seats} players`, samples);
    }, 3_600_000);
  }
});
