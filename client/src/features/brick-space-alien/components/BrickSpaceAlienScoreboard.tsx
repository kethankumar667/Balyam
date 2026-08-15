import React from "react";

interface BrickSpaceAlienScoreboardProps {
  score: number;
  highScore: number;
  lives: number;
  wave: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const BrickSpaceAlienScoreboard: React.FC<BrickSpaceAlienScoreboardProps> = ({
  score,
  highScore,
  lives,
  wave,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 bg-[#111928] border-2 border-[#1f2a44] rounded-xl text-zinc-200 font-mono select-none w-full max-w-[320px] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#1f2a44] pb-1.5 text-xs">
        <span className="font-black text-amber-400 uppercase flex items-center gap-1">
          <span>👾</span> SPACE ALIEN
        </span>
        <button
          type="button"
          onClick={onToggleSound}
          className="px-2 py-0.5 rounded bg-[#1e2942] hover:bg-[#2b3a5c] text-xs font-bold text-[#00f0ff] border border-[#2b3a5c] transition cursor-pointer"
        >
          {soundEnabled ? "🔊 AUDIO" : "🔇 MUTED"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0b101c] p-2 rounded border border-[#1a233a]">
          <span className="text-[10px] text-zinc-400 block">SCORE</span>
          <span className="font-black text-base text-amber-400">{score}</span>
        </div>
        <div className="bg-[#0b101c] p-2 rounded border border-[#1a233a]">
          <span className="text-[10px] text-zinc-400 block">HIGH SCORE</span>
          <span className="font-black text-base text-[#00f0ff]">{highScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0b101c] p-2 rounded border border-[#1a233a]">
          <span className="text-[10px] text-zinc-400 block">WAVE</span>
          <span className="font-black text-sm text-green-400">WAVE {wave}</span>
        </div>
        <div className="bg-[#0b101c] p-2 rounded border border-[#1a233a]">
          <span className="text-[10px] text-zinc-400 block">DEFENDER LIVES</span>
          <div className="flex items-center gap-1 font-black text-sm text-rose-400">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <span key={i}>🚀</span>
            ))}
            {lives <= 0 && <span className="text-zinc-500 text-xs">NONE</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrickSpaceAlienScoreboard;
