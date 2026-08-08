import { useState, useEffect } from "react";
import type { SamethaluPlayerState } from "@shared/types";
import type { SamethaluBoardProps } from "./SamethaluBoardMobile";
import WisdomGalleryModal, { unlockProverb } from "./WisdomGalleryModal";

export default function SamethaluBoardDesktop({ state, selfId, onMove }: SamethaluBoardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(state.mySelectedIndex);
  const [showGallery, setShowGallery] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const q = state.currentQuestion;
  const myPlayer = state.players.find((p) => p.id === selfId);
  const hasAnswered = myPlayer?.hasAnswered || selectedIdx !== null;

  // Reset selection when a new round starts
  useEffect(() => {
    setSelectedIdx(null);
  }, [state.round]);

  // Audio Narrator ("తాతయ్య సామెతలు")
  useEffect(() => {
    if (!speechEnabled || !window.speechSynthesis || !q) return;

    window.speechSynthesis.cancel();
    let textToSpeak = "";
    if (state.phase === "playing") {
      textToSpeak = q.proverb.replace("______", "ఏమిటి?");
    } else if (state.phase === "roundSummary") {
      const correctText = state.correctIndex != null ? q.options[state.correctIndex] : "";
      const fullText = q.proverb.replace("______", correctText);
      textToSpeak = `${fullText}. భావం: ${q.meaning}`;
    }

    if (textToSpeak) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "te-IN";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [q, state.phase, state.correctIndex, speechEnabled]);

  // Card Unlocking on Correct Answer
  useEffect(() => {
    if (state.phase === "roundSummary" && q) {
      const myChosenIdx = state.selectedIndices?.[selfId];
      if (state.correctIndex != null && myChosenIdx === state.correctIndex) {
        unlockProverb(q.id);
      }
    }
  }, [state.phase, q, selfId, state.selectedIndices, state.correctIndex]);

  const handleSelect = (idx: number) => {
    if (hasAnswered) return;
    setSelectedIdx(idx);
    onMove("submitAnswer", { optionIndex: idx });
  };

  const renderProverbHeader = () => {
    if (!q) return "సామెత...";
    const parts = q.proverb.split("______");

    return (
      <span className="inline">
        {parts[0]}
        {selectedIdx != null ? (
          <span className="inline-block px-3 py-1 mx-1.5 rounded bg-amber-400 text-black font-extrabold shadow-md border border-amber-300">
            {q.options[selectedIdx]}
          </span>
        ) : (
          <span className="inline-block px-4 py-1 mx-1.5 rounded border-2 border-dashed border-amber-400 bg-amber-500/20 text-amber-300 font-mono tracking-widest animate-pulse">
            ______
          </span>
        )}
        {parts[1]}
      </span>
    );
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] max-w-6xl mx-auto p-6 text-ink-hi font-sans grid grid-cols-12 gap-6 relative">
      {/* Left Column (Proverb Question & Choice Grid) */}
      <div className="col-span-7 space-y-6 flex flex-col justify-between">
        {/* Banner */}
        <div className="bg-surface-0 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <div className="flex items-center gap-3">
              <span>Samethalu Quiz (సామెతలు)</span>
              <button
                onClick={() => setShowGallery(true)}
                className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-bold transition cursor-pointer"
              >
                🎨 Wisdom Gallery Cards
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSpeechEnabled(!speechEnabled)}
                title="Toggle తాతయ్య Audio Narrator"
                className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 cursor-pointer"
              >
                {speechEnabled ? "🔊 Narrator" : "🔇 Muted"}
              </button>
              <span>Round {state.round} of {state.totalRounds}</span>
            </div>
          </div>

          <div className="p-5 bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-400/40 rounded-xl shadow-2xl">
            <h1 className="text-3xl font-bold text-amber-900 dark:text-amber-200 font-display leading-relaxed">
              {renderProverbHeader()}
            </h1>
          </div>
        </div>

        {/* Word Tiles Grid */}
        {state.phase === "playing" && q && (
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-4 flex-1 flex flex-col justify-between">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              🧩 Click a Word Tile to complete the proverb blank:
            </div>

            <div className="grid grid-cols-2 gap-4">
              {q.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={hasAnswered}
                    className={`p-5 rounded-2xl font-bold text-sm text-left transition border shadow-lg active:scale-95 flex flex-col justify-between h-32 cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 border-amber-300 text-black shadow-amber-500/20 ring-2 ring-amber-300"
                        : hasAnswered
                        ? "bg-surface-1/60 border-surface-rim text-ink-mute cursor-not-allowed"
                        : "bg-surface-1 hover:bg-surface-0 border-amber-500/30 text-amber-900 dark:text-amber-100 hover:border-amber-400"
                    }`}
                  >
                    <span className="text-xs uppercase text-amber-600 dark:text-amber-400 font-bold font-mono">Word Tile {idx + 1}</span>
                    <span className="text-xl font-display font-bold">{opt}</span>
                    {isSelected ? (
                      <span className="text-xs font-bold uppercase text-amber-950">Placed!</span>
                    ) : (
                      <span className="text-xs text-amber-500 font-medium">Click to place →</span>
                    )}
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center animate-pulse">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Word tile placed! Waiting for opponents...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Round Summary */}
        {state.phase === "roundSummary" && q && (
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Round {state.round} Proverb Wisdom & Scores
              </h2>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm space-y-1">
                <div className="font-bold text-amber-700 dark:text-amber-300">🎙️ తాతయ్య వివరణ / Meaning:</div>
                <div className="text-ink-hi leading-relaxed">{q.meaning}</div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {state.seatOrder.map((pid) => {
                  const player = state.players.find((p) => p.id === pid);
                  const chosenIdx = state.selectedIndices?.[pid];
                  const pts = state.roundScores?.[pid] ?? -2;
                  const isCorrect = chosenIdx === state.correctIndex;

                  return (
                    <div
                      key={pid}
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        pid === selfId
                          ? "bg-amber-500/10 border-amber-500/40"
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
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-sm text-black shadow-lg transition active:scale-95 cursor-pointer"
            >
              Continue to Next Proverb →
            </button>
          </div>
        )}
      </div>

      {/* Right Column (Leaderboard & Gallery Access) */}
      <div className="col-span-5 flex flex-col space-y-6">
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl flex-1 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-ink-hi uppercase tracking-wider flex justify-between items-center">
              <span>Match Leaderboard</span>
              <button
                onClick={() => setShowGallery(true)}
                className="text-xs text-amber-500 hover:underline cursor-pointer"
              >
                🎨 Open Wisdom Gallery
              </button>
            </h2>

            <div className="space-y-3">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    p.id === selfId
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-surface-1 border-surface-rim"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        p.hasAnswered ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
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

          <button
            onClick={() => setShowGallery(true)}
            className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs uppercase tracking-wider hover:bg-amber-500/30 transition cursor-pointer"
          >
            🎨 View Wisdom Gallery Cards
          </button>
        </div>
      </div>

      {/* Wisdom Gallery Modal */}
      {showGallery && <WisdomGalleryModal onClose={() => setShowGallery(false)} />}
    </div>
  );
}
