import { useCallback } from "react";
import { ArrowLeft, BookOpen, Lightbulb, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import GameTutorial from "../../components/GameTutorial";
import { marbleCount } from "./brainvitaRules";
import { BrainVitaFitGrid } from "./BrainVitaGrid";
import BrainVitaResultModal, { formatClock } from "./BrainVitaResultModal";
import { BRAINVITA_TUTORIAL_KEY, useBrainVita } from "./useBrainVita";
import type { BrainVitaBoardProps } from "./BrainVitaBoard";

const ROOM_BACKGROUND = "radial-gradient(ellipse at 50% -10%, #4a2c15 0%, #24130a 52%, #140a05 100%)";

const ICON_BUTTON =
  "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-amber-50/90 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

const ACTION_BUTTON =
  "flex min-h-[48px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-amber-50 transition-colors hover:bg-white/10 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl bg-black/30 px-3 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-amber-100/70">{label}</div>
      <div className="text-lg font-bold leading-tight tabular-nums text-amber-50">{value}</div>
    </div>
  );
}

export default function BrainVitaBoardMobile({ onExit }: BrainVitaBoardProps) {
  const game = useBrainVita();
  const { state, tutorial } = game;
  const setTutorialOpen = tutorial.setOpen;
  const closeTutorial = useCallback(() => setTutorialOpen(false), [setTutorialOpen]);
  const marbles = marbleCount(state.board);

  return (
    <div
      className="relative flex h-dvh-safe max-h-dvh-safe w-full flex-col overflow-hidden font-sans text-amber-50 short-land:grid short-land:grid-cols-[minmax(0,34%)_minmax(0,1fr)] short-land:grid-rows-[auto_auto_1fr_auto]"
      style={{ background: ROOM_BACKGROUND }}
    >
      <div role="status" aria-live="polite" className="sr-only">
        {game.finished ? `Game over. ${marbles} ${marbles === 1 ? "marble" : "marbles"} left.` : `${marbles} marbles left. ${state.moves.length} jumps.`}
        {game.hintNote ? ` ${game.hintNote}` : ""}
      </div>

      <header className="z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2 backdrop-blur-xl [@media(max-height:640px)]:py-1 short-land:col-start-1 short-land:row-start-1">
        <button type="button" onClick={onExit} className={ICON_BUTTON} aria-label="Leave game">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 truncate text-sm font-bold uppercase tracking-wider">Brain Vita</h1>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setTutorialOpen(true)} className={ICON_BUTTON} aria-label="How to play">
            <BookOpen className="h-4 w-4" />
          </button>
          <button type="button" onClick={game.toggleMute} className={ICON_BUTTON} aria-label={game.isMuted ? "Unmute sounds" : "Mute sounds"}>
            {game.isMuted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
          </button>
        </div>
      </header>

      <section className="z-10 flex gap-2 px-3 py-2 [@media(max-height:640px)]:py-1 short-land:col-start-1 short-land:row-start-2">
        <Stat label="Marbles" value={marbles} />
        <Stat label="Jumps" value={state.moves.length} />
        <Stat label="Time" value={formatClock(game.seconds)} />
      </section>

      <main className="z-10 flex min-h-0 flex-1 items-stretch justify-center px-2 py-1 short-land:col-start-2 short-land:row-span-4 short-land:row-start-1">
        <BrainVitaFitGrid
          board={state.board}
          selected={state.selected}
          targets={game.targets}
          hint={state.hint}
          disabled={game.finished}
          onTap={game.tap}
        />
      </main>

      <footer className="z-20 border-t border-white/10 bg-black/55 px-3 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-xl short-land:col-start-1 short-land:row-start-4">
        {game.hintNote && <p className="mb-1.5 text-center text-xs text-amber-200">{game.hintNote}</p>}
        <div className="mx-auto flex max-w-[480px] gap-2">
          <button type="button" onClick={game.undo} aria-disabled={!game.canUndo} className={ACTION_BUTTON} aria-label="Undo the last jump">
            <Undo2 className="h-4 w-4" />
            <span>Undo</span>
          </button>
          <button type="button" onClick={game.requestHint} aria-disabled={game.finished} className={ACTION_BUTTON} aria-label="Show a hint">
            <Lightbulb className="h-4 w-4" />
            <span>Hint</span>
          </button>
          <button type="button" onClick={game.restart} className={ACTION_BUTTON} aria-label="Start a new game">
            <RotateCcw className="h-4 w-4" />
            <span>Restart</span>
          </button>
        </div>
      </footer>

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
