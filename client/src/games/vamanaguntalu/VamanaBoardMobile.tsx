import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, MessageCircle, Trophy, Volume2, VolumeX, X } from "lucide-react";
import Chat from "../../components/Chat";
import GameTutorial from "../../components/GameTutorial";
import Modal from "../../components/Modal";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { VamanaFitBoard } from "./VamanaFitBoard";
import { VamanaScoreCard } from "./VamanaScoreCard";
import { VAMANA_TUTORIAL_KEY, useVamanaBoard } from "./useVamanaBoard";
import type { VamanaBoardProps } from "./VamanaBoardProps";

const ROOM_BACKGROUND = "radial-gradient(ellipse at 50% -10%, #4a2c15 0%, #24130a 52%, #140a05 100%)";

/** A phone held sideways has too little height for the upright board, so it gets the wide one. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";

const ICON_BUTTON =
  "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-amber-50/90 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

export default function VamanaBoardMobile({ state, players, selfId, messages, onLeave }: VamanaBoardProps) {
  const board = useVamanaBoard({ state, players, selfId });
  const isShortLandscape = useMediaQuery(SHORT_LANDSCAPE);
  const orientation = isShortLandscape ? "horizontal" : "vertical";

  const [chatOpen, setChatOpen] = useState(false);
  const lastSeenChat = useRef(messages.length);
  const hasUnreadChat = !chatOpen && messages.length > lastSeenChat.current;
  useEffect(() => {
    if (chatOpen) lastSeenChat.current = messages.length;
  }, [chatOpen, messages.length]);

  const setTutorialOpen = board.tutorial.setOpen;
  const closeTutorial = useCallback(() => setTutorialOpen(false), [setTutorialOpen]);
  const lastCapturePit = state.lastMove?.capture?.pit ?? null;
  const { replay, mine, rival, mineId, rivalId } = board;

  const status = board.isOver
    ? board.showOutcome
      ? board.outcome.announcement
      : ""
    : board.isMyTurn
      ? `Your turn. ${board.secondsLeft > 0 ? `${board.secondsLeft} seconds left.` : ""}`
      : `${board.nameOf(state.turnPlayerId)}'s turn.`;

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden font-sans text-amber-50 short-land:grid short-land:grid-cols-[minmax(0,30%)_minmax(0,1fr)] short-land:grid-rows-[auto_1fr_auto]"
      style={{ background: ROOM_BACKGROUND }}
    >
      <TurnTimeWarning deadline={state.turnDeadline} active={board.isMyTurn} />
      <div role="status" aria-live="polite" className="sr-only">
        {status} {board.lastMoveText}
      </div>

      <header className="z-20 flex flex-wrap items-center justify-between gap-y-1 border-b border-white/10 bg-black/40 px-3 py-2 backdrop-blur-xl [@media(max-height:640px)]:py-1 short-land:col-start-1 short-land:row-start-1">
        <button type="button" onClick={onLeave} className={ICON_BUTTON} aria-label="Leave match">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 truncate px-2 text-xs font-bold uppercase tracking-wider text-amber-50">Vamana Guntalu</h1>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => board.tutorial.setOpen(true)} className={ICON_BUTTON} aria-label="How to play">
            <BookOpen className="h-4 w-4" />
          </button>
          <button type="button" onClick={board.handleMuteToggle} className={ICON_BUTTON} aria-label={board.isMuted ? "Unmute sounds" : "Mute sounds"}>
            {board.isMuted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className={`relative ${ICON_BUTTON}`}
            aria-label={hasUnreadChat ? "Open chat, unread messages" : "Open chat"}
          >
            <MessageCircle className="h-4 w-4" />
            {hasUnreadChat && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black/40" />}
          </button>
        </div>
      </header>

      <section className="z-10 px-3 py-2 [@media(max-height:640px)]:py-1 short-land:col-start-1 short-land:row-start-2 short-land:self-center">
        <div className="mx-auto grid max-w-[520px] grid-cols-2 gap-2">
          <VamanaScoreCard
            compact
            name={rival?.name ?? "Opponent"}
            avatar={rival?.avatar}
            isSelf={false}
            isBot={rival?.isBot}
            captured={replay.captured[rivalId] ?? 0}
            onRow={board.onRow(rivalId)}
            isActiveTurn={!board.isOver && state.turnPlayerId === rivalId}
          />
          <VamanaScoreCard
            compact
            name={mine?.name ?? "You"}
            avatar={mine?.avatar}
            isSelf={board.isPlayer}
            isBot={mine?.isBot}
            captured={replay.captured[mineId] ?? 0}
            onRow={board.onRow(mineId)}
            isActiveTurn={!board.isOver && state.turnPlayerId === mineId}
          />
        </div>
        {!board.isOver && (
          <p className="mt-1.5 text-center text-xs text-amber-100/85">
            {board.isMyTurn ? "Your turn — tap a pit on your row" : `Waiting for ${board.nameOf(state.turnPlayerId)}`}
            {state.turnDeadline ? <span className={`ml-2 font-bold tabular-nums ${board.isTimerCritical ? "text-rose-300" : "text-amber-50"}`}>{board.secondsLeft}s</span> : null}
          </p>
        )}
      </section>

      <main className="z-10 flex min-h-0 flex-1 items-stretch justify-center px-3 py-1 short-land:col-start-2 short-land:px-2 short-land:row-span-3 short-land:row-start-1">
        <VamanaFitBoard
          orientation={orientation}
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

      <footer
        className={`z-20 border-t border-white/10 bg-black/55 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl short-land:col-start-1 short-land:row-start-3 ${
          board.showOutcome ? "" : "[@media(max-height:640px)]:hidden"
        }`}
      >
        {board.showOutcome ? (
          <div className="mx-auto flex max-w-[420px] flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-300" />
              <span className="text-sm font-bold uppercase tracking-wider">{board.outcome.headline}</span>
            </div>
            {(state.swept[board.isPlayer ? selfId : mineId] ?? 0) > 0 && (
              <p className="text-center text-xs text-amber-100/85">
                {board.isPlayer ? "You keep" : `${mine?.name ?? "They"} keeps`} {state.swept[board.isPlayer ? selfId : mineId]} seeds left on {board.isPlayer ? "your" : "their"} row.
              </p>
            )}
            <button type="button" onClick={onLeave} className="min-h-[46px] w-full cursor-pointer rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/15">
              Leave
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-amber-100/80">{board.lastMoveText || "Pick a pit on your row to sow its seeds."}</p>
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
