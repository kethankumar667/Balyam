import React from "react";
import type { GameAction, GameState } from "../types";
import { MENU_ITEMS } from "../constants/gameConstants";

interface MenuScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ state, dispatch }) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 bg-[#8BAC0F] select-none text-[#0F380F]">
      <div className="text-center pt-2">
        <h2 className="text-lg font-black tracking-widest uppercase font-mono">
          BRICK BLOCKS
        </h2>
        <span className="text-[10px] font-bold text-[#306230] uppercase">
          MODE: {state.mode}
        </span>
      </div>

      <div className="flex flex-col gap-2 my-auto">
        {MENU_ITEMS.map((item, idx) => {
          const isSelected = state.selectedMenuItem === idx;
          const label = idx === 1 ? `MODE: ${state.mode}` : item;

          return (
            <button
              key={item}
              onClick={() => {
                if (idx === 1) {
                  dispatch({ type: "TOGGLE_MODE" });
                } else {
                  dispatch({ type: "SELECT_MENU_ITEM" });
                }
              }}
              className={`flex items-center justify-between px-3 py-2 rounded text-xs font-mono font-bold transition-all border ${
                isSelected
                  ? "bg-[#0F380F] text-[#8BAC0F] border-[#0F380F] shadow-sm"
                  : "bg-[#7F9F0E]/30 text-[#0F380F] border-[#306230]/40 hover:bg-[#7F9F0E]/60"
              }`}
            >
              <span>{isSelected ? `▶ ${label}` : `  ${label}`}</span>
            </button>
          );
        })}
      </div>

      <div className="text-center pb-1 text-[9.5px] font-mono text-[#306230]">
        <span>USE 2/8 (UP/DN) • 5/ENTER (OK)</span>
      </div>
    </div>
  );
};
