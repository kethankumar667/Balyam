import { useState } from "react";
import type { TambolaClaimType, TambolaPlayerState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface TambolaBoardProps {
  state: TambolaPlayerState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function TambolaBoardMobile({ state, selfId, onMove }: TambolaBoardProps) {
  const [showCalledList, setShowCalledList] = useState(false);
  const myPlayer = state.players.find((p) => p.id === selfId);

  const handleMark = (row: number, col: number) => {
    onMove("markCell", { row, col });
  };

  const handleClaim = (claimType: TambolaClaimType) => {
    onMove("claim", { claimType });
  };

  const claimsList: { type: TambolaClaimType; label: string }[] = [
    { type: "early5", label: "Early 5" },
    { type: "topLine", label: "Top Line" },
    { type: "middleLine", label: "Middle Line" },
    { type: "bottomLine", label: "Bottom Line" },
    { type: "fullHouse", label: "Full House" },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 text-ink-hi font-sans space-y-4">
      {/* Current Call Display */}
      <div className="bg-surface-0 border border-pink-500/30 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden flex flex-col items-center">
        <div className="flex justify-between w-full text-xs text-ink-mid mb-2">
          <span>Tambola / Housie</span>
          <span>Called: {state.calledNumbers.length} / 90</span>
        </div>

        <motion.div
          key={state.currentCall}
          initial={{ scale: 0.2, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 flex items-center justify-center text-4xl font-display text-white shadow-2xl border-2 border-white/50 my-2 animate-glow-pulse"
        >
          {state.currentCall || "—"}
        </motion.div>

        <button
          onClick={() => setShowCalledList(!showCalledList)}
          className="text-xs text-pink-600 dark:text-pink-300 font-semibold hover:underline mt-1 cursor-pointer"
        >
          {showCalledList ? "Hide Called Numbers" : "View All Called Numbers"}
        </button>
      </div>

      {/* Called Numbers Drawer */}
      <AnimatePresence>
        {showCalledList && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-surface-1 border border-surface-rim rounded-xl p-3 max-h-40 overflow-y-auto"
          >
            <div className="text-xs font-bold text-pink-600 dark:text-pink-400 mb-2 uppercase">Drawn Numbers</div>
            <div className="flex flex-wrap gap-1.5">
              {state.calledNumbers.map((num) => (
                <span
                  key={num}
                  className="w-7 h-7 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-700 dark:text-pink-300 font-bold text-xs flex items-center justify-center"
                >
                  {num}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tambola Ticket (3x9 Grid) */}
      <div className="bg-surface-0 border border-surface-rim rounded-2xl p-3 shadow-xl">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 flex justify-between items-center">
          <span>Your Ticket</span>
          <span className="text-[11px] text-ink-mid">Tap numbers as they're called</span>
        </div>

        <div className="grid grid-rows-3 gap-1.5 bg-surface-1/80 p-2 rounded-xl border border-surface-rim">
          {state.myTicket.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-9 gap-1">
              {row.map((val, cIdx) => {
                const isMarked = state.myMarkedCells[rIdx][cIdx];
                const isCalled = val > 0 && state.calledNumbers.includes(val);
                const isCurrent = val > 0 && state.currentCall === val;

                if (val === 0) {
                  return <div key={cIdx} className="bg-surface-0/50 rounded-lg h-9" />;
                }

                return (
                  <button
                    key={cIdx}
                    onClick={() => handleMark(rIdx, cIdx)}
                    disabled={!isCalled}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition border active:scale-95 ${
                      isMarked
                        ? "bg-emerald-500 border-emerald-300 text-black shadow-lg"
                        : isCurrent
                        ? "bg-pink-500 border-white text-white animate-pulse"
                        : isCalled
                        ? "bg-pink-500/20 border-pink-500/40 text-pink-700 dark:text-pink-200 cursor-pointer"
                        : "bg-surface-0 border-surface-rim text-ink-mute opacity-70"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Claim Buttons */}
      <div className="bg-surface-0 border border-surface-rim rounded-2xl p-3 shadow-lg space-y-2">
        <div className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">Claims</div>
        <div className="grid grid-cols-2 gap-2">
          {claimsList.map((c) => {
            const winner = state.winners.find((w) => w.type === c.type);
            const isWon = Boolean(winner);
            const isWonByMe = winner?.winnerId === selfId;

            return (
              <button
                key={c.type}
                onClick={() => handleClaim(c.type)}
                disabled={isWon}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition border ${
                  isWonByMe
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                    : isWon
                    ? "bg-surface-1 border-surface-rim text-ink-mute line-through cursor-not-allowed"
                    : "bg-pink-600 hover:bg-pink-700 border-pink-400/40 text-white shadow active:scale-95 cursor-pointer"
                }`}
              >
                <span>{c.label}</span>
                {winner && (
                  <span className="text-[9px] font-normal truncate max-w-[60px] opacity-80">
                    {winner.winnerId === selfId ? "You!" : winner.winnerName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
