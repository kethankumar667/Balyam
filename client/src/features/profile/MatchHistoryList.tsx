import { useState } from "react";
import type { MatchHistoryItem, MatchResult } from "@shared/profile/MatchHistory";
import type { GameKind } from "@shared/types";
import { SearchNavIcon, GamesNavIcon } from "../../design-system/icons";
import { ProfileEmptyMatchesArtwork } from "./ProfileArtwork";
import { formatTimeAgo } from "../../lib/formatTimeAgo";

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
        <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
          VICTORY
        </span>
      );
    }
    if (result === "LOSS") {
      return (
        <span className="bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
          DEFEAT
        </span>
      );
    }
    return (
      <span className="bg-zinc-500/15 text-zinc-500 border border-zinc-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
        DRAW
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold font-mono">
          <button
            onClick={() => onSelectGame(undefined)}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              !selectedGame
                ? "bg-amber-500 text-zinc-950 font-black shadow-xs"
                : "bg-[var(--auth-field)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-field-edge)]"
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => setFilterResult("ALL")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              filterResult === "ALL"
                ? "bg-stone-800 dark:bg-zinc-800 text-white font-bold"
                : "bg-[var(--auth-field)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-field-edge)]"
            }`}
          >
            All Outcomes
          </button>
          <button
            onClick={() => setFilterResult("WIN")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              filterResult === "WIN"
                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold"
                : "bg-[var(--auth-field)] text-[var(--auth-ink-soft)] hover:text-emerald-500 border border-[var(--auth-field-edge)]"
            }`}
          >
            Wins Only
          </button>
        </div>

        <div className="relative w-full sm:w-56">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--auth-ink-soft)] pointer-events-none">
            <SearchNavIcon size={14} />
          </span>
          <input
            type="text"
            placeholder="Search by room or player…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--auth-ink)] placeholder-[var(--auth-ink-soft)] focus:outline-none focus:border-amber-500 font-mono transition"
          />
        </div>
      </div>

      {/* Matches List */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="flex justify-center">
            <ProfileEmptyMatchesArtwork className="w-36 h-36" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-black text-lg text-[var(--auth-ink)] tracking-tight">
              {matches.length === 0 ? "No Matches Recorded Yet" : "No Matches Found"}
            </h3>
            <p className="text-xs text-[var(--auth-ink-soft)] leading-relaxed">
              {matches.length === 0
                ? "Jump into any classic multiplayer room — Ludo, Hand Cricket, Rummy, or UNO — to record your match history and earn XP!"
                : "No matches in your history match the selected filters. Try clearing your search query or outcome filter."}
            </p>
          </div>
          {matches.length === 0 && (
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.location.href = "/games";
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-2.5 rounded-2xl text-xs uppercase font-mono tracking-wider transition shadow-md flex items-center gap-2 mx-auto"
            >
              <GamesNavIcon size={14} />
              Play First Match
            </button>
          )}
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
                className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] hover:border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3.5">
                  {getResultBadge(m.result)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[var(--auth-ink)] capitalize">
                        {m.game}
                      </span>
                      <span className="text-xs text-[var(--auth-ink-soft)] font-mono">
                        #{m.roomCode}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--auth-ink-soft)] mt-0.5">
                      Opponents: {otherPlayers || "Solo / Bots"} • {durationSec}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                  <span className="text-[var(--auth-ink-soft)] font-mono text-[11px]">{timeAgo}</span>
                  {m.replayAvailable && (
                    <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                      Replay Ready
                    </span>
                  )}
                  {onViewMatchDetail && (
                    <button
                      onClick={() => onViewMatchDetail(m.matchId)}
                      className="bg-[var(--auth-field)] hover:bg-amber-500 hover:text-zinc-950 text-[var(--auth-ink)] border border-[var(--auth-field-edge)] hover:border-amber-500 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition shadow-xs"
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
