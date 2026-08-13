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

export default function SpaceWarBoardMobile({
  state,
  selfId,
  onMove,
}: SpaceWarBoardMobileProps) {
  const haptics = useHaptics();
  const { win } = haptics;
  const [isMuted, setIsMuted] = useState(false);

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

  return (
    <div className="w-full h-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-between bg-[#060810] text-[#00f0ff] p-1.5 sm:p-2.5 select-none touch-none overflow-hidden">
      
      {/* CYBER ARCADE HANDHELD CONSOLE SHELL */}
      <div className="w-full max-w-[460px] h-full flex-1 flex flex-col justify-between items-center bg-gradient-to-b from-[#141728] via-[#1a1d33] to-[#0f1120] border-2 border-[#00f0ff]/30 rounded-3xl p-2.5 sm:p-3 shadow-[0_0_30px_rgba(0,240,255,0.15)] gap-2 overflow-hidden">
        
        {/* TOP STATUS LED BAR */}
        <div className="w-full flex items-center justify-between px-2 text-[10px] font-mono text-[#8e9ab5] shrink-0 h-[20px]">
          <span className="font-extrabold tracking-widest text-[#00f0ff] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse shadow-[0_0_8px_#00f0ff]" />
            SPACE WAR PORTABLE
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px] text-[#00ff88]">
              🟢 READY
            </span>
          </div>
        </div>

        {/* 1. TOP CARD: GAME SCREEN DISPLAY (EXACT 50% EQUAL FLEX SHARE) */}
        <div className="w-full flex-1 h-[48%] bg-black border-2 border-[#00f0ff]/20 rounded-2xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] flex items-center justify-center relative min-h-0">
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
            
            {/* LEFT 5 COLUMNS: FOUR-SECTOR FLIGHT PAD — the whole quarter is
                the control, and a finger can slide between quarters without
                lifting. Sized off the deck height so it fills the column. */}
            <div className="col-span-6 flex items-center justify-center h-full min-h-0">
              <QuadDPad
                onPress={handlePadPress}
                onRelease={handlePadRelease}
                accent="#00f0ff"
                divider="#ff2a5f"
                ariaLabel="Flight controls"
                disabled={state.isOver}
                minSize={120}
                maxSize={200}
                /* Lower than Snake's share: this deck also carries the fire
                   button, the utility stack and the theme row, and a short
                   phone has to fit all of it. */
                heightFraction={0.19}
              />
            </div>

            {/* CENTER 2 COLUMNS: UTILITIES & SPECIAL WEAPON */}
            <div className="col-span-2 flex flex-col items-center justify-center gap-1.5 h-full">
              {/* PAUSE */}
              <button
                onClick={() => onMove("toggle_pause")}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#ffe066] to-[#cc9900] border border-[#fff0b3] shadow-[0_2px_0_#806000] active:translate-y-0.5 flex items-center justify-center text-black font-bold text-xs"
                title="Pause"
              >
                ⏸
              </button>

              {/* MUTE */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#ffe066] to-[#cc9900] border border-[#fff0b3] shadow-[0_2px_0_#806000] active:translate-y-0.5 flex items-center justify-center text-black font-bold text-xs"
                title="Mute"
              >
                {isMuted ? "🔇" : "🔊"}
              </button>

              {/* SPECIAL WEAPON BUTTON */}
              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                <span className="text-[8px] font-extrabold text-[#8e9ab5] tracking-tighter uppercase">SPECIAL</span>
                <button
                  onPointerDown={() => {
                    onMove("special");
                  }}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#ffe066] via-[#ffcc00] to-[#cc9900] border-2 border-[#fff0b3] shadow-[0_3px_0_#806000] active:translate-y-0.5 flex items-center justify-center text-xl shadow-lg"
                  aria-label="Special Weapon"
                >
                  🚀
                </button>
              </div>
            </div>

            {/* RIGHT 4 COLUMNS: MASSIVE ROUND 3D RED FIRE BUTTON.
                Held, it keeps firing — one shot per tap meant a thumb had to
                out-drum the enemy spawner to clear a wave. */}
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
                /* sm:w-24, not sm:w-26 — `26` is not on Tailwind's scale, so
                   the class generated nothing and the button never grew on a
                   larger screen. Harmless next to Snake's `h-15` (which cost
                   it the touch target entirely), but the same mistake. */
                className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#ff4d4d] via-[#e60000] to-[#990000] border-4 border-[#ffb3b3] shadow-[0_7px_0_#660000] active:translate-y-1 flex items-center justify-center text-white font-extrabold tracking-wider text-xl sm:text-2xl drop-shadow-md"
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
    </div>
  );
}
