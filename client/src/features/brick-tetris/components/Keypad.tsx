import React from "react";
import type { GameAction, GameState } from "../types";
import { tetrisAudio } from "../services/audioService";

interface KeypadProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const Keypad: React.FC<KeypadProps> = ({ state, dispatch }) => {
  const isPlaying = state.status === "playing";

  return (
    <div className="w-full flex flex-col items-center gap-3 p-3 bg-[#607D3B] rounded-xl border-2 border-[#385020] shadow-md select-none">
      {/* Top action row: Hold, Mode, Pause */}
      <div className="flex justify-between w-full max-w-[280px] px-1">
        <button
          onClick={() => {
            if (isPlaying) {
              dispatch({ type: "HOLD_PIECE" });
              tetrisAudio.playHold();
            }
          }}
          disabled={!isPlaying || !state.canHold}
          className="px-3 py-1.5 bg-[#2B4018] text-[#9BBC0F] disabled:opacity-40 text-xs font-mono font-bold rounded-lg border border-[#1E3010] shadow active:translate-y-0.5 min-w-[64px]"
        >
          HOLD (0)
        </button>

        <button
          onClick={() => {
            dispatch({ type: "PAUSE_TOGGLE" });
            tetrisAudio.playButtonTick();
          }}
          className="px-3 py-1.5 bg-[#2B4018] text-[#9BBC0F] text-xs font-mono font-bold rounded-lg border border-[#1E3010] shadow active:translate-y-0.5 min-w-[64px]"
        >
          PAUSE (5)
        </button>
      </div>

      {/* Main D-Pad controls: Up(Rotate), Down(Soft Drop), Left, Right, Center(Hard Drop) */}
      <div className="grid grid-cols-3 gap-2 w-[220px] h-[170px] items-center justify-items-center">
        {/* Row 1: Rotate CCW (Z/1) | Rotate CW (2/Up) | Rotate 180 */}
        <button
          onClick={() => {
            if (isPlaying) {
              dispatch({ type: "ROTATE_CCW" });
              tetrisAudio.playRotate();
            }
          }}
          aria-label="Rotate Counter-Clockwise"
          className="w-13 h-12 bg-[#203412] active:bg-[#15240B] text-[#8BAC0F] font-mono font-bold rounded-xl border-2 border-[#12200A] shadow flex flex-col items-center justify-center text-[10px]"
        >
          <span>↺ CCW</span>
          <span className="text-[8px] text-[#7F9F0E]">1</span>
        </button>

        <button
          onClick={() => {
            if (isPlaying) {
              dispatch({ type: "ROTATE_CW" });
              tetrisAudio.playRotate();
            } else {
              dispatch({ type: "NAVIGATE_MENU", payload: { direction: "UP" } });
              tetrisAudio.playButtonTick();
            }
          }}
          aria-label="Rotate Clockwise"
          className="w-13 h-12 bg-[#203412] active:bg-[#15240B] text-[#8BAC0F] font-mono font-bold rounded-xl border-2 border-[#12200A] shadow flex flex-col items-center justify-center text-[10px]"
        >
          <span>↻ CW</span>
          <span className="text-[8px] text-[#7F9F0E]">2</span>
        </button>

        <button
          onClick={() => {
            if (isPlaying) {
              dispatch({ type: "HARD_DROP" });
              tetrisAudio.playHardDrop();
            } else {
              dispatch({ type: "SELECT_MENU_ITEM" });
              tetrisAudio.playButtonTick();
            }
          }}
          aria-label="Hard Drop"
          className="w-13 h-12 bg-[#203412] active:bg-[#15240B] text-[#8BAC0F] font-mono font-bold rounded-xl border-2 border-[#12200A] shadow flex flex-col items-center justify-center text-[10px]"
        >
          <span>DROP</span>
          <span className="text-[8px] text-[#7F9F0E]">SPACE</span>
        </button>

        {/* Row 2: Left | Soft Drop | Right */}
        <button
          onClick={() => {
            if (isPlaying) {
              dispatch({ type: "MOVE_LEFT" });
              tetrisAudio.playMove();
            }
          }}
          aria-label="Move Left"
          className="w-13 h-12 bg-[#203412] active:bg-[#15240B] text-[#8BAC0F] font-mono font-bold rounded-xl border-2 border-[#12200A] shadow flex flex-col items-center justify-center text-[10px]"
        >
          <span>◀ LEFT</span>
          <span className="text-[8px] text-[#7F9F0E]">4</span>
        </button>

        <button
          onClick={() => {
            if (isPlaying) {
              dispatch({ type: "SOFT_DROP_START" });
              setTimeout(() => dispatch({ type: "SOFT_DROP_END" }), 150);
              tetrisAudio.playMove();
            } else {
              dispatch({ type: "NAVIGATE_MENU", payload: { direction: "DOWN" } });
              tetrisAudio.playButtonTick();
            }
          }}
          aria-label="Soft Drop"
          className="w-13 h-12 bg-[#203412] active:bg-[#15240B] text-[#8BAC0F] font-mono font-bold rounded-xl border-2 border-[#12200A] shadow flex flex-col items-center justify-center text-[10px]"
        >
          <span>▼ DOWN</span>
          <span className="text-[8px] text-[#7F9F0E]">8</span>
        </button>

        <button
          onClick={() => {
            if (isPlaying) {
              dispatch({ type: "MOVE_RIGHT" });
              tetrisAudio.playMove();
            }
          }}
          aria-label="Move Right"
          className="w-13 h-12 bg-[#203412] active:bg-[#15240B] text-[#8BAC0F] font-mono font-bold rounded-xl border-2 border-[#12200A] shadow flex flex-col items-center justify-center text-[10px]"
        >
          <span>RIGHT ▶</span>
          <span className="text-[8px] text-[#7F9F0E]">6</span>
        </button>
      </div>
    </div>
  );
};
