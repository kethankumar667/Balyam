import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { rummyHint, type RummyHintInput } from "../coach.js";
import type { AdvisorTable, PublicEvent } from "../advisor/types.js";
import { DEFAULT_TUNING } from "../advisor/tuning.js";

/**
 * AI Coach: Rummy.
 *
 * The decisions are tested where they are made (`advisor/__tests__`). What is tested HERE is the part unique
 * to coaching:
 *
 *   - it never advises an action that is impossible in the current phase,
 *   - it explains itself (a hint with no `detail` teaches nothing, which is the point of the feature),
 *   - it points at cards the player actually holds,
 *   - its machine-readable `action` agrees with its words, so playing the coach and reading it say the same.
 */

let seq = 0;
function card(rank: Rank, suit: Suit): Card {
  return { id: `c${++seq}_${rank}${suit}`, rank, suit, isPrintedJoker: false };
}

const WILD: Rank = "7";
const CUT = card("7", "D");
const ME = "me";

/** 13 cards: a pure sequence, a set, and loose cards. */
function mixedHand(): Card[] {
  return [
    card("4", "S"), card("5", "S"), card("6", "S"),
    card("9", "H"), card("9", "D"), card("9", "C"),
    card("2", "D"), card("J", "H"), card("K", "D"),
    card("Q", "H"), card("3", "H"), card("8", "S"), card("A", "D"),
  ];
}

function input(over: Partial<AdvisorTable> = {}, names: Record<string, string> = { bob: "Bob" }): RummyHintInput {
  return {
    names,
    table: {
      myId: ME,
      hand: mixedHand(),
      wild: WILD,
      cutCard: CUT,
      openPile: [],
      openJokerDrawable: false,
      closedDeckCount: 40,
      phase: "draw",
      log: [],
      opponents: [{ id: "bob", handSize: 13 }],
      mode: "single",
      myTotal: 0,
      poolTarget: null,
      myTurns: 6,
      ...over,
    },
  };
}

/** A discard-phase table: the 13-card hand plus the card just drawn. */
function discardPhase(extra: Card): Partial<AdvisorTable> {
  return { hand: [...mixedHand(), extra], phase: "discard" };
}

