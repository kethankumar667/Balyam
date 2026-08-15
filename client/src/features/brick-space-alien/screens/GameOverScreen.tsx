import React from "react";

interface GameOverScreenProps {
  score: number;
  highScore: number;
  wave: number;
  onRestart: () => void;
  onMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  highScore,
  wave,
  onRestart,
  onMenu,
}) => {
  const isNewHighScore = score > 0 && score >= highScore;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#8bac0f] text-[#0f380f] font-mono p-4 select-none z-20">
      <div className="flex flex-col items-center gap-2 border-2 border-[#0f380f] p-4 rounded-lg bg-[#9bbc0f] w-full max-w-[210px] shadow-lg text-center">
        <h3 className="text-base font-black tracking-widest uppercase">GAME OVER</h3>
        {isNewHighScore && (
          <span className="text-[10px] font-black text-amber-700 bg-amber-200 px-2 py-0.5 rounded border border-amber-500 animate-pulse">
            ★ NEW HIGH SCORE! ★
          </span>
        )}

        <div className="flex flex-col gap-1 w-full text-xs my-1 bg-[#306230]/10 p-2 rounded">
          <div className="flex justify-between">
            <span className="text-[#306230] font-bold">SCORE:</span>
            <span className="font-black">{score}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#306230] font-bold">WAVE:</span>
            <span className="font-black">{wave}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#306230] font-bold">BEST:</span>
            <span className="font-black">{highScore}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="w-full py-1.5 bg-[#0f380f] text-[#9bbc0f] text-xs font-black rounded border border-[#0f380f] cursor-pointer active:scale-95 uppercase"
        >
          PLAY AGAIN (R)
        </button>

        <button
          type="button"
          onClick={onMenu}
          className="w-full py-1.5 bg-transparent text-[#0f380f] text-xs font-black rounded border border-[#0f380f] hover:bg-[#306230]/20 cursor-pointer active:scale-95 uppercase"
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
