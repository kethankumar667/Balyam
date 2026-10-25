import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Flag, Lightbulb, LogOut, MessageCircle, Volume2, VolumeX, X } from "lucide-react";
import Chat from "../../components/Chat";
import GameTutorial from "../../components/GameTutorial";
import Modal from "../../components/Modal";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { VamanaDock, VamanaDockButton, VamanaMoveNote } from "./VamanaDock";
import { VamanaFitBoard } from "./VamanaFitBoard";
import { VamanaScene } from "./VamanaScene";
import { VamanaScoreCard } from "./VamanaScoreCard";
import { VamanaTitleSign } from "./VamanaTitleSign";
import { VamanaOutcomeBar, VamanaTurnBar } from "./VamanaTurnBar";
import { VAMANA_TUTORIAL_KEY, useVamanaBoard } from "./useVamanaBoard";
import type { VamanaBoardProps } from "./VamanaBoardProps";

/** A phone held sideways has too little height for the upright board, so it gets the wide one. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";
/** Below this the carved ends and the recap pill cost the board more than they are worth. */
const TIGHT_HEIGHT = "(max-height: 740px)";
/** Below this the round action dock goes too, and its controls move up to the header. */
const CRAMPED_HEIGHT = "(max-height: 600px)";

const ROUND_BUTTON =
  "flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#E4B128]/40 bg-[#2a160a]/85 text-amber-50 shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#3b2210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128] md:h-12 md:w-12";

/**
 * The upright table: phones, and tablets held upright. The board stands on its end between the two
 * score cards above it and the round controls below, as in the design. A phone held sideways (or too
 * short to spare the room) drops the extras and lays the board flat beside a single column.
 */
