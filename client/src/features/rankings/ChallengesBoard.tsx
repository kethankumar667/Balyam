import { useState } from "react";
import type { Challenge, PlayerChallenges } from "@shared/ranking/Challenges";

interface ChallengesBoardProps {
  challenges: PlayerChallenges;
  onClaimReward: (challengeId: string) => Promise<void>;
}

export default function ChallengesBoard({ challenges, onClaimReward }: ChallengesBoardProps) {
  const [activeType, setActiveType] = useState<"daily" | "weekly">("daily");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const activeList = activeType === "daily" ? challenges.daily : challenges.weekly;
  const resetTimestamp = activeType === "daily" ? challenges.dailyResetTime : challenges.weeklyResetTime;
  const timeRemaining = formatTimeRemaining(resetTimestamp);

  const handleClaim = async (challengeId: string) => {
    setClaimingId(challengeId);
    try {
      await onClaimReward(challengeId);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Type Selector and Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 dark:bg-zinc-900/60 border border-stone-800 dark:border-zinc-800 rounded-xl p-3.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveType("daily")}
            className={`px-3 min-h-[44px] inline-flex items-center justify-center rounded-lg text-xs font-bold transition ${
              activeType === "daily"
                ? "bg-amber-500 text-zinc-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            ☀️ Daily Quests
          </button>
          <button
            onClick={() => setActiveType("weekly")}
            className={`px-3 min-h-[44px] inline-flex items-center justify-center rounded-lg text-xs font-bold transition ${
              activeType === "weekly"
                ? "bg-amber-500 text-zinc-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            🎯 Weekly Milestones
          </button>
        </div>

        <div className="text-xs font-mono text-stone-400 flex items-center gap-1.5">
          <span>Resets in:</span>
          <span className="font-bold text-amber-400">{timeRemaining}</span>
        </div>
      </div>

      {/* Challenge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {activeList.map((c) => {
          const progressPercent = Math.min(100, Math.round((c.current / c.target) * 100));

          return (
            <div
              key={c.id}
              className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition ${
                c.claimed
                  ? "bg-stone-950/40 border-stone-800/60 opacity-60"
                  : c.completed
                  ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
                  : "bg-stone-900/80 dark:bg-zinc-900/80 border-stone-800 dark:border-zinc-800"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    +{c.xpReward} XP
                  </span>
                  {c.game && (
                    <span className="text-[10px] font-mono uppercase bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                      {c.game}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-stone-100 dark:text-zinc-100">
                  {c.title}
                </h3>
                <p className="text-xs text-stone-400 dark:text-zinc-400 leading-snug">
                  {c.description}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-stone-400">
                    <span>Progress</span>
                    <span>
                      {c.current} / {c.target}
                    </span>
                  </div>
                  <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.completed ? "bg-emerald-400" : "bg-amber-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Claim Button or Status */}
                {c.claimed ? (
                  <div className="text-center text-xs font-mono font-bold text-stone-500 bg-stone-900/60 py-1.5 rounded-xl border border-stone-800">
                    ✓ CLAIMED
                  </div>
                ) : c.completed ? (
                  <button
                    onClick={() => handleClaim(c.id)}
                    disabled={claimingId === c.id}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs py-2 rounded-xl transition shadow active:scale-[0.99]"
                  >
                    {claimingId === c.id ? "Claiming..." : `CLAIM +${c.xpReward} XP`}
                  </button>
                ) : (
                  <div className="text-center text-[11px] font-mono text-stone-500 bg-stone-950/60 py-1.5 rounded-xl border border-stone-800">
                    IN PROGRESS ({progressPercent}%)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeRemaining(targetTimestamp: number): string {
  const diffSec = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
