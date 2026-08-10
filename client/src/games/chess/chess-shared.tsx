import React, { useMemo, useState } from "react";
import type {
  ChessBoardTheme,
  ChessMoveRecord,
  ChessPublicState,
  Player,
} from "@shared/types";
import { HapticsManager } from "../../services/HapticsManager";

/* ─────────────────────────── Theme Definitions ─────────────────────────── */
export interface BoardThemeConfig {
  name: string;
  lightSquare: string;
  darkSquare: string;
  border: string;
  lastMoveHighlight: string;
  selectedHighlight: string;
  legalDot: string;
}

export const CHESS_THEMES: Record<ChessBoardTheme, BoardThemeConfig> = {
  emerald: {
    name: "Classic Olive",
    lightSquare: "#E9E0C5",
    darkSquare: "#7B9B52",
    border: "#4E6931",
    lastMoveHighlight: "rgba(247, 247, 105, 0.5)",
    selectedHighlight: "rgba(20, 83, 45, 0.6)",
    legalDot: "rgba(107, 142, 35, 0.7)",
  },
  wood: {
    name: "Classic Mahogany",
    lightSquare: "#F0D9B5",
    darkSquare: "#B58863",
    border: "#6D4323",
    lastMoveHighlight: "rgba(247, 247, 105, 0.5)",
    selectedHighlight: "rgba(109, 67, 35, 0.6)",
    legalDot: "rgba(139, 90, 43, 0.7)",
  },
  glass: {
    name: "Glass Prism",
    lightSquare: "#E2E8F0",
    darkSquare: "#64748B",
    border: "#334155",
    lastMoveHighlight: "rgba(56, 189, 248, 0.4)",
    selectedHighlight: "rgba(15, 23, 42, 0.6)",
    legalDot: "rgba(2, 132, 199, 0.7)",
  },
  cyberpunk: {
    name: "Neon Cyber",
    lightSquare: "#CFFAFE",
    darkSquare: "#0891B2",
    border: "#155E75",
    lastMoveHighlight: "rgba(244, 114, 182, 0.5)",
    selectedHighlight: "rgba(8, 145, 178, 0.6)",
    legalDot: "rgba(6, 182, 212, 0.8)",
  },
  classic: {
    name: "Monochrome Dark",
    lightSquare: "#E4E4E7",
    darkSquare: "#52525B",
    border: "#27272A",
    lastMoveHighlight: "rgba(250, 204, 21, 0.4)",
    selectedHighlight: "rgba(39, 39, 42, 0.6)",
    legalDot: "rgba(161, 161, 170, 0.7)",
  },
};

/* ─────────────────────────── SVG Vector Piece Components ─────────────────────────── */
export function ChessPieceSymbol({
  type,
  color,
  size = 40,
}: {
  type: string;
  color: "w" | "b";
  size?: number;
}) {
  const isWhite = color === "w";

  const symbols: Record<string, string> = {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙",
  };

  return (
    <span
      className={`inline-block select-none transition-transform duration-150 hover:scale-110 ${
        isWhite
          ? "text-[#FFFBF2] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
          : "text-[#1A1817] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)]"
      }`}
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        WebkitTextStroke: isWhite ? "1.5px #6D5432" : "1.5px #000000",
        filter: isWhite
          ? "drop-shadow(0px 3px 2px rgba(0,0,0,0.4))"
          : "drop-shadow(0px 3px 2px rgba(0,0,0,0.6))",
      }}
    >
      {symbols[type.toLowerCase()] ?? "♟"}
    </span>
  );
}

