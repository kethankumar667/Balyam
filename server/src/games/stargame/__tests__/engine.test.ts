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

/** Drive shuffle → deal → pass for round 2+, which skips themeSelect
 *  entirely (values are locked in once, for the whole game). */
function reshuffleAndDeal(e: StarGameEngine, n: number): void {
  expect(pub(e).phase).toBe("shuffle");
  for (let i = 0; i < n; i++) {
    e.applyMove({ playerId: `p${i}`, type: "shuffle" });
  }
  expect(pub(e).phase).toBe("deal");
  e.resolveDeadline();
  expect(pub(e).phase).toBe("pass");
}

/**
 * Funnel valuesInPlay[0] toward "p0" one sequential relay step at a time
 * (driven by currentPasserId, matching the real client's one-actor-at-a-time
 * turn), until the STAR phase opens. p0 hoards the target; everyone else
 * shoves any target-valued card they're holding onward. Starter-agnostic —
 * works whichever seat is passOrder[0] for the round.
 */
function driveToStar(e: StarGameEngine, n: number): void {
  let guard = 0;
  while (pub(e).phase === "pass" && guard++ < 40 * n) {
    const target = pub(e).valuesInPlay[0];
    const pid = pub(e).currentPasserId;
    if (!pid) break;
    const hand = view(e, pid).myHand;
    const card =
      pid === "p0"
        ? hand.find((c) => c.value !== target) ?? hand[0] // p0 hoards the target
        : hand.find((c) => c.value === target) ?? hand[0]; // others shove it onward
    e.applyMove({ playerId: pid, type: "selectCard", data: { cardId: card.id } });
    e.applyMove({ playerId: pid, type: "pass" });
  }
}

/** From the "star" phase, presses STAR for the eligible winner then places
 *  every remaining hand in seat order, finishing the round. */
function finishRoundViaStar(e: StarGameEngine, n: number): void {
  expect(pub(e).phase).toBe("star");
  const winner = pub(e).players.find((p) => p.starEligible)!.id;
  e.applyMove({ playerId: winner, type: "pressStar" });
  expect(pub(e).phase).toBe("handstack");
  for (let i = 0; i < n; i++) {
    const pid = `p${i}`;
    if (pid === winner) continue;
    e.applyMove({ playerId: pid, type: "placeHand" });
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

  it("rejects an unowned card and a second pass from the same player out of turn", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    const hand = view(e, "p0").myHand;
    expect(e.applyMove({ playerId: "p0", type: "selectCard", data: { cardId: "nope" } }).ok).toBe(false);
    expect(e.applyMove({ playerId: "p0", type: "selectCard", data: { cardId: hand[0].id } }).ok).toBe(true);
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(true);
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(false); // p0's turn is over — now p1's
  });
});

