import React, { useEffect, useRef } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { useSpaceWarCanvas } from "./useSpaceWarCanvas";
import { useSpaceWarInput } from "./useSpaceWarInput";
import { STEERING_KEYS } from "./controls";
import { useHaptics } from "../../hooks/useHaptics";

interface SpaceWarBoardDesktopProps {
  state: SpaceWarPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SpaceWarBoardDesktop({
  state,
  selfId,
  onMove,
}: SpaceWarBoardDesktopProps) {
  const { win } = useHaptics();

  // Fire vibration when player ship gets killed (lives decrease) or game is over
  const prevLivesRef = useRef(state.player?.lives);
  const prevOverRef = useRef(state.isOver);

  useEffect(() => {
    const currentLives = state.player?.lives;
    if (
      (prevLivesRef.current !== undefined && currentLives < prevLivesRef.current) ||
      (state.isOver && !prevOverRef.current)
    ) {
      win();
    }
    prevLivesRef.current = currentLives;
    prevOverRef.current = !!state.isOver;
  }, [state.player?.lives, state.isOver, win]);

  const input = useSpaceWarInput(onMove);
  const { press, release } = input;

  // Keyboard Event Listeners
  useEffect(() => {
    const ACTIONS = [" ", "x", "X", "p", "P"];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (STEERING_KEYS.has(e.key)) {
        e.preventDefault();
        // Through the input hook: it de-duplicates the OS auto-repeat (which
        // otherwise sent a `keydown` every ~30ms for as long as a key was
        // held) and guarantees the release even if focus is lost mid-press.
        press(e.key);
      } else if (ACTIONS.includes(e.key)) {
        e.preventDefault();
        onMove("keydown", e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (STEERING_KEYS.has(e.key)) {
        release(e.key);
      } else if (ACTIONS.includes(e.key)) {
        onMove("keyup", e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onMove, press, release]);

  /**
   * Landscape canvas on requestAnimationFrame — see the hook. Painting only
   * when a broadcast arrived capped this at the 30Hz simulation rate and
   * left every ship and bullet stepping between fixed positions.
   */
  const canvasRef = useSpaceWarCanvas(state, "horizontal", input.held);

  // Level Completion Banner state
  const [levelClearBanner, setLevelClearBanner] = React.useState<{ cleared: number; next: number } | null>(null);
  const prevLevelRef = useRef(state.level);

  useEffect(() => {
    if (state.level > prevLevelRef.current) {
      setLevelClearBanner({ cleared: prevLevelRef.current, next: state.level });
      win();
      const timer = window.setTimeout(() => setLevelClearBanner(null), 3500);
      prevLevelRef.current = state.level;
      return () => window.clearTimeout(timer);
    }
    prevLevelRef.current = state.level;
  }, [state.level, win]);

  const boss = state.enemies.find((e) => e.type === "boss");
  const bossHp = state.bossHp ?? (boss ? boss.hp : null);
  const bossMaxHp = state.bossMaxHp ?? (boss ? boss.maxHp : null);
  const isBossFighting = bossHp !== null && bossMaxHp !== null && bossHp > 0;

  const bossPct = isBossFighting ? Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100)) : 0;
  const bossName = state.level <= 2
    ? "CYBER GOLIATH DREADNOUGHT"
    : state.level <= 4
    ? "VOID LEVIATHAN SERPENT"
    : state.level <= 6
    ? "NEO-KRAKEN BIO-TITAN"
    : "APOCALYPSE HARBINGER TITAN";

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full max-w-[1280px] mx-auto p-4 select-none">
      {/* Left Main Play Area */}
      <div className="flex-1 flex flex-col items-center w-full">
        {/* Futuristic Top Bezel */}
        <div className="w-full flex items-center justify-between px-4 py-2.5 bg-[#12162e] border-2 border-[#1f2952] rounded-t-2xl text-xs font-mono text-[#00f0ff] shadow-lg">
          <div className="flex items-center gap-2 font-bold tracking-wide">
            <span className="w-3 h-3 rounded-full bg-[#00f0ff] animate-pulse" />
            <span>SPACE WAR</span>
          </div>

          {/* Theme Selector Pills */}
          <div className="flex items-center gap-1.5 bg-[#0a0d1c] p-1.5 rounded-xl border border-[#1f2952]">
            {[
              { id: "cyberpunk", label: "🌌 Cyberpunk" },
              { id: "retro_nokia", label: "📟 3310 Nokia" },
              { id: "neon_synthwave", label: "🌅 Synthwave" },
              { id: "solar_flare", label: "☀️ Solar Flare" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => onMove("set_theme", t.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  (state.theme || "cyberpunk") === t.id
                    ? "bg-[#00f0ff] text-black shadow-md"
                    : "text-[#8e9bb4] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[12px] text-[#ffd700] font-bold">HIGH SCORE: {state.highScore}</span>
            <button
              onClick={() => onMove("toggle_pause")}
              className="px-3.5 py-1 bg-[#1a2347] hover:bg-[#253266] text-[#00f0ff] font-bold rounded-lg border border-[#00f0ff]/50 shadow transition"
            >
              {state.isPaused ? "RESUME" : "PAUSE"}
            </button>
          </div>
        </div>

        {/* 840x480 Game Canvas Viewport */}
        <div className="relative w-full aspect-[840/480] bg-black border-x-2 border-b-2 border-[#1f2952] rounded-b-2xl overflow-hidden shadow-2xl">
          {/* Dynamic Boss Monster Health Bar Top Overlay */}
          {isBossFighting && (
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[90%] max-w-[560px] bg-[#0c0517]/95 border-2 border-red-500 rounded-xl px-4 py-2 shadow-[0_0_24px_rgba(255,0,85,0.6)] z-20 flex flex-col gap-1 backdrop-blur-md animate-pulse">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                  <span className="text-red-500 animate-bounce">⚠️</span>
                  <span>BOSS: {bossName}</span>
                </span>
                <span className="font-black text-rose-400">
                  {bossHp} / {bossMaxHp} ({Math.round(bossPct)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-red-950/80 rounded-full overflow-hidden border border-red-500/50 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-150 shadow-[0_0_12px_#ff0055]"
                  style={{ width: `${bossPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Level Complete Celebration Overlay */}
          {levelClearBanner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-30 animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-b from-[#111936] to-[#0a0f24] border-2 border-amber-400 rounded-3xl p-6 text-center shadow-[0_0_36px_rgba(251,191,36,0.5)] max-w-md mx-4">
                <div className="text-3xl mb-1">⭐ 🏆 ⭐</div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide font-display">
                  LEVEL {levelClearBanner.cleared} CLEARED!
                </h2>
                <p className="text-sm font-mono text-[#00f0ff] mt-2 font-bold">
                  WARPING TO LEVEL {levelClearBanner.next}...
                </p>
                <div className="mt-3.5 inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono font-bold text-xs">
                  BONUS: +{levelClearBanner.cleared * 500} POINTS
                </div>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={840}
            height={480}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Right Desktop Dashboard Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4 p-5 bg-[#101429] border-2 border-[#1c2447] rounded-2xl text-[#00f0ff] font-mono shadow-xl">
        <h3 className="text-lg font-bold border-b border-[#1c2447] pb-2 text-[#ffffff] flex items-center gap-2">
          <span>🚀</span> TELEMETRY PANEL
        </h3>

        {/* Campaign Stats */}
        <div className="flex flex-col gap-2.5 bg-[#161c38] p-3.5 rounded-xl border border-[#232c57] text-xs">
          <div className="flex justify-between">
            <span className="text-[#8e9bb4]">CURRENT LEVEL:</span>
            <span className="font-bold text-[#00f0ff]">{state.level} / {state.maxLevels}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e9bb4]">SCORE:</span>
            <span className="font-bold text-[#ffd700]">{state.score}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e9bb4]">LIVES REMAINING:</span>
            <span className="font-bold text-[#ff3366]">{state.player.lives} / {state.player.maxLives}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8e9bb4]">SPECIAL WEAPON:</span>
            <span
              className="font-bold uppercase px-2 py-0.5 rounded border text-xs flex items-center gap-1 shadow"
              style={{
                borderColor: state.player.specialAttack === "missile" ? "#ff8800" : state.player.specialAttack === "laser" ? "#00f0ff" : "#00ff88",
                color: state.player.specialAttack === "missile" ? "#ffaa33" : state.player.specialAttack === "laser" ? "#00f0ff" : "#00ff88",
                backgroundColor: "rgba(10, 15, 35, 0.8)",
              }}
            >
              <span>{state.player.specialAttack === "missile" ? "🚀 MISSILES" : state.player.specialAttack === "laser" ? "⚡ HYPER LASER" : "🛡️ PLASMA WALL"}</span>
              <span className="text-white font-black bg-red-600 px-1 rounded text-[10px]">x{state.player.specialCount}</span>
            </span>
          </div>
          {state.player.shieldOn && (
            <div className="flex justify-between items-center bg-cyan-950/50 p-1.5 rounded border border-cyan-400 text-cyan-300">
              <span className="font-bold flex items-center gap-1"><span>🛡️</span> FORCEFIELD SHIELD:</span>
              <span className="font-black animate-pulse">{Math.ceil((state.player.shieldTimeLeft || 0) / 1000)}s</span>
            </div>
          )}
        </div>

        {/* Controls Guide */}
        <div className="flex flex-col gap-2 bg-[#161c38] p-3.5 rounded-xl border border-[#232c57] text-xs">
          <h4 className="font-bold text-[#ffffff] border-b border-[#232c57] pb-1">
            KEYBOARD CONTROLS
          </h4>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <span className="text-[#8e9bb4]">MOVE:</span>
              <p className="font-bold text-[#00f0ff]">WASD / ARROWS</p>
            </div>
            <div>
              <span className="text-[#8e9bb4]">PRIMARY FIRE:</span>
              <p className="font-bold text-[#ff3366]">SPACEBAR</p>
            </div>
            <div>
              <span className="text-[#8e9bb4]">SPECIAL WEAPON:</span>
              <p className="font-bold text-[#cc99ff]">X KEY</p>
            </div>
            <div>
              <span className="text-[#8e9bb4]">PAUSE GAME:</span>
              <p className="font-bold text-[#ffd700]">P KEY</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            onClick={() => onMove("special")}
            className={`py-3 text-white font-bold rounded-xl border flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 ${
              state.player.specialCount > 0
                ? "bg-gradient-to-r from-[#8000ff] to-[#cc00ff] hover:from-[#9933ff] hover:to-[#e600ff] border-[#cc99ff] shadow-[0_0_12px_rgba(204,0,255,0.4)] cursor-pointer"
                : "bg-[#1d2238] border-[#374066] text-zinc-500 opacity-60 cursor-not-allowed"
            }`}
          >
            <span>{state.player.specialAttack === "missile" ? "🚀" : state.player.specialAttack === "laser" ? "⚡" : "🛡️"}</span>
            <span>SPECIAL (x{state.player.specialCount})</span>
          </button>

          <button
            onClick={() => onMove("fire")}
            className="py-3 bg-[#ff0055] hover:bg-[#ff3377] text-white font-bold rounded-xl border border-[#ff99bb] flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
          >
            <span>🔥</span> FIRE
          </button>
        </div>
      </div>
    </div>
  );
}
