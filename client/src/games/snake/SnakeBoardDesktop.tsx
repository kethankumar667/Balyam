import { useState, useEffect } from "react";
import type { SnakePublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface SnakeBoardProps {
  state: SnakePublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SnakeBoardDesktop({ state, selfId, onMove }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Keyboard controls listener for Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") onMove("turn", { dir: "UP" });
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") onMove("turn", { dir: "DOWN" });
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") onMove("turn", { dir: "LEFT" });
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") onMove("turn", { dir: "RIGHT" });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove]);

  // Tick loop
  useEffect(() => {
    if (state.isOver) return;
    const interval = setInterval(() => {
      onMove("tick");
    }, 120);
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-4xl mx-auto p-6 text-emerald-950 font-mono space-y-6 relative overflow-hidden bg-[#8b9bb4] rounded-3xl shadow-2xl my-4">
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
        {/* Left Side Nokia Specs */}
        <div className="col-span-1 bg-[#2d3725] border-4 border-[#1c2415] rounded-2xl p-6 text-white space-y-4 shadow-xl">
          <h2 className="text-xl font-bold font-mono text-[#9ebd9e]">Nokia 3310 Arcade 🐍</h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Use <strong>Arrow Keys</strong> or <strong>WASD</strong> to steer your pixel snake!
          </p>
          <div className="space-y-2 pt-4 border-t border-white/20">
            <h3 className="text-sm font-bold text-amber-400 uppercase">Live High Scores</h3>
            {state.players.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-[#536248]/40 rounded-lg">
                <span>{p.id === selfId ? "You" : `Player (${p.id.slice(0, 4)})`}</span>
                <span className="font-bold text-amber-300">{p.score} pts</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="w-full py-2 rounded-xl bg-[#9ebd9e] text-[#1c2415] font-bold text-xs uppercase cursor-pointer"
          >
            ? How to Play
          </button>
        </div>

        {/* Center LCD Matrix */}
        <div className="col-span-2 bg-[#9ebd9e] border-8 border-[#3b4731] rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-[#1c2415] border-b-2 border-[#3b4731] pb-2 uppercase">
            <span>LCD 20x20 MATRIX</span>
            <span>Speed: 120ms</span>
          </div>

          <div className="grid grid-cols-20 gap-1 bg-[#4a573f]/20 p-2 border-4 border-[#1c2415] rounded aspect-square">
            {Array.from({ length: state.gridSize * state.gridSize }).map((_, idx) => {
              const x = idx % state.gridSize;
              const y = Math.floor(idx / state.gridSize);

              const isFood = state.food.x === x && state.food.y === y;
              let isSnake = false;

              for (const [_, s] of Object.entries(state.snakes)) {
                if (s.body.some((seg) => seg.x === x && seg.y === y)) {
                  isSnake = true;
                  break;
                }
              }

              return (
                <div
                  key={idx}
                  className={`w-full h-full rounded-xs ${
                    isSnake
                      ? "bg-[#1c2415]"
                      : isFood
                      ? "bg-[#1c2415] animate-ping"
                      : "bg-[#9ebd9e]/40"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-3 p-3 bg-[#9ebd9e] border-2 border-[#1c2415] rounded-2xl shadow-xl max-w-md mx-auto">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-[#8b9bb4] text-2xl transition active:scale-125 cursor-pointer"
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
              className="bg-[#9ebd9e] border-4 border-[#1c2415] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-[#1c2415]"
            >
              <h3 className="text-xl font-bold font-mono">How to Play Nokia Snake 🐍</h3>
              <div className="text-xs space-y-2 leading-relaxed">
                <p>• Use keyboard WASD or Arrow Keys to change direction.</p>
                <p>• Collect food pellets to increase score and length.</p>
                <p>• Outlast opponent snakes to claim victory!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-[#1c2415] text-[#9ebd9e] font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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
