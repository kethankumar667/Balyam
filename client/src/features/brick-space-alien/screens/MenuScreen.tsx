import React from "react";
import { MENU_OPTIONS } from "../constants";

interface MenuScreenProps {
  selectedIndex: number;
  soundEnabled: boolean;
  onSelect: (index: number) => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  selectedIndex,
  soundEnabled,
  onSelect,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between bg-[#8bac0f] text-[#0f380f] font-mono p-4 select-none z-20">
      {/* Title Header */}
      <div className="flex flex-col items-center mt-2">
        <span className="text-2xl mb-1">👾 👾 👾</span>
        <h2 className="text-lg font-black tracking-widest uppercase">SPACE ALIEN</h2>
        <span className="text-[10px] font-bold text-[#306230] tracking-wider">DEFEND THE GALAXY</span>
      </div>

      {/* Menu Options */}
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        {MENU_OPTIONS.map((opt, idx) => {
          const isSelected = idx === selectedIndex;
          const displayLabel = idx === 3 ? `SOUND: ${soundEnabled ? "ON" : "OFF"}` : opt;

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(idx)}
              className={`w-full py-1.5 px-3 text-xs font-black tracking-wider flex items-center justify-between rounded border cursor-pointer transition ${
                isSelected
                  ? "bg-[#0f380f] text-[#9bbc0f] border-[#0f380f] shadow"
                  : "bg-transparent text-[#0f380f] border-[#306230]/40 hover:bg-[#306230]/10"
              }`}
            >
              <span>{displayLabel}</span>
              {isSelected && <span>▶</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom Key Prompt */}
      <div className="text-[10px] font-bold text-[#306230] text-center mb-1">
        PRESS ENTER OR FIRE TO SELECT
      </div>
    </div>
  );
};

export default MenuScreen;
