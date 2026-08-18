import type { TournamentHistoryItem } from "@shared/tournaments/Tournament";

interface TournamentHistoryProps {
  history: TournamentHistoryItem[];
}

export default function TournamentHistory({ history }: TournamentHistoryProps) {
  const getPlacementBadge = (placement: number) => {
    if (placement === 1) {
      return (
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black px-3 py-1 rounded-full font-mono">
          👑 1st Place (Champion)
        </span>
      );
    }
    if (placement === 2) {
      return (
        <span className="bg-stone-300/20 text-stone-200 border border-stone-300/30 text-xs font-black px-3 py-1 rounded-full font-mono">
          🥈 2nd Place (Finalist)
        </span>
      );
    }
    if (placement === 3) {
      return (
        <span className="bg-amber-700/20 text-amber-400 border border-amber-700/30 text-xs font-black px-3 py-1 rounded-full font-mono">
          🥉 3rd Place (Semifinalist)
        </span>
      );
    }
    return (
      <span className="bg-stone-800 text-stone-400 border border-stone-700 text-xs font-mono px-3 py-1 rounded-full">
        Top {placement} Finish
      </span>
    );
  };

  if (history.length === 0) {
    return (
      <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs">
        No tournament history found. Enter upcoming tournaments to earn trophies and championship badges!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item, idx) => {
        const dateStr = new Date(item.participatedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={`${item.tournamentId}_${idx}`}
            className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{item.badge || "🎖️"}</span>
              <div>
                <h4 className="font-bold text-sm text-stone-100 dark:text-zinc-100">
                  {item.tournamentName}
                </h4>
                <span className="text-[11px] font-mono text-stone-400">
                  {item.game} • {dateStr}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getPlacementBadge(item.placement)}
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                +{item.prizeXP} XP
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
