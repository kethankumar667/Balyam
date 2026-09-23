import React from "react";
import Modal from "../../components/Modal";
import {
  CONNECT4_THEMES,
  MASTER_THEMES,
  type Connect4ThemeId,
  type Connect4ThemeConfig,
} from "./connect4Themes";
import { X, Check, Palette } from "lucide-react";
import { HapticsManager } from "../../services/HapticsManager";
import { connect4Audio } from "./connect4Audio";

interface Connect4ThemeModalProps {
  isOpen: boolean;
  currentThemeId: Connect4ThemeId;
  onSelectTheme: (themeId: Connect4ThemeId) => void;
  onClose: () => void;
}

export function Connect4ThemeModal({
  isOpen,
  currentThemeId,
  onSelectTheme,
  onClose,
}: Connect4ThemeModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabelledBy="theme-modal-title"
      panelClassName="w-full max-w-lg p-0 overflow-hidden"
    >
      <div className="relative w-full rounded-2xl border border-white/10 bg-black/90 p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/5 text-white/80 border border-white/10">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                Architectural Editions
              </h2>
              <p className="text-xs text-white/40">
                Select your tactile material environment
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close theme modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Master Architectural Theme Cards */}
        <div className="space-y-2.5 my-2">
          {MASTER_THEMES.map((themeKey) => {
            const t = CONNECT4_THEMES[themeKey];
            const isSelected =
              currentThemeId === themeKey ||
              (themeKey === "cyber_arcade" && currentThemeId === "cyber_matrix") ||
              (themeKey === "championship_lounge" && currentThemeId === "obsidian_gold");

            return (
              <button
                key={themeKey}
                type="button"
                onClick={() => {
                  HapticsManager.trigger("turn");
                  connect4Audio.playHoverTick(t.soundProfile);
                  onSelectTheme(themeKey);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? "border-white/40 bg-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                    : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Tactile Stone Preview Pair */}
                  <div className="flex items-center -space-x-2 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full shadow-md flex items-center justify-center ${t.rGradient}`}
                      style={{ backgroundColor: t.rFill }}
                    >
                      <div className="w-[65%] h-[65%] rounded-full border border-black/25 bg-black/10 shadow-inner" />
                    </div>
                    <div
                      className={`w-7 h-7 rounded-full shadow-md flex items-center justify-center ${t.yGradient}`}
                      style={{ backgroundColor: t.yFill }}
                    >
                      <div className="w-[65%] h-[65%] rounded-full border border-black/25 bg-black/10 shadow-inner" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{t.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider uppercase border border-white/15 bg-white/5 text-white/70">
                        {t.badge}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 line-clamp-1 mt-0.5 font-normal">
                      {t.description}
                    </p>
                  </div>
                </div>

                {/* Selected Checkmark */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-white text-black" : "border border-white/20 text-transparent"
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
export default Connect4ThemeModal;
