import { useState, useEffect } from "react";
import type { SnakePublicState, SnakeTheme } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";
import type { SnakeBoardProps } from "./SnakeBoardMobile";

export default function SnakeBoardDesktop({ state, selfId, onMove }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [activeTheme, setActiveTheme] = useState<SnakeTheme>(state.theme || "nokia-monochrome");
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Sync theme if state changes
  useEffect(() => {
    if (state.theme) setActiveTheme(state.theme);
  }, [state.theme]);

  // Keyboard controls listener for Desktop (Arrow Keys, WASD, Numpad 2/4/6/8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "w", "W", "8", "Numpad8"].includes(e.key)) onMove("turn", { dir: "UP" });
      if (["ArrowDown", "s", "S", "2", "Numpad2"].includes(e.key)) onMove("turn", { dir: "DOWN" });
      if (["ArrowLeft", "a", "A", "4", "Numpad4"].includes(e.key)) onMove("turn", { dir: "LEFT" });
      if (["ArrowRight", "d", "D", "6", "Numpad6"].includes(e.key)) onMove("turn", { dir: "RIGHT" });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove]);

  // Tick loop synced to state.speedMs
  useEffect(() => {
    if (state.isOver) return;
    const intervalTime = state.speedMs || 120;
    const interval = setInterval(() => {
      onMove("tick");
    }, intervalTime);
    return () => clearInterval(interval);
  }, [state.isOver, state.speedMs, onMove]);

  const triggerReaction = (emoji: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    const x = Math.random() * 80 + 10;
    setReactions((prev) => [...prev.slice(-6), { id, emoji, x }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const themeClasses = {
    "nokia-monochrome": {
      outer: "bg-[#8b9bb4] text-emerald-950 font-mono",
      specs: "bg-[#2d3725] border-4 border-[#1c2415] text-white",
      specsTitle: "text-[#9ebd9e]",
      screen: "bg-[#9ebd9e] border-8 border-[#3b4731]",
      grid: "bg-[#4a573f]/20 border-4 border-[#1c2415]",
      header: "text-[#1c2415] border-[#3b4731]",
      snakeSelf: "bg-[#1c2415]",
      snakeOther: "bg-[#3b4731]",
      food: "bg-[#1c2415] animate-ping",
      cellEmpty: "bg-[#9ebd9e]/40",
    },
    "nokia-color": {
      outer: "bg-[#0f172a] text-slate-100 font-sans",
      specs: "bg-slate-900 border-4 border-sky-400 text-slate-100",
      specsTitle: "text-sky-300",
      screen: "bg-[#1e293b] border-8 border-[#38bdf8]",
      grid: "bg-[#0f172a]/60 border-4 border-[#38bdf8]/40",
      header: "text-sky-300 border-sky-500/30",
      snakeSelf: "bg-emerald-400 shadow-[0_0_10px_#34d399]",
      snakeOther: "bg-blue-400",
      food: "bg-red-500 animate-pulse rounded-full shadow-[0_0_12px_#ef4444]",
      cellEmpty: "bg-slate-800/40",
    },
    "neon-modern": {
      outer: "bg-[#090d16] text-purple-100 font-sans",
      specs: "bg-[#131b2e] border-4 border-purple-500 text-purple-100",
      specsTitle: "text-purple-300",
      screen: "bg-[#0d1322] border-8 border-[#8b5cf6] shadow-[0_0_40px_rgba(139,92,246,0.3)]",
      grid: "bg-[#090d16] border-4 border-[#a855f7]/50",
      header: "text-purple-300 border-purple-500/30",
      snakeSelf: "bg-gradient-to-r from-purple-400 to-pink-500 shadow-[0_0_14px_#d946ef]",
      snakeOther: "bg-amber-400",
      food: "bg-emerald-400 animate-ping rounded-full shadow-[0_0_14px_#10b981]",
      cellEmpty: "bg-purple-950/20",
    },
  }[activeTheme];

  const myPlayer = state.players.find((p) => p.id === selfId);

  return (
    <div className={`flex flex-col min-h-[calc(100vh-5rem)] max-w-5xl mx-auto p-6 rounded-3xl shadow-2xl my-4 space-y-6 relative overflow-hidden transition-all duration-300 ${themeClasses.outer}`}>
      {/* Floating Reaction Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ y: "80vh", opacity: 1, scale: 0.5 }}
              animate={{ y: "20vh", opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              style={{ left: `${r.x}%` }}
              className="absolute text-4xl select-none"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Side Specs Panel */}
        <div className={`col-span-4 rounded-2xl p-6 space-y-5 shadow-xl ${themeClasses.specs}`}>
          <div>
            <h2 className={`text-xl font-bold font-mono ${themeClasses.specsTitle}`}>Nokia Snake Arcade 🐍</h2>
            <p className="text-xs opacity-80 mt-1 leading-relaxed">
              Steer your pixel snake using <strong>Arrow Keys</strong>, <strong>WASD</strong>, or <strong>Numpad 2/4/6/8</strong>!
            </p>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <label className="text-[11px] font-bold uppercase tracking-wider block opacity-70">Visual Arcade Theme</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(["nokia-monochrome", "nokia-color", "neon-modern"] as const).map((th) => (
                <button
                  key={th}
                  onClick={() => setActiveTheme(th)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer text-center ${
                    activeTheme === th ? "bg-amber-400 text-black shadow" : "bg-black/40 text-white/70 hover:bg-black/60"
                  }`}
                >
                  {th === "nokia-monochrome" ? "3310 LCD" : th === "nokia-color" ? "6110 Color" : "Neon"}
                </button>
              ))}
            </div>
          </div>

          {/* Live Scoreboard */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Live Match Leaderboard</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {state.players.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-xs p-2.5 bg-black/30 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    <span className="font-bold">{p.id === selfId ? "You" : `Player (${p.id.slice(0, 4)})`}</span>
                  </div>
                  <span className="font-bold text-amber-300">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowRules(true)}
            className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs uppercase tracking-wider cursor-pointer shadow hover:bg-amber-300 transition"
          >
            ? How to Play
          </button>
        </div>

        {/* Center LCD Matrix Display */}
        <div className={`col-span-8 rounded-2xl p-6 shadow-2xl space-y-4 ${themeClasses.screen}`}>
          <div className={`flex justify-between items-center text-sm font-bold border-b-2 pb-2 uppercase ${themeClasses.header}`}>
            <span>LCD MATRIX ({state.gridSize}×{state.gridSize})</span>
            <div className="flex items-center gap-4 text-xs">
              <span>{state.wallMode === "wrap" ? "🌐 WRAP MODE" : "🧱 SOLID WALLS"}</span>
              <span>Speed: {state.speedMs}ms</span>
            </div>
          </div>

          <div
            className={`grid gap-1 p-2 rounded aspect-square max-w-[500px] mx-auto ${themeClasses.grid}`}
            style={{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: state.gridSize * state.gridSize }).map((_, idx) => {
              const x = idx % state.gridSize;
              const y = Math.floor(idx / state.gridSize);

              const isFood = state.food.x === x && state.food.y === y;
              let isSnake = false;
              let isSelfSnake = false;

              for (const [pid, s] of Object.entries(state.snakes)) {
                if (s.body.some((seg) => seg.x === x && seg.y === y)) {
                  isSnake = true;
                  if (pid === selfId) isSelfSnake = true;
                  break;
                }
              }

              return (
                <div
                  key={idx}
                  className={`w-full h-full rounded-xs transition-all ${
                    isFood
                      ? themeClasses.food
                      : isSnake
                      ? isSelfSnake
                        ? themeClasses.snakeSelf
                        : themeClasses.snakeOther
                      : themeClasses.cellEmpty
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-3 p-3 bg-black/30 border border-white/10 rounded-2xl shadow-xl max-w-md mx-auto">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-white/10 text-2xl transition active:scale-125 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border-4 border-amber-400 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-100 font-sans"
            >
              <h3 className="text-xl font-bold font-mono text-amber-400">How to Play Nokia Snake 🐍</h3>
              <div className="text-xs space-y-2 leading-relaxed text-slate-300">
                <p>• Use keyboard WASD, Arrow Keys, or Numpad to change direction.</p>
                <p>• Collect food pellets to increase score by 10 points and extend snake length.</p>
                <p>• In Solid Walls mode, hitting the boundary crashes your snake. In Wrap mode, your snake wraps around.</p>
                <p>• Outlast opponent snakes to claim total victory!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-amber-300 transition"
              >
                Got It!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
