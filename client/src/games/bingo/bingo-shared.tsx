import type { BingoBoard, BingoLetter, BingoPattern, BingoWinner } from "@shared/types";
import RematchPanel from "../../components/RematchPanel";
import type { Player } from "@shared/types";

/**
 * Shared visual kit for the Bingo mobile/desktop shells — the equivalent of
 * star-shared.tsx / uno-shared.tsx for this game. Pure presentational
 * pieces; all state and socket emits live in useBingoBoard.ts.
 */

/** B-I-N-G-O column accent colors, used for the caller ball, column
 * headers, and the called-number chips so a value's column reads at a
 * glance without needing the letter spelled out every time. */
export const COLUMN_COLORS: Record<BingoLetter, { bg: string; text: string; ring: string }> = {
  B: { bg: "#1976D2", text: "#FFFFFF", ring: "#0D47A1" },
  I: { bg: "#00897B", text: "#FFFFFF", ring: "#004D40" },
  N: { bg: "#E4B128", text: "#3B2607", ring: "#6D4323" },
  G: { bg: "#8E24AA", text: "#FFFFFF", ring: "#4A148C" },
  O: { bg: "#E53935", text: "#FFFFFF", ring: "#7B1E2B" },
};

export const PATTERN_LABELS: Record<BingoPattern, string> = {
  row0: "Row 1",
  row1: "Row 2",
  row2: "Row 3",
  row3: "Row 4",
  row4: "Row 5",
  col0: "Column B",
  col1: "Column I",
  col2: "Column N",
  col3: "Column G",
  col4: "Column O",
  diagTL: "Diagonal",
  diagTR: "Diagonal",
  fourCorners: "Four Corners",
  fullHouse: "Full House",
};

/** 5x5 board grid. `size` scales cell dimensions for mobile vs desktop. */
export function BingoGrid({
  board,
  size = "md",
}: {
  board: BingoBoard;
  size?: "sm" | "md" | "lg";
}) {
  const cellClass =
    size === "lg"
      ? "h-14 w-14 sm:h-16 sm:w-16 text-base sm:text-lg"
      : size === "sm"
        ? "h-11 w-11 text-[13px]"
        : "h-12 w-12 sm:h-14 sm:w-14 text-sm sm:text-base";

  return (
    <div className="inline-grid grid-cols-5 gap-1 sm:gap-1.5 rounded-2xl bg-bhalyam-cream/90 p-2 sm:p-3 border-2 border-bhalyam-wood/30 shadow-lg">
      {(["B", "I", "N", "G", "O"] as BingoLetter[]).map((l) => (
        <div
          key={l}
          className={`${cellClass} flex items-center justify-center rounded-lg font-black tracking-wide`}
          style={{ backgroundColor: COLUMN_COLORS[l].bg, color: COLUMN_COLORS[l].text }}
        >
          {l}
        </div>
      ))}
      {board.map((cell) => (
        <div
          key={cell.index}
          className={`${cellClass} flex items-center justify-center rounded-lg font-bold tabular-nums border-2 transition-colors duration-200 ${
            cell.free
              ? "bg-bhalyam-gold/90 border-bhalyam-gold-dark text-bhalyam-wood-dark"
              : cell.marked
                ? "bg-emerald-500/90 border-emerald-700 text-white scale-[1.03]"
                : "bg-white border-bhalyam-wood/20 text-bhalyam-wood-dark"
          }`}
        >
          {cell.free ? "★" : cell.value}
        </div>
      ))}
    </div>
  );
}

/** Large "current call" display — the caller's voice. */
export function CallerBall({
  current,
  secondsLeft,
}: {
  current: { value: number; letter: BingoLetter } | null;
  secondsLeft: number | null;
}) {
  const colors = current ? COLUMN_COLORS[current.letter] : null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-4 font-black shadow-xl transition-transform duration-150"
        style={{
          backgroundColor: colors?.bg ?? "#F7E8C4",
          borderColor: colors?.ring ?? "#6D4323",
          color: colors?.text ?? "#6D4323",
        }}
      >
        {current ? (
          <span className="text-xl sm:text-2xl leading-none tabular-nums">
            {current.letter}
            <br />
            {current.value}
          </span>
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">
            Get ready…
          </span>
        )}
      </div>
      {secondsLeft != null && (
        <span className="text-[11px] font-semibold text-bhalyam-wood-dark/70 tabular-nums">
          next in {secondsLeft}s
        </span>
      )}
    </div>
  );
}

