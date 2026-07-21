import { useState } from "react";
import type { Player, UnoChampion, UnoRoundRecap } from "@shared/types";
import NotebookSheet from "./NotebookSheet";

/** Resolve a player's display name from the recap's own snapshot first (so a
 * later rename/departure doesn't rewrite history), falling back to the live
 * roster for ids the recap didn't carry a name for. */
function nameOf(id: string, recap: UnoRoundRecap, players: Player[]): string {
  return recap.playerNames[id] ?? players.find((p) => p.id === id)?.name ?? "Someone";
}

/** One line of photo-album narration per finished UNO round — same "photo
 * album" idea as Rummy's describeRound, but scored on points banked this
 * round rather than melds (UNO has no melds/wild joker to narrate). */
function describeRound(recap: UnoRoundRecap, index: number, history: UnoRoundRecap[], players: Player[]): string {
  const winnerName = nameOf(recap.winnerId, recap, players);
  const previous = index > 0 ? history[index - 1] : null;
  const before = previous?.scores[recap.winnerId] ?? 0;
  const gained = (recap.scores[recap.winnerId] ?? 0) - before;
  if (gained > 0) {
    return `Round ${recap.roundNumber} — ${winnerName} went out first and banked ${gained} point${gained === 1 ? "" : "s"}.`;
  }
  return `Round ${recap.roundNumber} — ${winnerName} went out first.`;
}

function ChampionBadge({ champion }: { champion: UnoChampion }) {
  return (
    <div className="text-nostalgia-pen-red text-sm border-b border-dashed border-nostalgia-paper-edge pb-2 mb-2">
      🏆 House Champion: <span className="font-bold">{champion.playerName}</span>{" "}
      <span className="text-xs opacity-70">
        since {champion.date} — {champion.finalScore} pts
      </span>
    </div>
  );
}

function HistoryList({
  history,
  champion,
  players,
}: {
  history: UnoRoundRecap[];
  champion: UnoChampion | null;
  players: Player[];
}) {
  const newestFirst = [...history].reverse();
  return (
    <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
      {champion && <ChampionBadge champion={champion} />}
      {newestFirst.length === 0 && <p className="opacity-60 text-sm">No rounds played yet — the first page of the album is blank.</p>}
      {newestFirst.map((r) => {
        const index = history.indexOf(r);
        return (
          <p key={`${r.roundNumber}-${r.ts}`} className="leading-snug">
            {describeRound(r, index, history, players)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * "Photo album" room history for UNO — same NotebookSheet surface and
 * teaser/panel split as RummyRoomHistory (client/src/components/nostalgia/
 * RummyRoomHistory.tsx), re-narrated for UNO's simpler recap shape (no
 * melds/wild joker, just who went out and how many points they banked).
 *
 * Two independent axes, not one "mobile vs desktop" switch:
 *   - `variant: "teaser"` — a collapsed chip that opens its own overlay.
 *     For mounting somewhere with no existing menu/modal affordance.
 *   - `variant: "panel"` — just the NotebookSheet content, no self-managed
 *     open state. For mounting inside something that already provides the
 *     open/close gesture (a rail tab, a modal).
 * `density` forwards to NotebookSheet's own mobile/desktop type-size switch
 * (per AGENTS.md Section 6) independently of which variant is used.
 */
export default function UnoRoomHistory({
  variant,
  density,
  history,
  champion,
  players,
  showTitle = true,
}: {
  variant: "teaser" | "panel";
  density: "mobile" | "desktop";
  history: UnoRoundRecap[];
  champion: UnoChampion | null;
  players: Player[];
  /** Set false when the caller already renders its own "Room History" title. */
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
