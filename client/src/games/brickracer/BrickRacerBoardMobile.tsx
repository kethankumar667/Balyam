import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Pause,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Flame,
  Gauge,
  Sparkles,
} from "lucide-react";
import { RenderPipeline } from "./canvas/RenderPipeline";
import { GameEngine } from "./engine/GameEngine";
import { StateMachine } from "./engine/StateMachine";
import { RetroSoundEngine } from "./audio/RetroSoundEngine";
import { BrickKeypad } from "./components/BrickKeypad";
import { BrickConsoleFrame } from "./components/BrickConsoleFrame";
import { useHaptics } from "../../hooks/useHaptics";
import type { MatchStats } from "./types";

export interface BrickRacerBoardProps {
  onExit?: () => void;
}

export default function BrickRacerBoardMobile({ onExit }: BrickRacerBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const soundRef = useRef<RetroSoundEngine>(new RetroSoundEngine());
  const { subtle } = useHaptics();

  const [stats, setStats] = useState<MatchStats>({
    score: 0,
    highScore: 0,
    level: 1,
    carsDodged: 0,
    distanceMeters: 0,
    speedKmh: 90,
    isBoosting: false,
    isNewRecord: false,
  });

  const [muted, setMuted] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const pipeline = new RenderPipeline(canvasRef.current);
    const soundEngine = soundRef.current;

    const stateMachine = new StateMachine(soundEngine, (updatedStats) => {
      setStats({ ...updatedStats });
    });

    const engine = new GameEngine(stateMachine, pipeline, soundEngine);
    engineRef.current = engine;
    engine.start();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "4" || key === "arrowleft" || key === "a") {
        engine.handleInput("LEFT");
        subtle();
      } else if (key === "6" || key === "arrowright" || key === "d") {
        engine.handleInput("RIGHT");
        subtle();
      } else if (key === "8" || key === "arrowdown" || key === "s") {
        engine.handleInput("BOOST_START");
        subtle();
      } else if (key === "5" || key === " " || key === "enter") {
        engine.handleInput("SELECT");
        subtle();
      } else if (key === "0" || key === "p" || key === "escape") {
        engine.togglePause();
        subtle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      engine.stop();
    };
  }, [subtle]);

  const handleKeypadPress = (key: string) => {
    subtle();
    if (!engineRef.current) return;

    if (key === "4") engineRef.current.handleInput("LEFT");
    else if (key === "6") engineRef.current.handleInput("RIGHT");
    else if (key === "8") engineRef.current.handleInput("BOOST_START");
    else if (key === "5") engineRef.current.handleInput("SELECT");
    else if (key === "0") engineRef.current.togglePause();
  };

  const toggleSound = () => {
    const nextMute = soundRef.current.toggleMute();
    setMuted(nextMute);
    subtle();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: performance.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !engineRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dt = performance.now() - touchStartRef.current.time;

    const minDistance = 20;

    if (dt <= 400 && Math.abs(dx) >= minDistance) {
      engineRef.current.handleInput(dx > 0 ? "RIGHT" : "LEFT");
      subtle();
    } else if (dt <= 400 && dy > minDistance) {
      engineRef.current.handleInput("BOOST_START");
      subtle();
    }
    touchStartRef.current = null;
  };

  return (
    <div
      className="w-full min-h-screen bg-[#111827] text-white flex flex-col items-center p-3 sm:p-4 select-none font-sans gap-2"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Mobile Bar with Back, Title & Controls */}
      <header className="w-full max-w-sm flex items-center justify-between py-1.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <Link
              to="/games"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Games</span>
            </Link>
          )}

          <div className="flex items-center gap-1">
            <span className="text-base">🏎️</span>
            <span className="bhalyam-display text-sm font-black text-amber-400 tracking-tight">
              BRICK RACER
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => engineRef.current?.togglePause()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs cursor-pointer transition"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 cursor-pointer transition"
            title={muted ? "Unmute Sound" : "Mute Sound"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Live Race Telemetry HUD Strip (Score, Level, High Score & Speed) */}
      <section
        aria-label="Race Telemetry"
        className="w-full max-w-sm bg-[#1E293B] border border-white/10 rounded-2xl p-2.5 shadow-lg flex flex-col gap-2 font-mono"
      >
        {/* Row 1: Score & Level */}
        <div className="grid grid-cols-2 gap-2">
          {/* Current Score */}
          <div className="bg-[#0B101C] p-2 rounded-xl border border-white/5 flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Live Score</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-amber-400 tracking-tight">
                {stats.score.toLocaleString()}
              </span>
              {stats.isNewRecord && (
                <span className="text-[9px] font-black text-emerald-400 flex items-center gap-0.5 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" /> NEW!
                </span>
              )}
            </div>
          </div>

          {/* Level & High Score */}
          <div className="bg-[#0B101C] p-2 rounded-xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Level</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                LV {stats.level}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-300 font-bold mt-1">
              <Trophy className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="text-[10px] text-zinc-400">BEST:</span>
              <span className="text-[#00F0FF] font-black">
                {stats.highScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Speed Gauge, Cars Dodged & Distance */}
        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
          {/* Speed Indicator */}
          <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
            stats.isBoosting
              ? "bg-orange-500/20 border-orange-500/50 text-orange-300 animate-pulse"
              : "bg-[#0B101C] border-white/5 text-zinc-300"
          }`}>
            <span className="text-[9px] text-zinc-400 flex items-center gap-0.5">
              {stats.isBoosting ? <Flame className="w-2.5 h-2.5 text-orange-400" /> : <Gauge className="w-2.5 h-2.5 text-zinc-400" />}
              SPEED
            </span>
            <span className={`text-[11px] font-black mt-0.5 ${stats.isBoosting ? "text-orange-400" : "text-white"}`}>
              {stats.speedKmh} <span className="text-[8px]">KM/H</span>
            </span>
          </div>

          {/* Cars Dodged */}
          <div className="bg-[#0B101C] p-1.5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[9px] text-zinc-400 flex items-center gap-0.5">
              <span>🚗</span> DODGED
            </span>
            <span className="text-[11px] font-black text-emerald-400 mt-0.5">
              {stats.carsDodged}
            </span>
          </div>

          {/* Distance */}
          <div className="bg-[#0B101C] p-1.5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[9px] text-zinc-400 flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 text-amber-400" /> DIST
            </span>
            <span className="text-[11px] font-black text-cyan-400 mt-0.5">
              {stats.distanceMeters} <span className="text-[8px]">M</span>
            </span>
          </div>
        </div>
      </section>

      {/* Handheld Handset Frame — grows into whatever room the compact
          header/telemetry/footer leave, instead of sitting fixed-size in
          whatever gap `justify-between` used to leave around it. */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <BrickConsoleFrame>
          {/* 12x12 Physical Beveled LCD Matrix Screen — scales with the
              viewport (bounded by width, height, and a sane cap) instead of
              a fixed 240/260px that left most phones with dead space around
              a console frame not big enough for the room around it. */}
          <div className="relative w-[min(80vw,48vh,380px)] h-[min(80vw,48vh,380px)] bg-[#9BBC0F] rounded-2xl border-4 border-[#0F380F] shadow-inner overflow-hidden flex items-center justify-center p-1.5">
            {/* LCD Phosphor Pixel Texture Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(15,56,15,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,56,15,0.06)_1px,transparent_1px)] bg-[size:4px_4px] pointer-events-none z-10" />

            <canvas
              ref={canvasRef}
              width={228}
              height={228}
              className="w-full h-full block image-rendering-pixelated"
            />
          </div>

          {/* Tactile Rubber Keypad */}
          <BrickKeypad
            onKeyPress={handleKeypadPress}
            isBoosting={stats.isBoosting}
          />
        </BrickConsoleFrame>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-zinc-500 py-1 font-mono text-center">
        4/6: STEER • 8: NITRO BOOST • 5: START • 0: PAUSE
      </div>
    </div>
  );
}
