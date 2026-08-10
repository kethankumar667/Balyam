import { useState, useEffect, useRef } from "react";
import type { SnakePublicState, SnakeTheme } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface SnakeBoardProps {
  state: SnakePublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SnakeBoardMobile({ state, selfId, onMove }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [activeTheme, setActiveTheme] = useState<SnakeTheme>(state.theme || "nokia-monochrome");
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Sync theme if state changes
  useEffect(() => {
    if (state.theme) setActiveTheme(state.theme);
  }, [state.theme]);

  // Automatic game tick loop synced to state.speedMs
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

  const handleTurn = (dir: string) => {
    onMove("turn", { dir });
  };

  // Touch Swipe Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) handleTurn("RIGHT");
      else if (dx < -30) handleTurn("LEFT");
    } else {
      if (dy > 30) handleTurn("DOWN");
      else if (dy < -30) handleTurn("UP");
    }
  };

  const themeClasses = {
    "nokia-monochrome": {
      outer: "bg-[#8b9bb4] text-emerald-950 font-mono",
      screen: "bg-[#9ebd9e] border-8 border-[#3b4731]",
      grid: "bg-[#4a573f]/20 border-2 border-[#1c2415]",
      header: "text-[#1c2415] border-[#3b4731]",
      button: "bg-[#3b4731] text-[#9ebd9e]",
      snakeSelf: "bg-[#1c2415]",
      snakeOther: "bg-[#3b4731]",
      food: "bg-[#1c2415] animate-ping",
      cellEmpty: "bg-[#9ebd9e]/40",
      keypad: "bg-[#2d3725] border-4 border-[#1c2415]",
      keyBtn: "bg-[#536248] text-white border-[#8b9bb4]",
    },
    "nokia-color": {
      outer: "bg-[#0f172a] text-slate-100 font-sans",
      screen: "bg-[#1e293b] border-8 border-[#38bdf8]",
      grid: "bg-[#0f172a]/60 border-2 border-[#38bdf8]/40",
      header: "text-sky-300 border-sky-500/30",
      button: "bg-sky-500 text-slate-900",
      snakeSelf: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
      snakeOther: "bg-blue-400",
      food: "bg-red-500 animate-pulse rounded-full shadow-[0_0_10px_#ef4444]",
      cellEmpty: "bg-slate-800/40",
      keypad: "bg-[#1e293b] border-4 border-[#38bdf8]",
      keyBtn: "bg-slate-700 text-sky-300 border-sky-400/40",
    },
    "neon-modern": {
      outer: "bg-[#090d16] text-purple-100 font-sans",
      screen: "bg-[#0d1322] border-8 border-[#8b5cf6] shadow-[0_0_30px_rgba(139,92,246,0.3)]",
      grid: "bg-[#090d16] border-2 border-[#a855f7]/50",
      header: "text-purple-300 border-purple-500/30",
      button: "bg-purple-600 text-white",
      snakeSelf: "bg-gradient-to-r from-purple-400 to-pink-500 shadow-[0_0_12px_#d946ef]",
      snakeOther: "bg-amber-400",
      food: "bg-emerald-400 animate-ping rounded-full shadow-[0_0_12px_#10b981]",
      cellEmpty: "bg-purple-950/20",
      keypad: "bg-[#131b2e] border-4 border-[#a855f7]",
      keyBtn: "bg-purple-900/60 text-purple-200 border-purple-400/40",
    },
  }[activeTheme];

  const myPlayer = state.players.find((p) => p.id === selfId);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 space-y-4 relative overflow-hidden transition-all duration-300 ${themeClasses.outer}`}
    >
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
              className="absolute text-3xl select-none"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Screen Frame */}
      <div className={`rounded-2xl p-4 shadow-2xl space-y-3 relative ${themeClasses.screen}`}>
        <div className={`flex justify-between items-center text-xs font-bold border-b pb-1.5 uppercase ${themeClasses.header}`}>
          <div className="flex items-center gap-2">
            <span>🐍 SNAKE</span>
            <button
              onClick={() => setShowRules(true)}
              className={`px-2 py-0.5 rounded text-[10px] cursor-pointer font-bold ${themeClasses.button}`}
            >
              ? Rules
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span>{state.wallMode === "wrap" ? "🌐 WRAP" : "🧱 SOLID"}</span>
            <span>{state.speedMs}ms</span>
          </div>
        </div>

        {/* Snake Grid Matrix */}
        <div
          className={`grid gap-0.5 p-1 rounded aspect-square ${themeClasses.grid}`}
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

        {/* Scoreboard */}
        <div className="flex justify-between items-center text-xs font-bold pt-1">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: p.color }}
              />
              <span>{p.id === selfId ? "You" : `P (${p.id.slice(0, 4)})`}:</span>
              <span className="font-extrabold">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Switcher Bar */}
      <div className="flex justify-center gap-2 bg-black/20 p-2 rounded-xl border border-white/10 text-xs">
        {(["nokia-monochrome", "nokia-color", "neon-modern"] as const).map((th) => (
          <button
            key={th}
            onClick={() => setActiveTheme(th)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
              activeTheme === th ? "bg-amber-400 text-black shadow" : "bg-black/40 text-white/70"
            }`}
          >
            {th === "nokia-monochrome" ? "LCD 3310" : th === "nokia-color" ? "6110 Color" : "Neon Glow"}
          </button>
        ))}
      </div>

      {/* Retro Keypad */}
      <div className={`flex flex-col items-center gap-2 p-3 rounded-3xl shadow-xl ${themeClasses.keypad}`}>
        <button
          onClick={() => handleTurn("UP")}
          className={`w-16 h-12 font-bold text-xl rounded-xl border-2 shadow active:scale-95 cursor-pointer ${themeClasses.keyBtn}`}
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => handleTurn("LEFT")}
            className={`w-16 h-12 font-bold text-xl rounded-xl border-2 shadow active:scale-95 cursor-pointer ${themeClasses.keyBtn}`}
          >
            ◄
          </button>
          <button
            onClick={() => handleTurn("DOWN")}
            className={`w-16 h-12 font-bold text-xl rounded-xl border-2 shadow active:scale-95 cursor-pointer ${themeClasses.keyBtn}`}
          >
            ▼
          </button>
          <button
            onClick={() => handleTurn("RIGHT")}
            className={`w-16 h-12 font-bold text-xl rounded-xl border-2 shadow active:scale-95 cursor-pointer ${themeClasses.keyBtn}`}
          >
            ►
          </button>
        </div>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-2 p-2 bg-black/20 border border-white/10 rounded-2xl shadow-xl">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-white/10 text-xl transition active:scale-125 cursor-pointer"
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
              className="bg-slate-900 border-4 border-amber-400 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-100 font-sans"
            >
              <h3 className="text-lg font-bold text-amber-400 font-mono">
                How to Play Snake 🐍
              </h3>
              <div className="text-xs space-y-2 leading-relaxed text-slate-300">
                <p>• Steer your pixel snake using D-pad keys or touch swipes.</p>
                <p>• Collect food pellets to gain 10 points and increase length.</p>
                <p>• Avoid hitting solid walls (unless Wrap mode is active) and snake bodies!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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
