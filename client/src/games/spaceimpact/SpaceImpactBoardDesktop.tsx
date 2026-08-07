import { useState, useEffect } from "react";
import type { SpaceImpactPublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface SpaceImpactBoardProps {
  state: SpaceImpactPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SpaceImpactBoardDesktop({ state, selfId, onMove }: SpaceImpactBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Desktop Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") onMove("moveShip", { dy: -8 });
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") onMove("moveShip", { dy: 8 });
      if (e.key === " " || e.key === "Enter") onMove("shoot");
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

  const myShip = state.ships[selfId];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-4xl mx-auto p-6 text-emerald-300 font-mono space-y-6 relative overflow-hidden bg-slate-950 rounded-3xl shadow-2xl my-4">
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
        <div className="col-span-1 bg-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-emerald-400">Space Impact 🚀</h2>
          <p className="text-xs text-emerald-200/80 leading-relaxed">
            Use <strong>W/S</strong> or <strong>Up/Down Arrow</strong> to move ship. Press <strong>Spacebar</strong> to fire lasers!
          </p>
          <div className="space-y-2 pt-4 border-t border-emerald-500/20">
            <h3 className="text-sm font-bold text-amber-400 uppercase">Live High Scores</h3>
            {state.players.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-slate-800 rounded-lg">
                <span>{p.id === selfId ? "You" : `Player (${p.id.slice(0, 4)})`}</span>
                <span className="font-bold text-amber-300">{p.score} pts</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase cursor-pointer"
          >
            ? Rules
          </button>
        </div>

        {/* Center Viewport */}
        <div className="col-span-2 bg-black border-4 border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-emerald-400 border-b border-emerald-500/30 pb-2 uppercase">
            <span>ARCADE VIEWPORT</span>
            <span>HP: {"❤️".repeat(myShip?.hp ?? 0)}</span>
          </div>

          <div className="relative w-full h-80 bg-slate-900 border-2 border-emerald-500/20 rounded overflow-hidden">
            {myShip && (
              <motion.div
                animate={{ top: `${myShip.y}%`, left: `${myShip.x}%` }}
                transition={{ duration: 0.1 }}
                className="absolute text-3xl select-none -translate-x-1/2 -translate-y-1/2"
              >
                🚀
              </motion.div>
            )}

            {state.enemies.map((e) => (
              <motion.div
                key={e.id}
                animate={{ left: `${e.x}%`, top: `${e.y}%` }}
                transition={{ duration: 0.1 }}
                className="absolute text-2xl select-none -translate-x-1/2 -translate-y-1/2"
              >
                👾
              </motion.div>
            ))}

            {state.bullets.map((b, idx) => (
              <div
                key={idx}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                className="absolute w-4 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399] -translate-x-1/2 -translate-y-1/2"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-3 p-3 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl max-w-md mx-auto">
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
              className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-emerald-300 font-mono"
            >
              <h3 className="text-xl font-bold text-emerald-400">How to Play Space Impact 🚀</h3>
              <div className="text-xs space-y-2 leading-relaxed">
                <p>• Steer ship with Arrow Keys or W/S.</p>
                <p>• Press Spacebar to shoot lasers.</p>
                <p>• Destroy all alien ships to score points!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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
