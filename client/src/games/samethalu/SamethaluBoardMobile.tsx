import { useState, useEffect } from "react";
import type { SamethaluPlayerState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface SamethaluBoardProps {
  state: SamethaluPlayerState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SamethaluBoardMobile({ state, selfId, onMove }: SamethaluBoardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(state.mySelectedIndex);

  // Reset selection when a new round starts
  useEffect(() => { setSelectedIdx(null); }, [state.round]);
  const [showRules, setShowRules] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  const q = state.currentQuestion;
  const myPlayer = state.players.find((p) => p.id === selfId);
  const hasAnswered = myPlayer?.hasAnswered || selectedIdx !== null;

  const handleSelect = (idx: number) => {
    if (hasAnswered) return;
    setSelectedIdx(idx);
    onMove("submitAnswer", { optionIndex: idx });
  };

  const triggerReaction = (emoji: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    const x = Math.random() * 80 + 10;
    setReactions((prev) => [...prev.slice(-6), { id, emoji, x }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 text-ink-hi font-sans space-y-4 relative overflow-hidden">
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

      {/* Banner */}
      <div className="bg-surface-0 border border-amber-500/30 rounded-2xl p-4 shadow-lg text-center relative overflow-hidden">
        <div className="flex justify-between items-center text-xs text-amber-600 dark:text-amber-400 mb-2 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span>Samethalu Quiz</span>
            <button
              onClick={() => setShowRules(true)}
              className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 text-[11px] cursor-pointer"
            >
              ? Rules
            </button>
          </div>
          <span>Round {state.round} of {state.totalRounds}</span>
        </div>

        <motion.div
          key={q?.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 15 }}
          className="my-2 p-4 bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-400/40 rounded-xl shadow-2xl relative overflow-hidden animate-glow-pulse"
        >
          <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200 font-display">
            {q?.proverb || "సామెత..."}
          </h2>
          <p className="text-xs text-amber-800 dark:text-amber-100/70 mt-2 font-medium">{q?.prompt}</p>
        </motion.div>
      </div>

      {/* Main Playing Phase */}
      {state.phase === "playing" && q && (
        <div className="space-y-3 flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <motion.button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={hasAnswered}
                  whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                  whileTap={{ scale: hasAnswered ? 1 : 0.97 }}
                  className={`p-4 rounded-xl font-bold text-sm text-left transition border shadow-md flex items-center justify-between ${
                    isSelected
                      ? "bg-amber-500 border-amber-300 text-black shadow-amber-500/30 ring-2 ring-amber-300"
                      : hasAnswered
                      ? "bg-surface-1/60 border-surface-rim text-ink-mute cursor-not-allowed"
                      : "bg-surface-0 hover:bg-surface-1 border-surface-rim text-ink-hi cursor-pointer"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="text-xs font-bold uppercase text-amber-900">Selected</span>}
                </motion.button>
              );
            })}
          </div>

          {hasAnswered && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Answer submitted! Waiting for players...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Round Summary Phase */}
      {state.phase === "roundSummary" && q && (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-4 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-center">
              Round {state.round} Explanation & Scores
            </h3>

            {/* Proverb Meaning */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-300">Meaning / భావం:</div>
              <div className="text-ink-hi">{q.meaning}</div>
            </div>

            {/* Scores Breakdown */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {state.seatOrder.map((pid) => {
                const player = state.players.find((p) => p.id === pid);
                const chosenIdx = state.selectedIndices?.[pid];
                const pts = state.roundScores?.[pid] ?? 0;
                const isCorrect = chosenIdx === state.correctIndex;

                return (
                  <div
                    key={pid}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      pid === selfId
                        ? "bg-amber-500/10 border-amber-500/40"
                        : "bg-surface-1 border-surface-rim"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-ink-hi">
                        {pid === selfId ? "You" : `Player (${pid.slice(0, 4)})`}
                      </div>
                      <div className="text-[11px] text-ink-mid">
                        {chosenIdx != null ? q.options[chosenIdx] : "No answer"}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isCorrect
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30"
                      }`}
                    >
                      +{pts} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onMove("nextRound")}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-sm text-black shadow-lg transition active:scale-95 cursor-pointer"
          >
            Next Proverb →
          </button>
        </div>
      )}

      {/* Finished Standings */}
      {state.phase === "finished" && state.standings && (
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-4 text-center space-y-4">
          <h2 className="text-2xl font-display text-amber-600 dark:text-amber-400">Match Complete! 📜</h2>
          <div className="space-y-2">
            {state.standings.map((st) => (
              <div
                key={st.playerId}
                className="flex justify-between items-center p-3 bg-surface-1 border border-surface-rim rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {st.rank === 0 ? "🥇" : st.rank === 1 ? "🥈" : st.rank === 2 ? "🥉" : `#${st.rank + 1}`}
                  </span>
                  <span className="font-bold text-sm text-ink-hi">
                    {st.playerId === selfId ? "You" : `Player (${st.playerId.slice(0, 4)})`}
                  </span>
                </div>
                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{st.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Reaction Dock */}
      {state.phase !== "finished" && (
        <div className="flex justify-center gap-2 p-2 bg-surface-0 border border-surface-rim rounded-2xl shadow-xl">
          {(["🔥", "👏", "😂", "🤯", "🥳"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-2 rounded-xl hover:bg-surface-1 text-xl transition active:scale-125 cursor-pointer"
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
              className="bg-surface-0 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 font-display">
                How to Play Samethalu Quiz 📜
              </h3>
              <div className="text-xs text-ink-mid space-y-2 leading-relaxed">
                <p>• Read the famous Telugu proverb (సామెత).</p>
                <p>• Choose the option that best completes the proverb or explains its true meaning.</p>
                <p>• <strong>Scoring:</strong> 100 points per correct answer + speed bonus up to 50 pts!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-600 transition"
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
