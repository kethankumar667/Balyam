import { useState, useEffect } from "react";
import type { CinemaCategory, TeluguCinemaluPlayerState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface TeluguCinemaluBoardProps {
  state: TeluguCinemaluPlayerState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

const CATEGORIES: { id: CinemaCategory; name: string; icon: string; lang: string }[] = [
  { id: "Tollywood", name: "Tollywood", icon: "🎬", lang: "Telugu Cinema" },
  { id: "Kollywood", name: "Kollywood", icon: "🎭", lang: "Tamil Cinema" },
  { id: "Sandalwood", name: "Sandalwood", icon: "🌟", lang: "Kannada Cinema" },
  { id: "Bollywood", name: "Bollywood", icon: "🎥", lang: "Hindi Cinema" },
  { id: "Hollywood", name: "Hollywood", icon: "🍿", lang: "English Cinema" },
  { id: "All", name: "All Industries", icon: "🌈", lang: "Mix of All Cinema" },
];

const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30];

export default function TeluguCinemaluBoardMobile({ state, selfId, onMove }: TeluguCinemaluBoardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(state.mySelectedIndex);
  const [chosenCat, setChosenCat] = useState<CinemaCategory>("Tollywood");
  const [chosenCount, setChosenCount] = useState<number>(10);

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

  const handleStartGame = () => {
    onMove("selectCategory", { category: chosenCat, questionCount: chosenCount });
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

      {/* Category Selection Phase */}
      {state.phase === "categorySelection" && (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="bg-surface-0 border border-red-500/30 rounded-2xl p-5 shadow-xl text-center space-y-4">
            <div className="inline-block p-3 bg-red-500/10 rounded-full text-3xl mb-1">🎬</div>
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 font-display">
              Cinema Quiz Setup
            </h2>
            <p className="text-xs text-ink-mid">
              Select your favorite film industry and total questions to begin!
            </p>

            {/* Category Grid */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold uppercase text-red-500 dark:text-red-400 tracking-wider">
                Select Film Industry:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setChosenCat(cat.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      chosenCat === cat.id
                        ? "bg-red-600 border-amber-400 text-white shadow-md ring-2 ring-amber-400"
                        : "bg-surface-1 hover:bg-surface-1/80 border-surface-rim text-ink-hi"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                    <span className={`text-[10px] ${chosenCat === cat.id ? "text-amber-200" : "text-ink-mid"}`}>
                      {cat.lang}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count Selection */}
            <div className="space-y-2 text-left pt-2">
              <label className="text-xs font-bold uppercase text-red-500 dark:text-red-400 tracking-wider">
                Number of Questions:
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {QUESTION_COUNTS.map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setChosenCount(cnt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      chosenCount === cnt
                        ? "bg-amber-500 border-amber-300 text-black shadow-md font-extrabold"
                        : "bg-surface-1 hover:bg-surface-1/80 border-surface-rim text-ink-hi"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full py-4 px-4 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-base text-white shadow-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Start Quiz ({chosenCat} • {chosenCount} Qs)</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Header Banner for playing / summary */}
      {state.phase !== "categorySelection" && (
        <div className="bg-surface-0 border border-red-500/30 rounded-2xl p-4 shadow-lg text-center relative overflow-hidden">
          <div className="flex justify-between items-center text-xs text-red-500 dark:text-red-400 mb-2 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span>🎬 {state.selectedCategory ?? "Cinema"} Quiz</span>
              <button
                onClick={() => setShowRules(true)}
                className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/30 text-[11px] cursor-pointer"
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
            className="my-2 p-3.5 bg-red-500/10 dark:bg-red-950/40 border-2 border-amber-400/40 rounded-xl shadow-2xl relative overflow-hidden animate-glow-pulse"
          >
            <p className="text-xs uppercase text-amber-600 dark:text-amber-400 font-bold mb-1 tracking-wider">
              {q?.category ?? "Cinema"} Challenge 🍿
            </p>
            <h2 className="text-lg font-bold text-red-900 dark:text-amber-200 font-display italic">
              "{q?.dialogue || "డైలాగ్..."}"
            </h2>
          </motion.div>
        </div>
      )}

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
                      ? "bg-red-600 border-amber-400 text-white shadow-red-600/40 ring-2 ring-amber-400"
                      : hasAnswered
                      ? "bg-surface-1/60 border-surface-rim text-ink-mute cursor-not-allowed"
                      : "bg-surface-0 hover:bg-surface-1 border-surface-rim text-ink-hi cursor-pointer"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="text-xs font-bold uppercase text-amber-300">Selected</span>}
                </motion.button>
              );
            })}
          </div>

          {hasAnswered && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-center">
              <p className="text-xs font-semibold text-red-600 dark:text-red-300">
                Answer locked! Loading evaluation...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Round Summary Phase */}
      {state.phase === "roundSummary" && q && (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-4 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-red-500 dark:text-red-400 uppercase tracking-wider text-center">
              Round {state.round} Cinema Trivia & Results
            </h3>

            {/* Trivia Box */}
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-600 dark:text-amber-400">Movie Trivia / ట్రివియా:</div>
              <div className="text-ink-hi">{q.trivia}</div>
            </div>

            {/* Answers Breakdown */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {state.seatOrder.map((pid) => {
                const player = state.players.find((p) => p.id === pid);
                const chosenIdx = state.selectedIndices?.[pid];
                const pts = state.roundScores?.[pid] ?? -2;
                const isCorrect = chosenIdx === state.correctIndex;

                return (
                  <div
                    key={pid}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      pid === selfId
                        ? "bg-red-500/10 border-red-500/40"
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
                          : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {pts > 0 ? `+${pts}` : pts} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onMove("nextRound")}
            className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-sm text-white shadow-lg transition active:scale-95 cursor-pointer"
          >
            Next Movie Dialogue →
          </button>
        </div>
      )}

      {/* Finished Standings */}
      {state.phase === "finished" && state.standings && (
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-4 text-center space-y-4">
          <h2 className="text-2xl font-display text-amber-600 dark:text-amber-400">Blockbuster Finish! 🎬</h2>
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
      {state.phase !== "finished" && state.phase !== "categorySelection" && (
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
              className="bg-surface-0 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 font-display">
                How to Play Cinema Quiz 🎬
              </h3>
              <div className="text-xs text-ink-mid space-y-2 leading-relaxed">
                <p>• Select your preferred film industry (Tollywood, Kollywood, Sandalwood, Bollywood, Hollywood).</p>
                <p>• Read the iconic movie dialogue prompt.</p>
                <p>• Guess the correct movie out of 4 options.</p>
                <p>• <strong>Scoring:</strong> <strong>+5 points</strong> for correct answers and <strong>-2 points</strong> for wrong choices!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition"
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