describe("rummy coach", () => {
  it("always explains itself", () => {
    const draw = rummyHint(input({ openPile: [card("5", "H")] }));
    const discard = rummyHint(input(discardPhase(card("K", "S"))));

    for (const hint of [draw, discard]) {
      expect(hint.headline.length).toBeGreaterThan(0);
      expect(hint.detail.length).toBeGreaterThan(20);
    }
  });

  it("only ever highlights cards the player is holding", () => {
    for (const phase of ["draw", "discard", "waiting"] as const) {
      const base = phase === "discard" ? discardPhase(card("K", "S")) : { phase };
      const table = input({ ...base, openPile: [card("5", "H")] });
      const ids = new Set(table.table.hand.map((c) => c.id));

      const hint = rummyHint(table);

      for (const id of hint.highlight) expect(ids.has(id), `highlighted ${id}, which is not in hand`).toBe(true);
      for (const group of hint.groups ?? []) for (const id of group) expect(ids.has(id)).toBe(true);
    }
  });

  it("advises a pile during the draw half of the turn, never a discard", () => {
    const hint = rummyHint(input({ openPile: [card("3", "S")] }));

    expect(hint.kind).toBe("draw");
    expect(hint.action?.type).toBe("draw");
  });

  it("recommends the open pile when the card extends a group", () => {
    // J♥ Q♥ are held, so the K♥ completes a pure run, and it is not a joker (the wild rank is 7).
    const hint = rummyHint(input({ openPile: [card("K", "H")] }));

    expect(hint.headline).toContain("open pile");
    expect(hint.action).toEqual({ type: "draw", from: "open" });
  });

  it("falls back to the closed deck when the open pile is empty", () => {
    const hint = rummyHint(input({ openPile: [] }));

    expect(hint.kind).toBe("draw");
    expect(hint.headline).toContain("closed");
    expect(hint.action).toEqual({ type: "draw", from: "closed" });
  });

  it("suggests a discard the player actually holds, and says the same in data and in words", () => {
    const hand = [...mixedHand(), card("K", "S")];
    const hint = rummyHint(input({ hand, phase: "discard" }));

    expect(hint.kind).toBe("discard");
    expect(hint.action?.type).toBe("discard");
    const target = hint.action?.type === "discard" ? hint.action.cardId : "";
    expect(hand.some((c) => c.id === target)).toBe(true);
    expect(hint.highlight).toEqual([target]);
  });

  it("says to declare, with groups the engine will accept, when the hand is complete", () => {
    const hand = [
      card("3", "S"), card("4", "S"), card("5", "S"), card("6", "S"),
      card("3", "H"), card("4", "H"), card("5", "H"),
      card("9", "D"), card("9", "C"), card("9", "H"),
      card("J", "D"), card("J", "C"), card("J", "S"), card("K", "C"),
    ];

    const hint = rummyHint(input({ hand, phase: "discard" }));

    expect(hint.kind).toBe("declare");
    expect(hint.action?.type).toBe("declare");
  });

  it("still coaches off-turn, so beginners can plan", () => {
    const hint = rummyHint(input({ phase: "waiting" }));

    expect(hint.kind).toBe("wait");
    expect(hint.action).toBeUndefined();
    expect(hint.detail.length).toBeGreaterThan(20);
  });

  it("handles an empty hand without throwing", () => {
    const hint = rummyHint(input({ hand: [], phase: "draw" }));

    expect(hint.kind).toBe("wait");
    expect(hint.highlight).toEqual([]);
  });

  it("names the missing sequence while the hand has no pure run", () => {
    const hand = [
      card("2", "S"), card("5", "H"), card("9", "D"), card("K", "C"),
      card("4", "D"), card("8", "H"), card("J", "S"), card("3", "C"),
      card("6", "C"), card("T", "H"), card("Q", "D"), card("A", "S"),
      card("9", "S"), card("4", "H"),
    ];

    const hint = rummyHint(input({ hand, phase: "discard" }));

    expect(hint.detail.toLowerCase()).toContain("pure sequence");
  });

  it("tells the player what an opponent was seen to pick up", () => {
    const picked: PublicEvent = { type: "draw", playerId: "bob", source: "open", card: card("Q", "S") };

    const hint = rummyHint(input({ ...discardPhase(card("K", "S")), log: [picked] }));

    expect(hint.analysis?.reads?.some((line) => line.includes("Bob"))).toBe(true);
  });

  describe("drop advice (off by default, see tuning.ts)", () => {
    const hopeless = [
      card("2", "S"), card("5", "H"), card("9", "D"), card("K", "C"), card("4", "D"), card("8", "H"), card("J", "S"),
      card("3", "C"), card("6", "C"), card("T", "H"), card("Q", "D"), card("A", "S"), card("K", "H"),
    ];
    const rivals = [{ id: "bob", handSize: 13 }, { id: "cat", handSize: 13 }, { id: "dan", handSize: 13 }];
    const dropOn = { ...DEFAULT_TUNING, dropUntilTurn: 2, dropMargin: 5 };

    it("never advises a drop with the shipped settings, however bad the hand", () => {
      expect(rummyHint(input({ hand: hopeless, myTurns: 0, opponents: rivals })).kind).not.toBe("drop");
    });

    it("recommends dropping a hopeless hand on the first turn when switched on, and not a decent one", () => {
      // Two runs and a set, with a pair of jacks one card from a third set: a hand worth playing.
      const strong = [
        card("4", "S"), card("5", "S"), card("6", "S"), card("3", "H"), card("4", "H"), card("5", "H"),
        card("9", "H"), card("9", "D"), card("9", "C"), card("J", "H"), card("J", "D"), card("K", "S"), card("2", "C"),
      ];
      const poor = rummyHint(input({ hand: hopeless, myTurns: 0, opponents: rivals }), dropOn);
      const fine = rummyHint(input({ hand: strong, myTurns: 0 }), dropOn);

      expect(poor.kind).toBe("drop");
      expect(poor.action).toEqual({ type: "drop" });
      expect(fine.kind).not.toBe("drop");
    });

    it("does not advise a drop once the player is well into the round, even when switched on", () => {
      expect(rummyHint(input({ hand: hopeless, myTurns: 7 }), dropOn).kind).toBe("draw");
    });
  });
});
