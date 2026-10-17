import { useCallback, useState } from "react";
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

/** A phone held sideways is wide enough for this layout but far too short to stack two score cards round the board. */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";

const HEADER_BUTTON =
  "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-amber-50/90 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

export default function VamanaBoardDesktop({ state, players, selfId, messages, roomCode, onLeave }: VamanaBoardProps) {
  const board = useVamanaBoard({ state, players, selfId });
  const isShort = useMediaQuery(SHORT_LANDSCAPE);
  const [chatOpen, setChatOpen] = useState(false);
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

  const sweptSelf = state.swept[board.isPlayer ? selfId : mineId] ?? 0;

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
    />
  );

  return (
    <div className="relative flex h-dvh-safe max-h-dvh-safe w-full flex-col overflow-hidden font-sans text-amber-50" style={{ background: ROOM_BACKGROUND }}>
      <TurnTimeWarning deadline={state.turnDeadline} active={board.isMyTurn} />
      <div role="status" aria-live="polite" className="sr-only">
        {status} {board.lastMoveText}
      </div>

      <header className="z-20 flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onLeave} className={HEADER_BUTTON} aria-label="Leave match">
            <ArrowLeft className="h-4 w-4" />
            <span>Exit</span>
          </button>
          <div>
            <h1 className="text-sm font-bold uppercase leading-tight tracking-wider">Vamana Guntalu</h1>
            <span className="text-[11px] text-amber-100/70">వామన గుంటలు · Room {roomCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => board.tutorial.setOpen(true)} className={HEADER_BUTTON} aria-label="How to play">
            <BookOpen className="h-4 w-4" />
            <span>Guide</span>
          </button>
          <button type="button" onClick={board.handleMuteToggle} className={HEADER_BUTTON} aria-label={board.isMuted ? "Unmute sounds" : "Mute sounds"}>
            {board.isMuted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
          </button>
          {isShort && (
            <button type="button" onClick={() => setChatOpen(true)} className={HEADER_BUTTON} aria-label="Open chat">
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center gap-3 px-6 py-4 short-land:gap-2 short-land:px-3 short-land:py-2">
          {isShort ? (
            <div className="grid w-full max-w-[880px] grid-cols-2 gap-2">
              {rivalCard}
              {mineCard}
            </div>
          ) : (
            <div className="w-full max-w-[880px]">{rivalCard}</div>
          )}

          <div className="flex min-h-0 w-full max-w-[880px] flex-1 items-center justify-center">
            <VamanaFitBoard
              orientation="horizontal"
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

          <div className="w-full max-w-[880px] space-y-2">
            {!isShort && mineCard}
            {board.showOutcome ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-black/60 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Trophy className="h-4 w-4 flex-shrink-0 text-amber-300" />
                  <span className="truncate text-sm font-bold uppercase tracking-wider">{board.outcome.headline}</span>
                  {sweptSelf > 0 && <span className="hidden text-xs text-amber-100/80 xl:inline">· {sweptSelf} seeds kept from the row</span>}
                </div>
                <button type="button" onClick={onLeave} className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/15">
                  Exit
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-amber-100/85">
                {board.isMyTurn ? "Your turn — click a pit on your row, or use the arrow keys and Enter" : `Waiting for ${board.nameOf(state.turnPlayerId)}`}
                {state.turnDeadline ? <span className={`ml-2 font-bold tabular-nums ${board.isTimerCritical ? "text-rose-300" : "text-amber-50"}`}>{board.secondsLeft}s</span> : null}
              </p>
            )}
          </div>
        </main>

        <aside className={`z-20 w-72 flex-shrink-0 flex-col border-l border-white/10 bg-black/40 backdrop-blur-xl lg:w-80 ${isShort ? "hidden" : "flex"}`}>
          <div className="flex-shrink-0 border-b border-white/10 p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-100/70">This match</h2>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-amber-100/70">Turn timer</dt>
                <dd className="font-semibold tabular-nums">{state.options.turnTimerSeconds}s</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-amber-100/70">Turns played</dt>
                <dd className="font-semibold tabular-nums">{state.moveCount}</dd>
              </div>
            </dl>
            <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-amber-100/90">{board.lastMoveText || "No moves yet."}</p>
          </div>
          <div className="dark flex min-h-0 flex-1 flex-col overflow-hidden p-2.5">
            <Chat messages={messages} selfId={selfId} className="!border-slate-800/80 !bg-slate-900/75 shadow-xl backdrop-blur-md" />
          </div>
        </aside>
      </div>

      {board.tutorial.open && <GameTutorial storageKey={VAMANA_TUTORIAL_KEY} onClose={closeTutorial} />}

      <Modal
        open={chatOpen && isShort}
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
