import { useBingoBoard } from "./useBingoBoard";
import type { BingoBoardProps } from "./useBingoBoard";
import {
  BingoGrid,
  CallerBall,
  CalledHistoryStrip,
  ClaimButton,
  PlayerProgressList,
  BingoResultOverlay,
} from "./bingo-shared";

/**
 * Bingo — DESKTOP shell (>=1280px, mouse/keyboard). A real three-column
 * layout instead of the mobile shell stretched: caller + full call history
 * as a persistent left rail, the player's own board front-and-center at a
 * larger cell size with an inline (non-sticky) Claim button, and the full
 * roster's live progress on the right — desktop has the width to show
 * every opponent's mark count at once, not just a compact list.
 *
 * Pure layout over the frozen useBingoBoard model, same as the mobile
 * shell — only the arrangement differs.
 */
export default function BingoBoardDesktop(props: BingoBoardProps) {
  const m = useBingoBoard(props);
  const { state, seats, selfId, players, nameOf, isOver, canAttemptClaim, claim, onLeave, onScorecardClose } = m;

  return (
    <div className="grid grid-cols-[220px_1fr_260px] gap-6 items-start px-4 py-2">
      {/* Left rail — caller + history */}
      <div className="flex flex-col items-center gap-4 sticky top-4">
        <CallerBall
          current={state.currentCall}
          secondsLeft={isOver ? null : m.secondsUntilNextCall}
        />
        <div className="w-full text-center text-[11px] font-semibold text-bhalyam-wood-dark/60">
          Round {state.roundNumber} · {state.calledNumbers.length} called
        </div>
        <div className="w-full max-h-[50vh] rounded-xl bg-white/40 p-2">
          <CalledHistoryStrip calledNumbers={state.calledNumbers} orientation="col" max={40} />
        </div>
      </div>

      {/* Center — own board + claim */}
      <div className="flex flex-col items-center gap-5 pt-2">
        <BingoGrid board={state.myBoard} size="lg" />
        <ClaimButton onClaim={claim} disabled={!canAttemptClaim} className="text-lg px-10 py-3.5" />
      </div>

      {/* Right rail — full roster progress */}
      <div className="flex flex-col gap-2 sticky top-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-bhalyam-wood-dark/60 px-1">
          Players
        </h3>
        <PlayerProgressList seats={seats} />
      </div>

      {isOver && (
        <BingoResultOverlay
          winners={state.winners}
          stopOnFirstWin={state.stopOnFirstWin}
          nameOf={nameOf}
          selfId={selfId}
          players={players}
          calledCount={state.calledNumbers.length}
          onLeave={onLeave}
          onContinue={onScorecardClose}
        />
      )}
    </div>
  );
}
