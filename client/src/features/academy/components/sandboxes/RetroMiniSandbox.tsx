import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useCompleteOnce, type SandboxProps } from "./sandboxShared";

interface Cell {
  x: number;
  y: number;
}

const GRID_COLS = 10;
const GRID_ROWS = 8;
const SCORE_PER_FOOD = 10;
const START_POSITION: Cell = { x: 4, y: 4 };
const START_FOOD: Cell = { x: 6, y: 3 };
const COL_PERCENT = 10;
const ROW_PERCENT = 12;

const DPAD_BUTTON_CLASS =
  "w-10 h-10 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center active:scale-95 cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400";

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

function isSameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Picks a food cell inside the LCD margin that the player is not standing on. */
function pickFoodCell(occupied: Cell, random: number): Cell {
  const candidates: Cell[] = [];
  for (let y = 1; y < GRID_ROWS - 1; y += 1) {
    for (let x = 1; x < GRID_COLS - 1; x += 1) {
      if (!isSameCell({ x, y }, occupied)) candidates.push({ x, y });
    }
  }
  return candidates[Math.floor(random * candidates.length)];
}

export const RetroMiniSandbox: React.FC<SandboxProps> = ({ onComplete }) => {
  const [pos, setPos] = useState<Cell>(START_POSITION);
  const [food, setFood] = useState<Cell>(START_FOOD);
  const [score, setScore] = useState(0);
  const complete = useCompleteOnce(onComplete);

  const move = (dx: number, dy: number) => {
    HapticsManager.getInstance().subtle();

    // Next state is derived here from the current render; no side effect
    // runs inside a state updater, so StrictMode cannot double-fire anything.
    const next: Cell = {
      x: clamp(pos.x + dx, GRID_COLS - 1),
      y: clamp(pos.y + dy, GRID_ROWS - 1),
    };
    setPos(next);

    if (!isSameCell(next, food)) return;
    setScore((current) => current + SCORE_PER_FOOD);
    setFood(pickFoodCell(next, Math.random()));
    HapticsManager.getInstance().win();
    complete();
  };

  return (
    <div className="bg-slate-900/90 border border-lime-600/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-lime-600/15 text-lime-400 border border-lime-500/30 font-black">
        Monochrome LCD Lab
      </div>

      <div className="text-left w-full max-w-xs">
        <span className="text-xs font-mono text-lime-400 font-bold block">
          Nokia 3310 Pixel Physics:
        </span>
        <p className="text-[11px] font-mono text-stone-400 leading-tight">
          Use the vintage directional pad to navigate your pixel segment towards the blinking food dot!
        </p>
      </div>

      {/* Retro LCD Screen */}
      <div
        className="w-48 h-32 rounded-xl p-2 border-4 border-stone-800 shadow-inner flex flex-col justify-between"
        style={{ background: "#8BAC0F" }}
      >
        <div className="flex justify-between items-center text-[10px] font-mono font-black text-[#0f380f] px-1 border-b border-[#0f380f]/20">
          <span>NOKIA 2D</span>
          <span>SCORE: {score}</span>
        </div>

        {/* Pixel Grid */}
        <div className="relative flex-1 w-full h-full overflow-hidden" aria-hidden="true">
          {/* Player Pixel */}
          <div
            className="absolute w-3 h-3 bg-[#0f380f] rounded-sm shadow-sm motion-safe:transition-all motion-safe:duration-100"
            style={{ left: `${pos.x * COL_PERCENT}%`, top: `${pos.y * ROW_PERCENT}%` }}
          />

          {/* Food Dot */}
          <div
            className="absolute w-2.5 h-2.5 bg-[#0f380f] rounded-full motion-safe:animate-ping"
            style={{ left: `${food.x * COL_PERCENT}%`, top: `${food.y * ROW_PERCENT}%` }}
          />
          <div
            className="absolute w-2.5 h-2.5 bg-[#0f380f] rounded-full"
            style={{ left: `${food.x * COL_PERCENT}%`, top: `${food.y * ROW_PERCENT}%` }}
          />
        </div>
      </div>

      {/* D-Pad Controls */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => move(0, -1)}
          className={DPAD_BUTTON_CLASS}
          aria-label="Move up"
        >
          <ChevronUp className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => move(-1, 0)}
            className={DPAD_BUTTON_CLASS}
            aria-label="Move left"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div
            className="w-8 h-8 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-[9px] font-mono text-stone-400 font-bold"
            aria-hidden="true"
          >
            OK
          </div>
          <button
            type="button"
            onClick={() => move(1, 0)}
            className={DPAD_BUTTON_CLASS}
            aria-label="Move right"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => move(0, 1)}
          className={DPAD_BUTTON_CLASS}
          aria-label="Move down"
        >
          <ChevronDown className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div role="status" className="min-h-[1.75rem]">
        {score > 0 && (
          <div className="flex items-center gap-1.5 text-lime-400 font-mono text-xs font-bold bg-lime-500/10 border border-lime-500/30 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Food collected</span>
          </div>
        )}
      </div>
    </div>
  );
};