describe("StarGameEngine — sequential relay pass", () => {
  it("starter rotates by round; passOrder is seatOrder rotated to begin there", () => {
    const e = newEngine(4);
    reachPass(e, 4);
    expect(pub(e).starterId).toBe("p0"); // round 1 -> seatOrder[0]
    expect(pub(e).passOrder).toEqual(["p0", "p1", "p2", "p3"]);
    expect(pub(e).currentPasserId).toBe("p0");
  });

  it("relays one full circulation: 3-card sender, 5-card receivers, everyone back to exactly 4", () => {
    const e = newEngine(4);
    reachPass(e, 4);

    const p0Card = view(e, "p0").myHand[0];
    e.applyMove({ playerId: "p0", type: "selectCard", data: { cardId: p0Card.id } });
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(true);
    expect(view(e, "p0").myHand).toHaveLength(3); // sender temporarily at 3
    expect(view(e, "p1").myHand).toHaveLength(5); // receiver temporarily at 5
    expect(view(e, "p1").myHand.some((c) => c.id === p0Card.id)).toBe(true);
    expect(pub(e).currentPasserId).toBe("p1");
    expect(pub(e).lastPass).toEqual({ fromId: "p0", toId: "p1", cardId: p0Card.id });

    const p1Card = view(e, "p1").myHand[0];
    e.applyMove({ playerId: "p1", type: "selectCard", data: { cardId: p1Card.id } });
    e.applyMove({ playerId: "p1", type: "pass" });
    expect(view(e, "p1").myHand).toHaveLength(4);
    expect(view(e, "p2").myHand).toHaveLength(5);
    expect(pub(e).currentPasserId).toBe("p2");

    const p2Card = view(e, "p2").myHand[0];
    e.applyMove({ playerId: "p2", type: "selectCard", data: { cardId: p2Card.id } });
    e.applyMove({ playerId: "p2", type: "pass" });
    expect(view(e, "p2").myHand).toHaveLength(4);
    expect(view(e, "p3").myHand).toHaveLength(5);
    expect(pub(e).currentPasserId).toBe("p3");

    // Final relay step: p3 passes back to the starter (p0) directly —
    // p0 receives without a choice of their own, closing the loop.
    const p3Card = view(e, "p3").myHand[0];
    e.applyMove({ playerId: "p3", type: "selectCard", data: { cardId: p3Card.id } });
    expect(e.applyMove({ playerId: "p3", type: "pass" }).ok).toBe(true);

    for (let i = 0; i < 4; i++) expect(view(e, `p${i}`).myHand).toHaveLength(4);
    expect(view(e, "p0").myHand.some((c) => c.id === p3Card.id)).toBe(true);
    // A fresh lap starts at the SAME starter (no 4-of-a-kind expected here).
    expect(pub(e).phase).toBe("pass");
    expect(pub(e).currentPasserId).toBe("p0");
  });

  it("enforces strict turn order — only the current passer may select or pass", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    expect(pub(e).currentPasserId).toBe("p0");
    expect(e.applyMove({ playerId: "p1", type: "pass" }).ok).toBe(false);
    expect(
      e.applyMove({ playerId: "p1", type: "selectCard", data: { cardId: view(e, "p1").myHand[0].id } }).ok,
    ).toBe(false);

    const card = view(e, "p0").myHand[0];
    expect(e.applyMove({ playerId: "p0", type: "selectCard", data: { cardId: card.id } }).ok).toBe(true);
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(true);
    expect(pub(e).currentPasserId).toBe("p1");
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(false); // no longer p0's turn
  });

  it("auto-pass (no explicit selectCard) sends the LAST card in hand order, never the first", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    const hand = view(e, "p0").myHand;
    const firstCard = hand[0];
    const lastCard = hand[hand.length - 1];
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(true); // no selectCard first
    expect(view(e, "p1").myHand.some((c) => c.id === lastCard.id)).toBe(true);
    expect(view(e, "p1").myHand.some((c) => c.id === firstCard.id)).toBe(false);
  });

  it("reorderHand changes which card auto-pass sends (the new last card)", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    const hand = view(e, "p0").myHand;
    const reordered = [hand[3].id, hand[2].id, hand[0].id, hand[1].id]; // new last = hand[1]
    expect(e.applyMove({ playerId: "p0", type: "reorderHand", data: { cardIds: reordered } }).ok).toBe(true);
    expect(view(e, "p0").myHand.map((c) => c.id)).toEqual(reordered);
    expect(e.applyMove({ playerId: "p0", type: "pass" }).ok).toBe(true); // auto-pass, no explicit select
    expect(view(e, "p1").myHand.some((c) => c.id === hand[1].id)).toBe(true); // the NEW last card
  });

  it("rejects a reorder that isn't an exact permutation of the current hand", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    const hand = view(e, "p0").myHand;
    expect(
      e.applyMove({ playerId: "p0", type: "reorderHand", data: { cardIds: [hand[0].id, hand[1].id] } }).ok,
    ).toBe(false); // missing cards
    expect(
      e.applyMove({
        playerId: "p0",
        type: "reorderHand",
        data: { cardIds: [hand[0].id, hand[0].id, hand[1].id, hand[2].id] },
      }).ok,
    ).toBe(false); // duplicate
    expect(
      e.applyMove({
        playerId: "p0",
        type: "reorderHand",
        data: { cardIds: ["ghost", hand[1].id, hand[2].id, hand[3].id] },
      }).ok,
    ).toBe(false); // unknown card
    expect(view(e, "p0").myHand.map((c) => c.id)).toEqual(hand.map((c) => c.id)); // untouched
  });
});

