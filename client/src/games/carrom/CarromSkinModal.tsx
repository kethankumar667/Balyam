import React from "react";
import type { StrikerSkin, BoardFeltSkin } from "@shared/types";
import { BOARD_SKINS, STRIKER_SKINS } from "./carrom-shared";
import Modal from "../../components/Modal";

export interface CarromSkinModalProps {
  open: boolean;
  onClose: () => void;
  currentStriker: StrikerSkin;
  currentFelt: BoardFeltSkin;
  onSelectStriker: (skin: StrikerSkin) => void;
  onSelectFelt: (skin: BoardFeltSkin) => void;
}

export default function CarromSkinModal({
  open,
  onClose,
  currentStriker,
  currentFelt,
  onSelectStriker,
  onSelectFelt,
}: CarromSkinModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Custom Skins & Themes"
      panelClassName="w-full max-w-lg rounded-3xl bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 border border-amber-500/30 shadow-2xl p-6 flex flex-col gap-6 text-stone-100 select-none"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-lg font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
          🎨 Custom Skins & Themes
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none text-stone-300 font-bold flex items-center justify-center transition cursor-pointer"
        >
          ✕
        </button>
      </div>

        {/* Striker Skin Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-200/80">
            Striker Skin
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(Object.keys(STRIKER_SKINS) as StrikerSkin[]).map((key) => {
              const cfg = STRIKER_SKINS[key];
              const selected = currentStriker === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectStriker(key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition cursor-pointer active:scale-95 ${
                    selected
                      ? "bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {/* Striker Preview */}
                  <div
                    className="w-8 h-8 rounded-full shadow-md flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${cfg.start}, ${cfg.end})`,
                      border: `2px solid ${cfg.rim}`,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: cfg.core }}
                    />
                  </div>
                  <span className="text-xs font-bold text-amber-100">{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Felt Skin Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-200/80">
            Board Felt Theme
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(BOARD_SKINS) as BoardFeltSkin[]).map((key) => {
              const cfg = BOARD_SKINS[key];
              const selected = currentFelt === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectFelt(key)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer active:scale-95 ${
                    selected
                      ? "bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {/* Board Felt Swatch Preview */}
                  <div
                    className="w-8 h-8 rounded-xl shadow-md border border-white/20"
                    style={{
                      background: `radial-gradient(circle, ${cfg.boardBgStart}, ${cfg.boardBgEnd})`,
                    }}
                  />
                  <span className="text-xs font-bold text-amber-100">{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg active:scale-98 transition cursor-pointer"
        >
          Apply & Return to Game
        </button>
    </Modal>
  );
}
