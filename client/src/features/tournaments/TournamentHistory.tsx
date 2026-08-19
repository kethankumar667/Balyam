import React from "react";
import type { TournamentHistoryItem } from "@shared/tournaments/Tournament";
import { GameCategoryIcon } from "../../design-system/icons";

interface TournamentHistoryProps {
  history: TournamentHistoryItem[];
}

export default function TournamentHistory({ history }: TournamentHistoryProps) {
  const getPlacementBadge = (placement: number) => {
    if (placement === 1) {
      return (
        <span className="bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40 text-xs font-black px-3.5 py-1.5 rounded-full font-mono shadow-xs">
          👑 1st Place (Champion)
        </span>
      );
    }
    if (placement === 2) {
      return (
        <span className="bg-stone-300/30 text-stone-700 dark:text-stone-200 border border-stone-400/40 text-xs font-black px-3.5 py-1.5 rounded-full font-mono shadow-xs">
          🥈 2nd Place (Finalist)
        </span>
      );
    }
    if (placement === 3) {
      return (
        <span className="bg-amber-700/20 text-amber-700 dark:text-amber-400 border border-amber-700/30 text-xs font-black px-3.5 py-1.5 rounded-full font-mono shadow-xs">
          🥉 3rd Place (Semifinalist)
        </span>
      );
    }
    return (
      <span className="bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 text-xs font-mono font-bold px-3.5 py-1.5 rounded-full">
        Top {placement} Placement
      </span>
    );
  };

  if (history.length === 0) {
    return (
      <div className="bg-[var(--auth-card)] dark:bg-stone-900/60 border border-[var(--auth-card-edge)] dark:border-stone-800 rounded-3xl p-10 text-center text-[var(--auth-ink-soft)] dark:text-stone-400 text-xs sm:text-sm font-sans space-y-2">
        <p className="font-bold text-[var(--auth-ink)] dark:text-stone-200">No tournament placements recorded yet.</p>
        <p>Enter active tournaments to earn championship trophies, badges, and permanent Hall of Fame history!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {history.map((item, idx) => {
        const dateStr = new Date(item.participatedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={`${item.tournamentId}_${idx}`}
            className="bg-[var(--auth-card)] dark:bg-stone-900/80 border border-[var(--auth-card-edge)] dark:border-stone-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl shrink-0">
                {item.badge || "🎖️"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm sm:text-base text-[var(--auth-ink)] dark:text-stone-100">
                    {item.tournamentName}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-stone-500/10 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md border border-[var(--auth-card-edge)] dark:border-stone-700">
                    <GameCategoryIcon game={item.game} size={12} />
                    {item.game}
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--auth-ink-soft)] dark:text-stone-400 block">
                  Participated: {dateStr}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {getPlacementBadge(item.placement)}
              <span className="text-xs font-mono font-black text-amber-500 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                +{item.prizeXP} XP
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