/** Recent calls, most recent first. `max` caps the DOM size for perf. */
export function CalledHistoryStrip({
  calledNumbers,
  orientation = "row",
  max = 15,
}: {
  calledNumbers: { value: number; letter: BingoLetter; order: number }[];
  orientation?: "row" | "col";
  max?: number;
}) {
  const recent = [...calledNumbers].slice(-max).reverse();
  if (recent.length === 0) {
    return (
      <div className="text-[11px] text-bhalyam-wood-dark/60 italic px-1">
        No numbers called yet
      </div>
    );
  }
  return (
    <div
      className={
        orientation === "row"
          ? "flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          : "flex flex-col gap-1.5 overflow-y-auto max-h-full pr-1"
      }
    >
      {recent.map((c) => (
        <div
          key={c.order}
          className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold tabular-nums border-2"
          style={{
            backgroundColor: COLUMN_COLORS[c.letter].bg,
            color: COLUMN_COLORS[c.letter].text,
            borderColor: COLUMN_COLORS[c.letter].ring,
            opacity: c === recent[0] ? 1 : 0.75,
          }}
          title={`${c.letter}-${c.value}`}
        >
          {c.value}
        </div>
      ))}
    </div>
  );
}

/** Sticky/inline primary action — full width on mobile, inline on desktop. */
export function ClaimButton({
  onClaim,
  disabled,
  className,
}: {
  onClaim: () => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClaim}
      disabled={disabled}
      className={
        "min-h-[44px] rounded-xl px-6 py-3 font-black uppercase tracking-wide text-white shadow-lg transition-all " +
        "bg-gradient-to-b from-[#E53935] to-[#7B1E2B] active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 " +
        (className ?? "")
      }
    >
      Claim BINGO!
    </button>
  );
}

export interface BingoSeat {
  id: string;
  name: string;
  markedCount: number;
  hasWon: boolean;
  isBot: boolean;
  isConnected: boolean;
  isSelf: boolean;
}

/** Opponent/self progress list — how far along everyone's board is. */
export function PlayerProgressList({ seats }: { seats: BingoSeat[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {seats.map((s) => (
        <div
          key={s.id}
          className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12px] ${
            s.isSelf ? "bg-bhalyam-gold/20 font-bold" : "bg-white/50"
          } ${!s.isConnected ? "opacity-50" : ""}`}
        >
          <span className="truncate flex items-center gap-1">
            {s.name}
            {s.isBot && <span className="text-[9px] uppercase text-bhalyam-wood-dark/50">bot</span>}
            {s.hasWon && <span title="Won">🏆</span>}
          </span>
          <span className="tabular-nums text-bhalyam-wood-dark/70">{s.markedCount}/25</span>
        </div>
      ))}
    </div>
  );
}

/** Fixed full-screen result overlay once the round finishes. */
export function BingoResultOverlay({
  winners,
  stopOnFirstWin,
  nameOf,
  selfId,
  players,
  calledCount,
  onLeave,
  onContinue,
}: {
  winners: BingoWinner[];
  stopOnFirstWin: boolean;
  nameOf: (id: string) => string;
  selfId: string | null;
  players: Player[];
  calledCount: number;
  onLeave: () => void;
  onContinue: () => void;
}) {
  const iWon = winners.some((w) => w.playerId === selfId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-bhalyam-cream p-5 shadow-2xl border-2 border-bhalyam-gold/50 max-h-[85vh] overflow-y-auto">
        <h2 className="text-center text-2xl font-black text-bhalyam-wood-dark mb-1">
          {winners.length === 0 ? "No BINGO this round" : iWon ? "You won! 🎉" : "BINGO!"}
        </h2>
        <p className="text-center text-[12px] text-bhalyam-wood-dark/60 mb-4">
          {calledCount} numbers called
          {!stopOnFirstWin && winners.length > 1 ? ` — ${winners.length} winners` : ""}
        </p>

        {winners.length === 0 ? (
          <p className="text-center text-sm text-bhalyam-wood-dark/70 mb-4">
            The pool ran out before anyone completed a pattern. Tough round!
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5 mb-4">
            {winners.map((w, i) => (
              <li
                key={w.playerId}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  w.playerId === selfId ? "bg-bhalyam-gold/25 font-bold" : "bg-white/60"
                }`}
              >
                <span>
                  {i + 1}. {nameOf(w.playerId)}
                </span>
                <span className="text-[11px] text-bhalyam-wood-dark/60">
                  {PATTERN_LABELS[w.pattern]}
                </span>
              </li>
            ))}
          </ol>
        )}

        <RematchPanel players={players} selfId={selfId} className="mb-3" />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 min-h-[44px] rounded-xl border-2 border-bhalyam-wood/30 bg-white/60 py-2.5 font-semibold text-bhalyam-wood-dark"
          >
            Leave room
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 min-h-[44px] rounded-xl bg-bhalyam-gold py-2.5 font-bold text-bhalyam-wood-dark"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
