import { useEffect, useRef, useState } from "react";
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
      className="w-full min-h-screen flex flex-col items-center justify-between p-3 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Mobile Bar with Exit & Pause */}
      <div className="w-full max-w-sm flex items-center justify-between py-1">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="px-3 py-1 rounded-full bg-white/10 text-zinc-300 font-bold text-xs cursor-pointer"
          >
            ← Exit
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={() => engineRef.current?.togglePause()}
          className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs cursor-pointer"
        >
          ⏸ Pause (0)
        </button>
      </div>

      {/* Handheld Handset Frame */}
      <BrickConsoleFrame>
        {/* LCD Screen Container */}
        <div className="relative w-[190px] h-[310px] bg-[#9BBC0F] rounded-xl border-4 border-[#0F380F] shadow-inner overflow-hidden flex items-center justify-center p-1">
          {/* LCD Phosphor Pixel Grid Texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,56,15,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,56,15,0.06)_1px,transparent_1px)] bg-[size:4px_4px] pointer-events-none z-10" />

          <canvas
            ref={canvasRef}
            width={142}
            height={272}
            className="w-full h-full block image-rendering-pixelated"
          />
        </div>

        {/* Tactile Rubber Keypad */}
        <BrickKeypad
          onKeyPress={handleKeypadPress}
          isBoosting={stats.isBoosting}
        />
      </BrickConsoleFrame>

      {/* Footer */}
      <div className="text-[11px] text-zinc-500 py-1">
        Brick Game Formula 1 • BHALYAM (Swipe or Buttons)
      </div>
    </div>
  );
}
