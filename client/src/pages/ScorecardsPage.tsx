import React, { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Trophy, RefreshCw, AlertCircle } from "lucide-react";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import { useScorecardStore } from "../store/scorecardStore";
import ChronoScorecardDeck from "../components/scorecard/ChronoScorecardDeck";
import PersonalBestOverdriveModal from "../components/scorecard/PersonalBestOverdriveModal";

export default function ScorecardsPage() {
  const { profile, currentName, currentAvatar, effectivePlayerId } =
    useOutletContext<ProfileFamilyOutletContext>();

  const { archive, loading, error, fetchScorecards, lastNewPB, dismissPBModal } =
    useScorecardStore();

  useEffect(() => {
    if (effectivePlayerId) {
      fetchScorecards(effectivePlayerId);
    }
  }, [effectivePlayerId, fetchScorecards]);

  if (loading && !archive) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] border-2 border-stone-300 dark:border-slate-700/80 border-b-4 border-b-stone-400 dark:border-b-slate-900 rounded-3xl shadow-[0_6px_0_rgba(15,23,42,0.8)]">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-500 border border-cyan-500/40 flex items-center justify-center mb-3 shadow-xs">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
        <span className="text-sm font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-300">Synchronizing Chrono-Scorecards...</span>
      </div>
    );
  }

  if (error && !archive) {
    return (
      <div className="p-8 rounded-3xl bg-linear-to-b from-rose-950/60 to-rose-950/90 border-2 border-rose-700 border-b-4 border-b-rose-900 text-center text-rose-200 shadow-[0_6px_0_rgba(159,18,57,0.6)]">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 stroke-[2.5]" />
        </div>
        <h3 className="text-base font-black uppercase tracking-wider text-white mb-1">Scorecards Unavailable</h3>
        <p className="text-xs text-rose-300/80 mb-5 max-w-sm mx-auto">{error}</p>
        <button
          onClick={() => effectivePlayerId && fetchScorecards(effectivePlayerId)}
          className="px-6 py-2.5 rounded-xl bg-linear-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 shadow-[0_4px_0_rgba(159,18,57,0.8)] transition-all min-h-[44px] cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ChronoScorecardDeck
        archive={
          archive ?? {
            playerId: effectivePlayerId ?? "guest",
            games: {},
            totalPersonalBestsBeaten: 0,
            updatedAt: Date.now(),
          }
        }
        playerName={currentName || profile?.displayName || "Player"}
        avatar={currentAvatar || profile?.avatar}
      />

      {/* Overdrive Celebratory Modal */}
      {lastNewPB && (
        <PersonalBestOverdriveModal
          result={lastNewPB}
          onClose={dismissPBModal}
        />
      )}
    </div>
  );
}
