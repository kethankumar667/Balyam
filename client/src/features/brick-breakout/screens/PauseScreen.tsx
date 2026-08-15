import React from "react";
import type { GameAction } from "../types";
import { breakoutAudio } from "../services/audioService";

interface PauseScreenProps {
  dispatch: React.Dispatch<GameAction>;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({ dispatch }) => {
  const handleResume = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "RESUME" });
  };

  const handleRestart = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "RESTART" });
  };

  const handleMenu = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "OPEN_MENU" });
  };

  return (
    <div className="absolute inset-0 bg-[#0f380f]/85 text-[#9bbc0f] p-4 flex flex-col items-center justify-center text-center font-mono select-none z-20 backdrop-blur-xs">
      <div className="text-xl font-black tracking-widest mb-6 animate-pulse">
        ⏸ GAME PAUSED
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-[180px]">
        <button
          type="button"
          onClick={handleResume}
          className="w-full py-2.5 rounded bg-[#8bac0f] hover:bg-[#9bbc0f] text-[#0f380f] font-bold text-xs uppercase shadow active:scale-95 transition cursor-pointer"
        >
          ▶ RESUME
        </button>

        <button
          type="button"
          onClick={handleRestart}
          className="w-full py-2 rounded bg-[#306230] hover:bg-[#3d7a3d] text-[#9bbc0f] font-bold text-xs uppercase shadow active:scale-95 transition cursor-pointer"
        >
          ⟳ RESTART
        </button>

        <button
          type="button"
          onClick={handleMenu}
          className="w-full py-2 rounded bg-[#204420] hover:bg-[#2c5c2c] text-[#8bac0f] font-bold text-xs uppercase shadow active:scale-95 transition cursor-pointer"
        >
          🏠 MAIN MENU
        </button>
      </div>
    </div>
  );
};

export default PauseScreen;
