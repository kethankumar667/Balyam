import { useEffect, useRef, useState } from "react";
import type { RummyPlayerState } from "@shared/types";

/**
 * "What just happened" for the Rummy table.
 *
 * The desktop felt centres four slots in a panel wide enough for roughly twice
 * that, so a third of the table is bare green on either side while the game is
 * running — the single loudest complaint in the desktop review. This turns
 * that space into the thing a card player actually wants there: a running
 * account of the other seats, which is otherwise invisible because opponents'
 * hands are hidden and their turns pass silently.
 *
 * DERIVED, not transported. The server publishes no event stream for Rummy, so
 * rather than add one this reads the deltas already present in every state
 * broadcast:
 *
 *   closedDeckCount ↓   → somebody drew from the deck
 *   openPile ↑          → somebody discarded (and we know exactly what)
 *   openPile ↓          → somebody took the discard
 *   turnPlayerId ≠      → the turn moved
 *
 * That covers every publicly observable action without touching the protocol.
 * Anything genuinely private (which cards they grouped) is absent because it
 * is not knowable, not because it was skipped.
 */

export interface RummyFeedItem {
  id: number;
  text: string;
  /** Drives the accent — "you" reads differently from an opponent's move. */
  tone: "self" | "other" | "table";
}

const MAX_ITEMS = 6;
const SUIT_GLYPH: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

function cardLabel(card: { rank: string; suit: string; isPrintedJoker?: boolean } | null | undefined): string {
  if (!card) return "a card";
  if (card.isPrintedJoker) return "a Joker";
  const rank = card.rank === "T" ? "10" : card.rank;
  return `${rank}${SUIT_GLYPH[card.suit] ?? card.suit}`;
}

export function useRummyFeed(
  state: RummyPlayerState,
  selfId: string | null,
  nameOf: (id: string) => string,
): RummyFeedItem[] {
  const [items, setItems] = useState<RummyFeedItem[]>([]);
  const seq = useRef(0);
  // Previous snapshot. Seeded on first run so the opening deal does not
  // announce itself as thirteen separate draws.
  const prev = useRef<{ deck: number; pile: number; turn: string } | null>(null);

  useEffect(() => {
    const now = {
      deck: state.closedDeckCount,
      pile: state.openPile?.length ?? 0,
      turn: state.turnPlayerId,
    };
    const before = prev.current;
    prev.current = now;
    if (!before) return;

    const next: RummyFeedItem[] = [];
    const push = (text: string, tone: RummyFeedItem["tone"]) => {
      seq.current += 1;
      next.push({ id: seq.current, text, tone });
    };

    // Attribute to whoever was on turn when the change happened — the state
    // that produced this delta, not the one it moved to.
    const actor = before.turn;
    const who = actor === selfId ? "You" : nameOf(actor);
    const tone: RummyFeedItem["tone"] = actor === selfId ? "self" : "other";

    if (now.deck < before.deck) push(`${who} drew from the deck`, tone);
    if (now.pile > before.pile) push(`${who} discarded ${cardLabel(state.topOfOpenPile)}`, tone);
    else if (now.pile < before.pile) push(`${who} took the discard`, tone);

    if (now.turn !== before.turn) {
      const nextWho = now.turn === selfId ? "Your turn" : `${nameOf(now.turn)}'s turn`;
      push(nextWho, "table");
    }

    if (next.length > 0) setItems((cur) => [...next.reverse(), ...cur].slice(0, MAX_ITEMS));
    // Only the observable deltas drive this; `state` identity churns per tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.closedDeckCount, state.openPile?.length, state.turnPlayerId, selfId]);

  return items;
}
