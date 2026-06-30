import { useState } from "react";
import type { Card, Player, RummyChampion, RummyRoundRecap } from "@shared/types";
import { classifyMeld, sortMeldCards } from "../../games/rummy/meldCheck";
import NotebookSheet from "./NotebookSheet";

const SUIT_NAME: Record<Card["suit"], string> = {
  S: "spades",
  H: "hearts",
  D: "diamonds",
  C: "clubs",
};

/** Resolve a player's display name from the recap's own snapshot first (so a
 * later rename/departure doesn't rewrite history), falling back to the live
 * roster for ids the recap didn't carry a name for. */
function nameOf(id: string, recap: RummyRoundRecap, players: Player[]): string {
  return recap.playerNames[id] ?? players.find((p) => p.id === id)?.name ?? "Someone";
}

/** One line of photo-album narration per finished round (docs/rummy/roadmap.md B.2). */
function describeRound(recap: RummyRoundRecap, players: Player[]): string {
  if (recap.endedByDisconnect) {
    return `Round ${recap.roundNumber} — ended early, ${nameOf(recap.endedByDisconnect, recap, players)} stepped away.`;
  }
  if (recap.invalidDeclareBy) {
    return `Round ${recap.roundNumber} — ${nameOf(recap.invalidDeclareBy, recap, players)}'s declare didn't hold up.`;
  }
  if (!recap.winnerId) {
    return `Round ${recap.roundNumber} — no one was left to finish it.`;
  }
  const winnerName = nameOf(recap.winnerId, recap, players);
  const melds = recap.finalMelds[recap.winnerId];
  const hand = recap.finalHands[recap.winnerId];
  if (melds && melds.length > 0 && hand && recap.wildJoker) {
    const handById = new Map(hand.map((c) => [c.id, c] as const));
    for (const group of melds) {
      const cards = group.map((id) => handById.get(id)).filter((c): c is Card => !!c);
      if (cards.length < 3) continue;
      const cls = classifyMeld(cards, recap.wildJoker.rank);
      if (cls.kind === "pureSequence") {
        const sorted = sortMeldCards(cards, recap.wildJoker.rank);
        const ranks = sorted.map((c) => c.rank).join("-");
        return `Round ${recap.roundNumber} — ${winnerName} declared with a pure ${ranks} of ${SUIT_NAME[sorted[0].suit]}.`;
      }
    }
    return `Round ${recap.roundNumber} — ${winnerName} declared and won the round.`;
  }
  return `Round ${recap.roundNumber} — ${winnerName} won when the table folded.`;
}

function ChampionBadge({ champion }: { champion: RummyChampion }) {
  return (
    <div className="text-nostalgia-pen-red text-sm border-b border-dashed border-nostalgia-paper-edge pb-2 mb-2">
      🏆 House Champion: <span className="font-bold">{champion.playerName}</span>{" "}
      <span className="text-xs opacity-70">since {champion.date}</span>
    </div>
  );
}

function HistoryList({
  history,
  champion,
  players,
}: {
  history: RummyRoundRecap[];
  champion: RummyChampion | null;
  players: Player[];
}) {
  const newestFirst = [...history].reverse();
  return (
    <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
      {champion && <ChampionBadge champion={champion} />}
      {newestFirst.length === 0 && <p className="opacity-60 text-sm">No rounds played yet — the first page of the album is blank.</p>}
      {newestFirst.map((r) => (
        <p key={`${r.roundNumber}-${r.ts}`} className="leading-snug">
          {describeRound(r, players)}
        </p>
      ))}
    </div>
  );
}

/**
 * "Photo album" room history (docs/rummy/roadmap.md B.2) — a NotebookSheet
 * scrolling past previous round recaps, oldest-set House Champion badge
 * pinned at the top.
 *
 * Two independent axes, not one "mobile vs desktop" switch:
 *   - `variant: "teaser"` — a collapsed chip that opens its own overlay.
 *     For mounting somewhere with no existing menu/modal affordance
 *     (the lobby header).
 *   - `variant: "panel"` — just the NotebookSheet content, no self-managed
 *     open state. For mounting inside something that already provides the
 *     open/close gesture: the mobile board's hamburger-menu `RummyModal`,
 *     or the desktop board's persistent side rail.
 * `density` forwards to NotebookSheet's own mobile/desktop type-size switch
 * (per AGENTS.md Section 6) independently of which variant is used.
 */
export default function RummyRoomHistory({
  variant,
  density,
  history,
  champion,
  players,
  showTitle = true,
}: {
  variant: "teaser" | "panel";
  density: "mobile" | "desktop";
  history: RummyRoundRecap[];
  champion: RummyChampion | null;
  players: Player[];
  /** Set false when the caller already renders its own "Room History" title (e.g. a RummyModal). */
  showTitle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (history.length === 0 && !champion) return null;

  if (variant === "panel") {
    return (
      <NotebookSheet layout={density} className="w-full">
        {showTitle && <h3 className="font-display text-sm uppercase tracking-wide mb-2 not-italic">Room History</h3>}
        <HistoryList history={history} champion={champion} players={players} />
      </NotebookSheet>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs bg-nostalgia-paper/70 hover:bg-nostalgia-paper text-nostalgia-pen border border-nostalgia-paper-edge rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"
        aria-label="Open room history"
      >
        📖 {champion ? `${champion.playerName} reigns` : `${history.length} round${history.length === 1 ? "" : "s"}`}
      </button>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end" role="dialog" aria-modal="true" aria-label="Room history">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-h-[80vh] overflow-hidden">
            <NotebookSheet layout={density} className="rounded-b-none w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm uppercase tracking-wide not-italic">Room History</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close room history"
                  className="text-nostalgia-pen/70 hover:text-nostalgia-pen text-xs px-2 py-1"
                >
                  Close
                </button>
              </div>
              <HistoryList history={history} champion={champion} players={players} />
            </NotebookSheet>
          </div>
        </div>
      )}
    </>
  );
}
