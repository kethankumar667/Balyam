import React, { useState, useRef } from "react";
import { Trophy, Zap, Share2, Award, Flame, TrendingUp } from "lucide-react";
import type { PlayerScorecardArchive, AllGameSlug } from "@shared/profile/Scorecard";
import { GAME_MODE_REGISTRY, getGameModeConfig } from "@shared/profile/GameModes";
import QuantumRadarHexagon from "./QuantumRadarHexagon";
import HoloPassShareModal from "./HoloPassShareModal";

interface ChronoScorecardDeckDesktopProps {
  archive: PlayerScorecardArchive;
  playerName: string;
  avatar?: string;
  className?: string;
}

export default function ChronoScorecardDeckDesktop({
  archive,
  playerName,
  avatar,
  className = "",
}: ChronoScorecardDeckDesktopProps) {
  const availableGames = Object.keys(GAME_MODE_REGISTRY) as AllGameSlug[];
  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");

  const gameConfig = getGameModeConfig(selectedGame);
  const [selectedModeId, setSelectedModeId] = useState<string>(gameConfig.defaultModeId);

  const [sharingScorecard, setSharingScorecard] = useState(false);

  // 3D Parallax Tilt state
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;
    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const gameScorecard = archive.games[selectedGame];
  const modeScorecard = gameScorecard?.modes[selectedModeId];
  const modeDef =
    gameConfig.modes.find((m) => m.modeId === selectedModeId) ?? gameConfig.modes[0]!;

  return (
    <div className={`w-full max-w-7xl mx-auto flex flex-col gap-6 select-none ${className}`}>
      {/* Desktop Top Bar: Total PBs Beaten & Global Metric */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Chrono-Scorecard Matrix</h2>
            <p className="text-xs text-slate-400">All-time personal best records across games and modes</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
            <Flame className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span>Records Shattered:</span>
            <span className="font-extrabold text-white text-sm">{archive.totalPersonalBestsBeaten}</span>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Game List (3 Cols) */}
        <div className="col-span-3 flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 max-h-[680px] overflow-y-auto">
          <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
            Catalog Games
          </span>
          {availableGames.map((gameSlug) => {
            const cfg = getGameModeConfig(gameSlug);
            const isSelected = selectedGame === gameSlug;
            const hasRecord = archive.games[gameSlug] != null;
            const modesCount = archive.games[gameSlug]?.totalModesPlayed ?? 0;

            return (
              <button
                key={gameSlug}
                onClick={() => {
                  setSelectedGame(gameSlug);
                  const nextCfg = getGameModeConfig(gameSlug);
                  setSelectedModeId(nextCfg.defaultModeId);
                }}
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                  isSelected
                    ? "bg-gradient-to-r from-cyan-600/30 to-blue-600/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                    : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasRecord ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]" : "bg-slate-700"
                    }`}
                  />
                  <span>{cfg.displayName}</span>
                </div>
                {hasRecord && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {modesCount} {modesCount === 1 ? "mode" : "modes"}
                  </span>
                )}
              </button>
            );
          })}
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
                  onClick={() => setSelectedModeId(mode.modeId)}
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

          {/* 3D Holographic Card */}
          {modeScorecard ? (
            <div
              style={{ perspective: "1000px" }}
              className="w-full"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div
                ref={cardRef}
                style={{
                  transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                  transition: "transform 0.1s ease-out",
                }}
                className={`relative p-6 rounded-3xl border backdrop-blur-xl overflow-hidden shadow-2xl ${
                  modeScorecard.foilTier === "obsidian_vanguard"
                    ? "bg-gradient-to-br from-purple-950/80 via-slate-950 to-black border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
                    : modeScorecard.foilTier === "prismatic_holo"
                    ? "bg-gradient-to-br from-amber-950/50 via-slate-950 to-cyan-950/50 border-amber-500/50 shadow-[0_0_35px_rgba(245,158,11,0.25)]"
                    : "bg-slate-900/90 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                }`}
              >
                {/* Scanline Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(6,182,212,0.03)_51%)] bg-[length:100%_4px] pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                      {gameConfig.displayName}
                    </span>
                    <h3 className="text-xl font-black text-white">{modeScorecard.modeDisplayName}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                    <Award className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="uppercase">{modeScorecard.foilTier.replace("_", " ")}</span>
                  </div>
                </div>

                {/* Hero Score Showcase */}
                <div className="p-6 mb-6 rounded-2xl bg-black/70 border border-slate-800/80 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="block text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1">
                      Personal Best
                    </span>
                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 font-mono tracking-tight">
                      {modeScorecard.bestScore}
                      <span className="text-sm font-normal text-slate-400 ml-2">{modeDef.unit}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSharingScorecard(true)}
                    className="flex items-center gap-2 py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all font-semibold text-xs shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Holo-Pass</span>
                  </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6 font-mono text-center">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Times Played</span>
                    <span className="text-lg font-bold text-white">{modeScorecard.timesPlayed}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Average Score</span>
                    <span className="text-lg font-bold text-white">{modeScorecard.averageScore}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Last Score</span>
                    <span className="text-lg font-bold text-cyan-400">
                      {modeScorecard.recentScores[0] ?? "-"}
                    </span>
                  </div>
                </div>

                {/* Secondary Metrics pills */}
                {Object.keys(modeScorecard.secondaryMetrics).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/80">
                    {Object.entries(modeScorecard.secondaryMetrics).map(([key, val]) => (
                      <div
                        key={key}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
                      >
                        <span className="text-slate-500 capitalize">{key}: </span>
                        <span className="font-bold text-white">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-950 border border-slate-800 text-center">
              <div className="mx-auto w-16 h-16 mb-4 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-600">
                <Trophy className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">No Record Recorded</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Play {gameConfig.displayName} ({modeDef.displayName}) to establish your all-time personal best record.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Quantum Radar Hexagon & Trends (4 Cols) */}
        <div className="col-span-4 flex flex-col gap-4">
          {modeScorecard ? (
            <>
              {/* Radar Card */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md flex flex-col items-center shadow-xl">
                <QuantumRadarHexagon radar={modeScorecard.radar} size={240} />
              </div>

              {/* Recent Runs Sparkline Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">
                    Recent Score Trajectory
                  </span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>

                <div className="flex items-center justify-between gap-2">
                  {modeScorecard.recentScores.map((score, i) => (
                    <div
                      key={i}
                      className={`flex-1 p-2.5 rounded-xl border text-center ${
                        score === modeScorecard.bestScore
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-extrabold"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="block text-[9px] text-slate-500">Run {i + 1}</span>
                      <span className="text-sm">{score}</span>
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
