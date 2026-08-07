import { useState, useEffect } from "react";
import type { BouncePublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface BounceBoardProps {
  state: BouncePublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function BounceBoardDesktop({ state, selfId, onMove }: BounceBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Desktop Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") onMove("move", { dir: "LEFT" });
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") onMove("move", { dir: "RIGHT" });
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") onMove("move", { dir: "JUMP" });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove]);

  // Tick loop
  useEffect(() => {
    if (state.isOver) return;
    const interval = setInterval(() => {
      onMove("tick");
    }, 100);
    return () => clearInterval(interval);
  }, [state.isOver, onMove]);

  const triggerReaction = (emoji: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    const x = Math.random() * 80 + 10;
    setReactions((prev) => [...prev.slice(-6), { id, emoji, x }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const myBall = state.balls[selfId];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-4xl mx-auto p-6 text-white font-sans space-y-6 relative overflow-hidden bg-sky-950 rounded-3xl shadow-2xl my-4">
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

      <div className="grid grid-cols-3 gap-6">
        {/* Left Side Info */}
        <div className="col-span-1 bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-amber-400 font-display">Nokia Bounce 🔴</h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Use <strong>A/D</strong> or <strong>Left/Right Arrows</strong> to roll, and <strong>Spacebar / Up Arrow</strong> to jump!
          </p>
          <div className="space-y-2 pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-amber-400 uppercase">Live Rings Leaderboard</h3>
            {state.players.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-slate-800 rounded-lg">
                <span>{p.id === selfId ? "You" : `Player (${p.id.slice(0, 4)})`}</span>
                <span className="font-bold text-amber-300">{p.ringsCollected} 🟡</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="w-full py-2 rounded-xl bg-amber-600 text-white font-bold text-xs uppercase cursor-pointer"
          >
            ? Rules
          </button>
        </div>

        {/* Center Viewport */}
        <div className="col-span-2 bg-slate-900 border-4 border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-amber-400 border-b border-white/10 pb-2 uppercase">
            <span>BOUNCE VIEWPORT</span>
            <span>Rings: {myBall?.ringsCollected ?? 0} / 10</span>
          </div>

          <div className="relative w-full h-80 bg-gradient-to-b from-sky-900 to-slate-950 border-2 border-white/10 rounded overflow-hidden">
            {state.rings.map((r) => (
              !r.collected && (
                <motion.div
                  key={r.id}
                  style={{ left: `${r.x}%`, top: `${r.y}%` }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute w-8 h-8 border-4 border-amber-400 rounded-full shadow-[0_0_12px_#f59e0b] -translate-x-1/2 -translate-y-1/2"
                />
              )
            ))}

            {myBall && (
              <motion.div
                animate={{ left: `${myBall.x}%`, top: `${myBall.y}%` }}
                transition={{ duration: 0.1 }}
                className="absolute w-10 h-10 bg-gradient-to-tr from-red-600 to-rose-400 rounded-full shadow-lg shadow-red-500/50 border-2 border-white -translate-x-1/2 -translate-y-1/2"
              />
            )}

            <div className="absolute bottom-0 inset-x-0 h-12 bg-amber-800/80 border-t-2 border-amber-600" />
          </div>
        </div>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-3 p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-xl max-w-md mx-auto">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-slate-800 text-2xl transition active:scale-125 cursor-pointer"
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
              className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-amber-300 font-sans"
            >
              <h3 className="text-xl font-bold text-amber-400 font-display">How to Play Nokia Bounce 🔴</h3>
              <div className="text-xs space-y-2 leading-relaxed text-white/80">
                <p>• Roll red ball with Arrow Keys or A/D.</p>
                <p>• Press Spacebar to Jump over floor obstacles.</p>
                <p>• Pass through 10 gold rings to complete level!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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
