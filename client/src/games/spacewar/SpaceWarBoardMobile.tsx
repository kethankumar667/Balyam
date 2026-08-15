import React, { useState, useEffect, useRef, useCallback } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { useSpaceWarCanvas } from "./useSpaceWarCanvas";
import { useSpaceWarInput } from "./useSpaceWarInput";
import { shipKeyFor } from "./controls";
import QuadDPad, { type PadDir } from "../../components/QuadDPad";
import { useHaptics } from "../../hooks/useHaptics";

interface SpaceWarBoardMobileProps {
  state: SpaceWarPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export const SPECIAL_WEAPONS_INFO = {
  missile: {
    name: "HOMING MISSILES",
    shortName: "MISSILES",
    icon: "🚀",
    color: "#ff8800",
    glow: "rgba(255, 136, 0, 0.6)",
    btnGradient: "from-[#ff9900] via-[#ff6600] to-[#cc3300]",
    borderColor: "#ffe066",
    description: "Fires 3 smart tracking missiles that automatically seek and destroy enemy ships & bosses.",
  },
  laser: {
    name: "HYPER LASER",
    shortName: "LASER",
    icon: "⚡",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.6)",
    btnGradient: "from-[#00f0ff] via-[#0099ff] to-[#0044cc]",
    borderColor: "#b3f7ff",
    description: "Fires an instant full-screen piercing death beam vaporizing all enemies in line.",
  },
  wall: {
    name: "PLASMA WALL",
    shortName: "BARRIER",
    icon: "🛡️",
    color: "#00ff88",
    glow: "rgba(0, 255, 136, 0.6)",
    btnGradient: "from-[#00ff88] via-[#00cc66] to-[#006633]",
    borderColor: "#b3ffdb",
    description: "Deploys a stationary energy wall that incinerates hostile projectiles & ships on contact.",
  },
} as const;

