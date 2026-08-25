import React, { useState, useEffect, useCallback } from "react";
import type { CoinColor, DotsBoxesColor, LudoColor, Player } from "@shared/types";
import { COLOR_HEX, PLAYER_COLORS_ORDER } from "../../games/ludo/board-layout";
import { COIN_COLOR_HEX } from "../CoinColorPicker";
import {
  DOTSBOXES_NEON_THEMES,
  DOTSBOXES_NOTEBOOK_THEMES,
  type DotsBoxesSkin,
} from "../../games/dotsboxes/dotsboxes-theme";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const LUDO_COLORS: { id: LudoColor; label: string; hex: string }[] =
  PLAYER_COLORS_ORDER.map((id) => ({
    id,
    label: capitalize(id),
    hex: COLOR_HEX[id],
  }));

const SNL_ORDER: CoinColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "cyan",
  "orange",
  "pink",
  "lime",
  "magenta",
];

function isBrightColor(colorId: string): boolean {
  return ["yellow", "cyan", "lime", "pink", "green", "orange"].includes(colorId.toLowerCase());
}

export default function CompactColorSelector({
  kind,
  players,
  selfId,
  onChooseLudoColor,
  onChooseCoinColor,
  onChoosePenColor,
}: {
  kind: "ludo" | "snl" | "dotsboxes";
  players: Player[];
  selfId: string | null;
  onChooseLudoColor?: (color: LudoColor) => void;
  onChooseCoinColor?: (color: CoinColor) => void;
  onChoosePenColor?: (color: DotsBoxesColor) => void;
}) {
  const self = players.find((p) => p.id === selfId);

  // Dots & Boxes skin state synchronized with localStorage
  const [skin, setSkin] = useState<DotsBoxesSkin>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bhalyam.dotsboxes.skin");
      if (saved === "neon" || saved === "notebook") return saved;
    }
    return "notebook";
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("bhalyam.dotsboxes.skin");
      if (saved === "neon" || saved === "notebook") {
        setSkin(saved);
      }
    };
    window.addEventListener("dotsboxes:skinChange", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("dotsboxes:skinChange", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleSetSkin = useCallback((newSkin: DotsBoxesSkin) => {
    setSkin(newSkin);
    if (typeof window !== "undefined") {
      localStorage.setItem("bhalyam.dotsboxes.skin", newSkin);
      window.dispatchEvent(new Event("dotsboxes:skinChange"));
    }
  }, []);

  // 1. Dots & Boxes Pen Color & Theme Selector
  if (kind === "dotsboxes") {
    const selectedPen = self?.penColor;
    const penList = skin === "notebook" ? DOTSBOXES_NOTEBOOK_THEMES : DOTSBOXES_NEON_THEMES;

    return (
      <div className="bg-[#FFFDF8] dark:bg-[var(--chrome-panel)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Theme Switcher Banner */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-200">
                Board Game Theme
              </div>
              <div className="text-[11px] text-stone-500">
                {skin === "notebook" ? "Realistic School Notebook Paper" : "Dark Neon Arcade"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-900/10 dark:bg-black/40 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => handleSetSkin("notebook")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                skin === "notebook"
                  ? "bg-amber-500 text-stone-950 shadow-md scale-102 font-['Patrick_Hand',cursive] text-sm"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              📓 Notebook
            </button>
            <button
              type="button"
              onClick={() => handleSetSkin("neon")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                skin === "neon"
                  ? "bg-sky-500 text-white shadow-md scale-102"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              ⚡ Neon
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-baseline justify-between pb-1 border-b border-[#EEDBCA]/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span aria-hidden>✏️</span>
            <h2 className="text-xs uppercase tracking-wider text-[#5C4328] dark:text-slate-300 font-extrabold">
              Pick Your Pen Color
            </h2>
          </div>
          <span className="text-[11px] text-[#5C4328] dark:text-slate-300 font-bold">
            First come, first served
          </span>
        </div>

        {/* Responsive 6 pen color chips */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {penList.map((theme) => {
            const owner = players.find((p) => p.penColor === theme.colorKey);
            const isMe = owner?.id === selfId;
            const isOther = !!owner && !isMe;
            const isAvailable = !owner;

            return (
              <button
                key={theme.colorKey}
                type="button"
                onClick={() => isAvailable && onChoosePenColor?.(theme.colorKey)}
                disabled={isOther}
                title={
                  isMe
                    ? "Your selected pen color"
                    : isOther
                    ? `Occupied by ${owner.name}`
                    : `Pick ${theme.name}`
                }
                aria-label={`Pen color ${theme.name}${
                  isMe ? " (Selected by you)" : isOther ? ` (Occupied by ${owner.name})` : ""
                }`}
                className={`min-h-[54px] relative rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all border-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isMe
                    ? "border-white ring-2 ring-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.6)] scale-105"
                    : isOther
                    ? "border-transparent opacity-40 !cursor-not-allowed"
                    : "border-white/20 hover:border-white hover:scale-105"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${theme.light} 0%, ${theme.primary} 100%)`,
                  boxShadow: isMe ? `0 0 16px ${theme.glow}` : "0 4px 10px rgba(0,0,0,0.12)",
                }}
              >
                <div className="w-5 h-5 rounded-full bg-white/30 border border-white/70 shadow-inner flex items-center justify-center">
                  {isMe && <span className="text-[11px] text-white font-black drop-shadow-sm">✓</span>}
                </div>
                <span className="text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] tracking-wide">
                  {theme.name}
                </span>

                {isOther && (
                  <span className="absolute -top-1.5 -right-1 text-[9px] font-bold text-white bg-slate-950/90 rounded px-1.5 truncate max-w-[85%] shadow-sm">
                    {owner.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-[#5C4328] dark:text-slate-300 font-bold">
          {selectedPen
            ? `You selected ${capitalize(selectedPen)} pen. Tap another to change.`
            : "No pen color selected. An available color will be auto-assigned when the game starts."}
        </p>
      </div>
    );
  }

  // 2. Ludo Color Selector
  if (kind === "ludo") {
    const selectedColor = self?.chosenColor;

    return (
      <div className="bg-[#FFFDF8] dark:bg-[var(--chrome-panel)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-baseline justify-between pb-1 border-b border-[#EEDBCA]/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span aria-hidden>🎨</span>
            <h2 className="text-xs uppercase tracking-wider text-[#5C4328] dark:text-slate-300 font-extrabold">
              Pick Your Color
            </h2>
          </div>
          <span className="text-[11px] text-[#5C4328] dark:text-slate-300 font-bold">
            First come, first served
          </span>
        </div>

        {/* Responsive color chips */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {LUDO_COLORS.map((c) => {
            const owner = players.find((p) => p.chosenColor === c.id);
            const isMe = owner?.id === selfId;
            const isOther = !!owner && !isMe;
            const isAvailable = !owner;
            const isBright = isBrightColor(c.id);

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => isAvailable && onChooseLudoColor?.(c.id)}
                disabled={isOther}
                title={
                  isMe
                    ? "Your selected color"
                    : isOther
                    ? `Occupied by ${owner.name}`
                    : `Pick ${c.label}`
                }
                aria-label={`Color ${c.label}${
                  isMe ? " (Selected by you)" : isOther ? ` (Occupied by ${owner.name})` : ""
                }`}
                className={`min-h-[44px] relative rounded-xl p-2 flex flex-col items-center justify-center gap-1 transition-all border-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F] ${
                  isMe
                    ? "border-[#EA5A1F] dark:border-amber-400 shadow-md scale-105"
                    : isOther
                    ? "border-transparent opacity-40 !cursor-not-allowed"
                    : "border-transparent hover:border-[#EEDBCA] dark:hover:border-slate-700 hover:scale-102"
                }`}
                style={{ background: c.hex }}
              >
                <div className={`w-5 h-5 rounded-full ${isBright ? "bg-black/20 border-black/30" : "bg-white/30 border-white/60"} border shadow-inner flex items-center justify-center`}>
                  {isMe && <span className={`text-[10px] ${isBright ? "text-slate-950" : "text-white"} font-black`}>✓</span>}
                </div>
                <span className={`text-[10px] font-black truncate max-w-full ${isBright ? "text-slate-950" : "text-white drop-shadow-sm"}`}>
                  {c.label}
                </span>

                {isOther && (
                  <span className="absolute -top-1.5 -right-1 text-[9px] font-bold text-white bg-slate-950/80 rounded px-1 truncate max-w-[85%]">
                    {owner.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-[#5C4328] dark:text-slate-300 font-bold">
          {selectedColor
            ? `You selected ${capitalize(selectedColor)}. Tap another to change.`
            : "No color selected. An available color will be assigned when the game starts."}
        </p>
      </div>
    );
  }

  // 3. Snakes and ladders coin colors
  const selectedCoin = self?.coinColor;

  return (
    <div className="bg-[#FFFDF8] dark:bg-[var(--chrome-panel)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-baseline justify-between pb-1 border-b border-[#EEDBCA]/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span aria-hidden>🪙</span>
          <h2 className="text-xs uppercase tracking-wider text-[#5C4328] dark:text-slate-300 font-extrabold">
            Pick Your Coin Color
          </h2>
        </div>
        <span className="text-[11px] text-[#5C4328] dark:text-slate-300 font-bold">
          First come, first served
        </span>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {SNL_ORDER.map((c) => {
          const palette = COIN_COLOR_HEX[c];
          const owner = players.find((p) => p.coinColor === c);
          const isMe = owner?.id === selfId;
          const isOther = !!owner && !isMe;
          const isAvailable = !owner;
          const isBright = isBrightColor(c);

          return (
            <button
              key={c}
              type="button"
              onClick={() => isAvailable && onChooseCoinColor?.(c)}
              disabled={isOther}
              title={
                isMe
                  ? "Your selected coin"
                  : isOther
                  ? `Taken by ${owner.name}`
                  : `Pick ${palette.label}`
              }
              aria-label={`Coin ${palette.label}${
                isMe ? " (Selected by you)" : isOther ? ` (Occupied by ${owner.name})` : ""
              }`}
              className={`min-h-[44px] relative rounded-xl p-1.5 flex flex-col items-center justify-center gap-1 transition-all border-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F] ${
                isMe
                  ? "border-[#EA5A1F] dark:border-amber-400 shadow-md scale-105"
                  : isOther
                  ? "border-transparent opacity-40 !cursor-not-allowed"
                  : "border-transparent hover:border-[#EEDBCA] dark:hover:border-slate-700 hover:scale-102"
              }`}
              style={{ background: palette.fill }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  color: palette.dark,
                }}
              >
                {isMe ? (self?.name.charAt(0).toUpperCase() ?? "✓") : ""}
              </div>
              <span className={`text-[10px] font-black truncate max-w-full ${isBright ? "text-slate-950" : "text-white drop-shadow-sm"}`}>
                {palette.label}
              </span>

              {isOther && (
                <span className="absolute -top-1.5 -right-1 text-[9px] font-bold text-white bg-slate-950/80 rounded px-1 truncate max-w-[85%]">
                  {owner.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[#5C4328] dark:text-slate-300 font-bold">
        {selectedCoin
          ? `You picked ${COIN_COLOR_HEX[selectedCoin].label}. Tap another to change.`
          : "No color selected. An available color will be auto-assigned when the game starts."}
      </p>
    </div>
  );
}
