import React, { useEffect, useRef, useState } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { renderSpaceWarCanvas } from "./render";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { subtle } = useHaptics();
  const [isMuted, setIsMuted] = useState(false);

  // Render loop on canvas in VERTICAL PORTRAIT MODE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderSpaceWarCanvas(ctx, state, "vertical");
  }, [state]);

  const handlePointerDown = (key: string) => {
    subtle();
    onMove("keydown", key);
  };

  const handlePointerUp = (key: string) => {
    onMove("keyup", key);
  };

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

        {/* 2. BOTTOM CARD: ERGONOMIC CONTROLLER DECK & THEMES (EXACT 50% EQUAL FLEX SHARE) */}
        <div className="w-full flex-1 h-[48%] flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden">
          
          {/* MAIN CONTROLLER DECK (12-COLUMN GRID) */}
          <div className="w-full flex-1 grid grid-cols-12 gap-1 items-center bg-gradient-to-b from-[#1f2438] to-[#141626] border-2 border-[#2f364f] rounded-2xl p-2 sm:p-3 shadow-2xl overflow-hidden">
            
            {/* LEFT 5 COLUMNS: PROPORTIONAL 3D GOLDEN D-PAD */}
            <div className="col-span-5 flex items-center justify-center h-full">
              <div className="relative w-30 h-30 sm:w-36 sm:h-36 bg-[#0e101a] rounded-full p-1 border-2 border-[#00f0ff]/30 shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] flex items-center justify-center shrink-0">
                {/* UP */}
                <button
                  onPointerDown={() => handlePointerDown("ArrowLeft")}
                  onPointerUp={() => handlePointerUp("ArrowLeft")}
                  onPointerLeave={() => handlePointerUp("ArrowLeft")}
                  className="absolute top-1 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-b from-[#ffe066] via-[#ffcc00] to-[#cc9900] active:translate-y-0.5 rounded-xl border-2 border-[#fff0b3] shadow-[0_3px_0_#806000] flex items-center justify-center text-base sm:text-lg text-white font-extrabold"
                  aria-label="Up"
                >
                  ▲
                </button>

                {/* LEFT */}
                <button
                  onPointerDown={() => handlePointerDown("ArrowUp")}
                  onPointerUp={() => handlePointerUp("ArrowUp")}
                  onPointerLeave={() => handlePointerUp("ArrowUp")}
                  className="absolute left-1 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-b from-[#ffe066] via-[#ffcc00] to-[#cc9900] active:translate-x-0.5 rounded-xl border-2 border-[#fff0b3] shadow-[0_3px_0_#806000] flex items-center justify-center text-base sm:text-lg text-white font-extrabold"
                  aria-label="Left"
                >
                  ◀
                </button>

                {/* CENTER HUB */}
                <div className="w-7 h-7 rounded-full bg-[#161928] border-2 border-[#00f0ff]/40 flex items-center justify-center shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-[#00f0ff]/60" />
                </div>

                {/* RIGHT */}
                <button
                  onPointerDown={() => handlePointerDown("ArrowDown")}
                  onPointerUp={() => handlePointerUp("ArrowDown")}
                  onPointerLeave={() => handlePointerUp("ArrowDown")}
                  className="absolute right-1 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-b from-[#ffe066] via-[#ffcc00] to-[#cc9900] active:-translate-x-0.5 rounded-xl border-2 border-[#fff0b3] shadow-[0_3px_0_#806000] flex items-center justify-center text-base sm:text-lg text-white font-extrabold"
                  aria-label="Right"
                >
                  ▶
                </button>

                {/* DOWN */}
                <button
                  onPointerDown={() => handlePointerDown("ArrowRight")}
                  onPointerUp={() => handlePointerUp("ArrowRight")}
                  onPointerLeave={() => handlePointerUp("ArrowRight")}
                  className="absolute bottom-1 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-b from-[#ffe066] via-[#ffcc00] to-[#cc9900] active:-translate-y-0.5 rounded-xl border-2 border-[#fff0b3] shadow-[0_3px_0_#806000] flex items-center justify-center text-base sm:text-lg text-white font-extrabold"
                  aria-label="Down"
                >
                  ▼
                </button>
              </div>
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
                    subtle();
                    onMove("special");
                  }}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#ffe066] via-[#ffcc00] to-[#cc9900] border-2 border-[#fff0b3] shadow-[0_3px_0_#806000] active:translate-y-0.5 flex items-center justify-center text-xl shadow-lg"
                  aria-label="Special Weapon"
                >
                  🚀
                </button>
              </div>
            </div>

            {/* RIGHT 5 COLUMNS: MASSIVE ROUND 3D RED FIRE BUTTON */}
            <div className="col-span-5 flex items-center justify-center h-full">
              <button
                onPointerDown={() => {
                  subtle();
                  onMove("fire");
                }}
                className="w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-b from-[#ff4d4d] via-[#e60000] to-[#990000] border-4 border-[#ffb3b3] shadow-[0_7px_0_#660000] active:translate-y-1 flex items-center justify-center text-white font-extrabold tracking-wider text-xl sm:text-2xl drop-shadow-md"
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
