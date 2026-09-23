import React, { useState, useRef, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Zap,
  Share2,
  Award,
  Flame,
  TrendingUp,
  TrendingDown,
  RotateCw,
  Play,
  Star,
  ShieldCheck,
  Crown,
  Search,
  Calendar,
  Layers,
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

interface ChronoScorecardDeckDesktopProps {
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
    // Ignore storage errors
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

export default function ChronoScorecardDeckDesktop({
  archive,
  playerName,
  avatar,
  className = "",
}: ChronoScorecardDeckDesktopProps) {
  const availableGames = useMemo(() => Object.keys(GAME_MODE_REGISTRY) as AllGameSlug[], []);
  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");
  const [pinnedGames, setPinnedGames] = useState<string[]>(loadPinnedGames);

  const [activeCategory, setActiveCategory] = useState<"all" | "board" | "card" | "social" | "retro_arcade">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const gameConfig = getGameModeConfig(selectedGame);
  const gameSchema = getGameMetricSchema(selectedGame);
  const [selectedModeId, setSelectedModeId] = useState<string>(gameConfig.defaultModeId);

  const [sharingScorecard, setSharingScorecard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // 3D Parallax Tilt state
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotX = ((y - centerY) / centerY) * -8;
    const rotY = ((x - centerX) / centerX) * 8;
    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

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
    <div className={`w-full max-w-7xl mx-auto flex flex-col gap-6 select-none ${className}`}>
      {/* Top Bar: Total PBs Beaten & Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Chrono-Scorecard Matrix</h2>
            <p className="text-xs text-slate-400">Personal best records, skill grading, and nostalgia feats</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
            <Flame className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span>Records Shattered:</span>
            <span className="font-extrabold text-white text-sm">{archive.totalPersonalBestsBeaten}</span>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Game List & Filtering (3 Cols) */}
        <div className="col-span-3 flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 max-h-[720px] overflow-hidden">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
            {(
              [
                { id: "all", label: "All" },
                { id: "board", label: "Board" },
                { id: "card", label: "Cards" },
                { id: "social", label: "Lounge" },
                { id: "retro_arcade", label: "Retro" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeCategory === cat.id
                    ? "bg-cyan-500 text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-400"
            />
          </div>

          {/* Game List with Pinning */}
          <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
            {filteredGames.map((gameSlug) => {
              const cfg = getGameModeConfig(gameSlug);
              const isSelected = selectedGame === gameSlug;
              const hasRecord = archive.games[gameSlug] != null;
              const modesCount = archive.games[gameSlug]?.totalModesPlayed ?? 0;
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
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-600/30 to-blue-600/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                      : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        hasRecord ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]" : "bg-slate-700"
                      }`}
                    />
                    <span className="truncate">{cfg.displayName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasRecord && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {modesCount} {modesCount === 1 ? "m" : "m"}
                      </span>
                    )}
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
                      className={`p-1 rounded-md transition-colors hover:bg-slate-800 cursor-pointer ${
                        isPinned ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                      }`}
                      title={isPinned ? "Unpin from favorites" : "Pin to top of list"}
                      aria-label={isPinned ? `Unpin ${cfg.displayName}` : `Pin ${cfg.displayName}`}
                    >
                      <Star className={`w-3 h-3 ${isPinned ? "fill-amber-400" : ""}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle Column: 3D Holographic Parallax Card & Modes (5 Cols) */}
        <div className="col-span-5 flex flex-col gap-4">
          {/* Mode Selector Chips */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
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
                  className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <span>{mode.displayName}</span>
                  {hasModeRecord && <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                </button>
              );
            })}
          </div>

          {/* 3D Holographic Card (Front / Back Flip) */}
          {modeScorecard ? (
            <div
              style={{ perspective: "1200px" }}
              className="w-full"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div
                ref={cardRef}
                style={{
                  transform: `rotateX(${rotateX}deg) rotateY(${rotateY + (isFlipped ? 180 : 0)}deg)`,
                  transformStyle: "preserve-3d",
                  transition: isFlipped ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)" : "transform 0.1s ease-out",
                }}
                className={`relative p-6 rounded-3xl border backdrop-blur-xl shadow-2xl transition-colors ${
                  modeScorecard.foilTier === "obsidian_vanguard"
                    ? "bg-gradient-to-br from-purple-950/80 via-slate-950 to-black border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
                    : modeScorecard.foilTier === "prismatic_holo"
                    ? "bg-gradient-to-br from-amber-950/50 via-slate-950 to-cyan-950/50 border-amber-500/50 shadow-[0_0_35px_rgba(245,158,11,0.25)]"
                    : "bg-slate-900/90 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                }`}
              >
                {/* ── CARD FRONT ── */}
                <div className={isFlipped ? "hidden" : "block"}>
                  {/* Scanline Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(6,182,212,0.03)_51%)] bg-[length:100%_4px] pointer-events-none rounded-3xl" />

                  {/* Card Header with Rank Grade & Polarity Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                          {gameConfig.displayName}
                        </span>
                        {/* Polarity Chip */}
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-950/80 border border-slate-700 text-slate-300">
                          {modeDef.scoringDirection === "LOWER_IS_BETTER"
                            ? "⚡ Lowest Turns Priority"
                            : "🎯 Highest Score Priority"}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-0.5">{modeScorecard.modeDisplayName}</h3>
                    </div>

                    {/* Performance Rank Badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold ${rankInfo.badgeBg} ${rankInfo.badgeBorder} ${rankInfo.badgeText}`}
                        title={rankInfo.description}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{rankInfo.grade}-RANK</span>
                      </div>
                    </div>
                  </div>

                  {/* Hero Score Showcase */}
                  <div className="p-5 mb-5 rounded-2xl bg-black/70 border border-slate-800/80 flex items-center justify-between shadow-inner">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                          {gameSchema.primaryRankMetric.label}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">({rankInfo.label})</span>
                      </div>
                      <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 font-mono tracking-tight">
                        {formatGameMetricValue(modeScorecard.bestScore, gameSchema.primaryRankMetric.format)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsFlipped(true)}
                        className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
                        title="Flip card to inspect match dossier & signature feats"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Dossier</span>
                      </button>

                      <button
                        onClick={() => setSharingScorecard(true)}
                        className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all font-semibold text-xs cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Holo-Pass</span>
                      </button>
                    </div>
                  </div>

                  {/* Next Milestone Target & Beat PB CTA */}
                  <div className="p-3.5 mb-5 rounded-xl bg-slate-950/70 border border-cyan-500/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-white font-bold">{milestone.title}</span>
                      </div>
                      <span className="text-cyan-400 font-semibold text-[11px]">{milestone.remainingText}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${milestone.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Progress: <strong className="text-slate-200">{milestone.progressPercent}%</strong> (+{milestone.rewardXp} XP Reward)
                      </span>

                      <Link
                        to={getGameLaunchRoute(selectedGame)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-[11px] shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-slate-950" />
                        <span>Beat This Record</span>
                      </Link>
                    </div>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-5 font-mono text-center">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase">Matches Played</span>
                      <span className="text-base font-bold text-white">{modeScorecard.timesPlayed}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase truncate" title={gameSchema.secondaryMetrics[0]?.label || "Secondary Metric"}>
                        {gameSchema.secondaryMetrics[0]?.shortLabel || "Avg Score"}
                      </span>
                      <span className="text-base font-bold text-white">
                        {gameSchema.secondaryMetrics[0]
                          ? formatGameMetricValue(
                              modeScorecard.secondaryMetrics[gameSchema.secondaryMetrics[0].key] ?? (modeScorecard.timesPlayed > 0 ? "-" : 0),
                              gameSchema.secondaryMetrics[0].format
                            )
                          : modeScorecard.averageScore}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase truncate" title={gameSchema.secondaryMetrics[1]?.label || "Last Score"}>
                        {gameSchema.secondaryMetrics[1]?.shortLabel || "Last Score"}
                      </span>
                      <span className="text-base font-bold text-cyan-400">
                        {gameSchema.secondaryMetrics[1]
                          ? formatGameMetricValue(
                              modeScorecard.secondaryMetrics[gameSchema.secondaryMetrics[1].key] ?? (modeScorecard.recentScores[0] ?? "-"),
                              gameSchema.secondaryMetrics[1].format
                            )
                          : (modeScorecard.recentScores[0] ?? "-")}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Metrics pills */}
                  {Object.keys(modeScorecard.secondaryMetrics).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/80">
                      {Object.entries(modeScorecard.secondaryMetrics).map(([key, val]) => {
                        const fieldDef = gameSchema.secondaryMetrics.find((f) => f.key === key);
                        const label = fieldDef?.label ?? key;
                        const formattedVal = fieldDef ? formatGameMetricValue(val, fieldDef.format) : String(val);
                        return (
                          <div
                            key={key}
                            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
                          >
                            <span className="text-slate-500 capitalize">{label}: </span>
                            <span className="font-bold text-white">{formattedVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── CARD BACK: MATCH DOSSIER & SIGNATURE FEATS ── */}
                <div
                  style={{ transform: "rotateY(180deg)" }}
                  className={!isFlipped ? "hidden" : "block text-left font-mono"}
                >
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                        Record Dossier
                      </span>
                      <h4 className="text-base font-black text-white">{gameConfig.displayName} Record Log</h4>
                    </div>

                    <button
                      onClick={() => setIsFlipped(false)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Back to Card</span>
                    </button>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="block text-[9px] text-slate-500 uppercase">Achieved On</span>
                        <span className="text-slate-200 font-bold">
                          {modeScorecard.bestScoreAchievedAt
                            ? new Date(modeScorecard.bestScoreAchievedAt).toLocaleDateString()
                            : "Official Match"}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <div>
                        <span className="block text-[9px] text-slate-500 uppercase">Context</span>
                        <span className="text-slate-200 font-bold">
                          {modeScorecard.bestContext.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Feat Badges */}
                  <div className="mb-4">
                    <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
                      Signature Feat Badges
                    </span>
                    <div className="flex flex-col gap-2">
                      {signatureFeats.map((feat) => (
                        <div
                          key={feat.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                            feat.isUnlocked
                              ? "bg-slate-950/80 border-amber-500/40 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                              : "bg-slate-950/40 border-slate-800/80 text-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                feat.isUnlocked ? "bg-amber-500/20 text-amber-400" : "bg-slate-900 text-slate-600"
                              }`}
                            >
                              {feat.icon === "Flame" ? (
                                <Flame className="w-3.5 h-3.5" />
                              ) : feat.icon === "Zap" ? (
                                <Zap className="w-3.5 h-3.5" />
                              ) : feat.icon === "Crown" ? (
                                <Crown className="w-3.5 h-3.5" />
                              ) : feat.icon === "ShieldCheck" ? (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Trophy className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-white truncate">{feat.name}</span>
                              <span className="block text-[10px] text-slate-400 truncate">{feat.description}</span>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase ${
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
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-950 border border-slate-800 text-center">
              <div className="mx-auto w-16 h-16 mb-4 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-600">
                <Trophy className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">No Record Recorded</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                Play {gameConfig.displayName} ({modeDef.displayName}) to establish your all-time personal best record.
              </p>
              <Link
                to={getGameLaunchRoute(selectedGame)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition-all hover:bg-cyan-400"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Launch {gameConfig.displayName}</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Radar Hexagon & Trends (4 Cols) */}
        <div className="col-span-4 flex flex-col gap-4">
          {modeScorecard ? (
            <>
              {/* Archetype Persona Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                    Gamer Persona
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Trait: {archetype.dominantTrait}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">{archetype.title}</h4>
                <p className="text-xs text-slate-400 leading-snug">{archetype.motto}</p>
              </div>

              {/* Radar Card */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md flex flex-col items-center shadow-xl">
                <QuantumRadarHexagon radar={modeScorecard.radar} size={220} />
              </div>

              {/* Recent Runs Sparkline & Momentum Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      Recent Trajectory
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      trendMomentum.isPositiveTrend
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {trendMomentum.label}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1.5">
                  {modeScorecard.recentScores.map((score, i) => (
                    <div
                      key={i}
                      className={`flex-1 p-2 rounded-xl border text-center ${
                        score === modeScorecard.bestScore
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-extrabold"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="block text-[8px] text-slate-500">#{i + 1}</span>
                      <span className="text-xs font-bold">{score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
              Radar telemetry activates once you establish your first match score.
            </div>
          )}
        </div>
      </div>

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
