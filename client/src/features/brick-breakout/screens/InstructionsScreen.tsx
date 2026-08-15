import React from "react";
import type { GameAction } from "../types";
import { breakoutAudio } from "../services/audioService";

interface InstructionsScreenProps {
  dispatch: React.Dispatch<GameAction>;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ dispatch }) => {
  const handleBack = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "OPEN_MENU" });
  };

  return (
    <div className="absolute inset-0 bg-[#0f380f]/95 text-[#9bbc0f] p-4 flex flex-col items-center justify-between text-left font-mono select-none z-20 overflow-y-auto">
      <div className="w-full flex flex-col gap-3 pt-2">
        <h2 className="text-base font-black text-center border-b border-[#8bac0f]/40 pb-1">
          HOW TO PLAY
        </h2>

        <div className="space-y-2 text-[11px] leading-relaxed">
          <p>
            • <strong className="text-white">Goal:</strong> Move paddle with Left/Right keys to bounce the ball and demolish all destructible bricks!
          </p>
          <p>
            • <strong className="text-white">Paddle Angles:</strong> Hitting the left or right paddle segment angles the ball for strategic corner shots.
          </p>
          <p>
            • <strong className="text-white">Brick Types:</strong>
          </p>
          <ul className="pl-3 space-y-1 text-[10px]">
            <li>▪ <strong>Normal:</strong> 1 hit (+100 pts)</li>
            <li>▪ <strong>Strong:</strong> 2 hits (+250 pts)</li>
            <li>▪ <strong>Steel:</strong> Indestructible barriers</li>
          </ul>
          <p>
            • <strong className="text-white">Combos:</strong> Keep the ball active to build consecutive multiplier combos!
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBack}
        className="w-full max-w-[180px] py-2 mt-4 rounded bg-[#8bac0f] hover:bg-[#9bbc0f] text-[#0f380f] font-bold text-xs uppercase tracking-wider shadow active:scale-95 transition cursor-pointer text-center"
      >
        ◀ BACK TO MENU
      </button>
    </div>
  );
};

export default InstructionsScreen;
