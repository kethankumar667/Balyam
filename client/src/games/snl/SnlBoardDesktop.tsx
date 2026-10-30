import { useEffect } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { useSnlBoard, type SnlBoardProps } from "./useSnlBoard";
import {
  SnlHeader,
  SnlBoardSvg,
  DiceTray,
  SnlPlayerRail,
  EventFeed,
  SnlFinishedBanner,
} from "./snl-board-shared";
import { COIN_COLOR_HEX } from "../../components/CoinColorPicker";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { SNL_TUTORIAL } from "../tutorials";

import { SnlWinnerCelebration } from "./SnlAnimations";

/**
 * Sized to the window height (header + room rail take ~250px; the board is
 * 100:112) so the whole table is on screen at 1440×900 without scrolling,
 * never below 420px and never above 720px.
 */
const DESKTOP_BOARD_SIZE = "max-w-[min(94vw,720px,max(420px,calc((100dvh_-_250px)_*_0.893)))]";

/**
 * Snakes & Ladders — desktop shell.
 *
 * Two-column: a large board on the left and a persistent right rail carrying
 * the dice console, roster (with progress to 100) and live event feed so
 * nothing collapses behind a sheet. Uses the extra width deliberately rather
 * than stretching the phone layout, and adds a keyboard shortcut: Space rolls.
 */
export default function SnlBoardDesktop(props: SnlBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useSnlBoard(props);
  const reactions = useSeatReactions(selfId);
  // Never over a live turn. SNL's public state has no `turnDeadline` field to
  // also check (unlike Ludo/DotsBoxes/UNO), so `!myTurn` alone is the guard —
  // still strictly safe, since a countdown can only cost THIS player a turn
  // while it is their turn. See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(SNL_TUTORIAL.key, !m.myTurn);

  // Space rolls — unless focus is on something that already owns Space (a
  // button, a text field, a disclosure) or the tutorial is open.
  const { canRoll, rolling, doRoll } = m;
  const tutorialOpen = tut.open;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || tutorialOpen || !canRoll || rolling) return;
      const target = e.target as HTMLElement | null;
      const ownsSpace = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(target.tagName));
      if (ownsSpace) return;
      e.preventDefault();
      doRoll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRoll, rolling, doRoll, tutorialOpen]);

  return (
    <div className="space-y-4 rounded-2xl border border-cyan-300/15 bg-[radial-gradient(circle_at_50%_0%,rgba(56,225,255,0.14),transparent_38%),linear-gradient(160deg,#0b1424,#04070d)] p-4 shadow-2xl lg:p-5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <SnlHeader state={state} turnPlayer={m.turnPlayer} turnColor={m.turnColor} />
        </div>
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>

      <InlineRoomRail
        code={roomCode}
        game="snl"
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Board column */}
        <div className="space-y-4 min-w-0">
          <SnlBoardSvg
            state={state}
            players={players}
            sizeClass={DESKTOP_BOARD_SIZE}
            coinColorOf={m.coinColorOf}
            initialOf={m.initialOf}
            squareGroups={m.squareGroups}
            startCount={m.startCount}
            toast={m.toast}
            activeSnakeBite={m.activeSnakeBite}
            activeLadderClimb={m.activeLadderClimb}
          />
          {state.phase === "finished" && (
            <SnlFinishedBanner players={players} winnerId={state.winnerId} />
          )}
          {state.phase === "finished" && state.winnerId && (
            <SnlWinnerCelebration winner={players.find((p) => p.id === state.winnerId)} />
          )}
        </div>

        {/* Persistent right rail */}
        <aside className="space-y-3 lg:sticky lg:top-4">
          <DiceTray
            value={state.diceValue}
            rolling={m.rolling}
            canRoll={m.canRoll}
            myTurn={m.myTurn}
            phase={state.phase}
            turnName={m.turnPlayer?.name ?? "Player"}
            onRoll={m.doRoll}
          />
          <SnlPlayerRail
            players={players}
            state={state}
            coinColorOf={m.coinColorOf}
            initialOf={m.initialOf}
            selfId={selfId}
            registerCardRef={reactions.registerCardRef}
            onTarget={reactions.openTarget}
            activeTargetId={reactions.activeTargetId}
            onCloseTarget={reactions.closeTarget}
          />
          <EventFeed events={state.recentEvents} players={players} />
        </aside>
      </div>

      {tut.open && (
        <GameTutorial
          slides={SNL_TUTORIAL.slides}
          storageKey={SNL_TUTORIAL.key}
          accent={SNL_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}

      <FloatingReactionsLayer
        reactions={reactions.items}
        anchorOf={reactions.anchorOf}
        glowOf={(playerId) => COIN_COLOR_HEX[m.coinColorOf[playerId]]?.fill}
      />
    </div>
  );
}