export default function VamanaBoardMobile({ state, players, selfId, messages, onLeave }: VamanaBoardProps) {
  const board = useVamanaBoard({ state, players, selfId });
  const isShortLandscape = useMediaQuery(SHORT_LANDSCAPE);
  const isTight = useMediaQuery(TIGHT_HEIGHT);
  const isCramped = useMediaQuery(CRAMPED_HEIGHT);
  const orientation = isShortLandscape ? "horizontal" : "vertical";

  const [chatOpen, setChatOpen] = useState(false);
  const lastSeenChat = useRef(messages.length);
  const hasUnreadChat = !chatOpen && messages.length > lastSeenChat.current;
  useEffect(() => {
    if (chatOpen) lastSeenChat.current = messages.length;
  }, [chatOpen, messages.length]);

  const setTutorialOpen = board.tutorial.setOpen;
  const openTutorial = useCallback(() => setTutorialOpen(true), [setTutorialOpen]);
  const closeTutorial = useCallback(() => setTutorialOpen(false), [setTutorialOpen]);
  const lastCapturePit = state.lastMove?.capture?.pit ?? null;
  const { replay, mine, rival, mineId, rivalId } = board;

  const isGivingUp = board.isPlayer && !board.isOver;
  const swept = state.swept[board.isPlayer ? selfId : mineId] ?? 0;
  const noteText =
    board.showOutcome && swept > 0
      ? `${board.isPlayer ? "You keep" : `${mine?.name ?? "They"} keeps`} ${swept} seeds left on ${board.isPlayer ? "your" : "their"} row.`
      : board.lastMoveText || "Pick a pit on your row to sow its seeds.";

  return (
    <div
      className="relative flex h-dvh-safe max-h-dvh-safe w-full flex-col overflow-hidden font-sans text-amber-50 short-land:grid short-land:grid-cols-[minmax(0,30%)_minmax(0,1fr)] short-land:grid-rows-[auto_1fr_auto]"
    >
      <VamanaScene isCompact={isTight} />
      <TurnTimeWarning deadline={state.turnDeadline} active={board.isMyTurn} />
      <div role="status" aria-live="polite" className="sr-only">
        {board.statusText} {board.lastMoveText}
      </div>

      <header className="relative z-20 flex items-center justify-between gap-1 px-2 pb-1 pt-2 min-[360px]:gap-2 min-[360px]:px-3 short-land:col-span-2 short-land:row-start-1 short-land:px-2 short-land:pt-1">
        <button type="button" onClick={onLeave} className={ROUND_BUTTON} aria-label="Leave match">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <VamanaTitleSign isStacked className="short-land:hidden" />
        <div className="flex items-center gap-1 min-[360px]:gap-2">
          <button type="button" onClick={openTutorial} className={`${ROUND_BUTTON} hidden [@media(max-height:600px)]:flex`} aria-label="How to play">
            <BookOpen className="h-5 w-5" />
          </button>
          <button type="button" onClick={board.handleMuteToggle} className={ROUND_BUTTON} aria-label={board.isMuted ? "Unmute sounds" : "Mute sounds"}>
            {board.isMuted ? <VolumeX className="h-5 w-5 text-rose-300" /> : <Volume2 className="h-5 w-5 text-emerald-300" />}
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className={`relative ${ROUND_BUTTON}`}
            aria-label={hasUnreadChat ? "Open chat, unread messages" : "Open chat"}
          >
            <MessageCircle className="h-5 w-5" />
            {hasUnreadChat && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#2a160a]" />}
          </button>
        </div>
      </header>

      <section className="relative z-10 px-3 pt-1 short-land:col-start-1 short-land:row-start-2 short-land:self-start short-land:px-2">
        <div className="mx-auto grid max-w-[560px] grid-cols-2 gap-2 md:max-w-[700px] md:gap-3 short-land:grid-cols-1">
          <VamanaScoreCard
            compact={isCramped}
            isAvatarHidden={isShortLandscape}
            name={rival?.name ?? "Opponent"}
            avatar={rival?.avatar}
            playerId={rival?.id}
            isSelf={false}
            isBot={rival?.isBot}
            captured={replay.captured[rivalId] ?? 0}
            onRow={board.onRow(rivalId)}
            isActiveTurn={!board.isOver && state.turnPlayerId === rivalId}
            isLeading={board.leaderId === rivalId}
            turnFraction={board.turnFraction}
          />
          <VamanaScoreCard
            compact={isCramped}
            isAvatarHidden={isShortLandscape}
            name={mine?.name ?? "You"}
            avatar={mine?.avatar}
            playerId={mine?.id}
            isSelf={board.isPlayer}
            isBot={mine?.isBot}
            captured={replay.captured[mineId] ?? 0}
            onRow={board.onRow(mineId)}
            isActiveTurn={!board.isOver && state.turnPlayerId === mineId}
            isLeading={board.leaderId === mineId}
            turnFraction={board.turnFraction}
          />
        </div>
        <div className="mx-auto mt-2 max-w-[560px] md:max-w-[700px]">
          {board.showOutcome ? (
            <VamanaOutcomeBar headline={board.outcome.headline} isCompact={isCramped} />
          ) : (
            !board.isOver && (
              <VamanaTurnBar
                text={isCramped && board.isMyTurn ? "Your turn" : board.turnText("touch")}
                secondsLeft={board.clockSeconds}
                totalSeconds={board.turnTotalSeconds}
                isCritical={board.isTimerCritical}
                isCompact={isTight}
              />
            )
          )}
        </div>
      </section>

      <main className="relative z-10 flex min-h-0 flex-1 items-stretch justify-center px-3 py-2 [@media(max-height:740px)]:py-1 short-land:col-start-2 short-land:row-span-2 short-land:row-start-2 short-land:px-2">
        <VamanaFitBoard
          orientation={orientation}
          hasOrnaments={!isTight}
          seat={board.seat}
          pits={replay.pits}
          isPlayer={board.isPlayer && !board.isOver}
          canSow={(pit) => board.canSow(pit) && !replay.isReplaying}
          onSelect={board.sowPit}
          activePit={replay.activePit}
          capturedPit={replay.capturedPit}
          lastCapturePit={lastCapturePit}
        />
      </main>

      <footer className="relative z-20 flex flex-col items-center gap-2 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 short-land:col-start-1 short-land:row-start-3 short-land:px-2">
        {!isTight && <VamanaMoveNote text={noteText} className="w-full max-w-[560px] md:max-w-[700px]" />}
        {isCramped ? (
          board.showOutcome && (
            <button type="button" onClick={onLeave} className="min-h-[44px] w-full cursor-pointer rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-amber-50 transition-colors hover:bg-white/15">
              Leave
            </button>
          )
        ) : (
          <VamanaDock>
            <VamanaDockButton label="How to Play" ariaLabel="How to play" icon={<Lightbulb className="h-6 w-6" />} onClick={openTutorial} />
            <VamanaDockButton
              label={isGivingUp ? "Give Up" : "Leave"}
              ariaLabel={isGivingUp ? "Give up and leave the match" : "Leave the table"}
              icon={isGivingUp ? <Flag className="h-6 w-6" /> : <LogOut className="h-6 w-6" />}
              onClick={onLeave}
              isDanger={isGivingUp}
            />
          </VamanaDock>
        )}
      </footer>

      {board.tutorial.open && <GameTutorial storageKey={VAMANA_TUTORIAL_KEY} onClose={closeTutorial} />}

      <Modal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        ariaLabelledBy="vamana-chat-title"
        mobileSheet
        panelClassName="w-full max-w-lg h-[70dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl overflow-hidden"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 id="vamana-chat-title" className="text-sm font-bold tracking-tight text-white">
            Chat
          </h2>
          <button type="button" onClick={() => setChatOpen(false)} className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close chat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="dark min-h-0 flex-1">
          <Chat messages={messages} selfId={selfId} />
        </div>
      </Modal>
    </div>
  );
}
