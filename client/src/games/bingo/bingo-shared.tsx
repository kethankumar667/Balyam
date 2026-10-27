import { useState } from "react";
import { Check, Eye, Hand, PartyPopper, Star, Trophy, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import type { BingoBoard, BingoLetter, BingoPlayerPublic, BingoWinner } from "@shared/types";
import type { Player } from "@shared/types";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import BoardPreviewPill from "../../components/BoardPreviewPill";
import PrizeWonChip from "../../components/economy/PrizeWonChip";
import BotResultNote from "../../components/room/BotResultNote";
import { useRoomStore } from "../../store/roomStore";
import { deriveTerminalMatchId } from "../../lib/economyMotionTriggers";
import { useMatchSettlement, winnerPrizesFor } from "../../hooks/useMatchSettlement";
import type { BingoSkin } from "./bingoSkin";

export const BINGO_LETTERS: BingoLetter[] = ["B", "I", "N", "G", "O"];

/** Each letter's ball: one colour a letter, so the five read as the word before they read as letters. */
const LETTER_BALL: Record<BingoLetter, string> = {
  B: "from-[#FF7B7B] to-[#C81E1E]",
  I: "from-[#FFCB4D] to-[#E07A00]",
  N: "from-[#5EE08F] to-[#15803D]",
  G: "from-[#6FB4FF] to-[#1D4ED8]",
  O: "from-[#C890FF] to-[#7E22CE]",
};

/**
 * B-I-N-G-O: one glossy ball per completed line.
 *
 * A letter is earned, not decorative. Earned balls grow, take a gold ring and a check badge; the rest stay a little
 * less saturated. The badge and the ring carry the state, so it never depends on telling two reds apart.
 */
export function BingoLetterBanner({ completedLetters = [], skin }: { completedLetters?: BingoLetter[]; skin: BingoSkin }) {
  return (
    <ul role="list" aria-label="Completed letters" className="flex items-center justify-center gap-2.5 py-1 sm:gap-3.5">
      {BINGO_LETTERS.map((letter) => {
        const isEarned = completedLetters.includes(letter);
        return (
          <li
            key={letter}
            role="listitem"
            aria-label={isEarned ? `${letter}, completed` : letter}
            className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b font-display text-2xl text-white shadow-[inset_0_-5px_0_rgba(0,0,0,0.22),0_5px_10px_rgba(0,0,0,0.25)] transition-all duration-300 [text-shadow:0_2px_0_rgba(0,0,0,0.35)] sm:h-14 sm:w-14 lg:h-16 lg:w-16 lg:text-3xl ${LETTER_BALL[letter]} ${
              isEarned
                ? `scale-110 ring-4 ring-[#FFD84D] ring-offset-2 ${skin.ringOffset}`
                : "saturate-[0.7]"
            }`}
          >
            <span aria-hidden="true" className="pointer-events-none absolute left-[18%] top-[9%] h-[28%] w-[42%] rounded-full bg-white/45 blur-[1px]" />
            <span aria-hidden="true">{letter}</span>
            {isEarned && (
              <span aria-hidden="true" className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-[#15803D] text-white ring-2 ring-white">
                <Check className="h-3 w-3" strokeWidth={4} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The call-out panel's moods, per theme: open for marking and running out. */
const CALL_OPEN = {
  light: "border-[#F0B400] bg-[#FFF0A8] text-[#4A2C12]",
  dark: "border-[#FFD84D] bg-[#3A2A08] text-[#FFF1D0]",
} as const;
const CALL_URGENT = {
  light: "border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]",
  dark: "border-[#F87171] bg-[#4A1414] text-[#FECACA]",
} as const;

/**
 * The number on the clock, and why the table is waiting.
 *
 * The engine holds the next call until every seat resolves the current one.
 * That pause is the feature — it is what keeps all boards on the same
 * number — but a board that does not SAY why it stopped reads as a freeze,
 * and freezes get reported as bugs. This panel is the explanation.
 */
export function CallOutPanel({
  number,
  secondsLeft,
  iHaveMarked,
  waitingOn,
  wasAutoMarkedForMe,
  skin,
}: {
  number: number | null;
  secondsLeft: number | null;
  iHaveMarked: boolean;
  waitingOn: string[];
  wasAutoMarkedForMe: boolean;
  skin: BingoSkin;
}) {
  const mood = skin.isDark ? "dark" : "light";

  if (number == null) {
    // The rescue is otherwise invisible — the cell just fills in — so
    // players never learn that missing one costs them nothing.
    if (!wasAutoMarkedForMe) return null;
    return (
      <div className={`w-full rounded-2xl px-4 py-2.5 text-center text-sm font-bold ${skin.well} ${skin.inkSoft}`}>
        Marked for you — you never lose a number
      </div>
    );
  }

  const urgent = secondsLeft != null && secondsLeft <= 3;
  const tone = iHaveMarked ? `${skin.well} ${skin.ink}` : `border-2 ${urgent ? CALL_URGENT[mood] : CALL_OPEN[mood]}`;

  return (
    <div className={`w-full rounded-2xl px-4 py-2.5 transition-colors duration-300 ${tone}`} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider opacity-70">Called</span>
          <span className="text-3xl font-black tabular-nums">{number}</span>
        </div>

        {!iHaveMarked ? (
          <span className="text-sm font-black tabular-nums">Tap it — {secondsLeft ?? 0}s</span>
        ) : waitingOn.length > 0 ? (
          // Named, not a spinner: "waiting for Ravi" is a fact players can
          // act on (nudge him), where a spinner is just a stalled screen.
          <span className={`truncate text-xs font-bold ${skin.inkSoft}`}>
            Waiting for {waitingOn.slice(0, 2).join(", ")}
            {waitingOn.length > 2 ? ` +${waitingOn.length - 2}` : ""}
          </span>
        ) : (
          <span className={`text-xs font-bold ${skin.isDark ? "text-[#6EE7A0]" : "text-[#15803D]"}`}>Marked ✓</span>
        )}
      </div>
    </div>
  );
}

/**
 * Auto-mark switch.
 *
 * An accessibility setting, not a difficulty setting — which is why it lives
 * on the player and not on the room. Finding one number among 25 under an
 * 8-second clock is the game for most people and a wall for some (motor
 * control, low vision, a young child playing along), and one player's need
 * must not decide it for the table.
 *
 * Worded as what it does, not as "easy mode". Nobody should have to call
 * themselves bad at Bingo to be able to play it.
 */
export function AutoMarkToggle({ enabled, onChange, skin }: { enabled: boolean; onChange: (on: boolean) => void; skin: BingoSkin }) {
  return (
    <SwitchRow
      enabled={enabled}
      onChange={onChange}
      skin={skin}
      icon={Hand}
      title="Mark for me"
      detail="Auto-mark numbers as they are called"
    />
  );
}

/**
 * Call-out switch: whether each number is also read aloud.
 *
 * Off until the player turns it on, and remembered on the device (see `announcer.ts`). The icon follows the state
 * so the row reads at a glance, but the switch role and the label carry the meaning for everyone else.
 */
export function CallOutToggle({ enabled, onChange, skin }: { enabled: boolean; onChange: (on: boolean) => void; skin: BingoSkin }) {
  return (
    <SwitchRow
      enabled={enabled}
      onChange={onChange}
      skin={skin}
      icon={enabled ? Volume2 : VolumeX}
      title="Call out numbers"
      detail="Speak each number aloud"
    />
  );
}

/** One labelled on/off row, shared by the table's switches so they look and behave alike. */
function SwitchRow({
  enabled,
  onChange,
  skin,
  icon: Icon,
  title,
  detail,
}: {
  enabled: boolean;
  onChange: (on: boolean) => void;
  skin: BingoSkin;
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-3xl px-4 py-3 text-left ${skin.card} ${skin.focus}`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${skin.well}`}>
        <Icon className={`h-6 w-6 ${skin.isDark ? "text-[#FFD84D]" : "text-[#8A4B00]"}`} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-black uppercase tracking-wide ${skin.ink}`}>{title}</span>
        <span className={`block text-xs leading-snug ${skin.inkSoft}`}>{detail}</span>
      </span>
      <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? skin.switchOn : skin.switchOff}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

const GRID_FRAME = {
  sm: "max-w-[13.5rem] gap-1 rounded-2xl p-1.5",
  md: "max-w-[24rem] gap-2 rounded-[1.75rem] p-3",
  lg: "max-w-[30rem] gap-2.5 rounded-[2rem] p-3.5",
} as const;
const GRID_TEXT = { sm: "text-sm", md: "text-2xl", lg: "text-3xl" } as const;

/** 5x5 grid of a player's Bingo board (numbers 1-25). The cells grow with their tray, so the board fills the width it is given. */
export function BingoGrid({
  board,
  onCellClick,
  isMyTurn,
  calledSet,
  size = "md",
  markableNumber = null,
  onMarkCell,
  skin,
}: {
  board: BingoBoard;
  onCellClick?: (val: number) => void;
  isMyTurn?: boolean;
  calledSet?: Set<number>;
  size?: "sm" | "md" | "lg";
  /**
   * The number currently open for marking, if this is the viewer's own card.
   * That one cell becomes tappable no matter whose turn it is to call —
   * finding it is the player's job every single call, and it is what turned
   * this from something you watch into something you play.
   */
  markableNumber?: number | null;
  onMarkCell?: (val: number) => void;
  skin: BingoSkin;
}) {
  const small = size === "sm";
  return (
    <div id="bingo-board-container" className={`mx-auto grid w-full grid-cols-5 transition-colors duration-300 ${GRID_FRAME[size]} ${skin.tray}`}>
      {board.map((cell) => {
        const isMarked = cell.marked || (calledSet && calledSet.has(cell.value));
        const canClick = isMyTurn && !isMarked && onCellClick;
        const canMark = !isMarked && onMarkCell && cell.value === markableNumber;
        const state = isMarked ? skin.cellMarked : canMark ? skin.cellMarkable : canClick ? `${skin.cellCallable} cursor-pointer active:scale-95` : skin.cell;

        return (
          <button
            key={cell.index}
            type="button"
            disabled={!canClick && !canMark}
            onClick={() => {
              // Marking wins over calling: if this is the open number, the
              // tap is the player striking their own card, even on the turn
              // where they are also the caller.
              if (canMark) onMarkCell(cell.value);
              else if (canClick) onCellClick(cell.value);
            }}
            aria-label={canMark ? `Mark ${cell.value}` : isMarked ? `${cell.value}, marked` : String(cell.value)}
            className={`relative flex aspect-square min-w-0 items-center justify-center border-2 font-black tabular-nums transition-all duration-200 ${small ? "rounded-lg" : "rounded-xl"} ${GRID_TEXT[size]} ${state} ${skin.focus}`}
          >
            {cell.value}
            {isMarked && (
              <span
                aria-hidden="true"
                className={`absolute grid place-items-center rounded-full bg-[#7A4A00] text-[#FFD84D] ring-2 ring-[#FFF3C4] ${small ? "-right-0.5 -top-0.5 h-3.5 w-3.5" : "-right-1 -top-1 h-5 w-5"}`}
              >
                <Star className={`fill-current ${small ? "h-2 w-2" : "h-3 w-3"}`} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Opponents scorecard: every player's 5x5 table. */
export function AllPlayerBoardsView({
  players,
  selfId,
  roster,
  registerCardRef,
  onTarget,
  activeTargetId,
  onCloseTarget,
  skin,
}: {
  players: BingoPlayerPublic[];
  selfId: string | null;
  /** Full player roster (carries `avatar`), used only to look up each seat's picture. */
  roster?: Player[];
  /** Reaction-targeting: registers each seat's card element as the fly-to/flinch anchor. */
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
  onTarget?: (playerId: string) => void;
  activeTargetId?: string | null;
  onCloseTarget?: () => void;
  skin: BingoSkin;
}) {
  const avatarById = new Map<string, string | undefined>();
  for (const r of roster ?? []) avatarById.set(r.id, r.avatar);

  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((p) => {
        const isSelf = p.id === selfId;
        const isTargetActive = activeTargetId === p.id;
        return (
          <div
            key={p.id}
            ref={registerCardRef?.(p.id)}
            className={`relative flex flex-col items-center gap-2 rounded-3xl p-3.5 transition-all ${skin.card} ${isSelf ? "ring-2 ring-[#F5B400]" : "cursor-pointer active:scale-[0.99]"}`}
            onClick={!isSelf ? () => onTarget?.(p.id) : undefined}
            title={!isSelf ? `Tap to react at ${p.name}` : undefined}
          >
            {isTargetActive && onCloseTarget && (
              <SeatTargetReactionWheel game="bingo" targetPlayerId={p.id} targetPlayerName={p.name} onClose={onCloseTarget} position="top" />
            )}
            <div className={`flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-1 text-sm font-bold ${skin.ink}`}>
              <span className="flex min-w-0 items-center gap-1.5">
                <SeatAvatar avatar={avatarById.get(p.id)} playerId={p.id} name={p.name} className="h-6 w-6" textClassName="text-[9px]" />
                <span className="truncate">
                  {p.name} {isSelf && "(You)"}
                </span>
                {p.isBot && <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${skin.well} ${skin.inkSoft}`}>bot</span>}
              </span>
              <span className={`shrink-0 text-xs font-extrabold ${skin.isDark ? "text-[#FFD84D]" : "text-[#8A4B00]"}`}>
                {p.completedLinesCount} Lines ({p.completedLetters.join("") || "-"})
              </span>
            </div>
            <BingoGrid board={p.board} size="sm" skin={skin} />
          </div>
        );
      })}
    </div>
  );
}

export function ClaimButton({ onClaim, disabled, className }: { onClaim: () => void; disabled: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClaim}
      disabled={disabled}
      className={
        "inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#FF7A59] to-[#E11D48] px-8 py-3 text-lg font-black uppercase tracking-wider text-white shadow-[0_5px_0_rgba(130,10,40,0.45)] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 motion-safe:animate-pulse " +
        (className ?? "")
      }
    >
      <PartyPopper className="h-5 w-5" aria-hidden="true" />
      Claim Bingo!
      <PartyPopper className="h-5 w-5 -scale-x-100" aria-hidden="true" />
    </button>
  );
}

export function BingoResultOverlay({
  winners,
  nameOf,
  selfId,
  players,
  calledCount,
  onLeave,
  onContinue,
  skin,
}: {
  winners: BingoWinner[];
  nameOf: (id: string) => string;
  selfId: string | null;
  players: Player[];
  calledCount: number;
  onLeave: () => void;
  onContinue: () => void;
  skin: BingoSkin;
}) {
  const [previewMode, setPreviewMode] = useState(false);
  const winner = winners[0];
  const winnerName = winner ? nameOf(winner.playerId) : "Player";
  const iWon = winner?.playerId === selfId;

  // Real-money prize for the winner, for a paid, settled match only.
  const roomState = useRoomStore((s) => s.roomState);
  const { settlement } = useMatchSettlement(deriveTerminalMatchId(roomState));
  const winnerPrize = winnerPrizesFor(settlement)?.[0] ?? null;

  if (previewMode) {
    return <BoardPreviewPill onClosePreview={() => setPreviewMode(false)} targetElementId="bingo-board-container" />;
  }

  const HeroIcon = iWon ? Trophy : PartyPopper;
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-[2rem] border-4 border-[#F5B400]/70 p-6 text-center shadow-2xl ${skin.card} ${skin.ink}`}>
        <HeroIcon className="mx-auto mb-2 h-12 w-12 text-[#F5B400]" aria-hidden="true" />
        <h2 className="mb-1 font-display text-3xl">{iWon ? "YOU WON BINGO!" : `${winnerName} WON BINGO!`}</h2>
        <BotResultNote player={players.find((p) => p.id === winner?.playerId)} className="mb-2 justify-center" />
        <p className={`text-sm font-medium ${skin.inkSoft} ${winnerPrize ? "mb-1" : "mb-4"}`}>Completed 5 lines in {calledCount} number callouts!</p>
        {winnerPrize && (
          <div className="mb-3 flex justify-center">
            <PrizeWonChip amount={winnerPrize} size="md" />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`inline-flex min-h-[46px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#FFE066] to-[#F5B400] py-2.5 text-xs font-black text-[#3A2200] shadow-md transition sm:text-sm ${skin.focus}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Board Preview
          </button>
          <button
            type="button"
            onClick={onLeave}
            className={`min-h-[46px] flex-1 cursor-pointer rounded-xl py-2.5 text-xs font-bold sm:text-sm ${skin.well} ${skin.ink} ${skin.focus}`}
          >
            Leave
          </button>
          <button
            type="button"
            onClick={onContinue}
            className={`min-h-[46px] flex-1 cursor-pointer rounded-xl bg-[#15803D] py-2.5 text-xs font-black text-white shadow-md transition hover:bg-[#166534] sm:text-sm ${skin.focus}`}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
