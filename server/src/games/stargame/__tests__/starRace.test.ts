import { describe, it, expect } from "vitest";
import type { Player, StarPlayerView } from "@shared/types.js";
import { STAR_THEMES } from "@shared/star-themes.js";
import { StarGameEngine } from "../StarGameEngine.js";

/**
 * The STAR moment and the hand-stack race — the two reflex phases where the
 * round is actually won, and the ones a UI-driven test can never reliably
 * reach (four-of-a-kind needs several full relay laps, so bots rarely converge
 * inside a test window). Driven at the engine instead: deterministic, and it
 * pins the rules the client's three-state star is built on.
 *
 * Rules under test:
 *   1. The star is claimable ONLY by a seat holding four of a kind.
 *   2. Claiming it opens the hand-stack race to everyone else.
 *   3. That race is fastest-first: arrival order sets rank, rank sets points.
 */

const COLORS = STAR_THEMES[0].values;

/**
 * Seeded LCG — deterministic but VARYING.
 *
 * A constant rng (`() => 0.42`) is not usable here: bots pick their pass with
 * `hand[floor(rng() * len)]`, so a fixed value makes every seat forward the
 * same slot forever and the relay cycles without ever forming four of a kind.
 * The test hung at 400 steps until this was replaced.
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

function newGame(n: number, seed = 12345): StarGameEngine {
  const e = new StarGameEngine();
  e.setRng(lcg(seed));
  e.setOptions({ themeId: "colors", totalRounds: 1, passSpeed: "normal" });
  e.init(
    Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      isHost: i === 0,
      isReady: true,
      isConnected: true,
      isBot: false,
    })) as Player[],
  );
  for (let i = 0; i < n; i++) {
    e.applyMove({ playerId: `p${i}`, type: "selectValue", data: { value: COLORS[i] } });
  }
  e.applyMove({ playerId: e.getPublicState().starterId!, type: "shuffle" });
  if (e.getPublicState().phase === "deal") e.resolveDeadline();
  return e;
}

const handOf = (e: StarGameEngine, pid: string) =>
  ((e.getStateFor(pid) as StarPlayerView).myHand ?? []).map((c) => c.value);

/** Relay until SOMEBODY holds four of a kind and the engine opens the star. */
function passUntilStar(e: StarGameEngine, maxSteps = 400): boolean {
  for (let i = 0; i < maxSteps; i++) {
    if (e.getPublicState().phase === "star") return true;
    const actor = e.pendingActors()[0];
    if (!actor) return false;
    e.applyAutoMove(actor);
  }
  return e.getPublicState().phase === "star";
}

describe("StarGameEngine — the STAR moment and the hand-stack race", () => {
  it("reaches the STAR phase, and only four-of-a-kind holders may claim it", () => {
    const e = newGame(4);
    expect(passUntilStar(e)).toBe(true);

    const eligible = e.pendingActors();
    expect(eligible.length).toBeGreaterThan(0);

    // Every eligible seat really does hold four identical chits.
    for (const pid of eligible) {
      const h = handOf(e, pid);
      expect(h).toHaveLength(4);
      expect(new Set(h).size).toBe(1);
    }

    // Anyone NOT holding four is refused, even though the phase is open.
    const ineligible = ["p0", "p1", "p2", "p3"].filter((p) => !eligible.includes(p));
    for (const pid of ineligible) {
      const r = e.applyMove({ playerId: pid, type: "pressStar" });
      expect(r.ok).toBe(false);
    }
    expect(e.getPublicState().phase).toBe("star");
  });

  it("claiming the star opens the hand-stack race to everyone else", () => {
    const e = newGame(4);
    expect(passUntilStar(e)).toBe(true);
    const winner = e.pendingActors()[0]!;
    expect(e.applyMove({ playerId: winner, type: "pressStar" }).ok).toBe(true);

    const pub = e.getPublicState();
    expect(pub.phase).toBe("handstack");
    expect(pub.starWinnerId).toBe(winner);
    // The winner is done; everyone else now has something to do.
    expect(e.pendingActors()).not.toContain(winner);
    expect(e.pendingActors().length).toBe(3);
    // And the winner cannot also stack.
    expect(e.applyMove({ playerId: winner, type: "placeHand" }).ok).toBe(false);
  });

  it("is fastest-fingers-first: arrival order sets rank, rank sets points", () => {
    const e = newGame(4);
    expect(passUntilStar(e)).toBe(true);
    const winner = e.pendingActors()[0]!;
    e.applyMove({ playerId: winner, type: "pressStar" });

    // Stack in a deliberate order — the LAST to react should score lowest.
    const others = ["p0", "p1", "p2", "p3"].filter((p) => p !== winner);
    for (const pid of others) {
      expect(e.applyMove({ playerId: pid, type: "placeHand" }).ok).toBe(true);
    }

    const res = e.getPublicState().lastResult!;
    expect(res.order).toEqual([winner, ...others]);
    // 10 - rank, floored at 1.
    expect(res.points[winner]).toBe(10);
    expect(res.points[others[0]]).toBe(9);
    expect(res.points[others[1]]).toBe(8);
    expect(res.points[others[2]]).toBe(7);
    // Strictly decreasing: reacting sooner is always worth more.
    const pts = res.order.map((p) => res.points[p]);
    for (let i = 1; i < pts.length; i++) expect(pts[i]).toBeLessThan(pts[i - 1]);
  });

  it("a seat cannot stack twice to farm rank", () => {
    const e = newGame(4);
    expect(passUntilStar(e)).toBe(true);
    const winner = e.pendingActors()[0]!;
    e.applyMove({ playerId: winner, type: "pressStar" });
    const first = e.pendingActors()[0]!;
    expect(e.applyMove({ playerId: first, type: "placeHand" }).ok).toBe(true);
    expect(e.applyMove({ playerId: first, type: "placeHand" }).ok).toBe(false);
  });
});
