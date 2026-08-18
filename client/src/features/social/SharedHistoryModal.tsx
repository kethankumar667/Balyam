import React from "react";
import type { Friend, SharedHistory } from "@shared/social/Friend";
import { SURFACES } from "../../design-system/dls";
import { TournamentCupIcon, StreakFlameIcon } from "../../design-system/icons";

interface SharedHistoryModalProps {
  friend: Friend | null;
  history: SharedHistory | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SharedHistoryModal({
  friend,
  history,
  isOpen,
  onClose,
}: SharedHistoryModalProps) {
  if (!isOpen || !friend) return null;

  const winRate =
    history && history.matchesPlayedTogether > 0
      ? Math.round((history.winsTogether / history.matchesPlayedTogether) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sharedHistoryTitle"
    >
      <div
        className={`max-w-md w-full rounded-3xl p-6 sm:p-8 ${SURFACES.modalHero} text-center space-y-6 relative overflow-hidden border border-stone-800 shadow-2xl`}
      >
        <div className="w-16 h-16 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center text-3xl mx-auto shadow">
          {friend.avatar || "👤"}
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest block">
            SHARED COMBAT HISTORY
          </span>
          <h3 id="sharedHistoryTitle" className="text-xl font-black text-stone-100">
            Battles with {friend.displayName}
          </h3>
          <p className="text-xs text-stone-500 font-mono">
            ID: {friend.friendPlayerId}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-stone-500 block uppercase">
              Matches
            </span>
            <span className="text-lg font-black font-mono text-stone-100">
              {history?.matchesPlayedTogether || 0}
            </span>
          </div>
          <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-stone-500 block uppercase">
              Wins
            </span>
            <span className="text-lg font-black font-mono text-amber-400">
              {history?.winsTogether || 0}
            </span>
          </div>
          <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-stone-500 block uppercase">
              Win Rate
            </span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {winRate}%
            </span>
          </div>
        </div>

        {/* Tournaments played */}
        <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono">
          <span className="text-stone-400 flex items-center gap-1.5">
            <TournamentCupIcon size={14} className="text-amber-400" />
            Tournaments Together
          </span>
          <span className="font-bold text-stone-200">
            {history?.tournamentsTogether || 0}
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2.5 rounded-xl text-xs font-mono uppercase transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
