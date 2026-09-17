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
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <span className="text-sm font-mono text-cyan-300">Synchronizing Chrono-Scorecards...</span>
      </div>
    );
  }

  if (error && !archive) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/40 border border-rose-800 text-center text-rose-300">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h3 className="text-base font-bold mb-1">Scorecards Unavailable</h3>
        <p className="text-xs text-rose-400/80 mb-4">{error}</p>
        <button
          onClick={() => effectivePlayerId && fetchScorecards(effectivePlayerId)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all min-h-[44px]"
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
