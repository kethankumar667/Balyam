import { useState, useEffect } from "react";
import type { RoadRashPublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface RoadRashBoardProps {
  state: RoadRashPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function RoadRashBoardMobile({ state, selfId, onMove }: RoadRashBoardProps) {
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

  const handleSteer = (dir: string) => {
    onMove("steer", { dir });
  };

  const handleThrottle = (accel: boolean) => {
    onMove("throttle", { accel });
  };

  const handleAttack = () => {
    onMove("attack");
  };

  const myBike = state.bikes[selfId];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 text-white font-sans space-y-4 relative overflow-hidden bg-zinc-950">
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

      {/* 90s Road Rash Arcade Frame */}
      <div className="bg-zinc-900 border-4 border-red-600/40 rounded-2xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="flex justify-between items-center text-xs font-bold text-red-500 border-b border-white/10 pb-2 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span>🏍️ ROAD RASH 90s</span>
            <button
              onClick={() => setShowRules(true)}
              className="px-2 py-0.5 rounded bg-red-600/20 text-red-300 text-[10px] cursor-pointer"
            >
              ? Rules
            </button>
          </div>
          <span>Speed: {myBike?.speed ?? 0} MPH</span>
        </div>

        {/* Pseudo-3D Highway Track */}
        <div className="relative w-full h-64 bg-zinc-950 border-2 border-red-600/20 rounded overflow-hidden flex flex-col justify-end p-4">
          {/* Highway Lanes */}
          <div className="absolute inset-0 flex">
            <div className="w-1/3 border-r-2 border-dashed border-yellow-500/30 bg-zinc-900/50" />
            <div className="w-1/3 border-r-2 border-dashed border-yellow-500/30 bg-zinc-900/50" />
            <div className="w-1/3 bg-zinc-900/50" />
          </div>

          {/* Opponent & Player Bikes */}
          {Object.entries(state.bikes).map(([pid, bike]) => {
            const lanePos = bike.lane === 0 ? "16%" : bike.lane === 1 ? "50%" : "84%";
            const isMe = pid === selfId;

            return (
              <motion.div
                key={pid}
                animate={{ left: lanePos }}
                transition={{ duration: 0.15 }}
                style={{ bottom: isMe ? "10%" : "40%" }}
                className="absolute text-4xl select-none -translate-x-1/2 flex flex-col items-center"
              >
                <span>{bike.isKnockedOut ? "💥" : isMe ? "🏍️" : "🏍️"}</span>
                {bike.isAttacking && (
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1.5 }}
                    className="text-2xl absolute -top-4"
                  >
                    🥊
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Live Leaderboard */}
        <div className="flex justify-between items-center text-xs font-bold text-red-400 pt-1">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <span>{p.id === selfId ? "You" : `P (${p.id.slice(0, 4)})`}:</span>
              <span>#{p.rank} ({p.position}m)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Road Rash Combat Controls */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900 border-2 border-red-600/30 rounded-2xl shadow-xl">
        <div className="flex gap-1 col-span-1">
          <button
            onClick={() => handleSteer("LEFT")}
            className="flex-1 h-14 bg-zinc-800 border border-white/20 text-white font-bold text-xl rounded-xl active:scale-95 cursor-pointer"
          >
            ◄
          </button>
          <button
            onClick={() => handleSteer("RIGHT")}
            className="flex-1 h-14 bg-zinc-800 border border-white/20 text-white font-bold text-xl rounded-xl active:scale-95 cursor-pointer"
          >
            ►
          </button>
        </div>

        <div className="flex gap-1 col-span-1">
          <button
            onClick={() => handleThrottle(true)}
            className="flex-1 h-14 bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl active:scale-95 cursor-pointer"
          >
            GAS ⚡
          </button>
          <button
            onClick={() => handleThrottle(false)}
            className="flex-1 h-14 bg-amber-700 text-white font-bold text-xs uppercase rounded-xl active:scale-95 cursor-pointer"
          >
            BRAKE
          </button>
        </div>

        <button
          onClick={handleAttack}
          className="col-span-1 h-14 bg-red-600 border-2 border-red-400 text-white font-bold text-sm uppercase rounded-xl shadow-lg active:scale-90 cursor-pointer flex items-center justify-center gap-1"
        >
          PUNCH 🥊
        </button>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-2 p-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-zinc-800 text-xl transition active:scale-125 cursor-pointer"
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
              className="bg-zinc-900 border-2 border-red-600/40 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-red-300 font-sans"
            >
              <h3 className="text-lg font-bold text-red-500 font-display">
                How to Play Road Rash 90s 🏍️
              </h3>
              <div className="text-xs space-y-2 leading-relaxed text-white/80">
                <p>• Steer motorcycle LEFT and RIGHT to switch lanes.</p>
                <p>• Press <strong>GAS ⚡</strong> to accelerate up to 100 MPH.</p>
                <p>• Tap <strong>PUNCH 🥊</strong> to knock rival bikers off their seats!</p>
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
