import type { BingoBoard, BingoLetter, BingoPlayerPublic, BingoWinner } from "@shared/types";
import RematchPanel from "../../components/RematchPanel";
import type { Player } from "@shared/types";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";

export const BINGO_LETTERS: BingoLetter[] = ["B", "I", "N", "G", "O"];

/** B-I-N-G-O Letter Header display (B-I-N-G-O strikeout letters) */
export function BingoLetterBanner({
  completedLetters = [],
}: {
  completedLetters?: BingoLetter[];
}) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
      {BINGO_LETTERS.map((letter) => {
        const isStruck = completedLetters.includes(letter);
        return (
          <div
            key={letter}
            className={`relative flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl font-black text-xl sm:text-2xl transition-all duration-300 shadow-md ${
              isStruck
                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white scale-110 ring-4 ring-amber-300/60 shadow-amber-500/50"
                : "bg-white/80 border-2 border-bhalyam-wood/30 text-bhalyam-wood-dark opacity-60"
            }`}
          >
            {letter}
            {isStruck && (
              <span className="absolute inset-0 flex items-center justify-center text-rose-600 font-extrabold text-2xl sm:text-3xl">
                ✕
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 5x5 Grid representing a player's Bingo board (numbers 1-25) */
/**
 * The pen stroke over a struck number.
 *
 * Marked cells used to become solid green tiles. That reads as a spreadsheet
 * selection, and worse, it hid the grid — you scan a bingo card for LINES,
 * and five filled blocks are harder to read as a line than five struck
 * numbers on a page.
 *
 * Jitter is derived from the cell index rather than random, so a given cell
 * always strikes the same way: it re-renders on every broadcast, and a
 * stroke that wriggled each time would be a distraction. Different per cell,
 * stable per cell — which is exactly how a page of real pen marks looks.
 *
 * Hand-rolled SVG rather than roughjs (already a dependency): roughjs draws
 * to canvas, and 25 canvases inside a grid that re-renders on every call is
 * a lot of machinery for two strokes.
 */
function PenStrike({ seed }: { seed: number }) {
  // Cheap deterministic hash → a few stable pseudo-random offsets.
  const j = (n: number, spread: number) =>
    (((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1 * spread - spread / 2;

  return (
    <svg
      viewBox="0 0 40 40"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g
        stroke="#C2410C"
        strokeWidth={3.2}
        strokeLinecap="round"
        opacity={0.85}
        fill="none"
      >
        <path
          d={`M ${7 + j(1, 4)} ${9 + j(2, 4)} Q 20 ${20 + j(3, 6)} ${33 + j(4, 4)} ${31 + j(5, 4)}`}
        />
        <path
          d={`M ${33 + j(6, 4)} ${9 + j(7, 4)} Q 20 ${20 + j(8, 6)} ${7 + j(9, 4)} ${31 + j(10, 4)}`}
        />
      </g>
    </svg>
  );
}

/**
 * The number on the clock, and why the table is waiting.
 *
 * The engine holds the next call until every seat resolves the current one.
 * That pause is the feature — it is what keeps all boards on the same
 * number — but a board that does not SAY why it stopped reads as a freeze,
 * and freezes get reported as bugs. This panel is the explanation.
 */
export function CallOutPanel({
  number,
  secondsLeft,
  iHaveMarked,
  waitingOn,
  wasAutoMarkedForMe,
}: {
  number: number | null;
  secondsLeft: number | null;
  iHaveMarked: boolean;
  waitingOn: string[];
  wasAutoMarkedForMe: boolean;
}) {
  if (number == null) {
    // The rescue is otherwise invisible — the cell just fills in — so
    // players never learn that missing one costs them nothing.
    if (!wasAutoMarkedForMe) return null;
    return (
      <div className="w-full rounded-xl border-2 border-bhalyam-wood/25 bg-bhalyam-cream/80 px-3 py-2 text-center text-sm font-bold text-bhalyam-wood-dark/80">
        Marked for you — you never lose a number
      </div>
    );
  }

  const urgent = secondsLeft != null && secondsLeft <= 3;

  return (
    <div
      className={`w-full rounded-xl border-2 px-3 py-2.5 ${
        iHaveMarked
          ? "border-bhalyam-wood/25 bg-bhalyam-cream/80"
          : urgent
          ? "border-red-500 bg-red-50"
          : "border-amber-500 bg-amber-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-bhalyam-wood-dark/60">
            Called
          </span>
          <span className="text-2xl font-black tabular-nums text-bhalyam-wood-dark">
            {number}
          </span>
        </div>

        {!iHaveMarked ? (
          <span
            className={`text-sm font-black tabular-nums ${
              urgent ? "text-red-600" : "text-bhalyam-wood-dark/80"
            }`}
          >
            Tap it — {secondsLeft ?? 0}s
          </span>
        ) : waitingOn.length > 0 ? (
          // Named, not a spinner: "waiting for Ravi" is a fact players can
          // act on (nudge him), where a spinner is just a stalled screen.
          <span className="truncate text-xs font-bold text-bhalyam-wood-dark/70">
            Waiting for {waitingOn.slice(0, 2).join(", ")}
            {waitingOn.length > 2 ? ` +${waitingOn.length - 2}` : ""}
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-700">Marked ✓</span>
        )}
      </div>
    </div>
  );
}

/**
 * Auto-mark switch.
 *
 * An accessibility setting, not a difficulty setting — which is why it lives
 * on the player and not on the room. Finding one number among 25 under an
 * 8-second clock is the game for most people and a wall for some (motor
 * control, low vision, a young child playing along), and one player's need
 * must not decide it for the table.
 *
 * Worded as what it does, not as "easy mode". Nobody should have to call
 * themselves bad at Bingo to be able to play it.
 */
export function AutoMarkToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors ${
        enabled
          ? "border-emerald-600 bg-emerald-50"
          : "border-bhalyam-wood/25 bg-bhalyam-cream/70 hover:border-bhalyam-wood/40"
      }`}
    >
      <span>
        <span className="block text-xs font-black uppercase tracking-wider text-bhalyam-wood-dark/70">
          Mark for me
        </span>
        <span className="block text-[11px] leading-snug text-bhalyam-wood-dark/60">
          {enabled
            ? "Numbers are struck off automatically"
            : "Tap each number yourself"}
        </span>
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          enabled ? "bg-emerald-600" : "bg-bhalyam-wood/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function BingoGrid({
  board,
  onCellClick,
  isMyTurn,
  calledSet,
  size = "md",
  markableNumber = null,
  onMarkCell,
}: {
  board: BingoBoard;
  onCellClick?: (val: number) => void;
  isMyTurn?: boolean;
  calledSet?: Set<number>;
  size?: "sm" | "md" | "lg";
  /**
   * The number currently open for marking, if this is the viewer's own card.
   * That one cell becomes tappable no matter whose turn it is to call —
   * finding it is the player's job every single call, and it is what turned
   * this from something you watch into something you play.
   */
  markableNumber?: number | null;
  onMarkCell?: (val: number) => void;
}) {
  const cellDimensions =
    size === "lg"
      ? "h-14 w-14 sm:h-16 sm:w-16 text-lg sm:text-xl"
      : size === "sm"
      ? "h-10 w-10 text-xs sm:text-sm"
      : "h-12 w-12 sm:h-14 sm:w-14 text-sm sm:text-base";

  return (
    <div id="bingo-board-container" className="inline-grid grid-cols-5 gap-1.5 sm:gap-2 rounded-2xl bg-bhalyam-cream/90 p-2.5 sm:p-3.5 border-3 border-bhalyam-wood/40 shadow-xl">
      {board.map((cell) => {
        const isMarked = cell.marked || (calledSet && calledSet.has(cell.value));
        const canClick = isMyTurn && !isMarked && onCellClick;
        const canMark = !isMarked && onMarkCell && cell.value === markableNumber;

        return (
          <button
            key={cell.index}
            type="button"
            disabled={!canClick && !canMark}
            onClick={() => {
              // Marking wins over calling: if this is the open number, the
              // tap is the player striking their own card, even on the turn
              // where they are also the caller.
              if (canMark) onMarkCell(cell.value);
              else if (canClick) onCellClick(cell.value);
            }}
            aria-label={canMark ? `Mark ${cell.value}` : String(cell.value)}
            className={`${cellDimensions} relative flex items-center justify-center rounded-xl font-black tabular-nums transition-all duration-200 shadow-sm border-2 ${
              isMarked
                ? // Struck, not filled. The number stays readable underneath
                  // because that is what a pen does to paper — and because a
                  // solid tile hides the board you are trying to read lines
                  // across.
                  "bg-white/90 border-bhalyam-wood/25 text-bhalyam-wood-dark/70"
                : canMark
                ? "bg-amber-200 border-amber-500 text-bhalyam-wood-dark cursor-pointer active:scale-95 ring-4 ring-amber-400/70 animate-pulse"
                : canClick
                ? "bg-white hover:bg-amber-100 border-amber-400 text-bhalyam-wood-dark cursor-pointer active:scale-95 ring-2 ring-amber-400/50"
                : "bg-white/90 border-bhalyam-wood/20 text-bhalyam-wood-dark opacity-90"
            }`}
          >
            {cell.value}
            {isMarked && <PenStrike seed={cell.index} />}
          </button>
        );
      })}
    </div>
  );
}

/** Opponents Scorecard view showing all players' 5x5 tables */
export function AllPlayerBoardsView({
  players,
  selfId,
  roster,
  registerCardRef,
  onTarget,
  activeTargetId,
  onCloseTarget,
}: {
  players: BingoPlayerPublic[];
  selfId: string | null;
  /** Full player roster (carries `avatar`), used only to look up each seat's picture. */
  roster?: Player[];
  /** Reaction-targeting: registers each seat's card element as the fly-to/flinch anchor. */
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
  onTarget?: (playerId: string) => void;
  activeTargetId?: string | null;
  onCloseTarget?: () => void;
}) {
  const avatarById = new Map<string, string | undefined>();
  for (const r of roster ?? []) avatarById.set(r.id, r.avatar);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl overflow-y-auto p-2">
      {players.map((p) => {
        const isSelf = p.id === selfId;
        const isTargetActive = activeTargetId === p.id;
        return (
          <div
            key={p.id}
            ref={registerCardRef?.(p.id)}
            className={`relative flex flex-col items-center gap-2 rounded-2xl p-3.5 border-2 transition-all ${
              isSelf
                ? "bg-amber-500/10 border-amber-400 shadow-md"
                : "bg-white/80 border-bhalyam-wood/20 cursor-pointer hover:border-amber-400 hover:shadow-lg active:scale-[0.99]"
            }`}
            onClick={!isSelf ? () => onTarget?.(p.id) : undefined}
            title={!isSelf ? `Tap to react at ${p.name}` : undefined}
          >
            {isTargetActive && onCloseTarget && (
              <SeatTargetReactionWheel
                game="bingo"
                targetPlayerId={p.id}
                targetPlayerName={p.name}
                onClose={onCloseTarget}
                position="top"
              />
            )}
            <div className="flex items-center justify-between w-full font-bold text-sm text-bhalyam-wood-dark px-1">
              <span className="flex items-center gap-1.5">
                <SeatAvatar
                  avatar={avatarById.get(p.id)}
                  name={p.name}
                  className="w-6 h-6"
                  textClassName="text-[9px]"
                />
                {p.name} {isSelf && "(You)"}
                {p.isBot && <span className="text-[10px] uppercase text-bhalyam-wood-dark/50 bg-bhalyam-wood/10 px-1.5 py-0.5 rounded">bot</span>}
              </span>
              <span className="text-amber-700 font-extrabold text-xs">
                {p.completedLinesCount} Lines ({p.completedLetters.join("") || "-"})
              </span>
            </div>
            <BingoGrid board={p.board} size="sm" />
          </div>
        );
      })}
    </div>
  );
}

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
        "min-h-[48px] rounded-2xl px-8 py-3.5 font-black uppercase tracking-wider text-white text-lg shadow-xl transition-all " +
        "bg-gradient-to-r from-rose-600 via-red-500 to-amber-600 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed animate-pulse " +
        (className ?? "")
      }
    >
      🎉 CLAIM BINGO! 🎉
    </button>
  );
}

import { useState } from "react";
import BoardPreviewPill from "../../components/BoardPreviewPill";

export function BingoResultOverlay({
  winners,
  nameOf,
  selfId,
  players,
  calledCount,
  onLeave,
  onContinue,
}: {
  winners: BingoWinner[];
  nameOf: (id: string) => string;
  selfId: string | null;
  players: Player[];
  calledCount: number;
  onLeave: () => void;
  onContinue: () => void;
}) {
  const [previewMode, setPreviewMode] = useState(false);
  const winner = winners[0];
  const winnerName = winner ? nameOf(winner.playerId) : "Player";
  const iWon = winner?.playerId === selfId;

  if (previewMode) {
    return (
      <BoardPreviewPill
        onClosePreview={() => setPreviewMode(false)}
        targetElementId="bingo-board-container"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-bhalyam-cream p-6 shadow-2xl border-4 border-amber-400/70 text-center">
        <div className="text-5xl mb-2">{iWon ? "🏆" : "🎉"}</div>
        <h2 className="text-3xl font-black text-bhalyam-wood-dark mb-1">
          {iWon ? "YOU WON BINGO!" : `${winnerName} WON BINGO!`}
        </h2>
        <p className="text-sm font-medium text-bhalyam-wood-dark/70 mb-4">
          Completed 5 lines in {calledCount} number callouts!
        </p>

        <RematchPanel players={players} selfId={selfId} className="mb-4" />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className="flex-1 min-h-[46px] rounded-xl bg-amber-600 hover:bg-amber-500 py-2.5 font-black text-white shadow-md text-xs sm:text-sm transition"
          >
            👁 Board Preview
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 min-h-[46px] rounded-xl border-2 border-bhalyam-wood/30 bg-white/70 py-2.5 font-bold text-bhalyam-wood-dark hover:bg-white text-xs sm:text-sm"
          >
            Leave
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-black text-white shadow-md text-xs sm:text-sm transition"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
