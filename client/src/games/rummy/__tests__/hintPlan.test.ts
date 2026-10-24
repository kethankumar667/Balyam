import { describe, expect, it } from "vitest";
import type { Card, CoachHint, Rank, Suit } from "@shared/types";
import { hasPlan, planFromHint } from "../hintPlan";

/**
 * Approving a hint rearranges the player's hand, so the plan has to be exactly the hand: every card in
 * exactly one place, the just-drawn open card kept apart when it can be, and a refusal (not a broken table)
 * when the hand has changed since the hint was asked for.
 */

const card = (id: string, rank: Rank, suit: Suit): Card => ({ id, rank, suit });
const handOf = (cards: Card[]): Map<string, Card> => new Map(cards.map((c) => [c.id, c]));

const A = card("a", "4", "S");
const B = card("b", "5", "S");
const C = card("c", "6", "S");
const D = card("d", "K", "H");
const E = card("e", "2", "C");
const hand = handOf([A, B, C, D, E]);

const hintOf = (over: Partial<CoachHint>): CoachHint => ({ kind: "discard", headline: "h", detail: "d", highlight: [], ...over });

describe("planFromHint", () => {
  it("lays out the coach's groups and leaves every other card in the ungrouped pile", () => {
    const plan = planFromHint(hintOf({ groups: [["a", "b", "c"]], action: { type: "discard", cardId: "d" } }), hand, null);

    expect(plan.groups.map((g) => g.map((c) => c.id))).toEqual([["a", "b", "c"]]);
    expect(plan.ungrouped.map((c) => c.id).sort()).toEqual(["d", "e"]);
    expect(plan.discard?.id).toBe("d");
    expect(plan.stale).toBe(false);
  });

  it("accounts for every card in the hand exactly once", () => {
    const plan = planFromHint(hintOf({ groups: [["a", "b", "c"]], action: { type: "discard", cardId: "d" } }), hand, "e");

    const placed = [...plan.groups.flat(), ...plan.ungrouped, ...(plan.openPickup ? [plan.openPickup] : [])].map((c) => c.id);
    expect(placed.sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("keeps the just-drawn open card apart when it is not in a suggested group", () => {
    const plan = planFromHint(hintOf({ groups: [["a", "b", "c"]] }), hand, "e");

    expect(plan.openPickup?.id).toBe("e");
    expect(plan.pickupInGroup).toBe(false);
    expect(plan.ungrouped.map((c) => c.id)).not.toContain("e");
  });

  it("lets the just-drawn card sit in a suggested group when that is what completes it", () => {
    const plan = planFromHint(hintOf({ groups: [["a", "b", "c"]] }), hand, "c");

    expect(plan.openPickup).toBeNull();
    expect(plan.pickupInGroup).toBe(true);
  });

  it("reads the card to throw from a declare as well as from a discard", () => {
    const plan = planFromHint(
      hintOf({ kind: "declare", groups: [["a", "b", "c"]], action: { type: "declare", discardCardId: "e", melds: [["a", "b", "c"]] } }),
      hand,
      null,
    );

    expect(plan.discard?.id).toBe("e");
  });

  it("refuses a hint that names a card the player no longer holds", () => {
    const gone = planFromHint(hintOf({ groups: [["a", "b", "zz"]] }), hand, null);
    const goneDiscard = planFromHint(hintOf({ action: { type: "discard", cardId: "zz" } }), hand, null);

    expect(gone.stale).toBe(true);
    expect(goneDiscard.stale).toBe(true);
    expect(hasPlan(gone)).toBe(false);
  });

  it("has nothing to apply for a hint that names no groups and no card", () => {
    const plan = planFromHint(hintOf({ kind: "draw", action: { type: "draw", from: "closed" } }), hand, null);

    expect(hasPlan(plan)).toBe(false);
  });
});