/* ─────────────────────────── Captured Pieces Bar ─────────────────────────── */
export function CapturedPiecesRack({
  captured,
}: {
  captured: { white: string[]; black: string[] };
}) {
  return (
    <div className="flex items-center gap-4 text-xs font-bold text-stone-300">
      {/* Captured Black pieces (taken by White) */}
      <div className="flex items-center gap-1 bg-stone-900/60 px-2.5 py-1 rounded-xl border border-white/10">
        <span className="text-[10px] text-amber-400 font-mono">White Captured:</span>
        {captured.white.length === 0 ? (
          <span className="text-[10px] text-stone-500 italic">None</span>
        ) : (
          captured.white.map((p, i) => (
            <ChessPieceSymbol key={`w-cap-${i}`} type={p} color="b" size={16} />
          ))
        )}
      </div>

      {/* Captured White pieces (taken by Black) */}
      <div className="flex items-center gap-1 bg-stone-900/60 px-2.5 py-1 rounded-xl border border-white/10">
        <span className="text-[10px] text-amber-400 font-mono">Black Captured:</span>
        {captured.black.length === 0 ? (
          <span className="text-[10px] text-stone-500 italic">None</span>
        ) : (
          captured.black.map((p, i) => (
            <ChessPieceSymbol key={`b-cap-${i}`} type={p} color="w" size={16} />
          ))
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Clock Timer Pill ─────────────────────────── */
export function ChessClockPill({
  playerName,
  timeMs,
  isActive,
  color,
}: {
  playerName: string;
  timeMs: number;
  isActive: boolean;
  color: "w" | "b";
}) {
  const secondsTotal = Math.max(0, Math.floor(timeMs / 1000));
  const mins = Math.floor(secondsTotal / 60);
  const secs = secondsTotal % 60;
  const timeFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 rounded-2xl border transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
          : "bg-stone-900/80 border-white/10"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-3.5 h-3.5 rounded-full border shadow-sm ${
            color === "w" ? "bg-white border-stone-400" : "bg-stone-900 border-stone-600"
          }`}
        />
        <span className="text-xs font-black text-amber-100 truncate">{playerName}</span>
      </div>

      <div
        className={`px-2.5 py-1 rounded-xl font-mono text-sm font-black tabular-nums ${
          isActive ? "bg-amber-400 text-stone-950" : "bg-stone-800 text-amber-300"
        }`}
      >
        ⏱ {timeFormatted}
      </div>
    </div>
  );
}

/* ─────────────────────────── Interactive 8x8 SVG/CSS Chess Board ─────────────────────────── */
export function ChessBoardGrid({
  fen,
  boardTheme = "emerald",
  myColor = "w",
  myTurn,
  lastMove,
  inCheck,
  onSquareClick,
  selectedSquare,
  legalTargets = [],
}: {
  fen: string;
  boardTheme?: ChessBoardTheme;
  myColor?: "w" | "b";
  myTurn: boolean;
  lastMove: { from: string; to: string } | null;
  inCheck: boolean;
  onSquareClick: (square: string) => void;
  selectedSquare: string | null;
  legalTargets?: string[];
}) {
  const theme = CHESS_THEMES[boardTheme] ?? CHESS_THEMES.emerald;

  // Parse FEN board
  const boardMatrix = useMemo(() => {
    const fenBoard = fen.split(" ")[0];
    const rows = fenBoard.split("/");
    const grid: Array<Array<{ square: string; piece: { type: string; color: "w" | "b" } | null }>> = [];

    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

    for (let r = 0; r < 8; r++) {
      const rankNum = 8 - r;
      const rowPieces: Array<{ square: string; piece: { type: string; color: "w" | "b" } | null }> = [];
      let fileIdx = 0;

      for (const char of rows[r]) {
        if (/\d/.test(char)) {
          const emptyCount = parseInt(char, 10);
          for (let e = 0; e < emptyCount; e++) {
            rowPieces.push({ square: `${files[fileIdx]}${rankNum}`, piece: null });
            fileIdx++;
          }
        } else {
          const color: "w" | "b" = char === char.toUpperCase() ? "w" : "b";
          rowPieces.push({
            square: `${files[fileIdx]}${rankNum}`,
            piece: { type: char.toLowerCase(), color },
          });
          fileIdx++;
        }
      }
      grid.push(rowPieces);
    }

    // Flip grid if playing Black
    if (myColor === "b") {
      return grid.slice().reverse().map((row) => row.slice().reverse());
    }

    return grid;
  }, [fen, myColor]);

  return (
    <div
      id="game-board-container"
      className="relative w-full aspect-square max-w-[620px] mx-auto select-none rounded-3xl overflow-hidden p-3 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
    >
      <div
        className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-2xl overflow-hidden shadow-inner border"
        style={{ borderColor: theme.border }}
      >
        {boardMatrix.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const isLight = (rIdx + cIdx) % 2 === 0;
            const bg = isLight ? theme.lightSquare : theme.darkSquare;
            const isSelected = selectedSquare === cell.square;
            const isLastMove = lastMove && (lastMove.from === cell.square || lastMove.to === cell.square);
            const isTarget = legalTargets.includes(cell.square);
            const isKingInCheck = inCheck && cell.piece?.type === "k" && cell.piece?.color === (myTurn ? myColor : myColor === "w" ? "b" : "w");

            return (
              <button
                key={cell.square}
                type="button"
                onClick={() => {
                  HapticsManager.getInstance().subtle();
                  onSquareClick(cell.square);
                }}
                className="relative w-full h-full flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                style={{ backgroundColor: bg }}
              >
                {/* Last Move Highlight */}
                {isLastMove && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: theme.lastMoveHighlight }}
                  />
                )}

                {/* Selected Square Highlight Ring */}
                {isSelected && (
                  <div className="absolute inset-0 border-4 border-amber-400 shadow-inner rounded-md pointer-events-none" />
                )}

                {/* King Check Glow Pulse */}
                {isKingInCheck && (
                  <div className="absolute inset-0 bg-red-600/60 animate-ping rounded-md pointer-events-none" />
                )}

                {/* Render Piece */}
                {cell.piece && (
                  <ChessPieceSymbol type={cell.piece.type} color={cell.piece.color} size={42} />
                )}

                {/* Legal Move Dot */}
                {isTarget && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`rounded-full ${
                        cell.piece ? "w-8 h-8 border-4 border-amber-400/80" : "w-4 h-4 bg-amber-400/90 shadow-md"
                      }`}
                    />
                  </div>
                )}

                {/* Square Notation Labels */}
                {cIdx === 0 && (
                  <span className="absolute top-0.5 left-1 text-[9px] font-black opacity-40 font-mono">
                    {cell.square[1]}
                  </span>
                )}
                {rIdx === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-black opacity-40 font-mono">
                    {cell.square[0]}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── SAN Move History Drawer ─────────────────────────── */
export function ChessMoveHistoryPanel({ history }: { history: ChessMoveRecord[] }) {
  const turns = useMemo(() => {
    const pairs: Array<{ num: number; white?: string; black?: string }> = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: history[i]?.san,
        black: history[i + 1]?.san,
      });
    }
    return pairs;
  }, [history]);

  return (
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-stone-900/80 border border-white/10 shadow-xl backdrop-blur-md max-h-48 overflow-y-auto">
      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
        📜 Move History ({history.length})
      </h4>

      {turns.length === 0 ? (
        <span className="text-xs text-stone-500 italic">No moves played yet.</span>
      ) : (
        <div className="grid grid-cols-1 gap-1 text-xs font-mono">
          {turns.map((t) => (
            <div key={t.num} className="flex items-center justify-between px-2 py-0.5 rounded bg-white/5">
              <span className="text-amber-300 font-bold w-8">{t.num}.</span>
              <span className="text-stone-100 flex-1">{t.white ?? "..."}</span>
              <span className="text-stone-400 flex-1 text-right">{t.black ?? ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
