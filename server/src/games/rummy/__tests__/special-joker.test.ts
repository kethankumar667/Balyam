import { describe, it, expect, beforeEach } from "vitest";
import type { Card, Player } from "@shared/types.js";
import { RummyEngine } from "../RummyEngine.js";

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

/**
 * The deal is randomised, so re-deal until the seeded open-pile top is a
 * printed joker. There are 4 printed jokers in the 108-card shoe, so a hit
 * arrives within a handful of deals; the generous cap only guards against a
 * pathological RNG run.
 */
function initUntilOpenIsPrintedJoker(engine: RummyEngine): void {
  for (let attempt = 0; attempt < 5000; attempt++) {
    engine.init(makePlayers(2));
    if (engine.getPublicState().topOfOpenPile?.isPrintedJoker) return;
  }
  throw new Error("Could not seed a printed joker onto the open pile");
}

describe("RummyEngine special joker (first-pick rule)", () => {
  let engine: RummyEngine;

  beforeEach(() => {
    engine = new RummyEngine();
  });

  it("flags openJokerDrawable=true when a printed joker is the seeded open card", () => {
    initUntilOpenIsPrintedJoker(engine);
    const s = engine.getPublicState();
    expect(s.topOfOpenPile?.isPrintedJoker).toBe(true);
    expect(s.openJokerDrawable).toBe(true);
  });

  it("lets the first player lift the printed joker off the open pile, then locks it", () => {
    initUntilOpenIsPrintedJoker(engine);
    const before = engine.getPublicState();
    const p0 = before.turnPlayerId;
    const joker = before.topOfOpenPile;
    expect(joker?.isPrintedJoker).toBe(true);

    const handBefore = engine.getStateFor(p0).myHand.length;
    const res = engine.applyMove({ playerId: p0, type: "draw", data: { from: "open" } });
    expect(res.ok).toBe(true);

    const after = engine.getStateFor(p0);
    expect(after.myHand.length).toBe(handBefore + 1);
    expect(after.myHand.some((c) => c.id === joker?.id)).toBe(true);
    // The round's first draw is spent — the joker is no longer drawable.
    expect(engine.getPublicState().openJokerDrawable).toBe(false);
  });

  it("clears openJokerDrawable once the round's first draw is taken", () => {
    engine.init(makePlayers(2));
    const p0 = engine.getPublicState().turnPlayerId;
    const res = engine.applyMove({ playerId: p0, type: "draw", data: { from: "closed" } });
    expect(res.ok).toBe(true);
    expect(engine.getPublicState().openJokerDrawable).toBe(false);
  });

  it("rejects lifting a printed joker discarded after the first draw", () => {
    // Seed a deal where p0 holds a printed joker AND the open card is NOT a
    // printed joker, so the joker only reaches the pile via p0's discard
    // (after the round's first draw is already spent).
    let p0 = "";
    let pj: Card | undefined;
    for (let attempt = 0; attempt < 5000; attempt++) {
      engine.init(makePlayers(2));
      p0 = engine.getPublicState().turnPlayerId;
      if (engine.getPublicState().topOfOpenPile?.isPrintedJoker) continue;
      pj = engine.getStateFor(p0).myHand.find((c) => c.isPrintedJoker);
      if (pj) break;
    }
    if (!pj) throw new Error("Could not seed a printed joker into p0's hand");

    // p0 draws from the closed deck (spends the first draw), then discards
    // the printed joker onto the open pile.
    expect(engine.applyMove({ playerId: p0, type: "draw", data: { from: "closed" } }).ok).toBe(true);
    expect(engine.applyMove({ playerId: p0, type: "discard", data: { cardId: pj.id } }).ok).toBe(true);

    const mid = engine.getPublicState();
    expect(mid.topOfOpenPile?.id).toBe(pj.id);
    expect(mid.openJokerDrawable).toBe(false);

    const p1 = mid.turnPlayerId;
    expect(p1).not.toBe(p0);
    const res = engine.applyMove({ playerId: p1, type: "draw", data: { from: "open" } });
    expect(res.ok).toBe(false);
  });
});
