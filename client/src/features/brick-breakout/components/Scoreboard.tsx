import React from "react";
import type { GameState } from "../types";

interface ScoreboardProps {
  state: GameState;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ state }) => {
  const { score, highScore, lives, level, combo, remainingBricks } = state;

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#8bac0f] border-2 border-[#0f380f] rounded-lg shadow-inner text-[#0f380f] font-mono select-none w-full max-w-[280px]">
      {/* Top row: Score and High Score */}
      <div className="flex items-center justify-between border-b border-[#306230]/40 pb-1.5">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">SCORE</span>
          <span className="text-xl font-black">{score.toString().padStart(6, "0")}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">HI-SCORE</span>
          <span className="text-xl font-black">{highScore.toString().padStart(6, "0")}</span>
        </div>
      </div>

      {/* Middle row: Level, Lives, Combo */}
      <div className="flex items-center justify-between pt-0.5 text-xs">
        <div className="flex items-center gap-1">
          <span className="font-bold uppercase opacity-80">LVL:</span>
          <span className="font-black text-sm">{level}</span>
        </div>

        {/* Lives indicators */}
        <div className="flex items-center gap-1">
          <span className="font-bold uppercase opacity-80">LIVES:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`inline-block w-2.5 h-2.5 rounded-xs border border-[#0f380f] ${
                  i < lives ? "bg-[#0f380f]" : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Combo */}
        <div className="flex items-center gap-1">
          <span className="font-bold uppercase opacity-80">COMBO:</span>
          <span className={`font-black text-sm ${combo > 1 ? "text-[#051605] underline" : ""}`}>
            {combo}&times;
          </span>
        </div>
      </div>

      {/* Bricks remaining pill */}
      <div className="flex items-center justify-between pt-1 border-t border-[#306230]/40 text-[11px]">
        <span className="opacity-80">BRICKS LEFT:</span>
        <span className="font-black">{remainingBricks}</span>
      </div>
    </div>
  );
};

export default Scoreboard;
