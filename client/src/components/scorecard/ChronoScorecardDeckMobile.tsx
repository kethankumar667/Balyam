import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Zap,
  Share2,
  ChevronRight,
  Activity,
  Award,
  Flame,
  Star,
  RotateCw,
  Play,
  Calendar,
  ShieldCheck,
  Crown,
  Search,
} from "lucide-react";
import type { PlayerScorecardArchive, AllGameSlug } from "@shared/profile/Scorecard";
import { GAME_MODE_REGISTRY, getGameModeConfig } from "@shared/profile/GameModes";
import {
  getGameMetricSchema,
  calculatePerformanceRank,
  getNextMilestoneTarget,
  derivePlayerArchetype,
  getSignatureFeatsForGame,
} from "@shared/profile/MetricRegistry";
import { formatGameMetricValue, calculateTrendMomentum } from "../../lib/metricFormatters";
import QuantumRadarHexagon from "./QuantumRadarHexagon";
import HoloPassShareModal from "./HoloPassShareModal";

interface ChronoScorecardDeckMobileProps {
  archive: PlayerScorecardArchive;
  playerName: string;
  avatar?: string;
  className?: string;
}

const PINNED_STORAGE_KEY = "bhalyam.scorecards.pinned";

function loadPinnedGames(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage issues
  }
  return ["handcricket", "ludo", "rummy"];
}

function savePinnedGames(pinned: string[]): void {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
  } catch {
    // Ignore storage quota
  }
}

function getGameLaunchRoute(game: AllGameSlug): string {
  const directRoutes: Record<string, string> = {
    snake: "/snake",
    nokiasnake: "/nokiasnake",
    nokiacricket: "/nokiacricket",
    "2048": "/2048",
    sudoku: "/sudoku",
    brickracer: "/brickracer",
    bricktetris: "/bricktetris",
    brickbreakout: "/brickbreakout",
    cricket2d: "/cricket2d",
    snake2d: "/snake2d",
  };
  return directRoutes[game] ?? `/games?game=${game}`;
}

