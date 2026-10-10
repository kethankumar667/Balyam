import { describe, it, expect } from "vitest";
import { chooseHandCricketPick, predictNextNumber } from "../handCricketStrategy.js";

/** A small seeded generator, so a duel gives the same result every run. */
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

const ALL = [1, 2, 3, 4, 5, 6];

/** The picker as it was: weights from the opponent's last six numbers, no idea what a number is worth. Kept as the opponent to beat. */
function legacyPick(isBowler: boolean, opponentPicks: number[], random: () => number): number {
  const recent = opponentPicks.slice(-6);
  const freq = new Map<number, number>();
  for (const v of recent) freq.set(v, (freq.get(v) ?? 0) + 1);
  const weights = new Map<number, number>();
  for (const v of ALL) weights.set(v, 1);
  if (isBowler) {
    for (const [v, c] of freq) weights.set(v, (weights.get(v) ?? 1) + c * 1.4);
  } else {
    for (const [v, c] of freq) weights.set(v, Math.max(0.2, (weights.get(v) ?? 1) - c * 0.5));
    for (const v of ALL) if ((freq.get(v) ?? 0) === 0) weights.set(v, (weights.get(v) ?? 1) + 0.8);
  }
  let total = 0;
  for (const v of ALL) total += weights.get(v) ?? 0;
  let r = random() * total;
  for (const v of ALL) {
    r -= weights.get(v) ?? 0;
    if (r <= 0) return v;
  }
  return 6;
}

type Picker = (isBowler: boolean, opponentPicks: number[], ownPicks: number[], ballsLeft: number, wicketsLeft: number, random: () => number) => number;

const legacy: Picker = (isBowler, opp, _own, _balls, _wickets, random) => legacyPick(isBowler, opp, random);
const modern: Picker = (isBowler, opp, own, ballsLeft, wicketsLeft, random) =>
  chooseHandCricketPick({ isBowler, allowed: ALL, opponentPicks: opp, ownPicks: own, wicketsLeft, ballsLeft, runsNeeded: null, random });

/** Runs a batting side scores in one innings of `balls` balls (10 wickets), averaged over `innings` innings. */
function averageRuns(bat: Picker, bowl: Picker, innings: number, seed: number, balls = 36): number {
  const random = mulberry32(seed);
  let total = 0;
  for (let i = 0; i < innings; i++) {
    const batPicks: number[] = [];
    const bowlPicks: number[] = [];
    let runs = 0;
    let wickets = 0;
    for (let ball = 0; ball < balls && wickets < 10; ball++) {
      const left = balls - ball;
      const b = bat(false, bowlPicks, batPicks, left, 10 - wickets, random);
      const w = bowl(true, batPicks, bowlPicks, left, 10 - wickets, random);
      batPicks.push(b);
      bowlPicks.push(w);
      if (b === w) wickets += 1;
      else runs += b;
    }
    total += runs;
  }
  return total / innings;
}

describe("Hand Cricket strategy", () => {
  it("opens a batting innings with a high number when it knows nothing", () => {
    const pick = chooseHandCricketPick({ isBowler: false, allowed: ALL, opponentPicks: [], ownPicks: [], wicketsLeft: 10, ballsLeft: 36, runsNeeded: null, random: mulberry32(1) });

    expect(pick).toBe(6);
  });

  it("only ever shows a number it is allowed to", () => {
    const random = mulberry32(3);
    for (let i = 0; i < 300; i++) {
      const allowed = [1, 2, 3];
      const pick = chooseHandCricketPick({
        isBowler: i % 2 === 0,
        allowed,
        opponentPicks: Array.from({ length: i % 12 }, () => 1 + Math.floor(random() * 6)),
        ownPicks: Array.from({ length: i % 12 }, () => 1 + Math.floor(random() * 6)),
        wicketsLeft: 1 + (i % 10),
        ballsLeft: 1 + (i % 40),
        runsNeeded: i % 3 === 0 ? 20 : null,
        random,
      });
      expect(allowed).toContain(pick);
    }
  });

  it("learns a bowler who always shows 6, and the batter stops showing it", () => {
    const opp = Array(8).fill(6);
    const own = [4, 3, 5, 4, 3, 5, 4, 3];
    const guess = predictNextNumber(opp, own);
    const random = mulberry32(9);

    let sixes = 0;
    for (let i = 0; i < 200; i++) {
      if (chooseHandCricketPick({ isBowler: false, allowed: ALL, opponentPicks: opp, ownPicks: own, wicketsLeft: 10, ballsLeft: 28, runsNeeded: null, random }) === 6) sixes += 1;
    }

    expect(guess[5]).toBeGreaterThan(0.6);
    // It may still throw the odd random 6, but it overwhelmingly avoids it.
    expect(sixes).toBeLessThan(30);
  });

  it("a bowler matches a batter who always shows the same number", () => {
    const opp = Array(8).fill(4);
    const own = [1, 2, 3, 5, 6, 1, 2, 3];
    const random = mulberry32(5);
    let fours = 0;
    for (let i = 0; i < 200; i++) {
      if (chooseHandCricketPick({ isBowler: true, allowed: ALL, opponentPicks: opp, ownPicks: own, wicketsLeft: 10, ballsLeft: 28, runsNeeded: null, random }) === 4) fours += 1;
    }

    expect(fours).toBeGreaterThan(140);
  });

  it("a chasing batter goes for the number that wins when it is within reach", () => {
    const random = mulberry32(2);
    const opp = [1, 2, 3, 1, 2, 3];
    const own = [4, 4, 4, 4, 4, 4];
    let sixes = 0;
    for (let i = 0; i < 100; i++) {
      if (chooseHandCricketPick({ isBowler: false, allowed: ALL, opponentPicks: opp, ownPicks: own, wicketsLeft: 3, ballsLeft: 5, runsNeeded: 6, random }) === 6) sixes += 1;
    }

    expect(sixes).toBeGreaterThan(70);
  });
});

describe("Hand Cricket duels: the new picker against the old one", () => {
  it("scores more as the batter against the old bowler", () => {
    const base = averageRuns(legacy, legacy, 400, 101);
    const better = averageRuns(modern, legacy, 400, 101);

    console.info(`[hand cricket] batting vs old bowler: old bat ${base.toFixed(1)} runs, new bat ${better.toFixed(1)} runs`);
    expect(better).toBeGreaterThan(base * 1.05);
  });

  it("concedes fewer runs as the bowler against the old batter", () => {
    const base = averageRuns(legacy, legacy, 400, 202);
    const tighter = averageRuns(legacy, modern, 400, 202);

    console.info(`[hand cricket] bowling vs old batter: old bowl conceded ${base.toFixed(1)}, new bowl conceded ${tighter.toFixed(1)}`);
    expect(tighter).toBeLessThan(base * 0.95);
  });

  it("out-scores the old bot in a straight bat-for-bat contest", () => {
    // Each side bats once against the other's bowling; the new bot should come out ahead.
    const margin = averageRuns(modern, legacy, 400, 303) - averageRuns(legacy, modern, 400, 303);

    console.info(`[hand cricket] new bot's average margin per match against the old bot: ${margin.toFixed(1)} runs`);
    expect(margin).toBeGreaterThan(0);
  });
});
