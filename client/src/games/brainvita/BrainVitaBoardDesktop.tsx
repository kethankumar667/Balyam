import { useCallback } from "react";
import { ArrowLeft, BookOpen, Lightbulb, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import GameTutorial from "../../components/GameTutorial";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { cellOf, marbleCount, type Move } from "./brainvitaRules";
import { BrainVitaFitGrid } from "./BrainVitaGrid";
import { BrainVitaDock, BrainVitaPill, BrainVitaScene, BrainVitaStats, BrainVitaTitleSign } from "./BrainVitaChrome";
import BrainVitaResultModal, { formatClock } from "./BrainVitaResultModal";
import { BRAINVITA_TUTORIAL_KEY, useBrainVita } from "./useBrainVita";
import type { BrainVitaBoardProps } from "./BrainVitaBoard";

/** A phone held sideways is wide enough for this layout but far too short for a header bar above the board. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";

/** Most recent jumps shown in the log. */
const LOG_LENGTH = 8;

const HEADER_BUTTON =
  "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#E4B128]/40 bg-[#2a160a]/85 px-4 py-2 text-sm font-semibold text-amber-50 shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#3b2210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";
const ROUND_BUTTON = `${HEADER_BUTTON} !px-0 h-11 w-11`;

const describeJump = ({ from, to }: Move): string => {
  const a = cellOf(from);
  const b = cellOf(to);
  return `Row ${a.row + 1}, column ${a.col + 1} to row ${b.row + 1}, column ${b.col + 1}`;
};

/**
 * The wide table: landscape tablets and desktops. The board stands large on the walnut, with the stats,
 * the three pills and the jump log in a panel beside it. On a short screen the header goes and its
 * buttons move into that panel.
 */
export default function BrainVitaBoardDesktop({ onExit }: BrainVitaBoardProps) {
  const game = useBrainVita();
  const isShort = useMediaQuery(SHORT_LANDSCAPE);
  const { state, tutorial } = game;
  const setTutorialOpen = tutorial.setOpen;
  const openTutorial = useCallback(() => setTutorialOpen(true), [setTutorialOpen]);
  const closeTutorial = useCallback(() => setTutorialOpen(false), [setTutorialOpen]);
  const marbles = marbleCount(state.board);
  const recent = state.moves.slice(-LOG_LENGTH).map((move, index, list) => ({ move, number: state.moves.length - list.length + index + 1 }));

  const muteButton = (
    <button type="button" onClick={game.toggleMute} className={isShort ? ROUND_BUTTON : HEADER_BUTTON} aria-label={game.isMuted ? "Unmute sounds" : "Mute sounds"}>
      {game.isMuted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
      {!isShort && <span>Sound</span>}
    </button>
  );
  const guideButton = (
    <button type="button" onClick={openTutorial} className={isShort ? ROUND_BUTTON : HEADER_BUTTON} aria-label="How to play">
      <BookOpen className="h-4 w-4" />
      {!isShort && <span>Guide</span>}
    </button>
  );

  return (
    <div className="relative flex h-dvh-safe max-h-dvh-safe w-full flex-col overflow-hidden font-sans text-amber-50">
      <BrainVitaScene />
      <div role="status" aria-live="polite" className="sr-only">
        {game.finished ? `Game over. ${marbles} ${marbles === 1 ? "marble" : "marbles"} left.` : `${marbles} marbles left. ${state.moves.length} jumps.`}
        {game.hintNote ? ` ${game.hintNote}` : ""}
      </div>

      {isShort ? (
        <h1 className="sr-only">Brain Vita</h1>
      ) : (
        <header className="relative z-20 grid h-[88px] flex-shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 pt-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onExit} className={HEADER_BUTTON} aria-label="Leave game">
              <ArrowLeft className="h-4 w-4" />
              <span>Exit</span>
            </button>
          </div>
          <BrainVitaTitleSign />
          <div className="flex items-center justify-end gap-2">
            {guideButton}
            {muteButton}
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch justify-center p-6 short-land:p-2">
          <div className="flex min-h-0 w-full max-w-[860px] items-stretch justify-center">
            <BrainVitaFitGrid
              board={state.board}
              selected={state.selected}
              targets={game.targets}
              hint={state.hint}
              disabled={game.finished}
              onTap={game.tap}
              hasProps={!isShort}
            />
          </div>
        </main>

        <aside className="relative z-20 flex w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto border-l border-[#E4B128]/20 bg-[#1b0e05]/60 p-4 backdrop-blur-md lg:w-96 lg:p-5">
          {isShort && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={onExit} className={ROUND_BUTTON} aria-label="Leave game">
                <ArrowLeft className="h-4 w-4" />
              </button>
              {guideButton}
              {muteButton}
            </div>
          )}
          <BrainVitaStats marbles={marbles} jumps={state.moves.length} time={formatClock(game.seconds)} layout="list" isCompact={isShort} />

          <BrainVitaDock isStacked={isShort}>
            <BrainVitaPill label="Undo" ariaLabel="Undo the last jump" icon={<Undo2 className="h-6 w-6" />} onClick={game.undo} isDisabled={!game.canUndo} isInline={isShort} />
            <BrainVitaPill label="Hint" ariaLabel="Show a hint" icon={<Lightbulb className="h-6 w-6" />} onClick={game.requestHint} isDisabled={game.finished} isPrimary isInline={isShort} />
            <BrainVitaPill label="Restart" ariaLabel="Start a new game" icon={<RotateCcw className="h-6 w-6" />} onClick={game.restart} isInline={isShort} />
          </BrainVitaDock>
          {game.hintNote && <p className="text-sm font-medium text-amber-200">{game.hintNote}</p>}

          <div className="space-y-2 text-sm leading-relaxed text-amber-100/85">
            <p>Pick a marble, then the empty hole two steps away in a straight line. It jumps over the marble between and takes it off. Use the arrow keys and Enter to play without a mouse.</p>
            <p className="text-amber-100/70">Hints and undo are for practice: a game that uses them is not posted to the leaderboard.</p>
          </div>

          <div className="min-h-0">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-100/75">Recent jumps</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-amber-100/70">No jumps yet.</p>
            ) : (
              <ol className="space-y-1 text-sm text-amber-50/90">
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
