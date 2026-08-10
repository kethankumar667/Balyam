import type { BingoBoard, BingoLetter, BingoPlayerPublic, BingoWinner } from "@shared/types";
import RematchPanel from "../../components/RematchPanel";
import type { Player } from "@shared/types";

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
export function BingoGrid({
  board,
  onCellClick,
  isMyTurn,
  calledSet,
  size = "md",
}: {
  board: BingoBoard;
  onCellClick?: (val: number) => void;
  isMyTurn?: boolean;
  calledSet?: Set<number>;
  size?: "sm" | "md" | "lg";
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

        return (
          <button
            key={cell.index}
            type="button"
            disabled={!canClick}
            onClick={() => canClick && onCellClick(cell.value)}
            className={`${cellDimensions} flex items-center justify-center rounded-xl font-black tabular-nums transition-all duration-200 shadow-sm border-2 ${
              isMarked
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 text-white scale-[1.03] shadow-emerald-500/30"
                : canClick
                ? "bg-white hover:bg-amber-100 border-amber-400 text-bhalyam-wood-dark cursor-pointer active:scale-95 ring-2 ring-amber-400/50"
                : "bg-white/90 border-bhalyam-wood/20 text-bhalyam-wood-dark opacity-90"
            }`}
          >
            {cell.value}
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
}: {
  players: BingoPlayerPublic[];
  selfId: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl overflow-y-auto p-2">
      {players.map((p) => {
        const isSelf = p.id === selfId;
        return (
          <div
            key={p.id}
            className={`flex flex-col items-center gap-2 rounded-2xl p-3.5 border-2 transition-all ${
              isSelf
                ? "bg-amber-500/10 border-amber-400 shadow-md"
                : "bg-white/80 border-bhalyam-wood/20"
            }`}
          >
            <div className="flex items-center justify-between w-full font-bold text-sm text-bhalyam-wood-dark px-1">
              <span className="flex items-center gap-1.5">
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
