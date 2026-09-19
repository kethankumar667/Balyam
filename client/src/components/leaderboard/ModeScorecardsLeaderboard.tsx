import { useState, useEffect } from "react";
import { Trophy, Zap, Gamepad2, Award, ArrowUpRight } from "lucide-react";
import { apiJson } from "../../lib/playerIdentity";
import { findAvatar } from "../../lib/avatars";
import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes";
import type { AllGameSlug, FoilTier, ScoringDirection } from "@shared/profile/Scorecard";
import PodiumTopThree, { type PodiumCompetitor } from "./PodiumTopThree";

interface ModeLeaderboardItem {
  rank: number;
  playerId: string;
  displayName: string;
  avatar?: string;
  bestScore: number;
  bestScoreAchievedAt: number;
  foilTier: FoilTier;
  scoringDirection: ScoringDirection;
  timesPlayed: number;
}

const SUPPORTED_GAMES: { id: AllGameSlug; label: string; icon: string }[] = [
  { id: "handcricket", label: "Hand Cricket", icon: "🏏" },
  { id: "2048", label: "2048 Classic", icon: "🔢" },
  { id: "snake", label: "Snake 2D", icon: "🐍" },
  { id: "ludo", label: "Ludo", icon: "🎲" },
  { id: "rummy", label: "Rummy", icon: "🎴" },
  { id: "uno", label: "UNO", icon: "🃏" },
  { id: "snl", label: "Snakes & Ladders", icon: "🪜" },
  { id: "dotsboxes", label: "Dots & Boxes", icon: "📦" },
  { id: "wordbuilding", label: "Word Building", icon: "🔤" },
  { id: "tictactoe", label: "Tic Tac Toe", icon: "⚡" },
  { id: "carrom", label: "Carrom", icon: "⚪" },
  { id: "nokiasnake", label: "Nokia Snake", icon: "📱" },
];

