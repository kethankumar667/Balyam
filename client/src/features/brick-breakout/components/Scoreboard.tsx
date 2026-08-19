import React from "react";
import type { GameState } from "../types";

interface ScoreboardProps {
  state: GameState;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ state }) => {
  const { score, highScore, lives, level, combo, remainingBricks } = state;

  return (
    <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-[#8bac0f] border-b-2 border-[#0f380f]/40 text-[#0f380f] font-mono select-none w-full max-w-[190px] rounded-t-sm">
      {/* Top row: Score and High Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] uppercase font-bold opacity-75">SC:</span>
          <span className="text-xs font-black">{score.toString().padStart(6, "0")}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] uppercase font-bold opacity-75">HI:</span>
          <span className="text-xs font-black">{highScore.toString().padStart(6, "0")}</span>
        </div>
      </div>

      {/* Bottom row: Level, Lives, Combo, Bricks Left */}
      <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-[#306230]/20">
        <div className="flex items-center gap-0.5">
          <span className="font-bold opacity-75">L:</span>
          <span className="font-black">{level}</span>
        </div>

        {/* Lives indicators */}
        <div className="flex items-center gap-0.5">
          <span className="font-bold opacity-75">HP:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-xs border border-[#0f380f] ${
                  i < lives ? "bg-[#0f380f]" : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Combo / Remaining Bricks */}
        {combo > 1 ? (
          <div className="flex items-center gap-0.5 text-[#051605] font-black">
            <span>{combo}&times;</span>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <span className="font-bold opacity-75">REM:</span>
            <span className="font-black">{remainingBricks}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;
