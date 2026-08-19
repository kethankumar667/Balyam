import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Zap, Volume2, VolumeX, ArrowLeft, Shield, Sparkles, Pause } from "lucide-react";
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
import { StorageService, ACHIEVEMENTS } from "./utils/storage";
import { useHaptics } from "../../hooks/useHaptics";
import type { MatchStats, NokiaCricketSaveData } from "./types";

export interface NokiaCricketBoardProps {
  onExit?: () => void;
}

export default function NokiaCricketBoardDesktop({ onExit }: NokiaCricketBoardProps) {
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

  const [saveData, setSaveData] = useState<NokiaCricketSaveData>(StorageService.load());
  const [muted, setMuted] = useState(false);

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
      } else if (key === "5" || key === "w" || key === " " || key === "enter" || key === "arrowup") {
        engine.handleInput("SELECT");
        subtle();
      } else if (key === "0" || key === "p" || key === "escape") {
        engine.togglePause();
        subtle();
      } else if (key === "m" || key === "s") {
        const nextMute = engine.toggleSound();
        setMuted(nextMute);
        subtle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      engine.stop();
    };
  }, [subtle, onExit]);

  const handleKeypadPress = (key: string) => {
    subtle();
    if (!engineRef.current) return;

    if (key === "SOUND" || key === "sound") {
      const nextMute = engineRef.current.toggleSound();
      setMuted(nextMute);
    } else if (key === "4") {
      engineRef.current.handleInput("LEFT");
    } else if (key === "5") {
      engineRef.current.handleInput("SELECT");
    } else if (key === "6") {
      engineRef.current.handleInput("RIGHT");
    } else if (key === "0") {
      engineRef.current.togglePause();
    }
  };

  const toggleSound = () => {
    if (!engineRef.current) {
      const nextMute = soundRef.current.toggleMute();
      setMuted(nextMute);
      return;
    }
    const nextMute = engineRef.current.toggleSound();
    setMuted(nextMute);
  };

  return (
    <div className="w-full min-h-screen bg-[#111827] text-white flex flex-col justify-between p-4 lg:p-6 font-sans select-none">
      
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-3">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-[12px] font-extrabold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <Link
              to="/games"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-[12px] font-extrabold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Games Lounge</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xl">🏏</span>
            <h1 className="bhalyam-display text-[20px] text-amber-400 font-black tracking-tight">
              RETRO CRICKET 2D
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => engineRef.current?.togglePause()}
            title="Pause Game (P)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 text-[12px] font-bold transition cursor-pointer"
          >
            <Pause className="w-4 h-4" />
            <span>Pause (P)</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 text-[12px] font-bold transition cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{muted ? "Muted" : "Sound ON"}</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Desktop Arena */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
        
        {/* Left Column: Live Match Telemetry & Over Tracker */}
        <aside className="lg:col-span-3 space-y-4">
          
          {/* Live Scorecard Card */}
          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Match Telemetry
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10.5px]">
                {stats.targetOvers} Overs Match
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-[28px] font-black text-white bhalyam-display">
                {stats.score} <span className="text-zinc-400 text-[18px]">/ {stats.wickets}</span>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-bold text-zinc-300">Overs: {stats.overs} / {stats.targetOvers}.0</div>
                <div className="text-[11px] text-amber-300/80 font-semibold">SR: {stats.strikeRate}%</div>
              </div>
            </div>

            {/* Current Over Balls Timeline */}
            <div>
              <div className="text-[10px] font-bold text-zinc-400 mb-1">THIS OVER:</div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const item = stats.currentOverDeliveries[idx];
                  return (
                    <div
                      key={idx}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] border ${
                        !item
                          ? "bg-white/5 border-white/10 text-zinc-600"
                          : item.runs === 6
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : item.runs === 4
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : item.outcome === "BOWLED" || item.outcome === "CAUGHT"
                          ? "bg-red-500/20 border-red-500 text-red-300"
                          : "bg-white/10 border-white/20 text-white"
                      }`}
                    >
                      {!item ? "•" : item.outcome === "BOWLED" || item.outcome === "CAUGHT" ? "W" : item.runs}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Records & Trophies */}
          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              <span>Career Records</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] pt-1">
              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="text-zinc-400 text-[10px]">High Score</div>
                <div className="font-black text-amber-300">{saveData.highScore} Runs</div>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="text-zinc-400 text-[10px]">Matches Won</div>
                <div className="font-black text-emerald-300">{saveData.matchesWon}</div>
              </div>
            </div>
          </div>

        </aside>

        {/* Center Column: Photorealistic Nokia Phone Chassis & Canvas */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <NokiaDeviceFrame>
            {/* Screen Bezel */}
            <div className="relative w-[280px] h-[210px] bg-[#87A96B] rounded-lg border-4 border-[#3F5E4D] shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(15,42,29,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,42,29,0.06)_1px,transparent_1px)] bg-[size:3px_3px] pointer-events-none z-10" />
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="w-full h-full block image-rendering-pixelated"
              />
            </div>

            {/* Keypad */}
            <NokiaKeypad onKeyPress={handleKeypadPress} />
          </NokiaDeviceFrame>
        </div>

        {/* Right Column: Keyboard Shortcuts & Batting Guide */}
        <aside className="lg:col-span-3 space-y-4">
          
          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Keyboard Controls</span>
            </div>

            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                <span className="text-zinc-300">Pull Shot (Leg)</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-amber-300">A</kbd>
                  <span className="text-zinc-500">or</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-amber-300">4</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                <span className="text-zinc-300">Straight Drive</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-amber-300">W</kbd>
                  <span className="text-zinc-500">or</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-amber-300">5</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                <span className="text-zinc-300">Square Cut (Off)</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-amber-300">D</kbd>
                  <span className="text-zinc-500">or</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-amber-300">6</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                <span className="text-zinc-300">Sound Toggle</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-emerald-300">M</kbd>
                  <span className="text-zinc-500">or</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono font-bold text-emerald-300">S</kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Timing Secrets</span>
            </div>
            <p className="text-[11.5px] text-zinc-300 leading-snug">
              Wait for the ball to complete its pitch bounce before pressing your shot. Hitting on the exact crease line triggers the <strong>SWEET SPOT</strong> for a massive Six!
            </p>
          </div>

        </aside>

      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-zinc-500 mt-2">
        Retro Cricket 2D • Built for 90s Kids on BHALYAM
      </footer>

    </div>
  );
}
