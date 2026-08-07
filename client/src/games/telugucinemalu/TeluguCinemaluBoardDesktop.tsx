import { useState, useEffect } from "react";
import type { TeluguCinemaluPlayerState } from "@shared/types";
import type { TeluguCinemaluBoardProps } from "./TeluguCinemaluBoardMobile";

export default function TeluguCinemaluBoardDesktop({ state, selfId, onMove }: TeluguCinemaluBoardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(state.mySelectedIndex);

  // Reset selection when a new round starts
  useEffect(() => { setSelectedIdx(null); }, [state.round]);

  const q = state.currentQuestion;
  const myPlayer = state.players.find((p) => p.id === selfId);
  const hasAnswered = myPlayer?.hasAnswered || selectedIdx !== null;

  const handleSelect = (idx: number) => {
    if (hasAnswered) return;
    setSelectedIdx(idx);
    onMove("submitAnswer", { optionIndex: idx });
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] max-w-6xl mx-auto p-6 text-ink-hi font-sans grid grid-cols-12 gap-6">
      {/* Left Column (Cinema Prompt & Option Workspace) */}
      <div className="col-span-7 space-y-6 flex flex-col justify-between">
        {/* Banner */}
        <div className="bg-surface-0 border border-red-500/30 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">
            <span>🎬 Telugu Cinema Quiz (తెలుగు సినిమా క్విజ్)</span>
            <span>Round {state.round} of {state.totalRounds}</span>
          </div>

          <div className="p-5 bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 rounded-xl">
            <p className="text-xs uppercase text-amber-600 dark:text-amber-400 font-bold mb-1">Mass Dialogue Challenge</p>
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-200 font-display italic">
              "{q?.dialogue || "డైలాగ్..."}"
            </h1>
            <p className="text-sm text-red-800 dark:text-red-100/80 mt-2 font-medium">{q?.prompt}</p>
          </div>
        </div>

        {/* Choice Grid */}
        {state.phase === "playing" && q && (
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-4 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4">
              {q.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={hasAnswered}
                    className={`p-5 rounded-xl font-bold text-sm text-left transition border shadow-lg active:scale-95 flex flex-col justify-between h-28 ${
                      isSelected
                        ? "bg-red-600 border-amber-400 text-white shadow-red-600/30"
                        : hasAnswered
                        ? "bg-surface-1/60 border-surface-rim text-ink-mute cursor-not-allowed"
                        : "bg-surface-1 hover:bg-surface-0 border-surface-rim text-ink-hi cursor-pointer"
                    }`}
                  >
                    <span className="text-xs uppercase text-amber-600 dark:text-amber-400 font-bold">Option {idx + 1}</span>
                    <span className="text-base font-semibold">{opt}</span>
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-center">
                <p className="text-sm font-semibold text-red-600 dark:text-red-300">
                  Answer locked in! Waiting for fellow Tollywood fans...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Round Summary */}
        {state.phase === "roundSummary" && q && (
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">
                Round {state.round} Cinema Trivia & Results
              </h2>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm space-y-1">
                <div className="font-bold text-amber-600 dark:text-amber-400">Movie Trivia / ట్రివియా:</div>
                <div className="text-ink-hi">{q.trivia}</div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {state.seatOrder.map((pid) => {
                  const player = state.players.find((p) => p.id === pid);
                  const chosenIdx = state.selectedIndices?.[pid];
                  const pts = state.roundScores?.[pid] ?? 0;
                  const isCorrect = chosenIdx === state.correctIndex;

                  return (
                    <div
                      key={pid}
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        pid === selfId
                          ? "bg-red-500/10 border-red-500/40"
                          : "bg-surface-1 border-surface-rim"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-ink-hi">
                          {pid === selfId ? "You" : `Player (${pid.slice(0, 5)})`}
                        </div>
                        <div className="text-xs text-ink-mid">
                          Choice: {chosenIdx != null ? q.options[chosenIdx] : "No answer"}
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
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
              className="w-full py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-sm text-white shadow-lg transition active:scale-95 cursor-pointer"
            >
              Continue to Next Movie Dialogue →
            </button>
          </div>
        )}
      </div>

      {/* Right Column (Leaderboard) */}
      <div className="col-span-5 flex flex-col space-y-6">
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl flex-1 space-y-4">
          <h2 className="text-base font-bold text-ink-hi uppercase tracking-wider">
            Cinema Adda Leaderboard 🍿
          </h2>

          <div className="space-y-3">
            {state.players.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  p.id === selfId
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-surface-1 border-surface-rim"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      p.hasAnswered ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-sm text-ink-hi">
                      {p.id === selfId ? "You" : `Player (${p.id.slice(0, 5)})`}
                    </div>
                    <div className="text-xs text-ink-mute font-medium">
                      {p.hasAnswered ? "Answered" : "Thinking..."}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-base text-amber-600 dark:text-amber-400">{p.score} pts</div>
                  <div className="text-xs text-ink-mute">{p.roundWins} round wins</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
