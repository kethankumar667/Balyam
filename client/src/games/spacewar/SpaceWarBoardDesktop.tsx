import React, { useEffect } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { useSpaceWarCanvas } from "./useSpaceWarCanvas";

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

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "x", "X", "p", "P"].includes(
          e.key
        )
      ) {
        e.preventDefault();
        onMove("keydown", e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "x", "X", "p", "P"].includes(
          e.key
        )
      ) {
        onMove("keyup", e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onMove]);

  /**
   * Landscape canvas on requestAnimationFrame — see the hook. Painting only
   * when a broadcast arrived capped this at the 30Hz simulation rate and
   * left every ship and bullet stepping between fixed positions.
   */
  const canvasRef = useSpaceWarCanvas(state, "horizontal");

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
          <div className="flex justify-between">
            <span className="text-[#8e9bb4]">SPECIAL WEAPON:</span>
            <span className="font-bold uppercase text-[#cc99ff]">
              {state.player.specialAttack} (x{state.player.specialCount})
            </span>
          </div>
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
            className="py-3 bg-[#8000ff] hover:bg-[#9933ff] text-white font-bold rounded-xl border border-[#cc99ff] flex items-center justify-center gap-1.5 shadow"
          >
            <span>🚀</span> SPECIAL
          </button>

          <button
            onClick={() => onMove("fire")}
            className="py-3 bg-[#ff0055] hover:bg-[#ff3377] text-white font-bold rounded-xl border border-[#ff99bb] flex items-center justify-center gap-1.5 shadow"
          >
            <span>🔥</span> FIRE
          </button>
        </div>
      </div>
    </div>
  );
}
