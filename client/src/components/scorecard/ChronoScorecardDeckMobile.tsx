import React, { useState } from "react";
import { Trophy, Zap, Share2, ChevronRight, Activity, Award } from "lucide-react";
import type { PlayerScorecardArchive, AllGameSlug } from "@shared/profile/Scorecard";
import { GAME_MODE_REGISTRY, getGameModeConfig } from "@shared/profile/GameModes";
import QuantumRadarHexagon from "./QuantumRadarHexagon";
import HoloPassShareModal from "./HoloPassShareModal";

interface ChronoScorecardDeckMobileProps {
  archive: PlayerScorecardArchive;
  playerName: string;
  avatar?: string;
  className?: string;
}

export default function ChronoScorecardDeckMobile({
  archive,
  playerName,
  avatar,
  className = "",
}: ChronoScorecardDeckMobileProps) {
  // Available games list from registry
  const availableGames = Object.keys(GAME_MODE_REGISTRY) as AllGameSlug[];
  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");

  const gameConfig = getGameModeConfig(selectedGame);
  const [selectedModeId, setSelectedModeId] = useState<string>(gameConfig.defaultModeId);

  const [showRadar, setShowRadar] = useState(false);
  const [sharingScorecard, setSharingScorecard] = useState(false);

  const gameScorecard = archive.games[selectedGame];
  const modeScorecard = gameScorecard?.modes[selectedModeId];

  // Active mode definition
  const modeDef =
    gameConfig.modes.find((m) => m.modeId === selectedModeId) ?? gameConfig.modes[0]!;

  return (
    <div className={`w-full flex flex-col gap-4 select-none ${className}`}>
      {/* Horizontal Game Selector Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
        {availableGames.map((gameSlug) => {
          const cfg = getGameModeConfig(gameSlug);
          const hasRecord = archive.games[gameSlug] != null;
          const isSelected = selectedGame === gameSlug;

          return (
            <button
              key={gameSlug}
              onClick={() => {
                setSelectedGame(gameSlug);
                const nextCfg = getGameModeConfig(gameSlug);
                setSelectedModeId(nextCfg.defaultModeId);
              }}
              className={`flex-shrink-0 snap-start flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all min-h-[44px] ${
                isSelected
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {hasRecord && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              <span>{cfg.displayName}</span>
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
              onClick={() => setSelectedModeId(mode.modeId)}
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

      {/* Main Holographic Chrono-Card */}
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
          {/* Card Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                {gameConfig.displayName}
              </div>
              <h3 className="text-lg font-black text-white">{modeScorecard.modeDisplayName}</h3>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
              <Award className="w-3 h-3 text-cyan-400" />
              <span className="uppercase">{modeScorecard.foilTier.replace("_", " ")}</span>
            </div>
          </div>

          {/* Record Display Hero */}
          <div className="p-4 mb-4 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                All-Time Record
              </span>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 font-mono">
                {modeScorecard.bestScore}
                <span className="text-xs font-normal text-slate-400 ml-1.5">{modeDef.unit}</span>
              </div>
            </div>
            <button
              onClick={() => setSharingScorecard(true)}
              className="p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Share holographic scorecard"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Stat Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-center font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="block text-[9px] text-slate-500 uppercase">Played</span>
              <span className="text-sm font-bold text-slate-200">{modeScorecard.timesPlayed}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="block text-[9px] text-slate-500 uppercase">Average</span>
              <span className="text-sm font-bold text-slate-200">{modeScorecard.averageScore}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="block text-[9px] text-slate-500 uppercase">Trend (5)</span>
              <span className="text-sm font-bold text-cyan-400">
                {modeScorecard.recentScores.length > 0 ? modeScorecard.recentScores[0] : "-"}
              </span>
            </div>
          </div>

          {/* Mini Recent Scores Sparkline */}
          {modeScorecard.recentScores.length > 1 && (
            <div className="p-2.5 mb-4 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-slate-500 uppercase">Recent Runs:</span>
              <div className="flex items-center gap-1.5">
                {modeScorecard.recentScores.map((sc, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      sc === modeScorecard.bestScore
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {sc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quantum Radar Drawer Toggle */}
          <button
            onClick={() => setShowRadar(!showRadar)}
            className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition-all min-h-[44px]"
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
