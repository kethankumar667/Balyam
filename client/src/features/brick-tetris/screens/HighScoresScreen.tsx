import React from "react";
import type { GameAction } from "../types";
import { loadTetrisData } from "../services/storageService";

interface HighScoresScreenProps {
  dispatch: React.Dispatch<GameAction>;
}

export const HighScoresScreen: React.FC<HighScoresScreenProps> = ({ dispatch }) => {
  const data = loadTetrisData();

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 bg-[#8BAC0F] text-[#0F380F] select-none font-mono">
      <div className="text-center pt-1 border-b border-[#306230] pb-1">
        <h2 className="text-base font-black tracking-wider uppercase">
          HIGH SCORES
        </h2>
        <span className="text-[10px] text-[#306230]">HALL OF FAME</span>
      </div>

      <div className="my-auto flex flex-col gap-1 text-[11px] overflow-y-auto max-h-[190px] px-1">
        {data.highScores.length === 0 ? (
          <p className="text-center text-[#306230] py-6">NO SCORES YET</p>
        ) : (
          data.highScores.map((entry, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center bg-[#7F9F0E]/30 px-2 py-1 rounded"
            >
              <span className="font-bold">
                {idx + 1}. {entry.score}
              </span>
              <span className="text-[9.5px] text-[#306230]">
                LV{entry.level} ({entry.mode})
              </span>
            </div>
          ))
        )}
      </div>

      <div className="pb-1">
        <button
          onClick={() => dispatch({ type: "BACK_TO_MENU" })}
          className="w-full px-3 py-1.5 bg-[#0F380F] text-[#8BAC0F] rounded text-xs font-bold hover:opacity-90"
        >
          BACK TO MENU (5)
        </button>
      </div>
    </div>
  );
};
