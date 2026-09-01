import React from "react";
import type { ChessBoardTheme, ChessPieceSet } from "@shared/types";
import { CHESS_THEMES } from "./chess-shared";
import Modal from "../../components/Modal";

export default function ChessSkinModal({
  isOpen,
  onClose,
  currentTheme,
  currentPieceSet,
  onSelectTheme,
  onSelectPieceSet,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ChessBoardTheme;
  currentPieceSet: ChessPieceSet;
  onSelectTheme: (theme: ChessBoardTheme) => void;
  onSelectPieceSet: (set: ChessPieceSet) => void;
}) {
  const themes: { id: ChessBoardTheme; name: string; light: string; dark: string }[] = [
    { id: "emerald", name: "Emerald Tournament", light: "#EEEED2", dark: "#769656" },
    { id: "wood", name: "Classic Mahogany", light: "#F0D9B5", dark: "#B58863" },
    { id: "glass", name: "Glass Prism", light: "#E2E8F0", dark: "#64748B" },
    { id: "cyberpunk", name: "Neon Cyber", light: "#CFFAFE", dark: "#0891B2" },
    { id: "classic", name: "Monochrome Dark", light: "#E4E4E7", dark: "#52525B" },
  ];

  const pieceSets: { id: ChessPieceSet; name: string; preview: string }[] = [
    { id: "neo", name: "Neo Modern", preview: "Flat geometric masses" },
    { id: "staunton", name: "Staunton Classic", preview: "Turned-wood silhouettes" },
    { id: "3d_glass", name: "3D Glass Prism", preview: "Neo shapes, glass finish" },
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      ariaLabel="Chess Custom Themes"
      panelClassName="relative w-full max-w-md bg-stone-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-6 text-stone-100 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <h3 className="text-lg font-black text-amber-400 uppercase tracking-wide">
            Chess Custom Themes
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-stone-800 hover:bg-stone-700 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none flex items-center justify-center text-stone-400 hover:text-white transition cursor-pointer"
        >
          ✕
        </button>
      </div>

        {/* Board Felt Themes */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
            1. Board Felt Style
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {themes.map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTheme(t.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg"
                      : "bg-stone-800/80 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden grid grid-cols-2 border border-white/20 shrink-0">
                    <div style={{ backgroundColor: t.light }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.light }} />
                  </div>
                  <span className="text-xs font-bold text-stone-200 truncate">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Piece Sets */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
            2. Piece Set Design
          </h4>
          <div className="space-y-2">
            {pieceSets.map((s) => {
              const isSelected = currentPieceSet === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectPieceSet(s.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg"
                      : "bg-stone-800/80 border-white/10 hover:border-white/20"
                  }`}
                >
                  <span className="text-xs font-bold text-stone-200">{s.name}</span>
                  <span className="text-sm font-serif tracking-widest text-amber-300">
                    {s.preview}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg transition cursor-pointer active:scale-95"
        >
          Apply Theme
        </button>
    </Modal>
  );
}
