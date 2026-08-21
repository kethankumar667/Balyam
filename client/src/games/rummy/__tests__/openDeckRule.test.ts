import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "@shared/types";
import { freshMeldLayout, appendIncomingCards, type MeldGroup } from "../reconcileLayout";

/**
 * Exercises the REAL production functions imported from
 * `../reconcileLayout` (used by both RummyBoardDesktop.tsx and
 * RummyBoardMobile.tsx) — not a re-implementation. A regression in the
 * actual reconciliation logic fails this suite directly.
 *
 * The open-deck placement rule is now driven by
 * `state.lastDrawnCardId`/`state.lastDrawSource` — a server-authoritative
 * per-viewer field (see RummyEngine.ts's `lastDraw`) — rather than a
 * client-side ref. The `openPickupId` parameter these tests pass in is
 * exactly what each board derives from that state before calling into
 * this module: `state.lastDrawSource === "open" && handSet.has(state.lastDrawnCardId)
 * ? state.lastDrawnCardId : null`. Unlike a ref, this signal is correct
 * from the very first render after a remount — a page refresh, a
 * reconnect, or the board swapping between Desktop/Mobile at a viewport
 * breakpoint — which is exactly the class of bug (the open card silently
 * landing in an existing meld after any of those) this rewrite closes.
 */
