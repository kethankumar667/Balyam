import React from "react";

export const ControlsHelp: React.FC = () => {
  return (
    <div className="bg-[#121b12] border border-[#8bac0f]/30 rounded-xl p-4 text-xs font-mono text-zinc-300 w-full max-w-[320px] shadow-lg">
      <h3 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-1.5 uppercase">
        <span>🎮</span> Desktop Controls
      </h3>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-zinc-400">Move Paddle Left:</span>
          <span className="font-bold text-amber-300">← / A / 4</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Move Paddle Right:</span>
          <span className="font-bold text-amber-300">→ / D / 6</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Launch / Confirm:</span>
          <span className="font-bold text-amber-300">Space / Enter</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Pause / Resume:</span>
          <span className="font-bold text-amber-300">P / Esc</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Restart:</span>
          <span className="font-bold text-amber-300">R</span>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-[#8bac0f]/20 text-[11px] text-zinc-400">
        💡 <strong className="text-zinc-200">Angle Deflection:</strong> Hitting the paddle edges angles the ball left or right for precision target shots!
      </div>
    </div>
  );
};

export default ControlsHelp;
