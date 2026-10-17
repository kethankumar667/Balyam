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
import { boardGeometry } from "./vamanaTheme";
import type { VamanaBoardProps } from "./VamanaBoardProps";

/** A phone held sideways is wide enough for this layout but far too short to stack two score cards round the board. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";
/** Wide enough to keep the chat panel open beside the board; narrower screens open chat from a button. */
const HAS_CHAT_RAIL = "(min-width: 1024px)";

const HEADER_BUTTON =
  "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#E4B128]/40 bg-[#2a160a]/85 px-4 py-2 text-sm font-semibold text-amber-50 shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#3b2210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";
const ROUND_BUTTON = `${HEADER_BUTTON} !px-0 h-11 w-11`;

/** The width of the column holding the cards and board. The board fills it, so wider screens get bigger pits, up to a point. */
const STAGE_MAX_WIDTH = "max-w-[1040px]";

/**
 * The wide table: landscape tablets and desktops. The board lies flat between the two score cards,
 * the round controls stand in a rail down the left side, and the chat sits in a panel on the right.
 * On a short screen the rail and panel go and the controls move into the header.
 */
export default function VamanaBoardDesktop({ state, players, selfId, messages, roomCode, onLeave }: VamanaBoardProps) {
  const board = useVamanaBoard({ state, players, selfId });
  const isShort = useMediaQuery(SHORT_LANDSCAPE);
  const hasChatRail = useMediaQuery(HAS_CHAT_RAIL) && !isShort;
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

  const boardAspect = boardGeometry("horizontal", !isShort).aspect;
  const isGivingUp = board.isPlayer && !board.isOver;
  const swept = state.swept[board.isPlayer ? selfId : mineId] ?? 0;
  const noteText =
    board.showOutcome && swept > 0
      ? `${board.isPlayer ? "You keep" : `${mine?.name ?? "They"} keeps`} ${swept} seeds left on ${board.isPlayer ? "your" : "their"} row.`
      : board.lastMoveText || "Pick a pit on your row to sow its seeds.";

  const rivalCard = (
    <VamanaScoreCard
      compact={isShort}
      name={rival?.name ?? "Opponent"}
      avatar={rival?.avatar}
      isSelf={false}
      isBot={rival?.isBot}
      captured={replay.captured[rivalId] ?? 0}
      onRow={board.onRow(rivalId)}
      isActiveTurn={!board.isOver && state.turnPlayerId === rivalId}
      isLeading={board.leaderId === rivalId}
      turnFraction={board.turnFraction}
    />
  );
  const mineCard = (
    <VamanaScoreCard
      compact={isShort}
      name={mine?.name ?? "You"}
      avatar={mine?.avatar}
      isSelf={board.isPlayer}
      isBot={mine?.isBot}
      captured={replay.captured[mineId] ?? 0}
      onRow={board.onRow(mineId)}
      isActiveTurn={!board.isOver && state.turnPlayerId === mineId}
      isLeading={board.leaderId === mineId}
      turnFraction={board.turnFraction}
    />
  );
  const statusBar = board.showOutcome ? (
    <VamanaOutcomeBar headline={board.outcome.headline} isCompact={isShort} />
  ) : (
    !board.isOver && (
      <VamanaTurnBar
        text={board.turnText("mouse")}
        secondsLeft={board.clockSeconds}
        totalSeconds={board.turnTotalSeconds}
        isCritical={board.isTimerCritical}
        isCompact={isShort}
      />
    )
  );

  return (
    <div className="relative flex h-dvh-safe max-h-dvh-safe w-full flex-col overflow-hidden font-sans text-amber-50">
      <VamanaScene isWide isCompact={isShort} />
      <TurnTimeWarning deadline={state.turnDeadline} active={board.isMyTurn} />
      <div role="status" aria-live="polite" className="sr-only">
        {board.statusText} {board.lastMoveText}
      </div>

      <header className={`relative z-20 grid flex-shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 ${isShort ? "h-12" : "h-[84px] pt-3"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onLeave} className={HEADER_BUTTON} aria-label="Leave match">
            <ArrowLeft className="h-4 w-4" />
            <span>Exit</span>
          </button>
          <span className="hidden truncate rounded-full bg-black/35 px-3 py-1 text-xs text-amber-100/85 lg:inline">Room {roomCode}</span>
        </div>
        <VamanaTitleSign isCompact={isShort} />
        <div className="flex items-center justify-end gap-2">
          {isShort && (
            <>
              <button type="button" onClick={openTutorial} className={ROUND_BUTTON} aria-label="How to play">
                <BookOpen className="h-4 w-4" />
              </button>
              <button type="button" onClick={board.handleMuteToggle} className={ROUND_BUTTON} aria-label={board.isMuted ? "Unmute sounds" : "Mute sounds"}>
                {board.isMuted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
              </button>
              <button type="button" onClick={() => setChatOpen(true)} className={ROUND_BUTTON} aria-label="Open chat">
                <MessageCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {!isShort && (
          <nav aria-label="Table controls" className="relative z-20 flex w-28 flex-shrink-0 flex-col items-center justify-center px-2">
            <div className="rounded-3xl bg-black/40 px-2 py-4 backdrop-blur-sm">
              <VamanaDock isVertical>
                <VamanaDockButton label="How to Play" ariaLabel="How to play" icon={<Lightbulb className="h-6 w-6" />} onClick={openTutorial} />
                <VamanaDockButton
                  label="Sound"
                  ariaLabel={board.isMuted ? "Unmute sounds" : "Mute sounds"}
                  icon={board.isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                  onClick={board.handleMuteToggle}
                />
                {!hasChatRail && (
                  <VamanaDockButton
                    label="Chat"
                    ariaLabel={hasUnreadChat ? "Open chat, unread messages" : "Open chat"}
                    icon={<MessageCircle className="h-6 w-6" />}
                    onClick={() => setChatOpen(true)}
                    hasBadge={hasUnreadChat}
                  />
                )}
                <VamanaDockButton
                  label={isGivingUp ? "Give Up" : "Leave"}
                  ariaLabel={isGivingUp ? "Give up and leave the match" : "Leave the table"}
                  icon={isGivingUp ? <Flag className="h-6 w-6" /> : <LogOut className="h-6 w-6" />}
                  onClick={onLeave}
                  isDanger={isGivingUp}
                />
              </VamanaDock>
            </div>
          </nav>
        )}

        <main className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 px-4 pb-4 short-land:gap-2 short-land:pb-2">
          <div className={`w-full ${STAGE_MAX_WIDTH}`}>{statusBar}</div>
          {isShort ? (
            <div className={`grid w-full ${STAGE_MAX_WIDTH} grid-cols-2 gap-2`}>
              {rivalCard}
              {mineCard}
            </div>
          ) : (
            <div className={`w-full ${STAGE_MAX_WIDTH}`}>{rivalCard}</div>
          )}

          {/* Shaped like the board so the cards sit snug against it; on a short screen it shrinks and the board fits itself to what is left. */}
          <div className={`flex min-h-0 w-full ${STAGE_MAX_WIDTH} shrink items-center justify-center`} style={{ aspectRatio: String(boardAspect) }}>
            <VamanaFitBoard
              orientation="horizontal"
              hasOrnaments={!isShort}
              seat={board.seat}
              pits={replay.pits}
              isPlayer={board.isPlayer && !board.isOver}
              canSow={(pit) => board.canSow(pit) && !replay.isReplaying}
              onSelect={board.sowPit}
              activePit={replay.activePit}
              capturedPit={replay.capturedPit}
              lastCapturePit={lastCapturePit}
            />
          </div>

          {!isShort && (
            <div className={`w-full ${STAGE_MAX_WIDTH} space-y-3`}>
              {mineCard}
              <VamanaMoveNote text={noteText} className="mx-auto w-fit max-w-full" />
            </div>
          )}
        </main>

        <aside className="relative z-20 hidden w-80 flex-shrink-0 flex-col border-l border-[#E4B128]/20 bg-[#1b0e05]/60 backdrop-blur-md lg:flex short-land:hidden">
          <div className="flex-shrink-0 border-b border-[#E4B128]/15 p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-100/75">This match</h2>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-amber-100/75">Turn timer</dt>
                <dd className="font-semibold tabular-nums">{state.options.turnTimerSeconds}s</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-amber-100/75">Turns played</dt>
                <dd className="font-semibold tabular-nums">{state.moveCount}</dd>
              </div>
            </dl>
          </div>
          <div className="dark flex min-h-0 flex-1 flex-col overflow-hidden p-2.5">
            <Chat messages={messages} selfId={selfId} className="!border-slate-800/80 !bg-slate-900/75 shadow-xl backdrop-blur-md" />
          </div>
        </aside>
      </div>

      {board.tutorial.open && <GameTutorial storageKey={VAMANA_TUTORIAL_KEY} onClose={closeTutorial} />}

      <Modal
        open={chatOpen && !hasChatRail}
        onClose={() => setChatOpen(false)}
        ariaLabelledBy="vamana-desktop-chat-title"
        mobileSheet
        panelClassName="w-full max-w-lg h-[80dvh] flex flex-col rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl overflow-hidden"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-2">
          <h2 id="vamana-desktop-chat-title" className="text-sm font-bold tracking-tight text-white">
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