describe("StarGameEngine — round starter rotation", () => {
  it("rotates the starter by seating order across successive rounds", () => {
    const e = newEngine(4, { totalRounds: 4 });
    reachPass(e, 4);
    expect(pub(e).round).toBe(1);
    expect(pub(e).starterId).toBe("p0");

    driveToStar(e, 4);
    finishRoundViaStar(e, 4);
    e.applyMove({ playerId: "p0", type: "nextRound" });
    expect(pub(e).round).toBe(2);
    expect(pub(e).starterId).toBe("p1");
    expect(pub(e).passOrder).toEqual(["p1", "p2", "p3", "p0"]);

    reshuffleAndDeal(e, 4);
    driveToStar(e, 4);
    finishRoundViaStar(e, 4);
    e.applyMove({ playerId: "p0", type: "nextRound" });
    expect(pub(e).round).toBe(3);
    expect(pub(e).starterId).toBe("p2");
    expect(pub(e).passOrder).toEqual(["p2", "p3", "p0", "p1"]);
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

  it("getBotThinkDelayMs stays fast (platform default) for star/handstack reflex phases, slow (1.5-4s) elsewhere", () => {
    const e = newEngine(3, { totalRounds: 1 });
    e.setRng(() => 0.9); // deterministic — isolates phase branching, not randomness
    reachPass(e, 3);
    expect(pub(e).phase).toBe("pass");
    expect(e.getBotThinkDelayMs()).toBeCloseTo(1500 + 0.9 * 2500, 5); // 3750 — deliberate-choice pace

    driveToStar(e, 3);
    expect(pub(e).phase).toBe("star");
    expect(e.getBotThinkDelayMs()).toBeCloseTo(1200 + 0.9 * 800, 5); // 1920 — untouched reflex pace

    e.applyMove({ playerId: "p0", type: "pressStar" });
    expect(pub(e).phase).toBe("handstack");
    expect(e.getBotThinkDelayMs()).toBeCloseTo(1200 + 0.9 * 800, 5); // 1920 — untouched reflex pace
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

  it("resolveDeadline forces only the current relay actor's pass, using their last card", () => {
    const e = newEngine(3);
    reachPass(e, 3);
    const hand = view(e, "p0").myHand;
    const lastCard = hand[hand.length - 1];
    e.resolveDeadline();
    expect(view(e, "p1").myHand.some((c) => c.id === lastCard.id)).toBe(true);
    expect(pub(e).currentPasserId).toBe("p1"); // only p0 was forced, not the whole table
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

  it("bots drive the sequential relay one actor at a time via pendingActors/applyAutoMove", () => {
    const e = newEngine(4, {}, true);
    let guard = 0;
    while (pub(e).phase !== "deal" && guard++ < 50) {
      for (const id of e.pendingActors()) e.applyAutoMove(id);
    }
    e.resolveDeadline(); // deal -> pass
    expect(pub(e).phase).toBe("pass");

    guard = 0;
    while (pub(e).phase === "pass" && guard++ < 200) {
      const actors = e.pendingActors();
      expect(actors.length).toBeLessThanOrEqual(1); // exactly one actor pending at a time
      for (const id of actors) e.applyAutoMove(id);
    }
    expect(["star", "pass"]).toContain(pub(e).phase);
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
