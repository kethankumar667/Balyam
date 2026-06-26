import { describe, it, expect } from "vitest";
import type { Player, StarPlayerView, StarPublicState } from "@shared/types.js";
import { STAR_THEMES } from "@shared/star-themes.js";
import { keyBetween } from "@shared/frac-index.js";
import { StarGameEngine } from "../StarGameEngine.js";

function makePlayers(n: number, bots = false): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
    isBot: bots,
  }));
}

const COLORS = STAR_THEMES[0].values; // 8 distinct color values

function newEngine(n: number, opts: Record<string, unknown> = {}, bots = false): StarGameEngine {
  const e = new StarGameEngine();
  e.setRng(() => 0.42); // deterministic shuffles
  e.setOptions({ themeId: "colors", totalRounds: 1, passSpeed: "normal", ...opts });
  e.init(makePlayers(n, bots));
  return e;
}

function pub(e: StarGameEngine): StarPublicState {
  return e.getPublicState();
}
function view(e: StarGameEngine, pid: string): StarPlayerView {
  return e.getStateFor(pid) as StarPlayerView;
}

/** Drive themeSelect → shuffle → deal → pass for n players with distinct picks. */
function reachPass(e: StarGameEngine, n: number): void {
  for (let i = 0; i < n; i++) {
    e.applyMove({ playerId: `p${i}`, type: "selectValue", data: { value: COLORS[i] } });
  }
  expect(pub(e).phase).toBe("shuffle");
  for (let i = 0; i < n; i++) {
    e.applyMove({ playerId: `p${i}`, type: "shuffle" });
  }
  expect(pub(e).phase).toBe("deal");
  e.resolveDeadline(); // deal beat → pass
  expect(pub(e).phase).toBe("pass");
}

/** Funnel valuesInPlay[0] clockwise to seat 0 until the STAR phase opens. */
function driveToStar(e: StarGameEngine, n: number): void {
  let guard = 0;
  while (pub(e).phase === "pass" && guard++ < 60) {
    const target = pub(e).valuesInPlay[0];
    for (let i = 0; i < n; i++) {
      if (pub(e).phase !== "pass") break;
      const pid = `p${i}`;
      const hand = view(e, pid).myHand;
      const card =
        i === 0
          ? hand.find((c) => c.value !== target) ?? hand[0] // seat 0 hoards the target
          : hand.find((c) => c.value === target) ?? hand[0]; // others shove it clockwise
      e.applyMove({ playerId: pid, type: "selectCard", data: { cardId: card.id } });
      e.applyMove({ playerId: pid, type: "pass" });
    }
  }
}

describe("StarGameEngine — setup & deck", () => {
  for (const n of [3, 4, 5, 6, 7, 8]) {
    it(`${n} players: deck is 4×N balanced and every hand holds 4`, () => {
      const e = newEngine(n);
      reachPass(e, n);
      expect(pub(e).valuesInPlay).toHaveLength(n);
      const all: string[] = [];
      for (let i = 0; i < n; i++) {
        const hand = view(e, `p${i}`).myHand;
        expect(hand).toHaveLength(4);
        all.push(...hand.map((c) => c.value));
      }
      expect(all).toHaveLength(4 * n);
      for (const v of pub(e).valuesInPlay) {
        expect(all.filter((x) => x === v)).toHaveLength(4);
      }
    });
  }
});

describe("StarGameEngine — anti-cheat & validation", () => {
  it("rejects a duplicate theme value (distinct selection)", () => {
    const e = newEngine(3);
    expect(e.applyMove({ playerId: "p0", type: "selectValue", data: { value: "Red" } }).ok).toBe(true);
    expect(e.applyMove({ playerId: "p1", type: "selectValue", data: { value: "Red" } }).ok).toBe(false);
    expect(e.applyMove({ playerId: "p1", type: "selectValue", data: { value: "Blue" } }).ok).toBe(true);
  });

  it("rejects shuffling out of turn and a non-player", () => {
    const e = newEngine(3);
    for (let i = 0; i < 3; i++) e.applyMove({ playerId: `p${i}`, type: "selectValue", data: { value: COLORS[i] } });
    expect(pub(e).shuffleTurnId).toBe("p0");
    expect(e.applyMove({ playerId: "p1", type: "shuffle" }).ok).toBe(false); // not p1's turn
    expect(e.applyMove({ playerId: "ghost", type: "shuffle" }).ok).toBe(false); // not a player
    expect(e.applyMove({ playerId: "p0", type: "shuffle" }).ok).toBe(true);
  });

  it("rejects a second pass in the same cycle and an unowned card", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    const hand = view(e, "p0").myHand;
    expect(e.applyMove({ playerId: "p0", type: "selectCard", data: { cardId: "nope" } }).ok).toBe(false);
    expect(e.applyMove({ playerId: "p0", type: "selectCard", data: { cardId: hand[0].id } }).ok).toBe(true);
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(true);
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(false); // double pass
  });
});