export default function SpaceWarBoardMobile({
  state,
  selfId,
  onMove,
}: SpaceWarBoardMobileProps) {
  const haptics = useHaptics();
  const { win } = haptics;
  const [isMuted, setIsMuted] = useState(false);
  const [showPowerGuide, setShowPowerGuide] = useState(false);

  // Special Weapon Pickup & Upgrade notification toast
  const [weaponToast, setWeaponToast] = useState<{ message: string; icon: string; color: string } | null>(null);
  const prevSpecialRef = useRef(state.player?.specialAttack);
  const prevSpecialCountRef = useRef(state.player?.specialCount);
  const prevShieldRef = useRef(state.player?.shieldOn);

  useEffect(() => {
    const curSpecial = state.player?.specialAttack;
    const curCount = state.player?.specialCount ?? 0;
    const prevCount = prevSpecialCountRef.current ?? 0;
    const curShield = state.player?.shieldOn;

    if (curSpecial && curCount > prevCount) {
      const meta = SPECIAL_WEAPONS_INFO[curSpecial] || SPECIAL_WEAPONS_INFO.missile;
      setWeaponToast({
        message: `${meta.name} ARMED (+${curCount - prevCount})`,
        icon: meta.icon,
        color: meta.color,
      });
      const timer = setTimeout(() => setWeaponToast(null), 2500);
      return () => clearTimeout(timer);
    } else if (curShield && !prevShieldRef.current) {
      setWeaponToast({
        message: "ENERGY SHIELD ONLINE!",
        icon: "🛡️",
        color: "#00f0ff",
      });
      const timer = setTimeout(() => setWeaponToast(null), 2500);
      return () => clearTimeout(timer);
    }

    prevSpecialRef.current = curSpecial;
    prevSpecialCountRef.current = curCount;
    prevShieldRef.current = curShield;
  }, [state.player?.specialAttack, state.player?.specialCount, state.player?.shieldOn]);

  // One owner for held keys: the pad presses into it, the canvas predicts from
  // it, and every way out of a press releases through it.
  const input = useSpaceWarInput(onMove);

  /**
   * Portrait canvas, driven on requestAnimationFrame and predicting the ship
   * from the same held-key set the pad writes to.
   */
  const canvasRef = useSpaceWarCanvas(state, "vertical", input.held);

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

  /**
   * Portrait draws the landscape world rotated a quarter turn, so screen
   * directions are not engine directions — `shipKeyFor` owns that translation.
   */
  const { press, release, releaseAll } = input;

  const handlePadPress = useCallback(
    (dir: PadDir) => {
      press(shipKeyFor(dir, "vertical"));
      haptics.subtle();
    },
    [press, haptics],
  );

  const handlePadRelease = useCallback(
    (dir: PadDir) => {
      release(shipKeyFor(dir, "vertical"));
    },
    [release],
  );

  // A run that ends or pauses with a finger down must not leave the ship
  // flying: the engine keeps applying held keys the moment it resumes.
  useEffect(() => {
    if (state.isOver || state.isPaused) releaseAll();
  }, [state.isOver, state.isPaused, releaseAll]);

  // Hold-to-fire. `onMove` is a fresh closure on every broadcast, so the
  // interval reads it from a ref rather than capturing a stale one.
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const fireTimer = useRef<number | null>(null);

  const stopFire = useCallback(() => {
    if (fireTimer.current !== null) {
      window.clearInterval(fireTimer.current);
      fireTimer.current = null;
    }
  }, []);

  const startFire = useCallback(() => {
    stopFire();
    moveRef.current("fire");
    haptics.subtle();
    fireTimer.current = window.setInterval(() => moveRef.current("fire"), 110);
  }, [stopFire, haptics]);

  useEffect(() => stopFire, [stopFire]);
  useEffect(() => {
    if (state.isOver || state.isPaused) stopFire();
  }, [state.isOver, state.isPaused, stopFire]);

  // Level Completion Banner state
  const [levelClearBanner, setLevelClearBanner] = useState<{ cleared: number; next: number } | null>(null);
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

  // Current Special Weapon details
  const currentSpecial = state.player?.specialAttack || "missile";
  const specialCount = state.player?.specialCount ?? 0;
  const specialMeta = SPECIAL_WEAPONS_INFO[currentSpecial] || SPECIAL_WEAPONS_INFO.missile;
  const hasSpecialCharges = specialCount > 0;

  return (
    <div className="w-full h-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-between bg-[#060810] text-[#00f0ff] p-1.5 sm:p-2.5 select-none touch-none overflow-hidden font-sans">
      
      {/* CYBER ARCADE HANDHELD CONSOLE SHELL */}
      <div className="w-full max-w-[460px] h-full flex-1 flex flex-col justify-between items-center bg-gradient-to-b from-[#141728] via-[#1a1d33] to-[#0f1120] border-2 border-[#00f0ff]/30 rounded-3xl p-2.5 sm:p-3 shadow-[0_0_30px_rgba(0,240,255,0.15)] gap-2 overflow-hidden">
        
        {/* TOP STATUS & TELEMETRY LED BAR */}
        <div className="w-full flex items-center justify-between px-2 text-[10px] font-mono text-[#8e9ab5] shrink-0 h-[22px] bg-[#0c0e1a] rounded-lg border border-[#1f243d]">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-widest text-[#00f0ff] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse shadow-[0_0_8px_#00f0ff]" />
              LVL {state.level}
            </span>
            <span className="text-[#ffd700] font-bold">★ {state.score}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Lives counter */}
            <span className="flex items-center gap-0.5 text-rose-400 font-bold">
              ❤️ x{state.player.lives}
            </span>

            {/* Power-up Info / Guide button */}
            <button
              onClick={() => setShowPowerGuide(true)}
              className="px-1.5 py-0.5 rounded bg-[#1e2540] hover:bg-[#2b355c] border border-[#00f0ff]/40 text-[#00f0ff] font-bold text-[9px] flex items-center gap-0.5 transition"
              title="Special Powers & Weapons Guide"
            >
              <span>ℹ️ POWERS</span>
            </button>
          </div>
        </div>

        {/* 1. TOP CARD: GAME SCREEN DISPLAY (EXACT 50% EQUAL FLEX SHARE) */}
        <div className="w-full flex-1 h-[48%] bg-black border-2 border-[#00f0ff]/20 rounded-2xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] flex items-center justify-center relative min-h-0">
          
          {/* Dynamic Boss Health Bar Mobile Overlay */}
          {isBossFighting && (
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[92%] bg-[#0c0517]/95 border border-red-500 rounded-lg px-2.5 py-1.5 shadow-[0_0_16px_rgba(255,0,85,0.6)] z-20 flex flex-col gap-0.5 backdrop-blur-md animate-pulse">
              <div className="flex items-center justify-between text-[10px] font-mono leading-tight">
                <span className="font-extrabold text-amber-400 truncate max-w-[70%] flex items-center gap-1">
                  <span className="text-red-500">⚠️</span>
                  <span>{bossName}</span>
                </span>
                <span className="font-bold text-rose-400">
                  {Math.round(bossPct)}%
                </span>
              </div>
              <div className="w-full h-2 bg-red-950/80 rounded-full overflow-hidden border border-red-500/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-150"
                  style={{ width: `${bossPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Real-time In-Game Special Power & Shield Floating Telemetry Badge */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
            {/* Active Armed Special Weapon Pill */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-mono font-bold shadow-lg transition-all ${
                hasSpecialCharges
                  ? "bg-[#0b1022]/90 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                  : "bg-[#0b1022]/70 border-zinc-700 text-zinc-400"
              }`}
            >
              <span className="text-xs">{specialMeta.icon}</span>
              <span>{specialMeta.shortName}</span>
              <span
                className={`px-1 rounded text-[9px] font-black ${
                  hasSpecialCharges ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                x{specialCount}
              </span>
            </div>

            {/* Active Shield Timer Badge */}
            {state.player.shieldOn && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(0,240,255,0.5)] animate-pulse">
                <span>🛡️</span>
                <span>SHIELD: {Math.ceil((state.player.shieldTimeLeft || 0) / 1000)}s</span>
              </div>
            )}
          </div>

          {/* Weapon / Powerup Event Toast Banner */}
          {weaponToast && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#080d1e]/95 border-2 shadow-2xl text-xs font-mono font-black tracking-wide"
                style={{ borderColor: weaponToast.color, color: weaponToast.color, boxShadow: `0 0 16px ${weaponToast.color}` }}
              >
                <span>{weaponToast.icon}</span>
                <span>{weaponToast.message}</span>
              </div>
            </div>
          )}

          {/* Level Complete Celebration Overlay */}
          {levelClearBanner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 animate-in fade-in zoom-in duration-300 p-3">
              <div className="bg-gradient-to-b from-[#111936] to-[#0a0f24] border-2 border-amber-400 rounded-2xl p-4 text-center shadow-[0_0_28px_rgba(251,191,36,0.6)] w-full max-w-[280px]">
                <div className="text-2xl mb-0.5">⭐ 🏆 ⭐</div>
                <h2 className="text-lg font-black text-amber-300 tracking-wide font-display">
                  LEVEL {levelClearBanner.cleared} CLEARED!
                </h2>
                <p className="text-xs font-mono text-[#00f0ff] mt-1 font-bold">
                  WARPING TO LEVEL {levelClearBanner.next}...
                </p>
                <div className="mt-2 inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono font-bold text-[10px]">
                  BONUS: +{levelClearBanner.cleared * 500} PTS
                </div>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={480}
            height={640}
            className="w-full h-full object-contain"
          />
        </div>

        {/* 2. BOTTOM CARD: ERGONOMIC CONTROLLER DECK & THEMES */}
        <div className="w-full flex-1 h-[48%] flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden">
          
          {/* MAIN CONTROLLER DECK (12-COLUMN GRID) */}
          <div className="w-full flex-1 grid grid-cols-12 gap-1 items-center bg-gradient-to-b from-[#1f2438] to-[#141626] border-2 border-[#2f364f] rounded-2xl p-2 sm:p-3 shadow-2xl overflow-hidden">
            
            {/* LEFT 5 COLUMNS: FOUR-SECTOR FLIGHT PAD */}
            <div className="col-span-5 flex items-center justify-center h-full min-h-0">
              <QuadDPad
                onPress={handlePadPress}
                onRelease={handlePadRelease}
                accent="#00f0ff"
                divider="#ff2a5f"
                ariaLabel="Flight controls"
                disabled={state.isOver}
                minSize={110}
                maxSize={180}
                heightFraction={0.19}
              />
            </div>

            {/* CENTER 3 COLUMNS: DYNAMIC SPECIAL WEAPON & UTILITIES */}
            <div className="col-span-3 flex flex-col items-center justify-center gap-1.5 h-full">
              {/* TOP UTILITY ROW: PAUSE & MUTE */}
              <div className="flex items-center gap-2">
                {/* PAUSE */}
                <button
                  onClick={() => onMove("toggle_pause")}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-b from-[#3a4469] to-[#1e2338] border border-[#5d6d9e] shadow active:translate-y-0.5 flex items-center justify-center text-white font-bold text-[10px]"
                  title="Pause"
                >
                  {state.isPaused ? "▶" : "⏸"}
                </button>

                {/* MUTE */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-b from-[#3a4469] to-[#1e2338] border border-[#5d6d9e] shadow active:translate-y-0.5 flex items-center justify-center text-white font-bold text-[10px]"
                  title="Mute"
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>
              </div>

              {/* DYNAMIC SPECIAL WEAPON CONTROLLER BUTTON */}
              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                {/* Weapon Title & Category */}
                <div
                  className="flex items-center gap-0.5 text-[8px] font-black tracking-tighter uppercase"
                  style={{ color: hasSpecialCharges ? specialMeta.color : "#717d9c" }}
                >
                  <span>{specialMeta.shortName}</span>
                </div>

                {/* Main 3D Special Button with Live Badge */}
                <div className="relative">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onMove("special");
                      if (hasSpecialCharges) {
                        haptics.win();
                      } else {
                        haptics.subtle();
                      }
                    }}
                    disabled={state.isOver || state.isPaused}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl transition-all active:scale-95 cursor-pointer ${
                      hasSpecialCharges
                        ? `bg-gradient-to-b ${specialMeta.btnGradient} border-2 border-white/90 shadow-[0_3px_0_#4d1a00] active:translate-y-0.5`
                        : "bg-gradient-to-b from-[#2a2e45] to-[#161826] border-2 border-[#3c4463] text-zinc-500 opacity-60 shadow-none"
                    }`}
                    aria-label={`Special Weapon: ${specialMeta.name}, ${specialCount} charges remaining`}
                  >
                    <span>{specialMeta.icon}</span>
                  </button>

                  {/* High-visibility Remaining Charges Badge */}
                  <span
                    className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full font-mono font-black text-[10px] flex items-center justify-center border shadow-md ${
                      hasSpecialCharges
                        ? "bg-red-600 border-white text-white animate-pulse"
                        : "bg-[#1d2133] border-[#3f4769] text-zinc-400"
                    }`}
                  >
                    x{specialCount}
                  </span>
                </div>

                {/* Subtitle Status */}
                <span
                  className="text-[7.5px] font-mono font-extrabold tracking-tight"
                  style={{ color: hasSpecialCharges ? "#ffd700" : "#6c7793" }}
                >
                  {hasSpecialCharges ? `${specialCount} CHARGE${specialCount > 1 ? "S" : ""}` : "EMPTY (⚡)"}
                </span>
              </div>
            </div>

            {/* RIGHT 4 COLUMNS: MASSIVE ROUND 3D RED FIRE BUTTON */}
            <div className="col-span-4 flex items-center justify-center h-full min-h-0">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  startFire();
                }}
                onPointerUp={stopFire}
                onPointerCancel={stopFire}
                onLostPointerCapture={stopFire}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: "none" }}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-b from-[#ff4d4d] via-[#e60000] to-[#990000] border-4 border-[#ffb3b3] shadow-[0_6px_0_#660000] active:translate-y-1 flex items-center justify-center text-white font-extrabold tracking-wider text-lg sm:text-xl drop-shadow-md cursor-pointer"
                aria-label="Fire Weapon"
              >
                FIRE
              </button>
            </div>

          </div>

          {/* BOTTOM THEME SELECTOR PILLS */}
          <div className="flex items-center justify-between bg-[#10121e] px-2.5 py-1 rounded-xl border border-[#23273b] w-full text-xs font-mono shrink-0 h-[28px]">
            <span className="font-bold text-[#8e9ab5] text-[10px]">THEME:</span>
            <div className="flex items-center gap-1">
              {[
                { id: "cyberpunk", label: "🌌 Cyber" },
                { id: "retro_nokia", label: "📟 Nokia" },
                { id: "neon_synthwave", label: "🌅 Synth" },
                { id: "solar_flare", label: "☀️ Solar" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onMove("set_theme", t.id)}
                  className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition ${
                    (state.theme || "cyberpunk") === t.id
                      ? "bg-[#00f0ff] text-black shadow-[0_0_8px_#00f0ff]"
                      : "text-[#8e9bb4] hover:text-white bg-[#181a28]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* SPECIAL POWERS & WEAPONS MANUAL MODAL */}
      {showPowerGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0f1429] border-2 border-[#00f0ff] rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-[0_0_30px_rgba(0,240,255,0.3)] text-white font-mono flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#232d54] pb-2">
              <h3 className="text-sm font-black text-[#00f0ff] flex items-center gap-1.5">
                <span>⚡</span> SPECIAL POWERS & WEAPONS
              </h3>
              <button
                onClick={() => setShowPowerGuide(false)}
                className="w-6 h-6 rounded-full bg-[#1b223d] hover:bg-[#2b3660] text-[#00f0ff] font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Special Attack Types List */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] text-[#8e9ab5] uppercase font-bold tracking-wider">
                Armed Special Attacks (Tap SPECIAL button)
              </span>

              {/* 1. Homing Missiles */}
              <div className="bg-[#151b36] p-2.5 rounded-xl border border-amber-500/40 flex items-start gap-2.5">
                <span className="text-2xl p-1 bg-amber-950/60 rounded-lg border border-amber-400">🚀</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-extrabold text-amber-300 text-xs">HOMING MISSILES</span>
                  <p className="text-[11px] text-zinc-300 leading-tight">
                    Fires 3 smart tracking missiles that home into nearest enemies and boss weak points.
                  </p>
                </div>
              </div>

              {/* 2. Hyper Laser */}
              <div className="bg-[#151b36] p-2.5 rounded-xl border border-cyan-500/40 flex items-start gap-2.5">
                <span className="text-2xl p-1 bg-cyan-950/60 rounded-lg border border-cyan-400">⚡</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-extrabold text-cyan-300 text-xs">HYPER LASER</span>
                  <p className="text-[11px] text-zinc-300 leading-tight">
                    Instant screen-wide piercing energy beam obliterating entire enemy waves in line.
                  </p>
                </div>
              </div>

              {/* 3. Plasma Wall */}
              <div className="bg-[#151b36] p-2.5 rounded-xl border border-emerald-500/40 flex items-start gap-2.5">
                <span className="text-2xl p-1 bg-emerald-950/60 rounded-lg border border-emerald-400">🛡️</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-extrabold text-emerald-300 text-xs">PLASMA WALL</span>
                  <p className="text-[11px] text-zinc-300 leading-tight">
                    Deploys an energy barrier that incinerates all incoming enemy projectiles & craft.
                  </p>
                </div>
              </div>
            </div>

            {/* Field Powerup Drops List */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#232d54]">
              <span className="text-[10px] text-[#8e9ab5] uppercase font-bold tracking-wider">
                Field Power-Up Drops (Fly ship over icon)
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="bg-[#151b36] p-2 rounded-lg border border-cyan-500/30">
                  <span className="text-base block">⚡</span>
                  <span className="font-bold text-cyan-300">AMMO (+3)</span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">Cycles weapon & adds +3</span>
                </div>
                <div className="bg-[#151b36] p-2 rounded-lg border border-emerald-500/30">
                  <span className="text-base block">🛡️</span>
                  <span className="font-bold text-emerald-300">SHIELD (4s)</span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">Complete invulnerability</span>
                </div>
                <div className="bg-[#151b36] p-2 rounded-lg border border-rose-500/30">
                  <span className="text-base block">❤️</span>
                  <span className="font-bold text-rose-300">LIFE (+1)</span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">Restores 1 starfighter</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPowerGuide(false)}
              className="w-full py-2 bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-black font-black text-xs rounded-xl shadow mt-1 cursor-pointer"
            >
              RETURN TO BATTLE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
