import { useState, useEffect } from "react";
import type { SpaceImpactPublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface SpaceImpactBoardProps {
  state: SpaceImpactPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SpaceImpactBoardMobile({ state, selfId, onMove }: SpaceImpactBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Automatic game tick
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

  const handleMoveShip = (dy: number) => {
    onMove("moveShip", { dy });
  };

  const handleShoot = () => {
    onMove("shoot");
  };

  const myShip = state.ships[selfId];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 text-emerald-300 font-mono space-y-4 relative overflow-hidden bg-slate-950">
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

      {/* Retro Arcade Space Viewport */}
      <div className="bg-black border-4 border-emerald-500/40 rounded-2xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="flex justify-between items-center text-xs font-bold text-emerald-400 border-b border-emerald-500/30 pb-2 uppercase">
          <div className="flex items-center gap-2">
            <span>🚀 SPACE IMPACT</span>
            <button
              onClick={() => setShowRules(true)}
              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] cursor-pointer"
            >
              ? Rules
            </button>
          </div>
          <span>HP: {"❤️".repeat(myShip?.hp ?? 0)}</span>
        </div>

        {/* Space Shooter Canvas Viewport */}
        <div className="relative w-full h-64 bg-slate-900 border-2 border-emerald-500/20 rounded overflow-hidden">
          {/* Player Ship */}
          {myShip && (
            <motion.div
              animate={{ top: `${myShip.y}%`, left: `${myShip.x}%` }}
              transition={{ duration: 0.1 }}
              className="absolute text-2xl select-none -translate-x-1/2 -translate-y-1/2"
            >
              🚀
            </motion.div>
          )}

          {/* Enemy Alien Wave */}
          {state.enemies.map((e) => (
            <motion.div
              key={e.id}
              animate={{ left: `${e.x}%`, top: `${e.y}%` }}
              transition={{ duration: 0.1 }}
              className="absolute text-xl select-none -translate-x-1/2 -translate-y-1/2"
            >
              👾
            </motion.div>
          ))}

          {/* Lasers */}
          {state.bullets.map((b, idx) => (
            <div
              key={idx}
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              className="absolute w-3 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399] -translate-x-1/2 -translate-y-1/2"
            />
          ))}
        </div>

        {/* Players Scoreboard */}
        <div className="flex justify-between items-center text-xs font-bold text-emerald-400 pt-1">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <span>{p.id === selfId ? "You" : `P (${p.id.slice(0, 4)})`}:</span>
              <span>{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Space Impact Mobile Arcade Controls */}
      <div className="flex justify-between items-center p-4 bg-slate-900 border-2 border-emerald-500/30 rounded-2xl shadow-xl">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleMoveShip(-8)}
            className="w-16 h-12 bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xl rounded-xl shadow active:scale-95 cursor-pointer"
          >
            ▲
          </button>
          <button
            onClick={() => handleMoveShip(8)}
            className="w-16 h-12 bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xl rounded-xl shadow active:scale-95 cursor-pointer"
          >
            ▼
          </button>
        </div>

        <button
          onClick={handleShoot}
          className="w-24 h-24 rounded-full bg-emerald-600 border-4 border-emerald-400 text-white font-bold text-lg uppercase shadow-lg shadow-emerald-600/50 active:scale-90 cursor-pointer flex items-center justify-center"
        >
          FIRE 🔥
        </button>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-2 p-2 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-slate-800 text-xl transition active:scale-125 cursor-pointer"
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
              className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-emerald-300 font-mono"
            >
              <h3 className="text-lg font-bold text-emerald-400">
                How to Play Space Impact 🚀
              </h3>
              <div className="text-xs space-y-2 leading-relaxed text-emerald-200/80">
                <p>• Move your spaceship UP and DOWN to align with target enemies.</p>
                <p>• Tap <strong>FIRE 🔥</strong> to blast lasers and destroy alien waves.</p>
                <p>• Earn 50 points per alien ship destroyed!</p>
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
