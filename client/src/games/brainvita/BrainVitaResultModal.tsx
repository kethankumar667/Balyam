import { useRef } from "react";
import { Trophy } from "lucide-react";
import Modal from "../../components/Modal";
import type { GameResult } from "./brainvitaGame";

/** Seconds as m:ss, e.g. 75 becomes "1:15". */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export interface BrainVitaResultModalProps {
  open: boolean;
  result: GameResult | null;
  seconds: number;
  /** True only when the scorecard confirmed it. */
  newPersonalBest: boolean;
  /** The names of the worlds this game just earned, if any. */
  unlockedSkinNames?: readonly string[];
  /** Switches to the newest world earned and closes this dialog. */
  onTryTheme?: () => void;
  onPlayAgain: () => void;
  /** Close the dialog and look at the final board. */
  onReview: () => void;
  onLeave: () => void;
}

const BUTTON =
  "min-h-[48px] flex-1 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

export default function BrainVitaResultModal({ open, result, seconds, newPersonalBest, unlockedSkinNames = [], onTryTheme, onPlayAgain, onReview, onLeave }: BrainVitaResultModalProps) {
  const playAgainRef = useRef<HTMLButtonElement>(null);
  if (!result) return null;

  const marbleWord = result.marblesLeft === 1 ? "marble" : "marbles";
  const headline = result.rating.isPerfect ? "Perfect game" : result.rating.title;
  const detail = result.rating.isPerfect
    ? "One marble left, in the centre."
    : result.marblesLeft === 1
      ? "One marble left."
      : `${result.marblesLeft} ${marbleWord} left.`;

  return (
    <Modal
      open={open}
      onClose={onReview}
      initialFocusRef={playAgainRef}
      ariaLabelledBy="brainvita-result-title"
      panelClassName="w-full max-w-sm rounded-3xl border border-[#E4B128]/45 bg-gradient-to-b from-[#5c3517] to-[#2a160a] p-6 text-amber-50 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Trophy className="h-9 w-9 text-amber-300" aria-hidden />
        <h2 id="brainvita-result-title" className="font-display text-3xl font-black tracking-wide text-[#F6D57A]">
          {headline}
        </h2>
        <p className="text-base text-amber-100/90">{detail}</p>
        <dl className="grid w-full grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-[#E4B128]/25 bg-black/25 px-2 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-amber-100/70">Left</dt>
            <dd className="text-xl font-bold tabular-nums">{result.marblesLeft}</dd>
          </div>
          <div className="rounded-xl border border-[#E4B128]/25 bg-black/25 px-2 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-amber-100/70">Jumps</dt>
            <dd className="text-xl font-bold tabular-nums">{result.moves}</dd>
          </div>
          <div className="rounded-xl border border-[#E4B128]/25 bg-black/25 px-2 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-amber-100/70">Time</dt>
            <dd className="text-xl font-bold tabular-nums">{formatClock(seconds)}</dd>
          </div>
        </dl>
        {newPersonalBest && <p className="rounded-full bg-amber-300/20 px-3 py-1 text-sm font-semibold text-amber-200">New personal best</p>}
        {unlockedSkinNames.length > 0 && (
          <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E4B128]/40 bg-black/25 px-3 py-2 text-left">
            <p className="text-sm font-semibold text-amber-50">{unlockedSkinNames.length === 1 ? "New world unlocked" : "New worlds unlocked"}: {unlockedSkinNames.join(", ")}</p>
            {onTryTheme && (
              <button type="button" onClick={onTryTheme} className="min-h-[44px] flex-shrink-0 cursor-pointer rounded-lg px-3 text-sm font-bold text-[#E4B128] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E4B128]">
                Try it
              </button>
            )}
          </div>
        )}
        {result.usedHelp && (
          <p className="text-sm text-amber-100/80">You used a hint or undo, so this game is for practice and is not posted to the leaderboard.</p>
        )}
        <div className="mt-2 flex w-full gap-2">
          <button type="button" ref={playAgainRef} onClick={onPlayAgain} className={`${BUTTON} bg-[#E4B128] text-[#2b1606] hover:bg-[#f0c243]`}>
            Play again
          </button>
          <button type="button" onClick={onReview} className={`${BUTTON} border border-[#E4B128]/40 bg-black/25 hover:bg-black/35`}>
            See board
          </button>
        </div>
        <button type="button" onClick={onLeave} className="min-h-[44px] w-full cursor-pointer rounded-xl text-sm text-amber-100/80 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E4B128]">
          Leave
        </button>
      </div>
    </Modal>
  );
}
