import { useCallback } from "react";
import { ArrowLeft, BookOpen, Lightbulb, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import GameTutorial from "../../components/GameTutorial";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { cellOf, marbleCount, type Move } from "./brainvitaRules";
import { BrainVitaFitGrid } from "./BrainVitaGrid";
import BrainVitaResultModal, { formatClock } from "./BrainVitaResultModal";
import { BRAINVITA_TUTORIAL_KEY, useBrainVita } from "./useBrainVita";
import type { BrainVitaBoardProps } from "./BrainVitaBoard";

const ROOM_BACKGROUND = "radial-gradient(ellipse at 50% -10%, #4a2c15 0%, #24130a 52%, #140a05 100%)";

/** A phone held sideways is wide enough for this layout but far too short for a header bar above the board. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";

/** Most recent jumps shown in the log. */
const LOG_LENGTH = 8;

const BUTTON =
  "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-amber-50/90 transition-colors hover:bg-white/10 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

const describeJump = ({ from, to }: Move): string => {
  const a = cellOf(from);
  const b = cellOf(to);
  return `Row ${a.row + 1}, column ${a.col + 1} to row ${b.row + 1}, column ${b.col + 1}`;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1 rounded-xl bg-black/30 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-amber-100/70">{label}</div>
      <div className="text-xl font-bold tabular-nums text-amber-50">{value}</div>
    </div>
  );
}

export default function BrainVitaBoardDesktop({ onExit }: BrainVitaBoardProps) {
  const game = useBrainVita();
  const isShort = useMediaQuery(SHORT_LANDSCAPE);
  const { state, tutorial } = game;
  const setTutorialOpen = tutorial.setOpen;
  const closeTutorial = useCallback(() => setTutorialOpen(false), [setTutorialOpen]);
  const marbles = marbleCount(state.board);
  const recent = state.moves.slice(-LOG_LENGTH).map((move, index, list) => ({ move, number: state.moves.length - list.length + index + 1 }));

  const toolbar = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onExit} className={BUTTON} aria-label="Leave game">
        <ArrowLeft className="h-4 w-4" />
        <span>Exit</span>
      </button>
      <button type="button" onClick={() => setTutorialOpen(true)} className={BUTTON} aria-label="How to play">
        <BookOpen className="h-4 w-4" />
        <span>Guide</span>
      </button>
      <button type="button" onClick={game.toggleMute} className={BUTTON} aria-label={game.isMuted ? "Unmute sounds" : "Mute sounds"}>
        {game.isMuted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
      </button>
    </div>
  );

  return (
    <div className="relative flex h-dvh-safe max-h-dvh-safe w-full flex-col overflow-hidden font-sans text-amber-50" style={{ background: ROOM_BACKGROUND }}>
      <div role="status" aria-live="polite" className="sr-only">
        {game.finished ? `Game over. ${marbles} ${marbles === 1 ? "marble" : "marbles"} left.` : `${marbles} marbles left. ${state.moves.length} jumps.`}
        {game.hintNote ? ` ${game.hintNote}` : ""}
      </div>

      {!isShort && (
        <header className="z-20 flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-5 backdrop-blur-xl">
          <div>
            <h1 className="text-sm font-bold uppercase leading-tight tracking-wider">Brain Vita</h1>
            <span className="text-[11px] text-amber-100/70">Marble solitaire · one player</span>
          </div>
          {toolbar}
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="z-10 flex min-h-0 min-w-0 flex-1 items-stretch justify-center p-5 short-land:p-2">
          <div className="flex min-h-0 w-full max-w-[860px] items-stretch justify-center">
            <BrainVitaFitGrid
              board={state.board}
              selected={state.selected}
              targets={game.targets}
              hint={state.hint}
              disabled={game.finished}
              onTap={game.tap}
            />
          </div>
        </main>

        <aside className="z-20 flex w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-black/40 p-4 backdrop-blur-xl lg:w-80">
          {isShort && toolbar}
          <div className="flex gap-2">
            <Stat label="Marbles" value={marbles} />
            <Stat label="Jumps" value={state.moves.length} />
            <Stat label="Time" value={formatClock(game.seconds)} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={game.undo} aria-disabled={!game.canUndo} className={`${BUTTON} flex-1`} aria-label="Undo the last jump">
              <Undo2 className="h-4 w-4" />
              <span>Undo</span>
            </button>
            <button type="button" onClick={game.requestHint} aria-disabled={game.finished} className={`${BUTTON} flex-1`} aria-label="Show a hint">
              <Lightbulb className="h-4 w-4" />
              <span>Hint</span>
            </button>
            <button type="button" onClick={game.restart} className={`${BUTTON} flex-1`} aria-label="Start a new game">
              <RotateCcw className="h-4 w-4" />
              <span>New</span>
            </button>
          </div>
          {game.hintNote && <p className="text-xs text-amber-200">{game.hintNote}</p>}
          <p className="text-xs leading-relaxed text-amber-100/80">
            Pick a marble, then the empty hole two steps away in a straight line. It jumps over the marble between and takes it off. Use the arrow keys and Enter to play without a mouse.
          </p>
          <p className="text-xs leading-relaxed text-amber-100/70">Hints and undo are for practice: a game that uses them is not posted to the leaderboard.</p>

          <div className="min-h-0">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-100/70">Recent jumps</h2>
            {recent.length === 0 ? (
              <p className="text-xs text-amber-100/70">No jumps yet.</p>
            ) : (
              <ol className="space-y-1 text-xs text-amber-50/90">
                {recent.map(({ move, number }) => (
                  <li key={number} className="tabular-nums">
                    {number}. {describeJump(move)}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {tutorial.open && <GameTutorial storageKey={BRAINVITA_TUTORIAL_KEY} onClose={closeTutorial} />}

      <BrainVitaResultModal
        open={game.resultOpen}
        result={game.result}
        seconds={game.seconds}
        newPersonalBest={game.newPersonalBest}
        onPlayAgain={game.restart}
        onReview={game.closeResult}
        onLeave={onExit}
      />
    </div>
  );
}
