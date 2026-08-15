import { useEffect, useRef, useState } from "react";
import { RenderPipeline } from "./canvas/RenderPipeline";
import { GameEngine } from "./engine/GameEngine";
import { StateMachine } from "./engine/StateMachine";
import { BallPhysics } from "./engine/BallPhysics";
import { TimingEngine } from "./engine/TimingEngine";
import { ScoringEngine } from "./engine/ScoringEngine";
import { ShotEngine } from "./engine/ShotEngine";
import { OpponentAI } from "./engine/OpponentAI";
import { NokiaSoundEngine } from "./audio/NokiaSoundEngine";
import { NokiaKeypad } from "./components/NokiaKeypad";
import { NokiaDeviceFrame } from "./components/NokiaDeviceFrame";
import { useHaptics } from "../../hooks/useHaptics";
import type { MatchStats } from "./types";

export interface NokiaCricketBoardProps {
  onExit?: () => void;
}

export default function NokiaCricketBoardMobile({ onExit }: NokiaCricketBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const soundRef = useRef<NokiaSoundEngine>(new NokiaSoundEngine());
  const { subtle } = useHaptics();

  const [stats, setStats] = useState<MatchStats>({
    score: 0,
    wickets: 0,
    balls: 0,
    overs: "0.0",
    target: 0,
    targetOvers: 5,
    currentOverDeliveries: [],
    sixes: 0,
    fours: 0,
    lastOutcome: null,
    lastFeedback: "",
    strikeRate: 0,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const pipeline = new RenderPipeline(canvasRef.current);
    const timingEngine = new TimingEngine();
    const scoringEngine = new ScoringEngine();
    const shotEngine = new ShotEngine(timingEngine, scoringEngine);
    const ballPhysics = new BallPhysics();
    const opponentAI = new OpponentAI();
    const soundEngine = soundRef.current;

    const stateMachine = new StateMachine(
      ballPhysics,
      shotEngine,
      opponentAI,
      soundEngine,
      (updatedStats) => setStats({ ...updatedStats })
    );

    const engine = new GameEngine(
      stateMachine,
      ballPhysics,
      timingEngine,
      pipeline,
      soundEngine
    );

    engineRef.current = engine;
    engine.start();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "4" || key === "a" || key === "arrowleft") {
        engine.handleInput("LEFT");
        subtle();
      } else if (key === "6" || key === "d" || key === "arrowright") {
        engine.handleInput("RIGHT");
        subtle();
      } else if (key === "2" || key === "arrowup") {
        engine.handleInput("UP");
        subtle();
      } else if (key === "8" || key === "arrowdown") {
        engine.handleInput("DOWN");
        subtle();
      } else if (key === "5" || key === "w" || key === "s" || key === " " || key === "enter" || key === "z") {
        engine.handleInput("SELECT");
        subtle();
      } else if (key === "p") {
        engine.togglePause();
        subtle();
      } else if (key === "escape" || key === "x") {
        if (onExit) onExit();
        else engine.handleInput("BACK");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      engine.stop();
    };
  }, [subtle, onExit]);

  const handleKeypadPress = (key: string) => {
    soundRef.current.playKeyTick();
    subtle();
    if (!engineRef.current) return;

    if (key === "4") engineRef.current.handleInput("LEFT");
    else if (key === "5") engineRef.current.handleInput("SELECT");
    else if (key === "6") engineRef.current.handleInput("RIGHT");
    else if (key === "2") engineRef.current.handleInput("UP");
    else if (key === "8") engineRef.current.handleInput("DOWN");
    else if (key === "SOFT_L") engineRef.current.handleInput("SELECT");
    else if (key === "SOFT_R") {
      engineRef.current.handleInput("BACK");
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-between p-3 select-none">
      {/* Top Mobile Bar with Back & Pause */}
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
          ⏸ Pause
        </button>
      </div>

      <NokiaDeviceFrame>
        {/* LCD Screen Container */}
        <div className="relative w-[256px] h-[192px] bg-[#87A96B] rounded-lg border-4 border-[#3F5E4D] shadow-inner overflow-hidden">
          {/* LCD Phosphor Pixel Grid Texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,42,29,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,42,29,0.06)_1px,transparent_1px)] bg-[size:3px_3px] pointer-events-none z-10" />

          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className="w-full h-full block image-rendering-pixelated"
          />
        </div>

        {/* Physical Rubber Tactile Keypad */}
        <NokiaKeypad onKeyPress={handleKeypadPress} />
      </NokiaDeviceFrame>

      <div className="text-[11px] text-zinc-500 py-1">
        Retro Cricket 2D • BHALYAM
      </div>
    </div>
  );
}
