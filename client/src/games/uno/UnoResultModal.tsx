import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Player, UnoPlayerState } from "@shared/types";
import RematchPanel from "../../components/RematchPanel";
import { fireUnoWinConfetti } from "./uno-confetti";
import { useAnimationConfig } from "../../animations/helpers/useAnimationConfig";
import { WinnerCelebration } from "../../animations/card/WinnerCelebration";

export interface UnoResultModalProps {
  state: UnoPlayerState;
  players: Player[];
  selfId: string | null;
  onClose: () => void;
  onLeave?: () => void;
}

/**
 * UNO's own end-of-round result screen — replaces the generic 90-second
 * scorecard fallback (Room.tsx's `GAMES_WITH_OWN_SCORECARD`), following the
 * exact precedent `RummyResultModal`/RPS/Hand Cricket already set: the
 * board shell renders this when `state.phase === "finished"` and calls
 * `onScorecardClose` when dismissed so Room.tsx's generic post-match flow
 * (GameOverScreen) still runs afterward.
 *
 * Scores are real as of Phase 3's `awardRoundPoints` — this is the first
 * surface that actually shows them off; before this modal existed, UNO's
 * only in-board result surface was the small inline `GameOverPanel` banner.
 */
export default function UnoResultModal({ state, players, selfId, onClose, onLeave }: UnoResultModalProps) {
  const winnerId = state.winnerId;
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const isSelfWinner = winnerId != null && winnerId === selfId;
  const animConfig = useAnimationConfig();

  // Only the winner gets the burst — same "no negative FX for everyone
  // else" precedent useUnoBoard.ts already sets for the win sound.
  useEffect(() => {
    if (isSelfWinner) fireUnoWinConfetti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranked = [...state.playerOrder].sort(
    (a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Match results"
    >
      {isSelfWinner && <WinnerCelebration config={animConfig} />}
      <motion.div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#FFF9F0", border: "2px solid #6D4323" }}
        initial={animConfig.reducedMotion ? false : { scale: 0.85, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
      >
        <div
          className="px-5 py-5 text-center space-y-1"
          style={{ background: "linear-gradient(135deg, #F7DA8B, #E6A11E)" }}
        >
          <div className="text-4xl" aria-hidden>
            {isSelfWinner ? "🎉" : "🏆"}
          </div>
          <div className="text-xl font-black text-[#2B2118]">
            {isSelfWinner ? "You win!" : winnerId ? `${nameOf(winnerId)} wins!` : "Round over"}
          </div>
          {winnerId && (
            <div className="text-sm font-semibold text-[#5C4A38]">
              {state.targetScore != null
                ? `${state.scores[winnerId] ?? 0} pts across ${state.round} round${state.round === 1 ? "" : "s"}`
                : `+${state.scores[winnerId] ?? 0} points`}
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-2 max-h-[40vh] overflow-y-auto">
          <h3 className="text-xs font-bold uppercase text-[#6E5E4D] tracking-wide">Scores</h3>
          {ranked.map((id) => {
            const isWinnerRow = id === winnerId;
            return (
              <div
                key={id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold ${
                  isWinnerRow ? "bg-[#E6A11E]/25" : "bg-[#F0E1D0]"
                }`}
              >
                <span className="text-[#2B2118] truncate pr-2">
                  {nameOf(id)}
                  {id === selfId && " (you)"}
                  {isWinnerRow && " 👑"}
                </span>
                <span className="text-[#6E5E4D] flex-shrink-0">{state.scores[id] ?? 0}</span>
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-5 space-y-3">
          <RematchPanel players={players} selfId={selfId} />
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg py-2.5 font-bold text-[#2B2118]"
              style={{ background: "#F0E1D0", border: "1px solid #E8D8BE" }}
            >
              Continue
            </button>
            {onLeave && (
              <button
                onClick={onLeave}
                className="flex-1 rounded-lg py-2.5 font-bold text-white"
                style={{ background: "#6D4323" }}
              >
                Leave
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
