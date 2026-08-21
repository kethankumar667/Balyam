import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "@shared/types";

interface MeldGroup {
  id: string;
  cardIds: string[];
}

interface Layout {
  groups: MeldGroup[];
  ungrouped: string[];
}

/**
 * Simulates the client-side layout reconciliation logic used in
 * RummyBoardDesktop.tsx and RummyBoardMobile.tsx.
 */
function reconcileHandLayout(
  prevLayout: Layout,
  incomingHand: Card[],
  options: {
    isFromOpenDeck?: boolean;
    prevOpenTopId?: string | null;
  } = {}
): Layout {
  const handIds = new Set(incomingHand.map((c) => c.id));
  const byId = new Map(incomingHand.map((c) => [c.id, c]));
  const MAX_GROUPS = 7;
  let nextGroupId = 100;
  const newGroupId = () => `group_${nextGroupId++}`;

  const known = new Set<string>(prevLayout.groups.flatMap((g) => g.cardIds));
  const filteredGroups = prevLayout.groups
    .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => handIds.has(id)) }))
    .filter((g) => g.cardIds.length > 0);

  const incoming = incomingHand.map((c) => c.id).filter((id) => !known.has(id));
  if (incoming.length === 0) {
    return { groups: filteredGroups, ungrouped: [] };
  }

  const newGroups = filteredGroups.map((g) => ({ ...g, cardIds: [...g.cardIds] }));

  for (const id of incoming) {
    const card = byId.get(id);
    if (!card) continue;

    const isFromOpen =
      options.isFromOpenDeck === true ||
      (options.prevOpenTopId !== undefined &&
        options.prevOpenTopId !== null &&
        id === options.prevOpenTopId);

    if (isFromOpen) {
      // RULE: Any card picked from Open Deck enters a NEW MELD ONLY
      newGroups.push({ id: newGroupId(), cardIds: [id] });
      continue;
    }

    // Closed deck draw: can align with matching suit group or create new group
    const matchingGroup = newGroups.find((g) => {
      const firstCard = byId.get(g.cardIds[0]);
      return firstCard && firstCard.suit === card.suit;
    });
    if (matchingGroup) {
      matchingGroup.cardIds.push(id);
    } else if (newGroups.length < MAX_GROUPS) {
      newGroups.push({ id: newGroupId(), cardIds: [id] });
    } else if (newGroups.length > 0) {
      newGroups[0].cardIds.push(id);
    }
  }

  return { groups: newGroups, ungrouped: [] };
}

describe("Rummy Open-Deck Pickup Rule Enforcement", () => {
  const c = (id: string, rank: Rank, suit: Suit): Card => ({
    id,
    rank,
    suit,
    isPrintedJoker: false,
  });

  it("places an open-deck card into a dedicated new meld, NOT into a pure sequence of matching suit", () => {
    // Player has a pure sequence: 4S, 5S, 6S in group_1
    const initialLayout: Layout = {
      groups: [{ id: "group_1", cardIds: ["c_4s", "c_5s", "c_6s"] }],
      ungrouped: [],
    };

    // Open deck card is 7S (would normally match suit and merge)
    const openCard = c("c_7s", "7", "S");
    const updatedHand = [
      c("c_4s", "4", "S"),
      c("c_5s", "5", "S"),
      c("c_6s", "6", "S"),
      openCard,
    ];

    const result = reconcileHandLayout(initialLayout, updatedHand, {
      isFromOpenDeck: true,
      prevOpenTopId: "c_7s",
    });

    // Verification:
    // Group 1 must remain untouched with exactly 3 cards [4S, 5S, 6S]
    expect(result.groups[0].cardIds).toEqual(["c_4s", "c_5s", "c_6s"]);
    // A new group (group 2) must be created containing exclusively the open card [7S]
    expect(result.groups.length).toBe(2);
    expect(result.groups[1].cardIds).toEqual(["c_7s"]);
  });

  it("places an open-deck wild joker into a dedicated new meld, NOT into an impure sequence", () => {
    const initialLayout: Layout = {
      groups: [
        { id: "group_1", cardIds: ["c_4h", "c_5h", "c_6h"] },
        { id: "group_2", cardIds: ["c_8d", "c_9d"] }, // waiting for wild or 10D
      ],
      ungrouped: [],
    };

    const openJoker = c("c_joker_2c", "2", "C"); // Wild is 2
    const updatedHand = [
      c("c_4h", "4", "H"),
      c("c_5h", "5", "H"),
      c("c_6h", "6", "H"),
      c("c_8d", "8", "D"),
      c("c_9d", "9", "D"),
      openJoker,
    ];

    const result = reconcileHandLayout(initialLayout, updatedHand, {
      isFromOpenDeck: true,
      prevOpenTopId: "c_joker_2c",
    });

    expect(result.groups.length).toBe(3);
    expect(result.groups[0].cardIds).toEqual(["c_4h", "c_5h", "c_6h"]);
    expect(result.groups[1].cardIds).toEqual(["c_8d", "c_9d"]);
    expect(result.groups[2].cardIds).toEqual(["c_joker_2c"]);
  });

  it("places an open-deck card into a new meld even if it matches an existing 3-of-a-kind set", () => {
    const initialLayout: Layout = {
      groups: [{ id: "set_kings", cardIds: ["c_ks", "c_kh", "c_kd"] }],
      ungrouped: [],
    };

    const openKing = c("c_kc", "K", "C");
    const updatedHand = [
      c("c_ks", "K", "S"),
      c("c_kh", "K", "H"),
      c("c_kd", "K", "D"),
      openKing,
    ];

    const result = reconcileHandLayout(initialLayout, updatedHand, {
      isFromOpenDeck: true,
    });

    expect(result.groups.length).toBe(2);
    expect(result.groups[0].cardIds).toEqual(["c_ks", "c_kh", "c_kd"]);
    expect(result.groups[1].cardIds).toEqual(["c_kc"]);
  });

  it("allows player to manually reorganize or group the open-deck card after pickup", () => {
    const layoutAfterPickup: Layout = {
      groups: [
        { id: "group_1", cardIds: ["c_4s", "c_5s", "c_6s"] },
        { id: "group_2", cardIds: ["c_7s"] },
      ],
      ungrouped: [],
    };

    // Manual action: player drags 7S into group_1
    const manualLayout: Layout = {
      groups: [
        { id: "group_1", cardIds: ["c_4s", "c_5s", "c_6s", "c_7s"] },
      ],
      ungrouped: [],
    };

    const currentHand = [
      c("c_4s", "4", "S"),
      c("c_5s", "5", "S"),
      c("c_6s", "6", "S"),
      c("c_7s", "7", "S"),
    ];

    // Subsequent re-render with identical hand preserves manual grouping
    const stableResult = reconcileHandLayout(manualLayout, currentHand);
    expect(stableResult.groups.length).toBe(1);
    expect(stableResult.groups[0].cardIds).toEqual(["c_4s", "c_5s", "c_6s", "c_7s"]);
  });
});
