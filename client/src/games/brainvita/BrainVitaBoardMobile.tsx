import { useCallback, useState } from "react";
import { ArrowLeft, BookOpen, Lightbulb, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import GameTutorial from "../../components/GameTutorial";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { marbleCount } from "./brainvitaRules";
import { SKINS } from "./brainvitaSkins";
import { BrainVitaFitGrid } from "./BrainVitaGrid";
import { BrainVitaDock, BrainVitaPill, BrainVitaRoundButton, BrainVitaScene, BrainVitaStats, BrainVitaTitleSign } from "./BrainVitaChrome";
import BrainVitaResultModal, { formatClock } from "./BrainVitaResultModal";
import { BrainVitaSkinContext } from "./BrainVitaSkinContext";
import { BrainVitaThemeDialog } from "./BrainVitaThemeDialog";
import { BRAINVITA_TUTORIAL_KEY, useBrainVita } from "./useBrainVita";
import type { BrainVitaBoardProps } from "./BrainVitaBoard";

/** A phone held sideways has too little height for the board with chrome above and below it. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";

/**
 * The upright table: phones, and tablets held upright. The sign, the stats plank, the board and the
 * three-pill dock stand in one column, as in the design. A phone held sideways lays the board beside a
 * single column of stats and pills instead.
 */
export default function BrainVitaBoardMobile({ onExit }: BrainVitaBoardProps) {
  const game = useBrainVita();
  const isShortLandscape = useMediaQuery(SHORT_LANDSCAPE);
  const [isLookOpen, setIsLookOpen] = useState(false);
  const { state, tutorial } = game;
  const setTutorialOpen = tutorial.setOpen;
  const dismissUnlock = game.dismissUnlock;
  const openTutorial = useCallback(() => setTutorialOpen(true), [setTutorialOpen]);
  const closeTutorial = useCallback(() => setTutorialOpen(false), [setTutorialOpen]);
  const openLook = useCallback(() => {
    dismissUnlock();
    setIsLookOpen(true);
  }, [dismissUnlock]);
  const marbles = marbleCount(state.board);

  return (
    <BrainVitaSkinContext.Provider value={SKINS[game.skin]}>
      <div className="relative flex h-dvh-safe max-h-dvh-safe w-full flex-col overflow-hidden font-sans text-amber-50 short-land:grid short-land:grid-cols-[minmax(0,30%)_minmax(0,1fr)] short-land:grid-rows-[auto_1fr_auto]">
        <BrainVitaScene />
        <div role="status" aria-live="polite" className="sr-only">
          {game.finished ? `Game over. ${marbles} ${marbles === 1 ? "marble" : "marbles"} left.` : `${marbles} marbles left. ${state.moves.length} jumps.`}
          {game.hintNote ? ` ${game.hintNote}` : ""}
        </div>

        <header className="relative z-20 flex items-center justify-between gap-1 px-2 pb-1 pt-5 min-[360px]:gap-2 min-[360px]:px-3 short-land:col-start-1 short-land:row-start-1 short-land:justify-start short-land:px-2 short-land:pt-1">
          <BrainVitaRoundButton onClick={onExit} aria-label="Leave game">
            <ArrowLeft className="h-5 w-5" />
          </BrainVitaRoundButton>
          <BrainVitaTitleSign className="short-land:sr-only" />
          <div className="flex items-center gap-1 min-[360px]:gap-2">
            <BrainVitaRoundButton onClick={openTutorial} aria-label="How to play">
              <BookOpen className="h-5 w-5" />
            </BrainVitaRoundButton>
            <BrainVitaRoundButton onClick={game.toggleMute} aria-label={game.isMuted ? "Unmute sounds" : "Mute sounds"}>
              {game.isMuted ? <VolumeX className="h-5 w-5 text-rose-300" /> : <Volume2 className="h-5 w-5 text-emerald-300" />}
            </BrainVitaRoundButton>
          </div>
        </header>

        <section className="relative z-20 px-3 pt-2 short-land:col-start-1 short-land:row-start-2 short-land:self-start short-land:px-2 short-land:pt-1">
          <div className="mx-auto w-full max-w-[640px]">
            <BrainVitaStats marbles={marbles} jumps={state.moves.length} time={formatClock(game.seconds)} layout={isShortLandscape ? "list" : "bar"} isCompact={isShortLandscape} />
          </div>
        </section>

        <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[860px] flex-1 items-stretch justify-center px-0 py-2 min-[360px]:px-1 md:px-6 short-land:col-start-2 short-land:row-span-3 short-land:row-start-1 short-land:max-w-none short-land:px-1 short-land:py-1">
          <BrainVitaFitGrid
            board={state.board}
            selected={state.selected}
            targets={game.targets}
            hint={state.hint}
            disabled={game.finished}
            onTap={game.tap}
            hasProps={!isShortLandscape}
            flight={game.flight}
            burst={game.burst}
                        onOpenLook={openLook}
            hasLookBadge={game.justUnlocked.length > 0}
          />
        </main>

        <footer className="relative z-20 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 short-land:col-start-1 short-land:row-start-3 short-land:px-2 short-land:pb-1">
          {game.hintNote && (
            <p className="mx-auto mb-1.5 w-fit max-w-full rounded-full px-3 py-1 text-center text-xs font-semibold text-amber-100" style={{ background: SKINS[game.skin].plankBackground, border: SKINS[game.skin].plankBorder }}>
              {game.hintNote}
            </p>
          )}
          <BrainVitaDock isStacked={isShortLandscape} className="mx-auto max-w-[640px]">
            <BrainVitaPill label="Undo" ariaLabel="Undo the last jump" icon={<Undo2 className="h-6 w-6" />} onClick={game.undo} isDisabled={!game.canUndo} isInline={isShortLandscape} />
            <BrainVitaPill label="Hint" ariaLabel="Show a hint" icon={<Lightbulb className="h-6 w-6" />} onClick={game.requestHint} isDisabled={game.finished} isPrimary isInline={isShortLandscape} />
            <BrainVitaPill label="Restart" ariaLabel="Start a new game" icon={<RotateCcw className="h-6 w-6" />} onClick={game.restart} isInline={isShortLandscape} />
          </BrainVitaDock>
        </footer>

        {tutorial.open && <GameTutorial storageKey={BRAINVITA_TUTORIAL_KEY} onClose={closeTutorial} />}

        <BrainVitaThemeDialog
          open={isLookOpen}
          onClose={() => setIsLookOpen(false)}
          skin={game.skin}
          unlocked={game.unlockedSkins}
          onSelectSkin={game.selectSkin}
          order={game.themeOrder}
        />

        <BrainVitaResultModal
          open={game.resultOpen}
          result={game.result}
          seconds={game.seconds}
          newPersonalBest={game.newPersonalBest}
          unlockedSkinNames={game.justUnlocked.map((id) => SKINS[id].name)}
          onTryTheme={() => {
            // The last one earned is the hardest won, so that is the one to show off.
            const newest = game.justUnlocked[game.justUnlocked.length - 1];
            if (newest) game.selectSkin(newest);
            game.dismissUnlock();
            game.closeResult();
          }}
          onPlayAgain={game.restart}
          onReview={game.closeResult}
          onLeave={onExit}
        />
      </div>
    </BrainVitaSkinContext.Provider>
  );
}
