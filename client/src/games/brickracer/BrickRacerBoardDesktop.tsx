import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Zap, Volume2, VolumeX, ArrowLeft, Flame, Sparkles, Pause, Gauge } from "lucide-react";
import { RenderPipeline } from "./canvas/RenderPipeline";
import { GameEngine } from "./engine/GameEngine";
import { StateMachine } from "./engine/StateMachine";
import { RetroSoundEngine } from "./audio/RetroSoundEngine";
import { BrickKeypad } from "./components/BrickKeypad";
import { BrickConsoleFrame } from "./components/BrickConsoleFrame";
import { StorageService, ACHIEVEMENTS } from "./utils/storage";
import { useHaptics } from "../../hooks/useHaptics";
import type { MatchStats, BrickRacerSaveData } from "./types";

export interface BrickRacerBoardProps {
  onExit?: () => void;
}

export default function BrickRacerBoardDesktop({ onExit }: BrickRacerBoardProps) {
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

  const [saveData, setSaveData] = useState<BrickRacerSaveData>(StorageService.load());
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const pipeline = new RenderPipeline(canvasRef.current);
    const soundEngine = soundRef.current;

    const stateMachine = new StateMachine(soundEngine, (updatedStats) => {
      setStats({ ...updatedStats });
      setSaveData(StorageService.load());
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
  };

  return (
    <div className="w-full min-h-screen bg-[#111827] text-white flex flex-col justify-between p-4 lg:p-6 font-sans select-none">
      {/* Top Header */}
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
            <span className="text-xl">🏎️</span>
            <h1 className="bhalyam-display text-[20px] text-amber-400 font-black tracking-tight">
              BRICK RACER 9999-IN-1
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => engineRef.current?.togglePause()}
            title="Pause Game (0 / P)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 text-[12px] font-bold transition cursor-pointer"
          >
            <Pause className="w-4 h-4" />
            <span>Pause (0)</span>
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

      {/* Main 3-Column Arena */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
        {/* Left Column: Live Race Telemetry */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Race Telemetry
              </span>
              {stats.isBoosting ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/30 border border-orange-400 text-orange-300 font-extrabold uppercase animate-pulse">
                  🔥 NITRO BOOST
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                  CRUISING
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Score</div>
                <div className="text-xl font-black text-amber-400">{stats.score}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">High Score</div>
                <div className="text-xl font-black text-emerald-400">{saveData.highScore}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Level</div>
                <div className="text-lg font-black text-cyan-400">LV {stats.level}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Speed</div>
                <div className="text-lg font-black text-orange-400">{stats.speedKmh} km/h</div>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-bold">Cars Dodged:</span>
              <span className="text-sm font-black text-white">{stats.carsDodged} 🏎️</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-bold">Distance Covered:</span>
              <span className="text-sm font-black text-cyan-300">{stats.distanceMeters} M</span>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase text-amber-400">
              <Zap className="w-4 h-4" />
              <span>Keyboard Controls</span>
            </div>
            <ul className="text-[11.5px] text-zinc-300 space-y-1 font-mono">
              <li><strong className="text-amber-400">Key 4 / A / ←:</strong> Steer LEFT</li>
              <li><strong className="text-amber-400">Key 6 / D / →:</strong> Steer RIGHT</li>
              <li><strong className="text-amber-400">Key 8 / S / ↓:</strong> Toggle BOOST</li>
              <li><strong className="text-amber-400">Key 5 / Enter:</strong> Start / Select</li>
              <li><strong className="text-amber-400">Key 0 / P:</strong> Pause / Resume</li>
            </ul>
          </div>
        </aside>

        {/* Center Column: Handset Frame with LCD Canvas & Keypad */}
        <section className="lg:col-span-6 flex justify-center">
          <BrickConsoleFrame>
            {/* 10x20 Physical Beveled LCD Matrix Screen */}
            <div className="relative w-[210px] h-[340px] bg-[#9BBC0F] rounded-xl border-4 border-[#0F380F] shadow-inner overflow-hidden flex items-center justify-center p-1">
              {/* LCD Phosphor Pixel Texture Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(15,56,15,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,56,15,0.06)_1px,transparent_1px)] bg-[size:4px_4px] pointer-events-none z-10" />

              <canvas
                ref={canvasRef}
                width={142}
                height={272}
                className="w-full h-full block image-rendering-pixelated"
              />
            </div>

            {/* Handheld Rubber Keypad */}
            <BrickKeypad
              onKeyPress={handleKeypadPress}
              isBoosting={stats.isBoosting}
            />
          </BrickConsoleFrame>
        </section>

        {/* Right Column: Achievements & Retro Lore */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              <span>Achievements ({saveData.achievements.length}/{ACHIEVEMENTS.length})</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = saveData.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all ${
                      unlocked
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : "bg-black/20 border-white/5 text-zinc-500 opacity-60"
                    }`}
                  >
                    <span className="text-xl">{ach.badge}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-extrabold truncate">{ach.title}</div>
                      <div className="text-[10px] text-zinc-400 line-clamp-1">{ach.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Brick Racing Pro Tips</span>
            </div>
            <p className="text-[11.5px] text-zinc-300 leading-snug">
              Center lane gives you instant 1-step escape paths to both left and right. Holding <strong>BOOST</strong> doubles your score per dodged car!
            </p>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-zinc-500 mt-2">
        Brick Game Formula 1 • 9999-in-1 Handheld Recreation on BHALYAM
      </footer>
    </div>
  );
}
