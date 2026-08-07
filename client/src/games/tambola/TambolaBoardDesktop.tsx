import type { TambolaClaimType, TambolaPlayerState } from "@shared/types";
import { motion } from "framer-motion";
import type { TambolaBoardProps } from "./TambolaBoardMobile";

export default function TambolaBoardDesktop({ state, selfId, onMove }: TambolaBoardProps) {
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
    <div className="min-h-[calc(100vh-6rem)] max-w-6xl mx-auto p-6 text-ink-hi font-sans grid grid-cols-12 gap-6">
      {/* Left Column (Interactive Ticket & Claim Panel) */}
      <div className="col-span-7 space-y-6 flex flex-col justify-between">
        {/* Banner */}
        <div className="bg-surface-0 border border-pink-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
              Tambola / Housie Lounge
            </div>
            <h1 className="text-2xl font-display text-ink-hi mt-1">Your Ticket</h1>
            <p className="text-xs text-ink-mid mt-1">
              Mark called numbers and claim prizes as soon as you meet the row/ticket condition!
            </p>
          </div>

          <motion.div
            key={state.currentCall}
            initial={{ scale: 0.2, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 flex items-center justify-center text-5xl font-display text-white shadow-2xl border-2 border-white/50 animate-glow-pulse"
          >
            {state.currentCall || "—"}
          </motion.div>
        </div>

        {/* 3x9 Ticket Grid */}
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-3 flex-1 flex flex-col justify-center">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            Player Ticket
          </div>
          <div className="grid grid-rows-3 gap-3 bg-surface-1/80 p-4 rounded-xl border border-surface-rim">
            {state.myTicket.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-9 gap-2">
                {row.map((val, cIdx) => {
                  const isMarked = state.myMarkedCells[rIdx][cIdx];
                  const isCalled = val > 0 && state.calledNumbers.includes(val);
                  const isCurrent = val > 0 && state.currentCall === val;

                  if (val === 0) {
                    return <div key={cIdx} className="bg-surface-0/50 rounded-xl h-12" />;
                  }

                  return (
                    <button
                      key={cIdx}
                      onClick={() => handleMark(rIdx, cIdx)}
                      disabled={!isCalled}
                      className={`h-12 rounded-xl font-bold text-sm flex items-center justify-center transition border active:scale-95 ${
                        isMarked
                          ? "bg-emerald-500 border-emerald-300 text-black shadow-lg"
                          : isCurrent
                          ? "bg-pink-500 border-white text-white animate-pulse"
                          : isCalled
                          ? "bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/40 text-pink-700 dark:text-pink-200 cursor-pointer"
                          : "bg-surface-0 border-surface-rim text-ink-mute opacity-60"
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
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-3">
          <div className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
            Available Prize Claims
          </div>
          <div className="grid grid-cols-5 gap-3">
            {claimsList.map((c) => {
              const winner = state.winners.find((w) => w.type === c.type);
              const isWon = Boolean(winner);
              const isWonByMe = winner?.winnerId === selfId;

              return (
                <button
                  key={c.type}
                  onClick={() => handleClaim(c.type)}
                  disabled={isWon}
                  className={`py-3 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition border ${
                    isWonByMe
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : isWon
                      ? "bg-surface-1 border-surface-rim text-ink-mute line-through cursor-not-allowed"
                      : "bg-pink-600 hover:bg-pink-700 border-pink-400/40 text-white shadow-lg active:scale-95 cursor-pointer"
                  }`}
                >
                  <span>{c.label}</span>
                  {winner && (
                    <span className="text-[10px] font-normal truncate max-w-full opacity-80">
                      {winner.winnerId === selfId ? "You" : winner.winnerName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column (Master Board 1-90 & Claim Log) */}
      <div className="col-span-5 flex flex-col space-y-6">
        {/* Master Board 1-90 Grid */}
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-3 flex-1">
          <div className="flex justify-between items-center text-xs text-ink-mid mb-2">
            <span className="font-bold text-ink-hi uppercase tracking-wider">Master Board</span>
            <span>Called: {state.calledNumbers.length} / 90</span>
          </div>

          <div className="grid grid-cols-10 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
              const isCalled = state.calledNumbers.includes(n);
              const isCurrent = state.currentCall === n;

              return (
                <div
                  key={n}
                  className={`h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition ${
                    isCurrent
                      ? "bg-pink-500 border-white text-white animate-pulse"
                      : isCalled
                      ? "bg-pink-500/20 border-pink-400/40 text-pink-700 dark:text-pink-300"
                      : "bg-surface-1 border-surface-rim text-ink-mute opacity-40"
                  }`}
                >
                  {n}
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim Winners Feed */}
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-5 shadow-xl space-y-3">
          <div className="text-xs font-bold text-ink-hi uppercase tracking-wider">
            Recent Claim Log
          </div>
          {state.winners.length === 0 ? (
            <div className="text-xs text-ink-mute italic">No claims won yet. Keep marking!</div>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {state.winners.map((w) => (
                <div
                  key={w.type}
                  className="p-2.5 bg-surface-1 border border-pink-500/20 rounded-xl text-xs flex justify-between items-center"
                >
                  <span className="font-bold text-pink-600 dark:text-pink-300 uppercase">{w.type}</span>
                  <span className="text-ink-hi">
                    Won by <strong className="text-amber-600 dark:text-amber-300">{w.winnerName}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
