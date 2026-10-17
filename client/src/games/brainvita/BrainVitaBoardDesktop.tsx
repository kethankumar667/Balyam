import { useCallback, useState } from "react";
import { ArrowLeft, BookOpen, Lightbulb, Palette, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import GameTutorial from "../../components/GameTutorial";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { cellOf, marbleCount, type Move } from "./brainvitaRules";
import { SKINS } from "./brainvitaSkins";
import { BrainVitaFitGrid } from "./BrainVitaGrid";
import { BrainVitaDock, BrainVitaHeaderButton, BrainVitaPill, BrainVitaRoundButton, BrainVitaScene, BrainVitaStats, BrainVitaTitleSign } from "./BrainVitaChrome";
import BrainVitaResultModal, { formatClock } from "./BrainVitaResultModal";
import { BrainVitaSkinContext } from "./BrainVitaSkinContext";
import { BrainVitaThemeDialog } from "./BrainVitaThemeDialog";
import { BRAINVITA_TUTORIAL_KEY, useBrainVita } from "./useBrainVita";
import type { BrainVitaBoardProps } from "./BrainVitaBoard";

/** A phone held sideways is wide enough for this layout but far too short for a header bar above the board. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";

/** Most recent jumps shown in the log. */
const LOG_LENGTH = 8;

const describeJump = ({ from, to }: Move): string => {
  const a = cellOf(from);
  const b = cellOf(to);
  return `Row ${a.row + 1}, column ${a.col + 1} to row ${b.row + 1}, column ${b.col + 1}`;
};

/**
 * The wide table: landscape tablets and desktops. The board stands large on the table, with the stats,
 * the three pills and the jump log in a panel beside it. On a short screen the header goes and its
 * buttons move into that panel.
 */
export default function BrainVitaBoardDesktop({ onExit }: BrainVitaBoardProps) {
  const game = useBrainVita();
  const isShort = useMediaQuery(SHORT_LANDSCAPE);
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
  const skin = SKINS[game.skin];
  const recent = state.moves.slice(-LOG_LENGTH).map((move, index, list) => ({ move, number: state.moves.length - list.length + index + 1 }));

  const muteIcon = game.isMuted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />;
  const muteLabel = game.isMuted ? "Unmute sounds" : "Mute sounds";
  const guideButton = isShort ? (
    <BrainVitaRoundButton onClick={openTutorial} aria-label="How to play">
      <BookOpen className="h-4 w-4" />
    </BrainVitaRoundButton>
  ) : (
    <BrainVitaHeaderButton onClick={openTutorial} aria-label="How to play">
      <BookOpen className="h-4 w-4" />
      <span>Guide</span>
    </BrainVitaHeaderButton>
  );
  const muteButton = isShort ? (
    <BrainVitaRoundButton onClick={game.toggleMute} aria-label={muteLabel}>
      {muteIcon}
    </BrainVitaRoundButton>
  ) : (
    <BrainVitaHeaderButton onClick={game.toggleMute} aria-label={muteLabel}>
      {muteIcon}
      <span>Sound</span>
    </BrainVitaHeaderButton>
  );

  return (
    <BrainVitaSkinContext.Provider value={skin}>
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
              <BrainVitaHeaderButton onClick={onExit} aria-label="Leave game">
                <ArrowLeft className="h-4 w-4" />
                <span>Exit</span>
              </BrainVitaHeaderButton>
            </div>
            <BrainVitaTitleSign />
            <div className="flex items-center justify-end gap-2">
              {guideButton}
              {muteButton}
              <BrainVitaHeaderButton onClick={openLook} aria-label={game.justUnlocked ? "Change board theme, a new theme is ready" : "Change board theme"}>
                <Palette className="h-4 w-4" style={{ color: skin.accentSoft }} />
                <span>Theme</span>
                {game.justUnlocked && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: skin.accentAlt }} />}
              </BrainVitaHeaderButton>
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
                flight={game.flight}
                burst={game.burst}
                isTiltOn={game.isTiltOn}
                onOpenLook={isShort ? openLook : undefined}
                hasLookBadge={game.justUnlocked !== null}
              />
            </div>
          </main>

          <aside
            className="relative z-20 flex w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto p-4 backdrop-blur-md lg:w-96 lg:p-5"
            style={{ background: skin.panelBackground, borderLeft: skin.panelBorder }}
          >
            {isShort && (
              <div className="flex items-center gap-2">
                <BrainVitaRoundButton onClick={onExit} aria-label="Leave game">
                  <ArrowLeft className="h-4 w-4" />
                </BrainVitaRoundButton>
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
              <p>Pick a marble, then the empty hole two steps away in a straight line. It jumps over the marble between and takes it off. Drag a marble to a glowing hole, or use the arrow keys and Enter to play without a mouse.</p>
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

        <BrainVitaThemeDialog
          open={isLookOpen}
          onClose={() => setIsLookOpen(false)}
          skin={game.skin}
          unlocked={game.unlockedSkins}
          onSelectSkin={game.selectSkin}
          isTiltAvailable={game.isTiltAvailable}
          isTiltOn={game.isTiltOn}
          onToggleTilt={game.toggleTilt}
          tiltNote={game.tiltNote}
        />

        <BrainVitaResultModal
          open={game.resultOpen}
          result={game.result}
          seconds={game.seconds}
          newPersonalBest={game.newPersonalBest}
          unlockedSkinName={game.justUnlocked ? SKINS[game.justUnlocked].name : null}
          onTryTheme={() => {
            if (game.justUnlocked) game.selectSkin(game.justUnlocked);
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
