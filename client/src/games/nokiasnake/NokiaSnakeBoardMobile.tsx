import { useEffect, useRef, useState } from "react";
import { RenderPipeline } from "./canvas/RenderPipeline";
import { GameEngine } from "./engine/GameEngine";
import { StateMachine } from "./engine/StateMachine";
import { RetroSoundEngine } from "./audio/RetroSoundEngine";
import { NokiaSnakeKeypad } from "./components/NokiaSnakeKeypad";
import { NokiaDeviceFrame } from "./components/NokiaDeviceFrame";
import { useHaptics } from "../../hooks/useHaptics";
import type { MatchStats } from "./types";

export interface NokiaSnakeBoardProps {
  onExit?: () => void;
}

export default function NokiaSnakeBoardMobile({ onExit }: NokiaSnakeBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const soundRef = useRef<RetroSoundEngine>(new RetroSoundEngine());
  const { subtle } = useHaptics();

  const [stats, setStats] = useState<MatchStats>({
    score: 0,
    highScore: 0,
    level: 1,
    foodEaten: 0,
    bonusCount: 0,
    length: 4,
    speedMs: 220,
    isNewRecord: false,
    gameMode: "CLASSIC",
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
      if (key === "2" || key === "arrowup" || key === "w") {
        engine.handleInput("UP");
        subtle();
      } else if (key === "8" || key === "arrowdown" || key === "s") {
        engine.handleInput("DOWN");
        subtle();
      } else if (key === "4" || key === "arrowleft" || key === "a") {
        engine.handleInput("LEFT");
        subtle();
      } else if (key === "6" || key === "arrowright" || key === "d") {
        engine.handleInput("RIGHT");
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

    if (key === "2") engineRef.current.handleInput("UP");
    else if (key === "8") engineRef.current.handleInput("DOWN");
    else if (key === "4") engineRef.current.handleInput("LEFT");
    else if (key === "6") engineRef.current.handleInput("RIGHT");
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

    const minDistance = 25; // px threshold
    const maxTime = 400; // ms threshold

    if (dt <= maxTime && (Math.abs(dx) >= minDistance || Math.abs(dy) >= minDistance)) {
      if (Math.abs(dx) > Math.abs(dy)) {
        engineRef.current.handleInput(dx > 0 ? "RIGHT" : "LEFT");
      } else {
        engineRef.current.handleInput(dy > 0 ? "DOWN" : "UP");
      }
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
      {/* Top Mobile Action Bar */}
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

      {/* Handset Frame */}
      <NokiaDeviceFrame>
        {/* LCD Screen Container */}
        <div className="relative w-[256px] h-[256px] bg-[#87A96B] rounded-lg border-4 border-[#3F5E4D] shadow-inner overflow-hidden flex items-center justify-center">
          {/* LCD Phosphor Pixel Grid Texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,42,29,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,42,29,0.06)_1px,transparent_1px)] bg-[size:3px_3px] pointer-events-none z-10" />

          <canvas
            ref={canvasRef}
            width={160}
            height={160}
            className="w-full h-full block image-rendering-pixelated"
          />
        </div>

        {/* Tactile Keypad */}
        <NokiaSnakeKeypad onKeyPress={handleKeypadPress} />
      </NokiaDeviceFrame>

      {/* Footer */}
      <div className="text-[11px] text-zinc-500 py-1">
        Retro Snake 2D • BHALYAM (Swipe or Keypad)
      </div>
    </div>
  );
}
