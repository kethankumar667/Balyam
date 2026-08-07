import { useState, useEffect } from "react";
import type { RoadRashPublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface RoadRashBoardProps {
  state: RoadRashPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function RoadRashBoardDesktop({ state, selfId, onMove }: RoadRashBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Desktop Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") onMove("steer", { dir: "LEFT" });
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") onMove("steer", { dir: "RIGHT" });
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") onMove("throttle", { accel: true });
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") onMove("throttle", { accel: false });
      if (e.key === " " || e.key === "Enter") onMove("attack");
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

  const myBike = state.bikes[selfId];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-4xl mx-auto p-6 text-white font-sans space-y-6 relative overflow-hidden bg-zinc-950 rounded-3xl shadow-2xl my-4">
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
        {/* Left Side Controls Info */}
        <div className="col-span-1 bg-zinc-900 border-2 border-red-600/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-red-500 font-display">Road Rash 90s 🏍️</h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Use <strong>A/D</strong> to switch lanes, <strong>W/S</strong> for Gas/Brake, and <strong>Spacebar</strong> to punch rival bikers!
          </p>
          <div className="space-y-2 pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-amber-400 uppercase">Live Race Standings</h3>
            {state.players.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-zinc-800 rounded-lg">
                <span>{p.id === selfId ? "You" : `Player (${p.id.slice(0, 4)})`}</span>
                <span className="font-bold text-amber-300">#{p.rank} ({p.position}m)</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="w-full py-2 rounded-xl bg-red-600 text-white font-bold text-xs uppercase cursor-pointer"
          >
            ? Rules
          </button>
        </div>

        {/* Center Viewport */}
        <div className="col-span-2 bg-zinc-900 border-4 border-red-600/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-red-500 border-b border-white/10 pb-2 uppercase">
            <span>HIGHWAY TRACK</span>
            <span>Speed: {myBike?.speed ?? 0} MPH</span>
          </div>

          <div className="relative w-full h-80 bg-zinc-950 border-2 border-red-600/20 rounded overflow-hidden flex flex-col justify-end p-4">
            <div className="absolute inset-0 flex">
              <div className="w-1/3 border-r-2 border-dashed border-yellow-500/30 bg-zinc-900/50" />
              <div className="w-1/3 border-r-2 border-dashed border-yellow-500/30 bg-zinc-900/50" />
              <div className="w-1/3 bg-zinc-900/50" />
            </div>

            {Object.entries(state.bikes).map(([pid, bike]) => {
              const lanePos = bike.lane === 0 ? "16%" : bike.lane === 1 ? "50%" : "84%";
              const isMe = pid === selfId;

              return (
                <motion.div
                  key={pid}
                  animate={{ left: lanePos }}
                  transition={{ duration: 0.15 }}
                  style={{ bottom: isMe ? "10%" : "40%" }}
                  className="absolute text-5xl select-none -translate-x-1/2 flex flex-col items-center"
                >
                  <span>{bike.isKnockedOut ? "💥" : isMe ? "🏍️" : "🏍️"}</span>
                  {bike.isAttacking && (
                    <motion.span
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1.5 }}
                      className="text-3xl absolute -top-6"
                    >
                      🥊
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-3 p-3 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl max-w-md mx-auto">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-zinc-800 text-2xl transition active:scale-125 cursor-pointer"
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
              className="bg-zinc-900 border-2 border-red-600/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-red-300 font-sans"
            >
              <h3 className="text-xl font-bold text-red-500 font-display">How to Play Road Rash 90s 🏍️</h3>
              <div className="text-xs space-y-2 leading-relaxed text-white/80">
                <p>• Steer motorcycle with Left/Right Arrows or A/D.</p>
                <p>• Accelerate with Up Arrow or W key.</p>
                <p>• Press Spacebar to punch and knock out rival bikers!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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
