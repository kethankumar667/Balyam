import { useState, useEffect } from "react";
import type { BouncePublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface BounceBoardProps {
  state: BouncePublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function BounceBoardMobile({ state, selfId, onMove }: BounceBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  /*
   * The client tick pump lived here and is deliberately gone.
   *
   * It sent `onMove("tick")` every 100ms to advance the simulation. But
   * BounceEngine declares `tickRateHz = 20`, so RoomManager already drives
   * the physics — and the engine ALSO stepped on every client tick, so the
   * simulation took the server's steps plus one per connected client. Two
   * players advanced the game roughly twice as fast as one, and the rate was
   * whatever a client chose to send: the client-supplied simulation rate the
   * GameEngine real-time contract exists to prevent.
   *
   * The engine now refuses `tick`. Nothing replaces this: the server
   * broadcasts state and this board renders it.
   */

  const triggerReaction = (emoji: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    const x = Math.random() * 80 + 10;
    setReactions((prev) => [...prev.slice(-6), { id, emoji, x }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const handleMoveBall = (dir: string) => {
    onMove("move", { dir });
  };

  const myBall = state.balls[selfId];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 text-white font-sans space-y-4 relative overflow-hidden bg-sky-950">
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

      {/* Bounce Arcade Screen */}
      <div className="bg-slate-900 border-4 border-amber-500/40 rounded-2xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="flex justify-between items-center text-xs font-bold text-amber-400 border-b border-white/10 pb-2 uppercase">
          <div className="flex items-center gap-2">
            <span>🔴 NOKIA BOUNCE</span>
            <button
              onClick={() => setShowRules(true)}
              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] cursor-pointer"
            >
              ? Rules
            </button>
          </div>
          <span>Rings: {myShipRings(myBall?.ringsCollected ?? 0)}</span>
        </div>

        {/* Platform Viewport */}
        <div className="relative w-full h-64 bg-gradient-to-b from-sky-900 to-slate-950 border-2 border-white/10 rounded overflow-hidden">
          {/* Gold Rings */}
          {state.rings.map((r) => (
            !r.collected && (
              <motion.div
                key={r.id}
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute w-6 h-6 border-4 border-amber-400 rounded-full shadow-[0_0_10px_#f59e0b] -translate-x-1/2 -translate-y-1/2"
              />
            )
          ))}

          {/* Red Ball */}
          {myBall && (
            <motion.div
              animate={{ left: `${myBall.x}%`, top: `${myBall.y}%` }}
              transition={{ duration: 0.1 }}
              className="absolute w-8 h-8 bg-gradient-to-tr from-red-600 to-rose-400 rounded-full shadow-lg shadow-red-500/50 border-2 border-white -translate-x-1/2 -translate-y-1/2"
            />
          )}

          {/* Floor */}
          <div className="absolute bottom-0 inset-x-0 h-10 bg-amber-800/80 border-t-2 border-amber-600" />
        </div>

        {/* Scoreboard */}
        <div className="flex justify-between items-center text-xs font-bold text-amber-400 pt-1">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <span>{p.id === selfId ? "You" : `P (${p.id.slice(0, 4)})`}:</span>
              <span>{p.ringsCollected} 🟡</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bounce Arcade Controls */}
      <div className="flex justify-between items-center p-4 bg-slate-900 border-2 border-amber-500/30 rounded-2xl shadow-xl">
        <div className="flex gap-2">
          <button
            onClick={() => handleMoveBall("LEFT")}
            className="w-16 h-14 bg-slate-800 border border-white/20 text-white font-bold text-2xl rounded-xl shadow active:scale-95 cursor-pointer"
          >
            ◄
          </button>
          <button
            onClick={() => handleMoveBall("RIGHT")}
            className="w-16 h-14 bg-slate-800 border border-white/20 text-white font-bold text-2xl rounded-xl shadow active:scale-95 cursor-pointer"
          >
            ►
          </button>
        </div>

        <button
          onClick={() => handleMoveBall("JUMP")}
          className="w-20 h-20 rounded-full bg-amber-600 border-4 border-amber-400 text-white font-bold text-lg uppercase shadow-lg shadow-amber-600/50 active:scale-90 cursor-pointer"
        >
          JUMP 🔴
        </button>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-2 p-2 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
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
              className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-amber-300 font-sans"
            >
              <h3 className="text-lg font-bold text-amber-400">
                How to Play Bounce 🔴
              </h3>
              <div className="text-xs space-y-2 leading-relaxed text-white/80">
                <p>• Move the red ball LEFT and RIGHT and tap JUMP to bounce.</p>
                <p>• Pass through glowing gold rings to collect them.</p>
                <p>• Collect 10 gold rings to win the match!</p>
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

function myShipRings(count: number): string {
  return `${count} / 10`;
}