export default function ChronoScorecardDeckMobile({
  archive,
  playerName,
  avatar,
  className = "",
}: ChronoScorecardDeckMobileProps) {
  const availableGames = useMemo(() => Object.keys(GAME_MODE_REGISTRY) as AllGameSlug[], []);
  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");
  const [pinnedGames, setPinnedGames] = useState<string[]>(loadPinnedGames);

  const [activeCategory, setActiveCategory] = useState<"all" | "board" | "card" | "social" | "retro_arcade">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const gameConfig = getGameModeConfig(selectedGame);
  const [selectedModeId, setSelectedModeId] = useState<string>(gameConfig.defaultModeId);

  const [showRadar, setShowRadar] = useState(false);
  const [sharingScorecard, setSharingScorecard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const togglePin = (gameSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedGames((prev) => {
      const next = prev.includes(gameSlug)
        ? prev.filter((g) => g !== gameSlug)
        : [...prev, gameSlug];
      savePinnedGames(next);
      return next;
    });
  };

  const gameScorecard = archive.games[selectedGame];
  const modeScorecard = gameScorecard?.modes[selectedModeId];
  const modeDef =
    gameConfig.modes.find((m) => m.modeId === selectedModeId) ?? gameConfig.modes[0]!;

  const gameSchema = getGameMetricSchema(selectedGame);

  // Derived Gamification Metrics
  const rankInfo = useMemo(() => {
    return calculatePerformanceRank(
      selectedGame,
      selectedModeId,
      modeScorecard?.bestScore,
      modeDef.scoringDirection
    );
  }, [selectedGame, selectedModeId, modeScorecard?.bestScore, modeDef.scoringDirection]);

  const milestone = useMemo(() => {
    return getNextMilestoneTarget(
      selectedGame,
      selectedModeId,
      modeScorecard?.bestScore,
      modeDef.scoringDirection
    );
  }, [selectedGame, selectedModeId, modeScorecard?.bestScore, modeDef.scoringDirection]);

  const archetype = useMemo(() => {
    return derivePlayerArchetype(modeScorecard?.radar);
  }, [modeScorecard?.radar]);

  const signatureFeats = useMemo(() => {
    return getSignatureFeatsForGame(selectedGame, modeScorecard);
  }, [selectedGame, modeScorecard]);

  const trendMomentum = useMemo(() => {
    return calculateTrendMomentum(
      modeScorecard?.recentScores ?? [],
      modeDef.scoringDirection
    );
  }, [modeScorecard?.recentScores, modeDef.scoringDirection]);

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    return availableGames
      .filter((slug) => {
        const cfg = getGameModeConfig(slug);
        const matchesCategory = activeCategory === "all" || cfg.category === activeCategory;
        const matchesSearch =
          !searchQuery.trim() ||
          cfg.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          slug.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const aPinned = pinnedGames.includes(a);
        const bPinned = pinnedGames.includes(b);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        const aHasRecord = archive.games[a] != null;
        const bHasRecord = archive.games[b] != null;
        if (aHasRecord && !bHasRecord) return -1;
        if (!aHasRecord && bHasRecord) return 1;

        return getGameModeConfig(a).displayName.localeCompare(getGameModeConfig(b).displayName);
      });
  }, [availableGames, activeCategory, searchQuery, pinnedGames, archive.games]);

  return (
    <div className={`w-full flex flex-col gap-4 select-none ${className}`}>
      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x -mx-1 px-1">
        {(
          [
            { id: "all", label: "All Games" },
            { id: "board", label: "Board" },
            { id: "card", label: "Cards" },
            { id: "social", label: "Lounge" },
            { id: "retro_arcade", label: "Retro" },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 snap-start px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              activeCategory === cat.id
                ? "bg-cyan-500 text-slate-950 shadow-xs"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Input on Mobile */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 min-h-[44px]"
        />
      </div>

      {/* Horizontal Game Selector Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
        {filteredGames.map((gameSlug) => {
          const cfg = getGameModeConfig(gameSlug);
          const hasRecord = archive.games[gameSlug] != null;
          const isSelected = selectedGame === gameSlug;
          const isPinned = pinnedGames.includes(gameSlug);

          return (
            <button
              key={gameSlug}
              onClick={() => {
                setSelectedGame(gameSlug);
                const nextCfg = getGameModeConfig(gameSlug);
                setSelectedModeId(nextCfg.defaultModeId);
                setIsFlipped(false);
              }}
              className={`flex-shrink-0 snap-start flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all min-h-[44px] ${
                isSelected
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {hasRecord && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
              <span className="whitespace-nowrap">{cfg.displayName}</span>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => togglePin(gameSlug, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePin(gameSlug, e as unknown as React.MouseEvent);
                  }
                }}
                className={`p-1 -mr-1 rounded-md transition-colors hover:bg-slate-800 cursor-pointer ${
                  isPinned ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                }`}
                title={isPinned ? "Unpin" : "Pin"}
                aria-label={isPinned ? `Unpin ${cfg.displayName}` : `Pin ${cfg.displayName}`}
              >
                <Star className={`w-3 h-3 ${isPinned ? "fill-amber-400" : ""}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Mode Selector Segmented Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
        {gameConfig.modes.map((mode) => {
          const isSelected = selectedModeId === mode.modeId;
          const hasModeRecord = gameScorecard?.modes[mode.modeId] != null;

          return (
            <button
              key={mode.modeId}
              onClick={() => {
                setSelectedModeId(mode.modeId);
                setIsFlipped(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                isSelected
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{mode.displayName}</span>
              {hasModeRecord && (
                <Trophy className="w-3 h-3 text-amber-400 fill-amber-400/40" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Holographic Chrono-Card (Flip Supported) */}
      {modeScorecard ? (
        <div
          className={`relative p-5 rounded-2xl border backdrop-blur-md overflow-hidden transition-all ${
            modeScorecard.foilTier === "obsidian_vanguard"
              ? "bg-gradient-to-br from-purple-950/60 via-slate-950 to-black border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.25)]"
              : modeScorecard.foilTier === "prismatic_holo"
              ? "bg-gradient-to-br from-amber-950/40 via-slate-950 to-cyan-950/30 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
              : "bg-slate-900/80 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
          }`}
        >
          {/* ── FRONT FACE ── */}
          {!isFlipped ? (
            <div>
              {/* Card Header with Rank Grade & Polarity */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                      {gameConfig.displayName}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-300">
                      {modeDef.scoringDirection === "LOWER_IS_BETTER" ? "⚡ Lowest Turns" : "🎯 High Score"}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">{modeScorecard.modeDisplayName}</h3>
                </div>

                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold ${rankInfo.badgeBg} ${rankInfo.badgeBorder} ${rankInfo.badgeText}`}
                >
                  <Award className="w-3 h-3" />
                  <span>{rankInfo.grade}-RANK</span>
                </div>
              </div>

              {/* Record Display Hero */}
              <div className="p-4 mb-4 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      {gameSchema.primaryRankMetric.label}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">({rankInfo.label})</span>
                  </div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 font-mono">
                    {formatGameMetricValue(modeScorecard.bestScore, gameSchema.primaryRankMetric.format)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Inspect match dossier"
                    title="Inspect match dossier"
                  >
                    <RotateCw className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    onClick={() => setSharingScorecard(true)}
                    className="p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Share holographic scorecard"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Next Milestone Quest & Play CTA */}
              <div className="p-3 mb-4 rounded-xl bg-slate-950/70 border border-cyan-500/25 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white font-bold">{milestone.title}</span>
                  </div>
                  <span className="text-cyan-400 font-semibold text-[10px]">{milestone.remainingText}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${milestone.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Progress: <strong className="text-slate-200">{milestone.progressPercent}%</strong> (+{milestone.rewardXp} XP)
                  </span>

                  <Link
                    to={getGameLaunchRoute(selectedGame)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-md min-h-[44px] transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>Beat Record</span>
                  </Link>
                </div>
              </div>

              {/* Stat Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="block text-[9px] text-slate-500 uppercase">Played</span>
                  <span className="text-sm font-bold text-slate-200">{modeScorecard.timesPlayed}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="block text-[9px] text-slate-500 uppercase truncate" title={gameSchema.secondaryMetrics[0]?.label || "Secondary Metric"}>
                    {gameSchema.secondaryMetrics[0]?.shortLabel || "Avg"}
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    {gameSchema.secondaryMetrics[0]
                      ? formatGameMetricValue(
                          modeScorecard.secondaryMetrics[gameSchema.secondaryMetrics[0].key] ?? (modeScorecard.timesPlayed > 0 ? "-" : 0),
                          gameSchema.secondaryMetrics[0].format
                        )
                      : modeScorecard.averageScore}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="block text-[9px] text-slate-500 uppercase truncate" title={gameSchema.secondaryMetrics[1]?.label || "Secondary Metric"}>
                    {gameSchema.secondaryMetrics[1]?.shortLabel || "Recent"}
                  </span>
                  <span className="text-sm font-bold text-cyan-400">
                    {gameSchema.secondaryMetrics[1]
                      ? formatGameMetricValue(
                          modeScorecard.secondaryMetrics[gameSchema.secondaryMetrics[1].key] ?? (modeScorecard.recentScores[0] ?? "-"),
                          gameSchema.secondaryMetrics[1].format
                        )
                      : (modeScorecard.recentScores[0] ?? "-")}
                  </span>
                </div>
              </div>

              {/* Secondary Metric Pills (if present) */}
              {Object.keys(modeScorecard.secondaryMetrics).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Object.entries(modeScorecard.secondaryMetrics).map(([key, val]) => {
                    const fieldDef = gameSchema.secondaryMetrics.find((f) => f.key === key);
                    const label = fieldDef?.label ?? key;
                    const formattedVal = fieldDef ? formatGameMetricValue(val, fieldDef.format) : String(val);
                    return (
                      <div
                        key={key}
                        className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                      >
                        <span className="text-slate-500">{label}: </span>
                        <span className="font-bold text-white">{formattedVal}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mini Recent Scores Sparkline & Trajectory */}
              {modeScorecard.recentScores.length > 1 && (
                <div className="p-2.5 mb-4 rounded-lg bg-slate-950/50 border border-slate-800/80 flex flex-col gap-2 font-mono">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 uppercase">Recent Runs:</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[9px] border ${
                        trendMomentum.isPositiveTrend
                          ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                          : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                      }`}
                    >
                      {trendMomentum.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {modeScorecard.recentScores.map((sc, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          sc === modeScorecard.bestScore
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {formatGameMetricValue(sc, gameSchema.primaryRankMetric.format)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── BACK FACE: MATCH DOSSIER & SIGNATURE FEATS ── */
            <div className="text-left font-mono">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                    Official Record Log
                  </span>
                  <h4 className="text-sm font-black text-white">{gameConfig.displayName} Dossier</h4>
                </div>

                <button
                  onClick={() => setIsFlipped(false)}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold min-h-[44px] cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
              </div>

              {/* Dossier Metadata */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase">Achieved On</span>
                    <span className="text-slate-200 font-bold text-[11px]">
                      {modeScorecard.bestScoreAchievedAt
                        ? new Date(modeScorecard.bestScoreAchievedAt).toLocaleDateString()
                        : "Official Run"}
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase">Context</span>
                    <span className="text-slate-200 font-bold text-[11px]">
                      {modeScorecard.bestContext.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Feats Badges */}
              <div className="mb-2">
                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
                  Signature Feats
                </span>
                <div className="flex flex-col gap-2">
                  {signatureFeats.map((feat) => (
                    <div
                      key={feat.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                        feat.isUnlocked
                          ? "bg-slate-950/80 border-amber-500/40 text-amber-200 shadow-xs"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            feat.isUnlocked ? "bg-amber-500/20 text-amber-400" : "bg-slate-900 text-slate-600"
                          }`}
                        >
                          {feat.icon === "Flame" ? (
                            <Flame className="w-3 h-3" />
                          ) : feat.icon === "Zap" ? (
                            <Zap className="w-3 h-3" />
                          ) : feat.icon === "Crown" ? (
                            <Crown className="w-3 h-3" />
                          ) : feat.icon === "ShieldCheck" ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <Trophy className="w-3 h-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-white truncate">{feat.name}</span>
                          <span className="block text-[9px] text-slate-400 truncate">{feat.description}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase ${
                          feat.isUnlocked
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-slate-900 text-slate-500 border border-slate-800"
                        }`}
                      >
                        {feat.isUnlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Archetype Persona Card */}
          <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Persona
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Trait: {archetype.dominantTrait}
              </span>
            </div>
            <h4 className="text-xs font-black text-white">{archetype.title}</h4>
            <p className="text-[10px] text-slate-400 leading-snug">{archetype.motto}</p>
          </div>

          {/* Quantum Radar Drawer Toggle */}
          <button
            onClick={() => setShowRadar(!showRadar)}
            className="mt-3 w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              <span>{showRadar ? "Hide Quantum Radar" : "Inspect Quantum Radar"}</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${showRadar ? "rotate-90" : ""}`}
            />
          </button>

          {/* Collapsible Radar View */}
          {showRadar && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col items-center animate-fadeIn">
              <QuantumRadarHexagon radar={modeScorecard.radar} size={200} />
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center">
          <div className="mx-auto w-12 h-12 mb-3 rounded-full bg-slate-900 flex items-center justify-center text-slate-600">
            <Trophy className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No Record Yet</h4>
          <p className="text-xs text-slate-400 mb-4">
            Play a match of {modeDef.displayName} to forge your first personal record!
          </p>
          <Link
            to={getGameLaunchRoute(selectedGame)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition-all hover:bg-cyan-400 min-h-[44px]"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Launch {gameConfig.displayName}</span>
          </Link>
        </div>
      )}

      {/* Share Modal */}
      {sharingScorecard && modeScorecard && (
        <HoloPassShareModal
          game={selectedGame}
          scorecard={modeScorecard}
          playerName={playerName}
          avatar={avatar}
          onClose={() => setSharingScorecard(false)}
        />
      )}
    </div>
  );
}