export default function ModeScorecardsLeaderboard() {
  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");
  const gameConfig = GAME_MODE_REGISTRY[selectedGame] ?? GAME_MODE_REGISTRY.handcricket!;
  const [selectedMode, setSelectedMode] = useState<string>(gameConfig.defaultModeId);

  const [items, setItems] = useState<ModeLeaderboardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync default mode whenever game changes
  const handleGameChange = (game: AllGameSlug) => {
    setSelectedGame(game);
    const cfg = GAME_MODE_REGISTRY[game] ?? GAME_MODE_REGISTRY.handcricket!;
    setSelectedMode(cfg.defaultModeId);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.resolve(
      apiJson<{ entries: ModeLeaderboardItem[] }>(
        `/api/ranking/scorecards/${selectedGame}/${selectedMode}`
      )
    )
      .then((res) => {
        if (!active) return;
        // `apiJson` resolves `null` on any network error or non-2xx response instead
        // of rejecting, so that case must be checked explicitly — otherwise a failed
        // request silently renders as "No Chrono Records Yet" instead of an error.
        if (res === null) {
          setError("Failed to load records");
          setLoading(false);
          return;
        }
        setItems(res.entries || []);
        setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load records");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedGame, selectedMode]);

  const activeModeDef = gameConfig.modes.find((m) => m.modeId === selectedMode) ?? gameConfig.modes[0];
  const unit = activeModeDef?.unit || "pts";

  const podiumCompetitors: PodiumCompetitor[] = items.slice(0, 3).map((item) => ({
    rank: item.rank,
    playerId: item.playerId,
    name: item.displayName,
    avatar: item.avatar,
    scoreOrRating: item.bestScore,
    scoreLabel: `${item.bestScore} ${unit}`,
    tier: item.foilTier.replace("_", " ").toUpperCase(),
    foilTier: item.foilTier,
  }));

  return (
    <div className="space-y-6">
      {/* Game Selector Chips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-amber-500" />
            <span>Select Game Arena</span>
          </label>
          <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">
            {SUPPORTED_GAMES.length} Arenas
          </span>
        </div>

        <div
          role="group"
          aria-label="Filter scoreboard by game arena"
          className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1"
        >
          {SUPPORTED_GAMES.map((g) => {
            const isSelected = selectedGame === g.id;
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Filter by ${g.label} game arena`}
                onClick={() => handleGameChange(g.id)}
                className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs tracking-wide transition-all active:scale-95 shrink-0 cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-black shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50"
                    : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] font-bold shadow-xs"
                }`}
              >
                <span className="text-base leading-none">{g.icon}</span>
                <span className="uppercase">{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)]">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Ruleset & Game Mode</span>
        </div>

        <div
          role="tablist"
          aria-label="Filter scoreboard by game mode"
          className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1"
        >
          {gameConfig.modes.map((m) => {
            const isSelected = selectedMode === m.modeId;
            return (
              <button
                key={m.modeId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Filter by ${m.displayName} mode`}
                onClick={() => setSelectedMode(m.modeId)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-black shadow-xs ring-1 ring-amber-500/20"
                    : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] font-semibold"
                }`}
              >
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                )}
                <span>{m.displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Description Banner */}
      {activeModeDef && (
        <div className="p-4 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] border-l-4 border-l-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 mt-0.5 sm:mt-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-black text-[var(--chrome-ink)]">
                {activeModeDef.displayName}
              </div>
              <div className="text-xs text-[var(--chrome-ink-soft)]">
                {activeModeDef.description}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="font-mono font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1.5">
              <span>{activeModeDef.scoringDirection === "HIGHER_IS_BETTER" ? "🏆 High Score Wins" : "⚡ Fewest Turns Wins"}</span>
              <span className="opacity-60 text-[10px]">({unit})</span>
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-[var(--chrome-ink-soft)]">
            Loading chrono records...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <p className="text-sm font-bold text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => handleGameChange(selectedGame)}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="py-14 px-4 text-center rounded-3xl border border-dashed border-[var(--chrome-border)] bg-[var(--chrome-panel)] space-y-3 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-mono font-black">
            ⚡
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-[var(--chrome-ink)]">
              No Chrono Records Yet
            </h3>
            <p className="text-xs text-[var(--chrome-ink-soft)]">
              Be the first lounge competitor to record a personal best in {activeModeDef?.displayName || selectedGame}!
            </p>
          </div>
        </div>
      )}

      {/* Populated State with Podium & Records Table */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-6">
          {/* 3D Podium for Top 3 */}
          {podiumCompetitors.length >= 2 && (
            <PodiumTopThree competitors={podiumCompetitors} unit={unit} />
          )}

          {/* High Score Records Table */}
          <div className="rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Game Mode High Score Table">
                <thead className="border-b border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Rank</th>
                    <th className="py-3.5 px-4 font-bold">Challenger</th>
                    <th className="py-3.5 px-4 font-bold">Personal Best</th>
                    <th className="py-3.5 px-4 font-bold">Foil Tier</th>
                    <th className="py-3.5 px-4 font-bold">Runs Played</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--chrome-hairline)] font-medium">
                  {items.map((item) => {
                    const avatar = item.avatar ? findAvatar(item.avatar) : null;
                    return (
                      <tr key={item.playerId} className="hover:bg-[var(--chrome-control)]/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black">
                          {item.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-zinc-950 font-black">
                              1
                            </span>
                          ) : item.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-zinc-950 font-black">
                              2
                            </span>
                          ) : item.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black">
                              3
                            </span>
                          ) : (
                            `#${item.rank}`
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 overflow-hidden shrink-0 flex items-center justify-center">
                              {avatar ? (
                                <img src={avatar.src} alt={item.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-black text-amber-400">
                                  {item.displayName.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-[var(--chrome-ink)]">
                              {item.displayName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-sm text-amber-500">
                          {item.bestScore.toLocaleString()}{" "}
                          <span className="text-[10px] text-[var(--chrome-ink-soft)] font-normal uppercase">
                            {unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              item.foilTier === "obsidian_vanguard"
                                ? "bg-purple-950/40 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                : item.foilTier === "prismatic_holo"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : item.foilTier === "neon_cyan"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                : "bg-stone-500/20 text-stone-400"
                            }`}
                          >
                            {item.foilTier.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[var(--chrome-ink-soft)]">
                          {item.timesPlayed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