describe("Rummy Open-Deck Pickup Rule Enforcement (real reconcileLayout module)", () => {
  const c = (id: string, rank: Rank, suit: Suit): Card => ({
    id,
    rank,
    suit,
    isPrintedJoker: false,
  });
  let n = 100;
  const testGroupId = () => `group_${n++}`;

  it("appendIncomingCards: places an open-deck card into a dedicated new meld, NOT into a pure sequence of matching suit", () => {
    const groups: MeldGroup[] = [{ id: "group_1", cardIds: ["c_4s", "c_5s", "c_6s"] }];
    const byId = new Map<string, Card>([
      ["c_4s", c("c_4s", "4", "S")],
      ["c_5s", c("c_5s", "5", "S")],
      ["c_6s", c("c_6s", "6", "S")],
      ["c_7s", c("c_7s", "7", "S")],
    ]);

    const result = appendIncomingCards(groups, ["c_7s"], byId, "c_7s", testGroupId);

    expect(result[0].cardIds).toEqual(["c_4s", "c_5s", "c_6s"]);
    expect(result.length).toBe(2);
    expect(result[1].cardIds).toEqual(["c_7s"]);
  });

  it("appendIncomingCards: places an open-deck wild joker into a dedicated new meld, NOT into an impure sequence", () => {
    const groups: MeldGroup[] = [
      { id: "group_1", cardIds: ["c_4h", "c_5h", "c_6h"] },
      { id: "group_2", cardIds: ["c_8d", "c_9d"] }, // waiting for wild or 10D
    ];
    const byId = new Map<string, Card>([
      ["c_4h", c("c_4h", "4", "H")],
      ["c_5h", c("c_5h", "5", "H")],
      ["c_6h", c("c_6h", "6", "H")],
      ["c_8d", c("c_8d", "8", "D")],
      ["c_9d", c("c_9d", "9", "D")],
      ["c_joker_2c", c("c_joker_2c", "2", "C")], // Wild is 2
    ]);

    const result = appendIncomingCards(groups, ["c_joker_2c"], byId, "c_joker_2c", testGroupId);

    expect(result.length).toBe(3);
    expect(result[0].cardIds).toEqual(["c_4h", "c_5h", "c_6h"]);
    expect(result[1].cardIds).toEqual(["c_8d", "c_9d"]);
    expect(result[2].cardIds).toEqual(["c_joker_2c"]);
  });

  it("appendIncomingCards: places an open-deck card into a new meld even if it matches an existing 3-of-a-kind set", () => {
    const groups: MeldGroup[] = [{ id: "set_kings", cardIds: ["c_ks", "c_kh", "c_kd"] }];
    const byId = new Map<string, Card>([
      ["c_ks", c("c_ks", "K", "S")],
      ["c_kh", c("c_kh", "K", "H")],
      ["c_kd", c("c_kd", "K", "D")],
      ["c_kc", c("c_kc", "K", "C")],
    ]);

    const result = appendIncomingCards(groups, ["c_kc"], byId, "c_kc", testGroupId);

    expect(result.length).toBe(2);
    expect(result[0].cardIds).toEqual(["c_ks", "c_kh", "c_kd"]);
    expect(result[1].cardIds).toEqual(["c_kc"]);
  });

  it("appendIncomingCards: a closed-deck draw (openPickupId null) still aligns with a matching-suit group as before", () => {
    const groups: MeldGroup[] = [{ id: "group_1", cardIds: ["c_4s", "c_5s", "c_6s"] }];
    const byId = new Map<string, Card>([
      ["c_4s", c("c_4s", "4", "S")],
      ["c_5s", c("c_5s", "5", "S")],
      ["c_6s", c("c_6s", "6", "S")],
      ["c_7s", c("c_7s", "7", "S")],
    ]);

    const result = appendIncomingCards(groups, ["c_7s"], byId, null, testGroupId);

    expect(result.length).toBe(1);
    expect(result[0].cardIds).toEqual(["c_4s", "c_5s", "c_6s", "c_7s"]);
  });

  it("appendIncomingCards: allows player to manually reorganize the open-deck card after pickup (a later pass with no new incoming ids leaves manual grouping untouched)", () => {
    const manuallyRegrouped: MeldGroup[] = [{ id: "group_1", cardIds: ["c_4s", "c_5s", "c_6s", "c_7s"] }];
    const byId = new Map<string, Card>([
      ["c_4s", c("c_4s", "4", "S")],
      ["c_5s", c("c_5s", "5", "S")],
      ["c_6s", c("c_6s", "6", "S")],
      ["c_7s", c("c_7s", "7", "S")],
    ]);

    // No incoming ids this pass — appendIncomingCards is only ever called
    // with the actual incoming/fresh list, so a no-op pass over an already
    // fully-known hand is simply never invoked by either board; simulating
    // it here with an empty incoming list confirms it's a true no-op.
    const result = appendIncomingCards(manuallyRegrouped, [], byId, null, testGroupId);
    expect(result).toEqual(manuallyRegrouped);
  });

  it("freshMeldLayout: on a fresh mount mid-turn (remount after an open-deck draw), the pickup still gets its own meld instead of joining a suit lane", () => {
    // Simulates the exact bug this rewrite fixes: layout state was lost
    // (page refresh / reconnect / Desktop<->Mobile swap), so the board's
    // "no groups survived" branch runs freshMeldLayout on the WHOLE hand —
    // including a card the player had already drawn from the open pile
    // this turn. Without carving it out, splitBySuit would bucket it
    // straight into the matching-suit lane below.
    const hand: Card[] = [
      c("c_4s", "4", "S"),
      c("c_5s", "5", "S"),
      c("c_6s", "6", "S"),
      c("c_open_7s", "7", "S"), // drawn from open pile this turn
      c("c_kh", "K", "H"),
    ];

    const result = freshMeldLayout(hand, "c_open_7s", testGroupId);

    const openGroup = result.groups.find((g) => g.cardIds.includes("c_open_7s"));
    expect(openGroup?.cardIds).toEqual(["c_open_7s"]);

    const spadeLane = result.groups.find((g) => g.cardIds.includes("c_4s"));
    expect(spadeLane?.cardIds).not.toContain("c_open_7s");
  });

  it("freshMeldLayout: a true initial deal (no pending open-deck pickup) suit-sorts every card, unaffected by this rule", () => {
    const hand: Card[] = [c("c_4s", "4", "S"), c("c_5s", "5", "S"), c("c_kh", "K", "H")];
    const result = freshMeldLayout(hand, null, testGroupId);
    const allIds = result.groups.flatMap((g) => g.cardIds);
    expect(allIds.sort()).toEqual(["c_4s", "c_5s", "c_kh"].sort());
  });
});
