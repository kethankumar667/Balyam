import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { rummyHint } from "../coach.js";

/**
 * AI Coach — Rummy.
 *
 * The coach's recommendations come from the bot's own helpers, which have
 * their own tests. What is tested HERE is the part unique to coaching:
 *
 *   - it never advises an illegal or impossible action for the current phase,
 *   - it explains itself (a hint with no `detail` teaches nothing, which is
 *     the entire point of the feature),
 *   - it points at cards the player actually holds.
 *
 * That last one matters most: a hint highlighting a card id that is not in
 * the hand renders as a ring around nothing.
 */

let seq = 0;
function card(rank: Rank, suit: Suit): Card {
  return { id: `c${++seq}_${rank}${suit}`, rank, suit, isPrintedJoker: false };
}

/** A hand with a pure sequence, a set, and loose high cards. */
function mixedHand(): Card[] {
  return [
    card("4", "S"), card("5", "S"), card("6", "S"),   // pure sequence
    card("9", "H"), card("9", "D"), card("9", "C"),   // set
    card("2", "D"), card("7", "C"), card("J", "H"),
    card("K", "D"), card("Q", "C"), card("3", "H"),
    card("8", "S"), card("A", "D"),                    // 14 cards
  ];
}

const WILD: Rank = "7";

describe("rummy coach", () => {
  it("always explains itself", () => {
    const hand = mixedHand();
    for (const turnAction of ["draw", "discardOrDeclare"] as const) {
      const hint = rummyHint({
        hand,
        wildJokerRank: WILD,
        isMyTurn: true,
        turnAction,
        openTop: card("5", "H"),
      });
      expect(hint.headline.length).toBeGreaterThan(0);
      // The teaching half. A recommendation without a reason produces players
      // who follow the button instead of learning the game.
      expect(hint.detail.length).toBeGreaterThan(20);
    }
  });

  it("only ever highlights cards the player is holding", () => {
    const hand = mixedHand();
    const ids = new Set(hand.map((c) => c.id));
    for (const turnAction of ["draw", "discardOrDeclare"] as const) {
      for (const isMyTurn of [true, false]) {
        const hint = rummyHint({
          hand,
          wildJokerRank: WILD,
          isMyTurn,
          turnAction,
          openTop: card("5", "H"),
        });
        for (const id of hint.highlight) {
          expect(ids.has(id), `highlighted ${id}, which is not in hand`).toBe(true);
        }
        for (const group of hint.groups ?? []) {
          for (const id of group) expect(ids.has(id)).toBe(true);
        }
      }
    }
  });

  it("advises a pile during the draw half of the turn", () => {
    const hint = rummyHint({
      hand: mixedHand(),
      wildJokerRank: WILD,
      isMyTurn: true,
      turnAction: "draw",
      openTop: card("3", "S"),
    });
    // Never "discard" while the player still has to draw — following that
    // would be an illegal move and the board would reject it.
    expect(hint.kind).toBe("draw");
  });

  it("recommends taking a card from the open pile when it extends a group", () => {
    const hand = mixedHand();
    const hint = rummyHint({
      hand,
      wildJokerRank: WILD,
      isMyTurn: true,
      turnAction: "draw",
      // 9♠ pairs with the three 9s already held.
      openTop: card("9", "S"),
    });
    expect(hint.headline).toContain("open pile");
  });

  it("falls back to the closed deck when the open pile is empty", () => {
    const hint = rummyHint({
      hand: mixedHand(),
      wildJokerRank: WILD,
      isMyTurn: true,
      turnAction: "draw",
      openTop: null,
    });
    expect(hint.kind).toBe("draw");
    expect(hint.headline).toContain("closed");
  });

  it("suggests a discard the player actually holds", () => {
    const hand = mixedHand();
    const hint = rummyHint({
      hand,
      wildJokerRank: WILD,
      isMyTurn: true,
      turnAction: "discardOrDeclare",
      openTop: null,
    });
    expect(["discard", "declare"]).toContain(hint.kind);
    expect(hint.highlight).toHaveLength(1);
    expect(hand.some((c) => c.id === hint.highlight[0])).toBe(true);
  });

  it("still coaches off-turn, so beginners can plan", () => {
    const hint = rummyHint({
      hand: mixedHand(),
      wildJokerRank: WILD,
      isMyTurn: false,
      turnAction: "draw",
      openTop: card("5", "H"),
    });
    // Off-turn it must not tell you to act — it can only show shape.
    expect(hint.kind).toBe("wait");
    expect(hint.detail.length).toBeGreaterThan(20);
  });

  it("handles an empty hand without throwing", () => {
    const hint = rummyHint({
      hand: [],
      wildJokerRank: WILD,
      isMyTurn: true,
      turnAction: "draw",
      openTop: null,
    });
    expect(hint.kind).toBe("wait");
    expect(hint.highlight).toEqual([]);
  });

  it("names the missing sequence while the hand has no pure run", () => {
    // No three-in-a-row in any suit — the pure-sequence requirement is the
    // single most common thing beginners do not know.
    const hand = [
      card("2", "S"), card("5", "H"), card("9", "D"), card("K", "C"),
      card("4", "D"), card("8", "H"), card("J", "S"), card("3", "C"),
      card("6", "C"), card("T", "H"), card("Q", "D"), card("A", "S"),
      card("9", "S"), card("4", "H"),
    ];
    const hint = rummyHint({
      hand,
      wildJokerRank: WILD,
      isMyTurn: true,
      turnAction: "discardOrDeclare",
      openTop: null,
    });
    expect(hint.detail.toLowerCase()).toContain("pure sequence");
  });
});
