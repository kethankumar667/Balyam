import { useState } from "react";
import type { MatchHistoryItem, MatchResult } from "@shared/profile/MatchHistory";
import type { GameKind } from "@shared/types";

interface MatchHistoryListProps {
  matches: MatchHistoryItem[];
  total: number;
  selectedGame?: GameKind;
  onSelectGame: (g?: GameKind) => void;
  onViewMatchDetail?: (matchId: string) => void;
}

export default function MatchHistoryList({
  matches,
  selectedGame,
  onSelectGame,
  onViewMatchDetail,
}: MatchHistoryListProps) {
  const [filterResult, setFilterResult] = useState<MatchResult | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = matches.filter((m) => {
    if (filterResult !== "ALL" && m.result !== filterResult) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = m.roomCode.toLowerCase().includes(q);
      const participantMatch = m.participants.some((p) => p.name.toLowerCase().includes(q));
      if (!codeMatch && !participantMatch) return false;
    }
    return true;
  });

  const getResultBadge = (result: MatchResult) => {
    if (result === "WIN") {
      return (
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
          VICTORY
        </span>
      );
    }
    if (result === "LOSS") {
      return (
        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
          DEFEAT
        </span>
      );
    }
    return (
      <span className="bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
        DRAW
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 dark:bg-zinc-900/60 border border-stone-800 dark:border-zinc-800 rounded-xl p-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => onSelectGame(undefined)}
            className={`px-3 py-1 rounded-lg transition shrink-0 ${
              !selectedGame
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => setFilterResult("ALL")}
            className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
              filterResult === "ALL"
                ? "bg-stone-800 text-stone-100 font-bold"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            All Outcomes
          </button>
          <button
            onClick={() => setFilterResult("WIN")}
            className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
              filterResult === "WIN"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                : "text-stone-500 hover:text-emerald-400"
            }`}
          >
            Wins Only
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by room or player…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-stone-950 dark:bg-zinc-950 border border-stone-800 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 w-full sm:w-48 font-mono"
        />
      </div>

      {/* Matches List */}
      {filtered.length === 0 ? (
        <div className="bg-stone-900/40 dark:bg-zinc-900/40 border border-stone-800 dark:border-zinc-800 rounded-xl p-8 text-center text-stone-500 text-xs">
          No matches found matching your filters.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((m) => {
            const timeAgo = formatTimeAgo(m.finishedAt);
            const durationSec = Math.round(m.durationMs / 1000);
            const otherPlayers = m.participants.filter((p) => !p.isWinner).map((p) => p.name).join(", ");

            return (
              <div
                key={m.matchId}
                className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 hover:border-stone-700 dark:hover:border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3">
                  {getResultBadge(m.result)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-100 dark:text-zinc-100 capitalize">
                        {m.game}
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        #{m.roomCode}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 dark:text-zinc-400 mt-0.5">
                      Opponents: {otherPlayers || "Solo / Bots"} • {durationSec}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                  <span className="text-stone-500 font-mono text-[11px]">{timeAgo}</span>
                  {m.replayAvailable && (
                    <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      Replay Ready
                    </span>
                  )}
                  {onViewMatchDetail && (
                    <button
                      onClick={() => onViewMatchDetail(m.matchId)}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1 rounded-lg text-xs font-medium transition"
                    >
                      Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
