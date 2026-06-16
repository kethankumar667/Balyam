import type { Card, Rank } from "@shared/types";

const RANK_DISPLAY: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];

interface Props {
  myHand: Card[];
  openPile: Card[];
  wildJokerRank: Rank;
  /** Number of decks in play. Standard Indian Rummy = 2. */
  decks?: number;
}

/**
 * Shows how many of each rank have been seen so far (mine + discard pile).
 * Helps players track which cards are still "live" in the closed deck + opponents' hands.
 */
export default function CardTracker({ myHand, openPile, wildJokerRank, decks = 2 }: Props) {
  // Total of each rank in the deck = 4 suits × N decks.
  const totalPerRank = 4 * decks;

  // Count what's already visible to us.
  const seen: Record<Rank, number> = Object.fromEntries(RANK_DISPLAY.map((r) => [r, 0])) as Record<Rank, number>;
  for (const c of myHand) seen[c.rank] += 1;
  for (const c of openPile) seen[c.rank] += 1;

  return (
    <div
      className="rounded-lg p-2 text-xs"
      style={{
        background: "rgba(0,0,0,0.32)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-emerald-100">
          Card Tracker
        </div>
        <div className="text-[10px] text-emerald-300/70">
          🃏 wild: <span className="font-bold text-amber-300">{wildJokerRank}</span> ·
          <span className="ml-1">discard pile: {openPile.length}</span>
        </div>
      </div>
      <div
        className="grid gap-0.5 sm:gap-1"
        style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      >
        {RANK_DISPLAY.map((r) => {
          const used = seen[r];
          const remaining = Math.max(0, totalPerRank - used);
          const isWild = r === wildJokerRank;
          const colorIntensity = remaining === 0 ? 0 : remaining / totalPerRank;
          const bg = isWild
            ? "linear-gradient(135deg, #fbbf24, #f97316)"
            : `rgba(16,185,129,${0.15 + colorIntensity * 0.45})`;
          return (
            <div
              key={r}
              className="rounded text-center px-0.5 sm:px-1 py-1 flex flex-col items-center justify-center min-w-0"
              style={{
                background: bg,
                color: isWild ? "#0f172a" : remaining === 0 ? "#94a3b8" : "#ecfdf5",
                border: isWild ? "1px solid #92400e" : "1px solid rgba(255,255,255,0.08)",
                opacity: remaining === 0 ? 0.5 : 1,
              }}
              title={isWild ? `${r} (Wild Joker)` : `${r}: ${used} seen, ${remaining} live`}
            >
              <span className="text-[9px] sm:text-[10px] font-extrabold leading-none">{r === "T" ? "10" : r}</span>
              <span className="text-[9px] tabular-nums leading-none mt-0.5 font-bold">
                {remaining}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-emerald-300/70 mt-1.5 px-1">
        Number = cards still live (out of {totalPerRank}). Dim cells are exhausted.
      </div>
    </div>
  );
}
