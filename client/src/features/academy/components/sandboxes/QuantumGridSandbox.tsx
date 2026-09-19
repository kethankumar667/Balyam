import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useReducedMotion } from "../../../../animations/helpers/useReducedMotion";
import { useCompleteOnce, type SandboxProps } from "./sandboxShared";

interface Piece {
  id: number;
  cellIndex: number;
  order: number;
}

const MAX_PIECES = 3;
const VAPORISE_MS = 300;
const GRID_CELLS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const OLDEST_TAG_CLASS = "bg-amber-400 text-slate-950 font-black";
const ORDER_TAG_CLASS = "text-cyan-200";

const INITIAL_PIECES: readonly Piece[] = [
  { id: 1, cellIndex: 0, order: 1 },
  { id: 2, cellIndex: 4, order: 2 },
  { id: 3, cellIndex: 8, order: 3 },
];

function findOldest(pieces: readonly Piece[]): Piece {
  return pieces.reduce((prev, curr) => (prev.order < curr.order ? prev : curr));
}

function nextOrder(pieces: readonly Piece[]): number {
  return pieces.reduce((max, piece) => Math.max(max, piece.order), 0) + 1;
}

function describeCell(
  index: number,
  piece: Piece | undefined,
  isOldest: boolean,
): string {
  const label = `Cell ${index + 1}`;
  if (!piece) return `${label}, empty`;
  return isOldest ? `${label}, X placed, oldest` : `${label}, X placed`;
}

export const QuantumGridSandbox: React.FC<SandboxProps> = ({ onComplete }) => {
  const [pieces, setPieces] = useState<readonly Piece[]>(INITIAL_PIECES);
  const [vaporizedId, setVaporizedId] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState("");
  const vaporiseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const complete = useCompleteOnce(onComplete);

  const clearVaporiseTimer = () => {
    if (vaporiseTimerRef.current === null) return;
    clearTimeout(vaporiseTimerRef.current);
    vaporiseTimerRef.current = null;
  };

  // A pending vaporise must never outlive the component.
  useEffect(() => {
    return () => {
      if (vaporiseTimerRef.current === null) return;
      clearTimeout(vaporiseTimerRef.current);
      vaporiseTimerRef.current = null;
    };
  }, []);

  const oldestPiece = pieces.length === MAX_PIECES ? findOldest(pieces) : null;
  const isVaporisePending = vaporizedId !== null;

  const scheduleVaporise = (targetCell: number) => {
    const toRemove = findOldest(pieces);
    setVaporizedId(toRemove.id);
    setLastEvent(
      `Piece in cell ${toRemove.cellIndex + 1} is dissolving into quantum vapor.`,
    );
    HapticsManager.getInstance().win();

    vaporiseTimerRef.current = setTimeout(() => {
      vaporiseTimerRef.current = null;
      const arrival: Piece = {
        id: nextOrder(pieces),
        cellIndex: targetCell,
        order: nextOrder(pieces),
      };
      setPieces([...pieces.filter((p) => p.id !== toRemove.id), arrival]);
      setVaporizedId(null);
      setLastEvent(
        `Placed in cell ${targetCell + 1}. The queue stays at ${MAX_PIECES} pieces.`,
      );
      complete();
    }, VAPORISE_MS);
  };

  const handleCellClick = (index: number) => {
    // Input is locked while a vaporise is pending: a second click would
    // schedule a second timer over the same stale pieces.
    if (vaporiseTimerRef.current !== null) return;
    if (pieces.some((p) => p.cellIndex === index)) return;

    HapticsManager.getInstance().subtle();

    if (pieces.length >= MAX_PIECES) {
      scheduleVaporise(index);
      return;
    }
    const order = nextOrder(pieces);
    setPieces([...pieces, { id: order, cellIndex: index, order }]);
  };

  const handleReset = () => {
    clearVaporiseTimer();
    setPieces(INITIAL_PIECES);
    setVaporizedId(null);
    setLastEvent("Grid reset.");
  };

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-black">
        Quantum FIFO Simulator
      </div>

      <div className="text-left w-full max-w-xs">
        <span className="text-xs font-mono text-cyan-300 font-bold block">
          3-Piece Quantum Evaporation Rule:
        </span>
        <p className="text-[11px] font-mono text-stone-400 leading-tight">
          Click any empty square to place your 4th piece. Watch your oldest glowing piece dissolve into quantum vapor!
        </p>
      </div>

      {/* 3x3 Grid */}
      <div
        role="group"
        aria-label="Quantum grid, 3 by 3"
        className="grid grid-cols-3 gap-2 w-48 h-48 sm:w-56 sm:h-56 p-2 bg-slate-950/80 rounded-2xl border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
      >
        {GRID_CELLS.map((idx) => {
          const piece = pieces.find((p) => p.cellIndex === idx);
          const isOldest = Boolean(oldestPiece && piece?.id === oldestPiece.id);
          const isVaporizing = piece !== undefined && vaporizedId === piece.id;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCellClick(idx)}
              aria-label={describeCell(idx, piece, isOldest)}
              aria-disabled={isVaporisePending}
              className={`rounded-xl border flex flex-col items-center justify-center relative transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                piece
                  ? isOldest
                    ? "bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] motion-safe:animate-pulse"
                    : "bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-sm"
                  : "bg-slate-900/60 border-stone-800 hover:border-cyan-500/50 hover:bg-slate-800/60"
              }`}
            >
              <AnimatePresence>
                {piece && !isVaporizing && (
                  <motion.div
                    initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { scale: 0, opacity: 0, filter: "blur(8px)" }
                    }
                    transition={reduceMotion ? { duration: 0 } : undefined}
                    className="flex flex-col items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
                      X
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1 rounded ${
                        isOldest ? OLDEST_TAG_CLASS : ORDER_TAG_CLASS
                      }`}
                    >
                      {isOldest ? "1st (Next)" : `#${piece.order}`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Status HUD */}
      <div className="w-full max-w-xs flex items-center justify-between pt-1 border-t border-stone-800">
        <div role="status" className="text-left">
          <span className="text-[11px] font-mono text-stone-400 block">
            Queue: {pieces.length}/{MAX_PIECES} Active Pieces
          </span>
          <span className="text-[11px] font-mono text-cyan-300 block">
            {lastEvent}
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          <span>Reset Grid</span>
        </button>
      </div>
    </div>
  );
};