describe("StarGameEngine — pass moves chits clockwise", () => {
  it("each player's chit lands on the next seat clockwise", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    const armedIds = [0, 1, 2].map((i) => view(e, `p${i}`).myHand[0].id);
    for (let i = 0; i < 3; i++) {
      e.applyMove({ playerId: `p${i}`, type: "selectCard", data: { cardId: armedIds[i] } });
      e.applyMove({ playerId: `p${i}`, type: "pass" });
    }
    // p0 → p1, p1 → p2, p2 → p0
    expect(view(e, "p1").myHand.some((c) => c.id === armedIds[0])).toBe(true);
    expect(view(e, "p2").myHand.some((c) => c.id === armedIds[1])).toBe(true);
    expect(view(e, "p0").myHand.some((c) => c.id === armedIds[2])).toBe(true);
    for (let i = 0; i < 3; i++) expect(view(e, `p${i}`).myHand).toHaveLength(4);
  });
});

describe("StarGameEngine — STAR, hand-stack, scoring & podium", () => {
  it("runs a full 1-round game: STAR winner=10, then 9, 8; podium medals assigned", () => {
    const e = newEngine(3, { totalRounds: 1 });
    reachPass(e, 3);
    driveToStar(e, 3);
    expect(pub(e).phase).toBe("star");
    expect(pub(e).players.find((p) => p.id === "p0")!.starEligible).toBe(true);

    // A non-eligible player cannot steal the STAR.
    expect(e.applyMove({ playerId: "p1", type: "pressStar" }).ok).toBe(false);
    expect(e.applyMove({ playerId: "p0", type: "pressStar" }).ok).toBe(true);
    expect(pub(e).phase).toBe("handstack");
    expect(pub(e).starWinnerId).toBe("p0");
    expect(pub(e).players.find((p) => p.id === "p0")!.roundWins).toBe(1);

    // Winner cannot also hand-stack; the rest race for places 2..N.
    expect(e.applyMove({ playerId: "p0", type: "placeHand" }).ok).toBe(false);
    expect(e.applyMove({ playerId: "p1", type: "placeHand" }).ok).toBe(true);
    expect(e.applyMove({ playerId: "p2", type: "placeHand" }).ok).toBe(true);

    expect(pub(e).phase).toBe("roundSummary");
    const res = pub(e).lastResult!;
    expect(res.order).toEqual(["p0", "p1", "p2"]);
    expect(res.points).toEqual({ p0: 10, p1: 9, p2: 8 });

    e.applyMove({ playerId: "p0", type: "nextRound" });
    expect(pub(e).phase).toBe("finished");
    expect(e.isOver()).toBe(true);
    const standings = pub(e).standings!;
    expect(standings[0]).toMatchObject({ playerId: "p0", rank: 0, score: 10, medal: "gold" });
    expect(standings[1]).toMatchObject({ rank: 1, medal: "silver" });
    expect(standings[2]).toMatchObject({ rank: 2, medal: "bronze" });
    expect(pub(e).winnerId).toBe("p0");
  });

  it("score never drops below 1 even at the back of a big table", () => {
    const e = newEngine(8, { totalRounds: 1 });
    reachPass(e, 8);
    driveToStar(e, 8);
    expect(pub(e).phase).toBe("star");
    e.applyMove({ playerId: "p0", type: "pressStar" });
    for (let i = 1; i < 8; i++) e.applyMove({ playerId: `p${i}`, type: "placeHand" });
    const pts = pub(e).lastResult!.points;
    // ranks 0..7 → 10,9,8,7,6,5,4,3 (all ≥ 1); floor only bites past rank 9.
    expect(Math.min(...Object.values(pts))).toBeGreaterThanOrEqual(1);
    expect(pts["p0"]).toBe(10);
    expect(pts["p7"]).toBe(3);
  });
});

describe("StarGameEngine — deadline auto-resolve & bots", () => {
  it("resolveDeadline auto-picks distinct values for everyone in themeSelect", () => {
    const e = newEngine(4);
    e.applyMove({ playerId: "p0", type: "selectValue", data: { value: "Red" } });
    e.resolveDeadline(); // p1..p3 auto-picked
    expect(pub(e).phase).toBe("shuffle");
    expect(pub(e).players.every((p) => p.hasSelected)).toBe(true);
  });

  it("bots drive themeSelect → shuffle → deal via pendingActors/applyAutoMove", () => {
    const e = newEngine(4, {}, true);
    let guard = 0;
    while (pub(e).phase !== "deal" && guard++ < 50) {
      const actors = e.pendingActors();
      if (actors.length === 0) break;
      for (const id of actors) {
        if (pub(e).phase === "deal") break;
        e.applyAutoMove(id);
      }
    }
    expect(pub(e).phase).toBe("deal");
    e.resolveDeadline();
    expect(pub(e).phase).toBe("pass");
  });
});

describe("frac-index ordering", () => {
  it("keys append in increasing lexicographic order and midpoints land between", () => {
    let prev: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 20; i++) {
      const k = keyBetween(prev, null, true);
      if (prev !== null) expect(k > prev).toBe(true);
      keys.push(k);
      prev = k;
    }
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
    const mid = keyBetween(keys[0], keys[1]);
    expect(mid > keys[0]).toBe(true);
    expect(mid < keys[1]).toBe(true);
  });
});
