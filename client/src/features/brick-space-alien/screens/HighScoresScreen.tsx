import React from "react";
import { SpaceAlienPersistenceService } from "../services/PersistenceService";

interface HighScoresScreenProps {
  onBack: () => void;
}

export const HighScoresScreen: React.FC<HighScoresScreenProps> = ({ onBack }) => {
  const data = SpaceAlienPersistenceService.load();

  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-[#8bac0f] text-[#0f380f] font-mono p-3 select-none z-20">
      <div className="flex flex-col items-center border-b border-[#306230] pb-1">
        <h3 className="text-sm font-black uppercase tracking-wider">HALL OF FAME</h3>
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between bg-[#306230]/10 p-1.5 rounded">
          <span className="text-[#306230] font-bold">HIGH SCORE:</span>
          <span className="font-black text-sm">{data.highScore}</span>
        </div>
        <div className="flex justify-between bg-[#306230]/10 p-1.5 rounded">
          <span className="text-[#306230] font-bold">HIGHEST WAVE:</span>
          <span className="font-black">WAVE {data.highestWave}</span>
        </div>
        <div className="flex justify-between bg-[#306230]/10 p-1.5 rounded">
          <span className="text-[#306230] font-bold">ALIENS DESTROYED:</span>
          <span className="font-black">{data.totalAlienKills}</span>
        </div>
        <div className="flex justify-between bg-[#306230]/10 p-1.5 rounded">
          <span className="text-[#306230] font-bold">GAMES PLAYED:</span>
          <span className="font-black">{data.gamesPlayed}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full py-1.5 bg-[#0f380f] text-[#9bbc0f] text-xs font-black rounded border border-[#0f380f] cursor-pointer active:scale-95 text-center uppercase"
      >
        ◀ BACK TO MENU
      </button>
    </div>
  );
};

export default HighScoresScreen;
