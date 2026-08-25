import React, { useEffect } from "react";
import { confetti } from "@tsparticles/confetti";
import { Eye, LogOut } from "lucide-react";
import Modal from "../../components/Modal";
import SeatAvatar from "../../components/profile/SeatAvatar";
import RematchPanel from "../../components/RematchPanel";
import {
  getPlayerInitials,
  type DotsBoxesSkin,
} from "./dotsboxes-theme";
import type { RankedPlayer } from "./useDotsBoxesBoard";
import type { Player } from "@shared/types";

interface DotsBoxesScorecardModalProps {
  open: boolean;
  onClose: () => void;
  rankedPlayers: RankedPlayer[];
  winner: RankedPlayer | null;
  isTie: boolean;
  selfId: string | null;
  players: Player[];
  totalBoxes: number;
  moveCount: number;
  skin?: DotsBoxesSkin;
  onLeave?: () => void;
}

const DOTSBOXES_CONFETTI_COLORS = ["#3B82F6", "#F59E0B", "#8B5CF6", "#22C55E", "#F43F5E", "#06B6D4", "#FBBF24"];

export default function DotsBoxesScorecardModal({
  open,
  onClose,
  rankedPlayers,
  winner,
  isTie,
  selfId,
  players,
  totalBoxes,
  moveCount,
  skin = "notebook",
  onLeave,
}: DotsBoxesScorecardModalProps) {
  useEffect(() => {
    if (
      open &&
      typeof window !== "undefined" &&
      typeof (window as unknown as { HTMLCanvasElement?: unknown }).HTMLCanvasElement !== "undefined"
    ) {
      const colors = winner?.theme
        ? [winner.theme.primary, winner.theme.light, "#FBBF24", "#FFFFFF"]
        : DOTSBOXES_CONFETTI_COLORS;

      try {
        // Main center burst
        void confetti({
          count: 120,
          spread: 110,
          startVelocity: 45,
          position: { x: 50, y: 25 },
          colors,
        })?.catch(() => {});

        // Dual flank cannons
        setTimeout(() => {
          void confetti({
            count: 50,
            angle: 60,
            spread: 55,
            startVelocity: 35,
            position: { x: 15, y: 65 },
            colors,
          })?.catch(() => {});

          void confetti({
            count: 50,
            angle: 120,
            spread: 55,
            startVelocity: 35,
            position: { x: 85, y: 65 },
            colors,
          })?.catch(() => {});
        }, 300);
      } catch {
        // Safe fallback
      }
    }
  }, [open, winner]);

  if (!open) return null;

  const isNotebook = skin === "notebook";
  const isSelfWinner = !isTie && winner?.pid === selfId;
  const winnerPercentage = Math.round(
    ((winner?.score ?? 0) / Math.max(1, totalBoxes)) * 100
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Match Scorecard"
      mobileSheet={false}
      panelClassName={`w-full max-w-[94vw] sm:max-w-[640px] md:max-w-[860px] max-h-[92dvh] flex flex-col rounded-3xl border-2 shadow-2xl overflow-hidden ${
        isNotebook
          ? "bg-[#FCF8EE] border-[#D7C9B1] text-stone-900 font-['Patrick_Hand',cursive]"
          : "bg-gradient-to-b from-[#11163C] via-[#0C0F2D] to-[#07091B] border-sky-500/40 text-slate-100"
      }`}
    >
      {/* ── 1. Header (Fixed at top) ── */}
      <div
        className={`relative z-10 flex-shrink-0 p-4 sm:p-5 md:p-6 text-center border-b ${
          isNotebook
            ? "border-[#E5DAC6] bg-[#FCF8EE]/95"
            : "border-slate-800/80 bg-[#0C0F2D]/95"
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-1.5 shadow-xs ${
              isNotebook
                ? "bg-amber-100 border border-amber-400 text-amber-900 font-['Architects_Daughter',cursive]"
                : "bg-amber-500/20 border border-amber-400/50 text-amber-300"
            }`}
          >
            <span className="text-sm">🏆</span>
            <span>{isTie ? "Match Tied" : isNotebook ? "Classroom Champion" : "Victory Celebration"}</span>
          </div>

          {/* Heading */}
          <h2
            className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
              isNotebook
                ? "text-[#1E3A8A] font-['Architects_Daughter',cursive] drop-shadow-xs"
                : "text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-yellow-300"
            }`}
          >
            {isTie
              ? "It's a Tie Game!"
              : isSelfWinner
              ? "🎉 You Won the Match!"
              : `${winner?.name ?? "Player"} Won the Match!`}
          </h2>

          {/* Subtitle */}
          <p className={`text-xs sm:text-sm mt-0.5 ${isNotebook ? "text-stone-600 font-bold" : "text-slate-300"}`}>
            {isTie
              ? `Tied match with ${winner?.score ?? 0} boxes each.`
              : `${winner?.name} captured ${winner?.score ?? 0} of ${totalBoxes} boxes (${winnerPercentage}% territory)!`}
          </p>
        </div>
      </div>

      {/* ── 2. Scrollable Body (Winner Podium + Standings) ── */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 md:p-6 no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          {/* Left Column: Winner Spotlight Podium & Match Stats (5 Cols on Desktop) */}
          <div className="md:col-span-5 flex flex-col gap-3.5">
            {/* Winner Spotlight Card */}
            <div
              className={`p-4 sm:p-5 rounded-3xl border-2 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-md ${
                isNotebook
                  ? "bg-white border-[#D7C9B1]"
                  : "bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800"
              }`}
              style={{
                borderColor: winner?.theme.primary ?? (isNotebook ? "#D7C9B1" : "#F59E0B"),
              }}
            >
              {/* Floating Crown Badge */}
              {!isTie && (
                <div className="absolute top-2.5 right-3 text-lg animate-bounce">👑</div>
              )}

              {/* Avatar */}
              <div
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 mb-2.5 flex items-center justify-center shadow-md"
                style={{ backgroundColor: winner?.theme.primary ?? "#F59E0B" }}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                  {winner?.avatar ? (
                    <SeatAvatar avatar={winner.avatar} name={winner.name} className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="font-black text-xl"
                      style={{
                        color: winner?.theme.primary,
                        fontFamily: winner?.theme.fontFamily ?? "inherit",
                      }}
                    >
                      {getPlayerInitials(winner?.name ?? "")}
                    </span>
                  )}
                </div>
              </div>

              {/* Winner Name */}
              <div
                className={`font-black text-base sm:text-lg truncate max-w-full mb-0.5 ${
                  isNotebook ? "text-stone-900" : "text-white"
                }`}
                style={{ fontFamily: winner?.theme.fontFamily ?? "inherit" }}
              >
                {winner?.name}
              </div>
              <div className={`text-xs font-bold mb-2 ${isNotebook ? "text-amber-800" : "text-amber-400"}`}>
                1st Place Champion
              </div>

              {/* Box Score Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border ${
                  isNotebook
                    ? "bg-[#FCF8EE] border-[#E5DAC6]"
                    : "bg-slate-950/90 border-slate-800"
                }`}
              >
                <span
                  className="text-base font-black"
                  style={{
                    color: winner?.theme.primary,
                    fontFamily: winner?.theme.fontFamily ?? "inherit",
                  }}
                >
                  {winner?.score}
                </span>
                <span className={`text-xs uppercase font-bold ${isNotebook ? "text-stone-500" : "text-slate-400"}`}>
                  Boxes Won
                </span>
              </div>
            </div>

            {/* Quick Match Stats */}
            <div
              className={`grid grid-cols-2 gap-2 p-3 rounded-2xl border text-center text-xs ${
                isNotebook
                  ? "bg-white border-[#E5DAC6]"
                  : "bg-slate-950/80 border-slate-800/80"
              }`}
            >
              <div>
                <div className={`text-[10px] uppercase font-bold ${isNotebook ? "text-stone-500" : "text-slate-400"}`}>
                  Total Moves
                </div>
                <div className={`font-black text-sm sm:text-base mt-0.5 ${isNotebook ? "text-stone-900" : "text-slate-100"}`}>
                  {moveCount}
                </div>
              </div>
              <div>
                <div className={`text-[10px] uppercase font-bold ${isNotebook ? "text-stone-500" : "text-slate-400"}`}>
                  Board Claimed
                </div>
                <div className={`font-black text-sm sm:text-base mt-0.5 ${isNotebook ? "text-blue-700" : "text-amber-400"}`}>
                  {totalBoxes} / {totalBoxes}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Complete Standings List (7 Cols on Desktop) */}
          <div className="md:col-span-7 flex flex-col">
            <div
              className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2 px-1 ${
                isNotebook ? "text-stone-600 font-['Architects_Daughter',cursive]" : "text-slate-400"
              }`}
            >
              <span>Final Standings</span>
              <span>Boxes Captured</span>
            </div>

            <div className="space-y-2">
              {rankedPlayers.map((p) => {
                const isSelf = p.pid === selfId;
                const isFirst = p.rank === 1 && !isTie;
                const isSecond = p.rank === 2;
                const isThird = p.rank === 3;
                const handwritingFont = p.theme.fontFamily ?? "inherit";

                return (
                  <div
                    key={p.pid}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all ${
                      isNotebook
                        ? isFirst
                          ? "bg-amber-100/90 border-amber-500 shadow-sm"
                          : "bg-white border-[#E5DAC6]"
                        : isFirst
                        ? "bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-slate-900/80 border-2 border-amber-500/70 shadow-sm"
                        : isSecond
                        ? "bg-slate-900/80 border border-slate-500/40"
                        : isThird
                        ? "bg-slate-900/80 border border-amber-700/40"
                        : "bg-slate-900/60 border border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Medal / Rank */}
                      <span className="w-5 text-center font-black text-sm">
                        {isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : `#${p.rank}`}
                      </span>

                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: p.theme.primary }}
                      >
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                          {p.avatar ? (
                            <SeatAvatar avatar={p.avatar} name={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span
                              className="font-bold text-xs"
                              style={{ color: p.theme.primary, fontFamily: handwritingFont }}
                            >
                              {getPlayerInitials(p.name)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`font-bold text-xs sm:text-sm truncate ${
                            isNotebook ? "text-stone-900" : "text-slate-100"
                          }`}
                          style={{ fontFamily: handwritingFont }}
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        {isSelf && (
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                              isNotebook
                                ? "bg-blue-100 text-blue-800 border-blue-300 font-sans"
                                : "bg-sky-950/90 text-sky-400 border-sky-800/70"
                            }`}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="font-black text-sm sm:text-base tracking-tight"
                        style={{ color: p.theme.primary, fontFamily: handwritingFont }}
                      >
                        {p.score.toString().padStart(2, "0")}
                      </span>
                      <span className={`text-[11px] uppercase font-bold ${isNotebook ? "text-stone-500" : "text-slate-400"}`}>
                        Boxes
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Action Dock (Fixed at bottom) ── */}
      <div
        className={`relative z-10 flex-shrink-0 p-4 sm:p-5 border-t space-y-2.5 ${
          isNotebook
            ? "border-[#E5DAC6] bg-[#FCF8EE]/95"
            : "border-slate-800/80 bg-[#0C0F2D]/95"
        }`}
      >
        {/* Rematch Panel */}
        <RematchPanel players={players} selfId={selfId} className="w-full" />

        {/* Secondary Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-xs ${
              isNotebook
                ? "bg-white hover:bg-stone-50 text-stone-800 border-2 border-stone-300 shadow-xs hover:border-stone-400"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 shadow-md"
            }`}
          >
            <Eye className={`w-4 h-4 ${isNotebook ? "text-stone-600" : "text-sky-400"}`} />
            <span>Inspect Board</span>
          </button>
          <button
            type="button"
            onClick={onLeave}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-xs ${
              isNotebook
                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 shadow-xs hover:border-rose-400"
                : "bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 shadow-md"
            }`}
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Leave Game</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
