import { useState, useEffect } from "react";
import type { SnakePublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface SnakeBoardProps {
  state: SnakePublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SnakeBoardMobile({ state, selfId, onMove }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Automatic game tick
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

  const handleTurn = (dir: string) => {
    onMove("turn", { dir });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 text-emerald-950 font-mono space-y-4 relative overflow-hidden bg-[#8b9bb4]">
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

      {/* Nokia 3310 Green LCD Screen Frame */}
      <div className="bg-[#9ebd9e] border-8 border-[#3b4731] rounded-2xl p-4 shadow-2xl space-y-3 relative">
        <div className="flex justify-between items-center text-xs font-bold text-[#1c2415] border-b border-[#3b4731] pb-1 uppercase">
          <div className="flex items-center gap-2">
            <span>🐍 NOKIA SNAKE</span>
            <button
              onClick={() => setShowRules(true)}
              className="px-2 py-0.5 rounded bg-[#3b4731] text-[#9ebd9e] text-[10px] cursor-pointer"
            >
              ? Rules
            </button>
          </div>
          <span>Grid {state.gridSize}x{state.gridSize}</span>
        </div>

        {/* Snake Grid Matrix */}
        <div className="grid grid-cols-20 gap-0.5 bg-[#4a573f]/20 p-1 border-2 border-[#1c2415] rounded aspect-square">
          {Array.from({ length: state.gridSize * state.gridSize }).map((_, idx) => {
            const x = idx % state.gridSize;
            const y = Math.floor(idx / state.gridSize);

            // Check food
            const isFood = state.food.x === x && state.food.y === y;

            // Check snake body
            let isSnake = false;
            let snakeColor = "#1c2415";
            for (const [pid, s] of Object.entries(state.snakes)) {
              if (s.body.some((seg) => seg.x === x && seg.y === y)) {
                isSnake = true;
                if (pid !== selfId) snakeColor = "#3b4731";
                break;
              }
            }

            return (
              <div
                key={idx}
                className={`w-full h-full rounded-xs transition-colors ${
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

        {/* Players Scoreboard */}
        <div className="flex justify-between items-center text-xs font-bold text-[#1c2415] pt-1">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <span>{p.id === selfId ? "You" : `P (${p.id.slice(0, 4)})`}:</span>
              <span>{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nokia Directional Keypad */}
      <div className="flex flex-col items-center gap-2 p-2 bg-[#2d3725] border-4 border-[#1c2415] rounded-3xl shadow-xl">
        <button
          onClick={() => handleTurn("UP")}
          className="w-16 h-12 bg-[#536248] text-white font-bold text-xl rounded-xl border-2 border-[#8b9bb4] shadow active:scale-95 cursor-pointer"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => handleTurn("LEFT")}
            className="w-16 h-12 bg-[#536248] text-white font-bold text-xl rounded-xl border-2 border-[#8b9bb4] shadow active:scale-95 cursor-pointer"
          >
            ◄
          </button>
          <button
            onClick={() => handleTurn("DOWN")}
            className="w-16 h-12 bg-[#536248] text-white font-bold text-xl rounded-xl border-2 border-[#8b9bb4] shadow active:scale-95 cursor-pointer"
          >
            ▼
          </button>
          <button
            onClick={() => handleTurn("RIGHT")}
            className="w-16 h-12 bg-[#536248] text-white font-bold text-xl rounded-xl border-2 border-[#8b9bb4] shadow active:scale-95 cursor-pointer"
          >
            ►
          </button>
        </div>
      </div>

      {/* Floating Reaction Dock */}
      {!state.isOver && (
        <div className="flex justify-center gap-2 p-2 bg-[#9ebd9e] border-2 border-[#1c2415] rounded-2xl shadow-xl">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-[#8b9bb4] text-xl transition active:scale-125 cursor-pointer"
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
              className="bg-[#9ebd9e] border-4 border-[#1c2415] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-[#1c2415]"
            >
              <h3 className="text-lg font-bold font-mono">
                How to Play Nokia Snake 🐍
              </h3>
              <div className="text-xs space-y-2 leading-relaxed">
                <p>• Guide your pixel snake using directional controls.</p>
                <p>• Eat food pellets to extend your length and score 10 points.</p>
                <p>• Avoid colliding with LCD walls or snake bodies!</p>
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
