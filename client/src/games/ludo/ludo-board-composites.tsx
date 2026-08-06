import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LudoColor, LudoState, Player } from "@shared/types";
import { enterFullscreen, exitFullscreen, isFullscreenActive, onFullscreenChange } from "../../lib/fullscreen";

/** CSS custom-prop pair the global `.ludo-chip` glossy treatment reads. */
function chipVars(tint: string, dark: string): CSSProperties {
  return { "--chip": tint, "--chip-dark": dark } as CSSProperties;
}
import { Dice } from "./Dice";
import { Token } from "./Token";
import InstructionsModal from "./InstructionsModal";
import Toast from "./Toast";
import Confetti from "./Confetti";
import FloatingReactionsLayer from "./FloatingReactionsLayer";
import CursorLayer from "./CursorLayer";
import EndGameCard from "./EndGameCard";
import EmojiRain from "./EmojiRain";
import WinnerCelebration from "./WinnerCelebration";
import SettingsMenu from "./SettingsMenu";
import PrintBoardSVG from "./PrintBoardSVG";
import { seatColor, seatColorDark } from "./print-board";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { COLOR_HEX, COLOR_HEX_DARK, HOME_TOKEN_PCT, PLAYER_COLORS_ORDER } from "./board-layout";
import { ordinal } from "@shared/ludo-rules";
import { Avatar } from "./Avatar";
import { BoardSVG, HoverPreviewMarker, MiniBurst, polygonTokenSize } from "./ludo-board-shared";
import type { LudoBoardModel } from "./useLudoBoard";

/**
 * Ludo — shared composite layout pieces.
 *
 * Each composite takes the full board model (`m`) plus the raw state/players
 * Room.tsx hands the picker, so both shells render the identical functional
 * surface and only their surrounding column arrangement differs. Imports
 * `LudoBoardModel` as a type only — erased at compile time, so this does not
 * form a runtime import cycle with useLudoBoard.ts (which imports VALUES from
 * ludo-board-shared.tsx, never from this file).
 */

/** Crayon "LUDO" wordmark on a taped sticky-note — the reference header
 *  motif. Purely decorative; each letter tinted a play-color with a wax-
 *  crayon outline and a hand-drawn tilt. */
function LudoLogo() {
  const letters: ReadonlyArray<[string, string]> = [
    ["L", "#E4572E"], ["U", "#F2A900"], ["D", "#2E86DE"], ["O", "#3FA34D"],
  ];
  return (
    <div className="relative select-none flex-shrink-0" style={{ transform: "rotate(-3deg)" }} aria-label="Ludo">
      <span
        aria-hidden
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-9 h-3.5 rounded-sm"
        style={{ background: "rgba(228,177,40,0.35)", border: "1px solid rgba(154,110,26,0.4)", transform: "rotate(4deg)" }}
      />
      <div className="flex items-end leading-none font-display" style={{ fontSize: "1.7rem" }}>
        {letters.map(([ch, col], i) => (
          <span
            key={i}
            className="font-black"
            style={{
              color: col,
              WebkitTextStroke: "1.4px rgba(63,36,18,0.55)",
              textShadow: "0 2px 0 rgba(63,36,18,0.22)",
              transform: `rotate(${(i % 2 ? 1 : -1) * 4}deg)`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Paper header: menu · LUDO logo · turn banner · sound · Rules · Leave.
 *  `rightSlot` lets the desktop shell dock the room rail inline. */
export function LudoStatusBar({ m, state, rightSlot }: { m: LudoBoardModel; state: LudoState; rightSlot?: ReactNode }) {
  const finished = state.phase === "finished";
  const chipStyle = { background: "#F7E8C4", border: "2px solid #C8A66B", color: "#6D4323" } as const;
  const iconChip =
    "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg active:scale-95 transition";
  // Icon chip that grows to hold a text label from sm+ (phones stay compact).
  const labelChip =
    "flex-shrink-0 h-9 px-3 rounded-full flex items-center gap-1.5 justify-center text-sm font-bold active:scale-95 transition";
  // Fullscreen toggle — self-contained (no other game state needs it).
  const [isFs, setIsFs] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => onFullscreenChange(() => setIsFs(isFullscreenActive())), []);
  const toggleFullscreen = () => (isFs ? void exitFullscreen() : void enterFullscreen("any"));
  // Mirrors TurnTimeWarning's own trigger so the two can't disagree about
  // whether the chip is on screen.
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const warningActive =
    m.myTurn &&
    state.phase === "playing" &&
    state.turnDeadline != null &&
    secondsLeft <= 10 &&
    secondsLeft > 0;
  return (
    <div className="flex items-center flex-wrap gap-2">
      <button
        onClick={() => m.setShowSettings(true)}
        aria-label="Settings"
        title="Settings (theme, color-blind, hover preview)"
        className={iconChip}
        style={chipStyle}
      >
        ☰
      </button>
      <LudoLogo />
      <div className="flex-1 min-w-0 text-center px-1">
        {/* The final-10s countdown chip (TurnTimeWarning, rendered by
            LudoOverlays) is `fixed` to this exact top-centre slot, and Ludo
            never passed it an offset — so it landed straight on top of "Roll
            the dice". Yield the slot while it is up, the same way UNO's boards
            hide their house-rules badge. Nothing is lost: the chip states the
            same turn, louder. */}
        {warningActive ? null : finished ? (
          <div className="font-script text-lg font-bold" style={{ color: "var(--paper-ink-hi)" }}>
            🏆 {state.winnerId ? `${m.nameOf(state.winnerId)} wins!` : "Game over"}
          </div>
        ) : m.displayMyTurn ? (
          <>
            <div className="font-script text-sm font-bold leading-tight" style={{ color: "var(--paper-ink-hi)" }}>Your turn</div>
            <div className="font-display text-base leading-tight" style={{ color: "var(--paper-ink)" }}>
              {m.displayTurnPhase === "rolling" ? "Roll the dice" : "Pick a token"}
            </div>
          </>
        ) : (
          <div className="font-script text-sm" style={{ color: "var(--paper-ink-soft)" }}>
            {m.nameOf(m.displayTurnPlayerId)}&rsquo;s turn…
          </div>
        )}
      </div>
      <button onClick={m.toggleSound} className={iconChip} style={chipStyle} title={m.soundOn ? "Mute" : "Unmute"} aria-label="Toggle sound">
        {m.soundOn ? "🔊" : "🔈"}
      </button>
      <button
        onClick={toggleFullscreen}
        className={`${iconChip} hidden sm:flex`}
        style={chipStyle}
        title={isFs ? "Exit fullscreen" : "Fullscreen"}
        aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFs ? "🗗" : "⛶"}
      </button>
      <button onClick={() => m.setShowInstructions(true)} className={labelChip} style={chipStyle} title="How to play" aria-label="How to play">
        <span aria-hidden>❔</span>
        <span className="hidden sm:inline">Rules</span>
      </button>
      {m.onLeave && (
        <button
          onClick={m.onLeave}
          className={labelChip}
          style={{ background: "#D64541", border: "2px solid #A5302C", color: "#fff" }}
          title="Leave room"
          aria-label="Leave room"
        >
          <span className="hidden sm:inline">Leave</span>
          <span aria-hidden>⇥</span>
        </button>
      )}
      {rightSlot}
    </div>
  );
}

/** Real, in-game per-seat status — no fabricated scores/levels/rewards
 *  (dropped by design). Shows the player's name, seat-colored rim + avatar
 *  ring, a live online dot (isConnected), and 4 pips = tokens home
 *  (finishedCount). The active seat gets a colored glow. */
type LudoSeatMeta = {
  pid: string;
  name: string;
  color: LudoColor;
  online: boolean;
  isBot: boolean;
  /** The server is playing this seat for its owner. Distinct from `isBot` —
   *  they are coming back, and the seat is still theirs. */
  autoPlaying: boolean;
  /** Why — "disconnected" ends on reconnect, "idle" the moment they play.
   *  Not optional: `orderedSeats` always sets it (to undefined when the seat
   *  is not taken over), and an optional field there breaks the type
   *  predicate that filters colourless seats out of the list. */
  autoReason: "disconnected" | "idle" | undefined;
  tokensHome: number;
  active: boolean;
  /** Won the finished game — gets the gold winner treatment. */
  isWinner: boolean;
  /** 1-based finishing place once this seat is all-home, else null. Shown
   *  DURING play too: with ranked finishing a player can be done while the
   *  rest are still going, and the table needs to see that. */
  rank: number | null;
};

/**
 * Turn countdown ring drawn around the active seat's avatar. Pure
 * presentation — the caller owns the timer so the same value can also be
 * printed as text (the number lives in the "Turn" chip rather than a floating
 * badge, which the card's `overflow-hidden` would clip).
 */
function TurnCountdownRing({ pct, color, box }: { pct: number; color: string; box: number }) {
  const stroke = 2.5;
  const r = (box - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg
      className="absolute pointer-events-none"
      width={box}
      height={box}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%) rotate(-90deg)" }}
      aria-hidden
    >
      <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(109,67,35,0.18)" strokeWidth={stroke} />
      <circle
        cx={box / 2}
        cy={box / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        style={{ transition: "stroke-dashoffset 900ms linear, stroke 250ms" }}
      />
    </svg>
  );
}

function orderedSeats(state: LudoState, players: Player[], selfId?: string | null): LudoSeatMeta[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const seats = state.playerOrder
    .map((pid) => {
      const color = state.playerColors[pid];
      const p = byId.get(pid);
      return {
        pid,
        color,
        name: p?.name ?? "Player",
        online: p?.isConnected !== false,
        isBot: p?.isBot === true,
        autoPlaying: p?.isAutoPlaying === true,
        autoReason: p?.autoPlayReason,
        tokensHome: state.finishedCount?.[pid] ?? 0,
        active: state.turnPlayerId === pid && state.phase !== "finished",
        isWinner: state.phase === "finished" && state.winnerId === pid,
        rank: (() => {
          const i = (state.finishOrder ?? []).indexOf(pid);
          return i >= 0 ? i + 1 : null;
        })(),
      };
    })
    .filter((s): s is LudoSeatMeta => !!s.color);

  // ALWAYS true turn order (`state.playerOrder` — exactly what the engine's
  // advanceTurn walks), rotated so the player AFTER you comes first and YOU
  // come last. Reading top-left → bottom-right is then "who plays next … all
  // the way round to me", and the highlight steps card by card.
  //
  // The previous colour sort is why turns looked out of sequence: colours are
  // HAND-PICKED (`chosenColor`), so a player who joins 2nd but picks brown
  // lands 8th in colour order while still taking the 2nd turn. Sorting cards
  // by colour made the engine's perfectly sequential rotation look random.
  // Self-last also puts you in the BOTTOM row, matching the board rotation
  // that now places your yard nearest you.
  const selfIdx = selfId ? seats.findIndex((s) => s.pid === selfId) : -1;
  if (selfIdx < 0) return seats;
  return [...seats.slice(selfIdx + 1), ...seats.slice(0, selfIdx + 1)];
}

/** Compact seat card. Progressive disclosure per the AAA critique: one
 *  progress indicator only (4 pips — the redundant "x/4 home" caption is
 *  dropped; exact count lives in the title tooltip), slimmer padding, and
 *  the active seat expands with a pulsing colored glow ring + a "Turn"
 *  badge so whose-turn-it-is reads without parsing text. */
function LudoPlayerCard({
  seat,
  deadline,
  index = 0,
  dense = false,
  ultra = false,
  isSelf = false,
  registerCard,
  onTarget,
}: {
  seat: LudoSeatMeta;
  /** Active turn's deadline — drives the countdown ring on the active seat. */
  deadline?: number | null;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
  /** 3+ cards abreast on a phone. At 390px that leaves ~111px per card, and
   *  the full layout does not fit: measured, the name was cut 27-81% and the
   *  4 pips overflowed their column. Dense swaps the pips for a compact
   *  "n/4", shrinks the avatar, and drops the inline BOT tag (kept in the
   *  tooltip) so the NAME gets the whole text column. */
  dense?: boolean;
  /** 4 cards abreast (7-8 players on a phone) — ~81px each. Beside a 26px
   *  avatar that leaves a ~27px text column, which cannot show a name at any
   *  font size worth reading. Ultra stacks the card vertically so the name
   *  gets the FULL card width instead of what's left over. */
  ultra?: boolean;
  /** The local player — marked so you can find yourself at a glance. */
  isSelf?: boolean;
  /** Registers this card as the anchor a reaction flies TO/FROM. Without it
   *  `reactionAnchor()` returns null and targeted reactions render nowhere —
   *  which is why they were invisible on every 5-8 player board. */
  registerCard?: (playerId: string, el: Element | null) => void;
  /** Tapping an opponent's card aims a reaction at them. */
  onTarget?: (playerId: string) => void;
}) {
  const rim = COLOR_HEX_DARK[seat.color];
  const tint = COLOR_HEX[seat.color];
  const offline = !seat.online;
  const avatarPx = ultra ? 24 : dense ? 26 : 30;

  // Turn timer. The engine publishes only a deadline (not the turn's length),
  // so the ring self-calibrates: the first tick after a new deadline arrives
  // becomes that turn's "full" value and the arc drains from there. Urgency is
  // carried by BOTH colour and the printed seconds (colour-blind safe).
  const timedKey = seat.active && !offline ? (deadline ?? null) : null;
  const secondsLeft = useTurnSecondsLeft(timedKey);
  const [track, setTrack] = useState<{ key: number | null; total: number }>({ key: null, total: 1 });
  if (timedKey !== track.key) setTrack({ key: timedKey, total: Math.max(1, secondsLeft) });
  const showTimer = timedKey != null;
  const pct = Math.max(0, Math.min(1, secondsLeft / Math.max(1, track.total)));
  const timerColor = secondsLeft <= 5 ? "#DC2626" : secondsLeft <= 10 ? "#F59E0B" : tint;

  return (
    <div
      // Stacking is gated on WIDTH as well as count. 4 cards abreast on a
      // 360px phone gives ~81px and must stack, but the same 4 on a 1024px
      // landscape screen gives ~250px, where stacking only wastes ~59px of
      // board height for no legibility gain. `sm:` returns those to inline.
      ref={(el) => registerCard?.(seat.pid, el)}
      onClick={onTarget && !isSelf ? () => onTarget(seat.pid) : undefined}
      role={onTarget && !isSelf ? "button" : undefined}
      tabIndex={onTarget && !isSelf ? 0 : undefined}
      onKeyDown={
        onTarget && !isSelf
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTarget(seat.pid);
              }
            }
          : undefined
      }
      title={onTarget && !isSelf ? `React at ${seat.name}` : undefined}
      className={`ludo-card-in relative flex-1 min-w-0 rounded-2xl overflow-hidden ${
        onTarget && !isSelf ? "cursor-pointer" : ""
      } ${
        ultra
          ? "flex flex-col items-center gap-0.5 px-1 py-1 sm:flex-row sm:items-center sm:gap-2 sm:px-2"
          : "flex items-center gap-2 px-2 py-1"
      }`}
      style={{
        background: seat.isWinner ? "rgba(255,247,214,0.98)" : "rgba(255,251,240,0.94)",
        border: `2.5px solid ${seat.isWinner ? "#E0AE3B" : rim}`,
        boxShadow: seat.isWinner
          ? "0 0 0 3px rgba(224,174,59,0.45), 0 8px 18px rgba(0,0,0,0.2)"
          : isSelf
            ? "0 0 0 2px rgba(224,174,59,0.85), 0 5px 12px rgba(0,0,0,0.16)"
            : seat.active
              ? "0 6px 14px rgba(0,0,0,0.18)"
              : "0 3px 8px rgba(0,0,0,0.10)",
        // Offline seats recede but stay legible (never fully hidden — you
        // still need to see who you're waiting on).
        opacity: offline ? 0.62 : 1,
        filter: offline ? "grayscale(0.45)" : undefined,
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      {/* Breathing turn glow — the "current player" cue. */}
      {seat.active && (
        <span
          aria-hidden
          className="ludo-seat-glow absolute -inset-0.5 rounded-2xl pointer-events-none"
          style={{ boxShadow: `0 0 0 3px ${tint}, 0 0 16px 2px ${tint}99` }}
        />
      )}
      {/* Light sweep crossing the active card. */}
      {seat.active && !offline && (
        <span
          aria-hidden
          className="ludo-turn-sweep absolute inset-y-0 w-1/3 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${tint}26, transparent)` }}
        />
      )}
      <div className="relative flex-shrink-0">
        {/* Glossy seat-color chip frame around the avatar (online dot kept
            outside so `.ludo-chip`'s overflow-hidden doesn't clip it). */}
        <div className="ludo-chip rounded-full" style={{ padding: 3, ...chipVars(tint, rim) }}>
          <Avatar name={seat.name} color={seat.color} size={avatarPx} />
        </div>
        {showTimer && <TurnCountdownRing pct={pct} color={timerColor} box={avatarPx + 14} />}
        {/* Online dot moved to the TOP-right so the "YOU" ribbon can own the
            bottom edge without the two colliding. */}
        <span
          className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full z-10 ${offline ? "ludo-reconnect" : ""}`}
          style={{ background: seat.online ? "#37B24D" : "#F59E0B", border: "2px solid #FFFBF0" }}
          title={seat.online ? "Online" : "Reconnecting…"}
        />
        {/* Self marker rides ON the avatar — a badge in the text row would
            cost the very width the name is already short of. */}
        {isSelf && (
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10 px-1 rounded-full text-[7px] font-black uppercase tracking-[0.1em] leading-[1.4] whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#F7DA8B,#E0AE3B)", color: "#4A3300", border: "1px solid #FFFBF0" }}
          >
            You
          </span>
        )}
      </div>
      <div className={ultra ? "min-w-0 w-full sm:flex-1" : "min-w-0 flex-1"}>
        {/* Line 1 is the NAME and nothing else. The BOT tag and the turn chip
            used to share this row and were eating 20px and ~34px of a ~51px
            column — which is why the ACTIVE player's name (the one you most
            need to read) was the most truncated card on screen. */}
        <div className={`flex items-center gap-1 min-w-0 ${ultra ? "justify-center sm:justify-start" : ""}`}>
          {seat.isWinner && <span className="flex-shrink-0 text-[11px] leading-none" aria-hidden>👑</span>}
          {!seat.isWinner && seat.rank != null && (
            <span
              className="flex-shrink-0 rounded px-1 text-[9px] font-black leading-none"
              style={{ background: "#6D4323", color: "#FFF7E0", paddingBlock: 2 }}
              title={`Finished ${ordinal(seat.rank)}`}
            >
              {ordinal(seat.rank)}
            </span>
          )}
          <span
            className={`truncate font-black uppercase tracking-wide ${
              ultra ? "text-[10px] sm:text-[12px]" : dense ? "text-[11px]" : "text-[12px]"
            }`}
            style={{ color: rim }}
            title={`${seat.name}${seat.isBot ? " (bot)" : ""}`}
          >
            {seat.name}
          </span>
          {!dense && seat.isBot && <span className="flex-shrink-0 text-[8px] opacity-60">BOT</span>}
        </div>
        {/* Gated on `offline || autoPlaying`, not offline alone: an IDLE
            takeover is a fully connected player who has stopped responding,
            so keying this off the socket would have hidden exactly the case
            the table most needs explained — someone whose dot is green but
            whose turns are being played for them. */}
        {offline || seat.autoPlaying ? (
          <div
            className="text-[9px] font-bold mt-0.5 truncate"
            style={{ color: "#B45309" }}
            title={
              seat.autoReason === "idle"
                ? `${seat.name} isn't responding — the table is playing their turns. Any move takes the seat back.`
                : seat.autoPlaying
                  ? `${seat.name} lost connection — the table is playing their turns until they return`
                  : `${seat.name} is reconnecting`
            }
          >
            {/* Once the server has taken the seat, say so. "Reconnecting…" on
                its own leaves the table wondering why that player keeps
                moving while their dot is amber. */}
            {seat.autoReason === "idle"
              ? "Away · auto"
              : seat.autoPlaying
                ? "Reconnecting · auto"
                : "Reconnecting…"}
          </div>
        ) : (
          <div
            className={`flex items-center gap-1 mt-0.5 min-w-0 ${ultra ? "justify-center sm:justify-start" : ""}`}
            title={`${seat.tokensHome}/4 tokens home`}
          >
            {dense || ultra ? (
              // 4 pips need ~60px; a dense card's text column is ~51px, so they
              // were being clipped. The count says the same thing in ~20px.
              <span className="text-[10px] font-black tabular-nums flex-shrink-0" style={{ color: rim }}>
                {seat.tokensHome}/4
              </span>
            ) : (
              [0, 1, 2, 3].map((i) =>
                i < seat.tokensHome ? (
                  // filled = glossy seat-color chip bead (the global color treatment)
                  <span key={i} className="ludo-chip w-3 h-3 rounded-full flex-shrink-0" style={chipVars(tint, rim)} />
                ) : (
                  <span
                    key={i}
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: "rgba(109,67,35,0.14)", border: "1px solid rgba(109,67,35,0.22)" }}
                  />
                ),
              )
            )}
            {/* Status chip lives on line 2, beside the progress — never on the
                name's line. */}
            {seat.isWinner ? (
              <span
                className="ludo-chip flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ ...chipVars("#F4B400", "#AB7E00"), color: "#4A3300" }}
              >
                <span className="relative">Won</span>
              </span>
            ) : seat.active ? (
              <span
                className="ludo-chip flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ ...chipVars(showTimer ? timerColor : tint, rim), color: "#fff" }}
                title={showTimer ? `${secondsLeft}s left in this turn` : "Their turn"}
              >
                <span className="relative tabular-nums whitespace-nowrap">
                  {showTimer ? `${secondsLeft}s` : "Turn"}
                </span>
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** A row (or column) of player cards. `row="top"` shows the first half of
 *  the color-ordered seats, `row="bottom"` the rest — 2/2 for a 4-player
 *  game, matching the reference's above/below-board split. `orientation`
 *  is "row" on mobile (cards flow across above/below the board) and "col"
 *  on desktop (cards stack in a side rail flanking the board). */
export function LudoPlayerCards({
  state,
  players,
  row,
  orientation = "row",
  selfId,
  registerCard,
  onTarget,
}: {
  state: LudoState;
  players: Player[];
  /** "all" = every seat in one list (desktop single left rail); "top"/"bottom"
   *  = the board-ordered halves (mobile above/below the board). */
  row: "top" | "bottom" | "all";
  orientation?: "row" | "col";
  selfId?: string | null;
  registerCard?: (playerId: string, el: Element | null) => void;
  onTarget?: (playerId: string) => void;
}) {
  const seats = orderedSeats(state, players, selfId);
  const mid = Math.ceil(seats.length / 2);
  const shown = row === "all" ? seats : row === "top" ? seats.slice(0, mid) : seats.slice(mid);
  if (shown.length === 0) return null;

  if (orientation === "col") {
    return (
      <div className="flex flex-col gap-2">
        {shown.map((s, i) => (
          <LudoPlayerCard
            key={s.pid}
            seat={s}
            deadline={state.turnDeadline}
            index={i}
            registerCard={registerCard}
            onTarget={onTarget}
            isSelf={s.pid === selfId}
          />
        ))}
      </div>
    );
  }

  // Both mobile rows size their cards off the BUSIER row, so a 5-player game
  // (3 up / 2 down) no longer renders 111px cards above and 170px cards below
  // — same component, 53% different width, names truncated in one row and
  // whole in the other. Fixed width + centring keeps the two rows identical.
  //
  // `all` in row orientation is the single-strip mobile roster: every seat is
  // on one line, so it sizes off the FULL count rather than half of it.
  const perRow = row === "all" ? Math.max(1, seats.length) : Math.max(1, mid);
  const cardW = `calc((100% - ${(perRow - 1) * 0.5}rem) / ${perRow})`;
  const dense = perRow >= 3;
  const ultra = perRow >= 4;
  return (
    <div className="flex justify-center gap-2">
      {shown.map((s, i) => (
        <div key={s.pid} className="min-w-0" style={{ width: cardW, display: "flex" }}>
          <LudoPlayerCard
            seat={s}
            deadline={state.turnDeadline}
            index={i}
            registerCard={registerCard}
            onTarget={onTarget}
            dense={dense}
            ultra={ultra}
            isSelf={s.pid === selfId}
          />
        </div>
      ))}
    </div>
  );
}

/** The bottom roll "cup" — a felt-green dice tray with a rope rim and a
 *  paper ribbon. The whole cup is the roll control (Dice stays visual so we
 *  never nest a button in a button). Streak badge shows the live six-run. */
/** Bumps a key each time `rolling` goes true → false, so a one-shot landing
 *  animation can be replayed by remounting on that key. */
function useSettleKey(rolling: boolean): number {
  const [key, setKey] = useState(0);
  const prev = useRef(rolling);
  useEffect(() => {
    if (prev.current && !rolling) setKey((k) => k + 1);
    prev.current = rolling;
  }, [rolling]);
  return key;
}

/**
 * Turn callout — the "whose move is it" ticket that sits directly under the
 * board on mobile.
 *
 * Two problems it solves, both from the mobile design review:
 *
 *  1. DEAD SPACE. The board is width-bound on a portrait phone (≈394px on a
 *     430px screen), but its row is ~640px tall, so `items-center` floated it
 *     with ~124px of blank paper above AND below — a quarter of the screen
 *     doing nothing. This ticket spends part of that band.
 *
 *  2. THE PROMPT WAS 700px FROM THE CONTROL. "Your turn / Roll the dice" lived
 *     in the header at the top of the screen while the roll cup sits at the
 *     very bottom, so the instruction and the thing it instructs you to touch
 *     were at opposite ends. Announcing the turn adjacent to the board — and
 *     within thumb reach — puts cause and effect in one glance.
 *
 * The countdown is the other half: previously the only clock was a ~20px "15S"
 * chip on your own seat card, which is easy to miss entirely. Here it is a
 * first-class element that goes amber at 10s and red at 5s.
 */
export function LudoTurnCallout({ m, state }: { m: LudoBoardModel; state: LudoState }) {
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  if (state.phase !== "playing") return null;

  const activeId = m.displayTurnPlayerId;
  const color = state.playerColors[activeId] as LudoColor | undefined;
  const hex = color ? COLOR_HEX[color] : "#6D4323";
  const dark = color ? COLOR_HEX_DARK[color] : "#4A2E18";
  const mine = m.displayMyTurn;
  const ticking = state.turnDeadline != null && secondsLeft > 0;
  const urgent = ticking && secondsLeft <= 5;
  const warn = ticking && secondsLeft <= 10;

  const action = mine
    ? m.displayTurnPhase === "rolling"
      ? "Roll the dice"
      : "Pick a token to move"
    : m.displayTurnPhase === "rolling"
      ? "is rolling…"
      : "is moving…";

  return (
    <div
      // Re-keying on the handover restarts the entrance animation, so the turn
      // passing is something you SEE rather than a word quietly changing. Same
      // trick the roll tray uses for its dice-settle impact.
      key={m.turnPulse}
      className="ludo-turn-change mx-auto flex w-full max-w-[26rem] items-center gap-2.5 px-3 py-2"
      style={{
        background: mine ? "#F7E8C4" : "rgba(247,232,196,0.55)",
        border: `2px solid ${mine ? hex : "#C8A66B"}`,
        borderRadius: 12,
        boxShadow: mine ? `0 0 0 3px ${hex}22, 0 6px 14px rgba(0,0,0,0.16)` : "0 3px 8px rgba(0,0,0,0.10)",
      }}
      aria-live="polite"
    >
      {/* Colour anchor — ties the callout to a seat without repeating the
          avatar already shown on that player's card. */}
      <span
        className="shrink-0 rounded-full"
        style={{
          width: 14,
          height: 14,
          background: hex,
          border: `2px solid ${dark}`,
          boxShadow: mine ? `0 0 0 4px ${hex}33` : undefined,
        }}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-black" style={{ color: dark }}>
          {mine ? "YOUR TURN" : m.nameOf(activeId)}
        </div>
        <div className="truncate text-[11px] font-bold" style={{ color: "#8A6A45" }}>
          {action}
        </div>
      </div>
      {ticking && (
        <span
          className="shrink-0 tabular-nums font-black"
          style={{
            minWidth: 40,
            textAlign: "center",
            fontSize: 15,
            padding: "3px 8px",
            borderRadius: 8,
            color: "#fff",
            background: urgent ? "#DC2626" : warn ? "#D97706" : dark,
          }}
          aria-label={`${secondsLeft} seconds left`}
        >
          {secondsLeft}s
        </span>
      )}
    </div>
  );
}

/**
 * "What just happened" — the same copy the toasts carry, kept instead of
 * discarded after 3.2s. A player who looked away had no way to learn they had
 * been cut.
 *
 * TWO SHAPES, one source, because the two shells have opposite spare space:
 *
 *   rail  — desktop. A tall column that was holding one 92px dice button in
 *           868px of height, so a five-row list costs nothing.
 *   strip — mobile. A phone board is WIDTH-bound, so the board row is taller
 *           than the square inside it and leaves ~135px of blank paper above
 *           and below. This spends part of that. It sits OUTSIDE the board's
 *           own flex slot, so the ResizeObserver still measures what is left:
 *           in portrait the board keeps its size and the strip is free, and
 *           on a short landscape screen — where the board is height-bound and
 *           there is no slack to spend — the board simply wins and the strip
 *           gives way rather than forcing a scroll.
 */
export function LudoMatchFeed({
  m,
  variant,
}: {
  m: LudoBoardModel;
  variant: "rail" | "strip";
}) {
  const items = m.feed.slice(0, variant === "rail" ? 5 : 2);
  const empty = "Nothing yet — cuts and homecomings show up here.";

  if (variant === "strip") {
    // One compact card. Hidden entirely when there is nothing to say: on a
    // phone an empty box is worse than no box.
    if (items.length === 0) return null;
    return (
      <div
        className="mx-auto flex w-full max-w-[26rem] flex-col gap-0.5 rounded-xl px-2.5 py-1.5"
        style={{ background: "rgba(247,232,196,0.55)", border: "2px solid #C8A66B" }}
        aria-live="polite"
      >
        {items.map((f, i) => (
          <div
            key={f.id}
            className="flex items-center gap-1.5 truncate text-[11px] font-bold leading-tight"
            style={{ color: "#6D4323", opacity: i === 0 ? 1 : 0.6 }}
          >
            <span aria-hidden>{f.emoji}</span>
            <span className="truncate">{f.text}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-2xl px-2 py-2"
      style={{ background: "rgba(247,232,196,0.55)", border: "2px solid #C8A66B" }}
      aria-live="polite"
    >
      <div className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "#8A6A45" }}>
        Match feed
      </div>
      <ul className="flex flex-col gap-1">
        {items.length === 0 && (
          <li className="px-1.5 py-1 text-[11px] font-semibold" style={{ color: "#A08A6B" }}>
            {empty}
          </li>
        )}
        {items.map((f, i) => (
          <li
            key={f.id}
            className="flex items-start gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-semibold leading-snug"
            style={{
              color: "#6D4323",
              background: i === 0 ? "rgba(255,255,255,0.75)" : "transparent",
              opacity: 1 - i * 0.13,
            }}
          >
            <span aria-hidden>{f.emoji}</span>
            <span className="min-w-0 flex-1">{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The right rail — turn state, the dice, and what just happened.
 *
 * The column was 225px wide and 868px tall holding a single 92px dice button,
 * so the most important control on the screen read as debris floating in a
 * gutter. And whose turn it was lived in 12px italic text at the very top of
 * the page, ~300px from the seat card that was actually lit — on a four-player
 * table you had to hunt for it.
 *
 * Stacking the three together fixes both: the column earns its width, and the
 * turn state sits directly above the thing you press when it is yours.
 */
export function LudoTurnTower({
  m,
  state,
}: {
  m: LudoBoardModel;
  state: LudoState;
}) {
  const finished = state.phase === "finished";
  const activeId = m.displayTurnPlayerId;
  const color = state.playerColors[activeId] as LudoColor | undefined;
  const hex = color ? COLOR_HEX[color] : "#9C7A3C";
  const dark = color ? COLOR_HEX_DARK[color] : "#6D4323";
  const mine = m.displayMyTurn;
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const ticking = state.turnDeadline != null && secondsLeft > 0 && !finished;
  const urgent = ticking && secondsLeft <= 5;

  return (
    /* Three rows, not a centred stack: turn state pinned to the top of the
       column, the dice held on the board's own centre line where the eye
       already is, and the feed anchored to the bottom. Centring all three
       left them huddled in the middle of an 868px column with ~300px of bare
       paper above and below — the rail looked emptier than before it had
       anything in it. */
    <div className="grid h-full w-full grid-rows-[auto_1fr_auto] items-center justify-items-center gap-3">
      {/* ── Whose turn ─────────────────────────────────────────────────
          Keyed on turnPulse so the handover animates instead of silently
          swapping a word — a change you do not see is a change you miss. */}
      {!finished && (
        <div
          key={m.turnPulse}
          className="ludo-turn-change w-full rounded-2xl px-3 py-2.5 text-center"
          style={{
            background: mine ? hex : "#F7E8C4",
            border: `3px solid ${mine ? dark : "#C8A66B"}`,
            boxShadow: mine
              ? `0 0 0 4px ${hex}33, 0 6px 16px rgba(0,0,0,0.18)`
              : "0 3px 10px rgba(0,0,0,0.10)",
          }}
        >
          <div
            className="text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ color: mine ? "#FFFBF0" : "#8A6A45" }}
          >
            {mine ? "Your turn" : "Now playing"}
          </div>
          {!mine && (
            <div
              className="mt-0.5 truncate text-[15px] font-black leading-tight"
              style={{ color: dark }}
              title={m.nameOf(activeId)}
            >
              {m.nameOf(activeId)}
            </div>
          )}
          <div
            className="mt-0.5 text-[12px] font-bold"
            style={{ color: mine ? "#FFFBF0" : "#8A6A45" }}
          >
            {m.displayTurnPhase === "rolling" ? "Roll the dice" : "Move a token"}
          </div>

          {/* The clock only appears when it is actually running, and only goes
              loud in the last five seconds — a countdown that is always red
              stops meaning anything. */}
          {ticking && (
            <div
              className="mx-auto mt-1.5 w-fit rounded-full px-2.5 py-0.5 text-[13px] font-black tabular-nums"
              style={{
                background: urgent ? "#DC2626" : mine ? "rgba(255,255,255,0.9)" : "#EFE0BC",
                color: urgent ? "#fff" : dark,
              }}
              aria-label={`${secondsLeft} seconds left`}
            >
              {secondsLeft}s
            </div>
          )}
        </div>
      )}

      <div className="flex items-center">
        <LudoRollTray m={m} state={state} />
      </div>

      <LudoMatchFeed m={m} variant="rail" />
    </div>
  );
}

export function LudoRollTray({ m, state }: { m: LudoBoardModel; state: LudoState }) {
  const streak = state.consecutiveSixes > 0 && state.consecutiveSixes < 3;
  const canRoll = m.myTurn && m.canRoll && !m.rolling;
  const settleKey = useSettleKey(m.rolling);
  const finished = state.phase === "finished";
  // Name who we're waiting on — "Waiting…" alone leaves the player guessing,
  // and on desktop this tray sits far from the header's turn banner.
  const waitingFor = !finished && !m.displayMyTurn ? m.nameOf(m.displayTurnPlayerId) : null;

  /**
   * The cup wears the ACTIVE seat's colour.
   *
   * It was a fixed felt green whoever was playing, so the dice read as a
   * detached widget parked at the bottom of the screen rather than as this
   * player's dice. Colour is the cheapest possible tether between the cup and
   * the seat whose turn it is — no geometry, no animation path — and it makes
   * "whose turn" readable from the control itself.
   */
  const activeColor = state.playerColors[m.displayTurnPlayerId] as LudoColor | undefined;
  const cupTint = !finished && activeColor ? COLOR_HEX[activeColor] : "#57B65B";
  const cupDark = !finished && activeColor ? COLOR_HEX_DARK[activeColor] : "#1B5E20";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={canRoll ? m.roll : undefined}
        disabled={!canRoll}
        aria-label={
          finished
            ? "Game over"
            : canRoll
              ? "Roll the dice"
              : m.myTurn
                ? "Pick a token to move"
                : `Waiting for ${waitingFor ?? "the next player"}`
        }
        // Outline (not ring): this button sets an inline box-shadow, which
        // would beat the global `*:focus-visible` box-shadow ring.
        className="relative rounded-full flex items-center justify-center active:scale-95 transition disabled:cursor-default focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        style={{
          width: 92,
          height: 92,
          background: `radial-gradient(circle at 50% 35%, ${cupTint}, ${cupDark})`,
          border: `5px solid ${cupDark}`,
          boxShadow: canRoll
            ? `0 0 0 4px ${cupTint}66, 0 8px 18px rgba(0,0,0,0.3)`
            : "0 6px 14px rgba(0,0,0,0.22)",
        }}
      >
        <div
          key={settleKey}
          style={{ width: 58, height: 58 }}
          className={canRoll ? "ludo-cup-breathe" : settleKey > 0 ? "ludo-dice-impact" : undefined}
        >
          <Dice value={state.diceValue} rolling={m.rolling} highlight={canRoll} wooden={m.settings.woodenDice} size="100%" />
        </div>
        {streak && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-black flex items-center justify-center"
            style={{ background: "#DC2626", color: "#fff", border: "2px solid #FFFBF0" }}
            title={`${state.consecutiveSixes} sixes in a row — a third forfeits the turn`}
          >
            {state.consecutiveSixes}
          </span>
        )}
      </button>
      <div
        // The desktop shell has no turn callout — this label is its only
        // whose-turn-is-it text, so the handover has to register here too.
        key={m.turnPulse}
        className="ludo-turn-change px-4 py-0.5 text-[12px] font-black max-w-[11rem] truncate text-center"
        style={{
          // Now that the mobile turn callout is gone, this label IS the turn
          // sentence on both shells — so it carries the seat colour too
          // rather than sitting in neutral parchment beside a coloured cup.
          background: m.displayMyTurn ? cupTint : "#F7E8C4",
          border: `2px solid ${m.displayMyTurn ? cupDark : "#C8A66B"}`,
          color: m.displayMyTurn ? "#FFFFFF" : "#6D4323",
          borderRadius: 6,
        }}
      >
        {finished
          ? "Game over"
          : m.displayMyTurn
            ? m.displayTurnPhase === "rolling"
              ? "Tap to roll"
              : "Pick a token"
            : `${waitingFor}…`}
      </div>
    </div>
  );
}

/** Bottom action bar: Chat · Emoji · [roll cup] · Voice · Invite. The side
 *  buttons drive the (now strip-less) room rail's panels via the
 *  `bhalyam:open-room-panel` bridge — this bar is the ONLY persistent room
 *  toolbar now, so the duplicate top strip is gone (critique: reduce layers).
 *  Chat carries the live unread badge lifted from the rail. (Reference's
 *  "Rewards" stays dropped: no rewards system exists.) */
export function LudoBottomBar({
  m,
  state,
  unread = 0,
  withTray = true,
}: {
  m: LudoBoardModel;
  state: LudoState;
  unread?: number;
  /** False when the shell places the roll tray itself (mobile puts it under
   *  the board, so the dice reads as part of the game rather than as a fifth
   *  nav icon, and the control bar drops to a single compact row). */
  withTray?: boolean;
}) {
  const openPanel = (panel: string) =>
    window.dispatchEvent(new CustomEvent("bhalyam:open-room-panel", { detail: { panel } }));
  const NavBtn = ({ label, glyph, panel, badge }: { label: string; glyph: string; panel: string; badge?: number }) => (
    <button type="button" onClick={() => openPanel(panel)} className="flex flex-col items-center gap-0.5" aria-label={label}>
      <span
        className="relative w-11 h-11 rounded-full flex items-center justify-center text-lg active:scale-95 transition"
        style={{ background: "#F7E8C4", border: "2px solid #C8A66B" }}
      >
        {glyph}
        {badge != null && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
            style={{ background: "#DC2626", color: "#fff", border: "1.5px solid #FFFBF0" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-[9px] font-semibold" style={{ color: "var(--paper-ink)" }}>{label}</span>
    </button>
  );
  return (
    /* Invite is gone from the persistent bar and lives in the room panel
     * (still one tap from "More"). It is the rarest action here by a wide
     * margin — you invite once, before the match — and it was carrying the
     * same weight as Chat, which is used constantly. */
    <div className={`flex items-end justify-center ${withTray ? "gap-2 sm:gap-4" : "gap-6"}`}>
      <NavBtn label="Chat" glyph="💬" panel="chat" badge={unread} />
      <NavBtn label="Emoji" glyph="😊" panel="emoji" />
      {withTray && <LudoRollTray m={m} state={state} />}
      <NavBtn label="Voice" glyph="🎙️" panel="voice" />
      <NavBtn label="More" glyph="⋯" panel="room" />
    </div>
  );
}

/**
 * The board wrap: SVG board (cross or polygon), live cursors, hover preview,
 * the token overlay, capture sad-faces and per-home mini-bursts. `maxWidth`
 * is a shell-supplied CSS value so mobile/desktop can size it differently
 * without duplicating the markup.
 */
export function LudoBoardArea({
  m,
  state,
  players,
  maxWidth,
}: {
  m: LudoBoardModel;
  state: LudoState;
  players: Player[];
  maxWidth: string;
}) {
  return (
    <div
      ref={m.boardWrapRef}
      onMouseMove={m.onBoardMouseMove}
      onMouseLeave={() => {
        m.onBoardMouseLeave();
        m.clearHoverPreview();
      }}
      // `overflow-hidden` keeps the ROTATED board art inside the rounded card
      // — without it the spun background square's corners hang outside it.
      className={`ludo-board relative w-full mx-auto aspect-square select-none rounded-2xl overflow-hidden border-4 border-slate-950 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] theme-${m.settings.theme} ${m.settings.highContrast ? "hc" : ""}`}
      style={{ maxWidth }}
    >
      {/* EGOCENTRIC ORIENTATION. The board spins so the local player's own
          yard sits at the BOTTOM, nearest their hands — the same reason a card
          game deals your hand toward you. Picking brown on an 8-player board
          previously put your pieces at the far top edge.

          Applied as one CSS rotation on a wrapper that contains BOTH the board
          SVG and the token/cursor overlay, so they cannot drift apart: token
          coordinates are percentages of this same box, and rotating the box
          rotates art and pieces as one. Purely presentational — no engine
          index, track position or colour→arm mapping is touched, so it stays
          per-client and cannot desync players from each other. */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${m.boardRotation}deg)`,
          transformOrigin: "50% 50%",
          transition: "transform 500ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
      {m.polygonGeo ? (
        <PrintBoardSVG
          geo={m.polygonGeo}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={m.arms}
          activeColors={m.activeColors}
          hasCaptured={state.hasCaptured ?? {}}
          rotationDeg={m.boardRotation}
        />
      ) : (
        <BoardSVG
          playerColorsInRoom={m.activeColors}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={m.arms}
          paint={m.armPaint}
          hasCaptured={state.hasCaptured ?? {}}
          unlockBurst={m.unlockBurst}
          registerCard={m.registerPlayerCard}
          selfId={m.selfId}
          finishedCount={state.finishedCount}
          finishOrder={state.finishOrder ?? []}
          rotationDeg={m.boardRotation}
        />
      )}
      {/* Live opponent cursors */}
      <CursorLayer
        cursors={Object.values(m.cursors).filter((c) => c.playerId !== m.selfId)}
        players={players}
        playerColors={state.playerColors}
      />
      {/* Hover-preview glow on destination cell */}
      {m.hoverPreview && <HoverPreviewMarker preview={m.hoverPreview} geo={m.polygonGeo} />}

      {/* Token overlay */}
      <div className="absolute inset-0">
        {m.allTokens.map(({ pid, token }) => {
          const pos = m.tokenPosition(pid, token);
          const movable = pid === m.selfId && m.myTurn && state.movableTokenIds.includes(token.id);
          const idx = parseInt(token.id.split("-")[1] ?? "0", 10);
          // Print boards recolor each seat by its arm's flat sector color —
          // tokens must match their yard/lane, not the canonical LudoColor.
          // Polygon sectors are painted by ARM index, so tokens must use the
          // arm too or they would not match the wedge they sit in.
          const armIdx = m.polygonGeo
            ? PLAYER_COLORS_ORDER.indexOf(m.arms[pid])
            : -1;
          return (
            <Token
              key={token.id}
              color={state.playerColors[pid]}
              hex={armIdx >= 0 ? seatColor(armIdx) : undefined}
              hexDark={armIdx >= 0 ? seatColorDark(armIdx) : undefined}
              left={pos.left}
              top={pos.top}
              // `pos.scale` shrinks tokens that are sharing a cell so the
              // whole fanned cluster still fits inside it.
              size={
                (m.polygonGeo
                  ? polygonTokenSize(token.state, m.polygonGeo.cellSize)
                  : token.state === "yard"
                  ? 7
                  : token.state === "home"
                  // Shared with the HOME_SLOTS solve in board-layout.ts — a
                  // literal here is how the size and the slot spacing drifted
                  // apart and put finished tokens on the centre medallion.
                  ? HOME_TOKEN_PCT
                  : 6) * (pos.scale ?? 1)
              }
              movable={movable}
              onClick={movable ? () => m.move(token.id) : undefined}
              onMouseEnter={() => m.onHoverToken(pid, token)}
              onMouseLeave={m.clearHoverPreview}
              label={String(idx + 1)}
              // Cancels the board's rotation so the pawn and its number stay
              // upright whichever way the board is turned.
              counterRotateDeg={-m.boardRotation}
              cbMode={m.settings.colorBlindMode}
              golden={m.settings.goldenTokens}
              celebrating={m.celebratingIds.has(token.id)}
              // Must track the board's step interval — a transition longer
              // than one step merges the whole walk into a single slide.
              hopMs={m.hopMsOf(token.id)}
            />
          );
        })}
      </div>
      {/* Capture sad-faces (briefly visible at the victim's last position) */}
      {m.captureFaces.map((cf) => (
        <span
          key={cf.id}
          className="capture-face"
          style={{ left: `${cf.left}%`, top: `${cf.top}%`, rotate: `${-m.boardRotation}deg` }}
        >
          😵
        </span>
      ))}

      {/* Per-home mini confetti bursts */}
      {m.homeBursts.map((b) => (
        <MiniBurst key={b.id} left={b.left} top={b.top} color={b.color} />
      ))}
      </div>
    </div>
  );
}

/** Every modal/overlay layer the board can show. Mounted once per shell. */
export function LudoOverlays({
  m,
  state,
  players,
}: {
  m: LudoBoardModel;
  state: LudoState;
  players: Player[];
}) {
  const srTurn =
    state.phase === "finished"
      ? state.winnerId
        ? `${m.nameOf(state.winnerId)} wins the game`
        : "Game over"
      : m.myTurn
        ? state.turnPhase === "rolling"
          ? "Your turn — roll the dice"
          : "Your turn — pick a token"
        : `${m.nameOf(state.turnPlayerId)}'s turn`;
  return (
    <>
      {/* Screen-reader turn/result announcements — the visual cues (glow,
          ring, colour) convey this to sighted players; this is their
          non-visual equivalent. */}
      <div className="sr-only" role="status" aria-live="polite">
        {srTurn}
      </div>
      <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn && state.phase === "playing"} />
      {m.showInstructions && <InstructionsModal onClose={() => m.setShowInstructions(false)} />}
      {m.showSettings && <SettingsMenu onClose={() => m.setShowSettings(false)} />}
      {m.luckyBanner && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="lucky-banner bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-500 text-white text-2xl font-black px-8 py-4 rounded-2xl shadow-2xl"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
          >
            {m.luckyBanner}
          </div>
        </div>
      )}
      {m.cutFlash != null && !m.luckyBanner && (
        <div key={m.cutFlash} className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="ludo-cut-flash bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 text-white text-5xl font-black px-10 py-5 rounded-2xl shadow-2xl"
            style={{ textShadow: "0 3px 8px rgba(0,0,0,0.5)" }}
          >
            💥 CUT!
          </div>
        </div>
      )}
      {m.toast && <Toast text={m.toast.text} emoji={m.toast.emoji} color={m.toast.color} />}
      {!m.reduceMotion && Date.now() < m.confettiUntil && <Confetti />}
      <FloatingReactionsLayer
        reactions={m.reactions}
        anchorOf={m.reactionAnchor}
        playerColors={state.playerColors}
      />
      {!m.reduceMotion &&
        m.rains.map((r) => <EmojiRain key={r.id} emoji={r.emoji} />)}
      {m.showCelebration && state.winnerId && (
        <WinnerCelebration
          winner={
            players.find((p) => p.id === state.winnerId) ??
            { id: state.winnerId, name: "Winner", isHost: false, isReady: false, isConnected: true }
          }
          color={state.playerColors[state.winnerId] ?? "red"}
        />
      )}
      {m.showEndCard && state.phase === "finished" && (
        <EndGameCard
          winnerId={state.winnerId ?? null}
          players={players}
          playerColors={state.playerColors}
          playerOrder={state.playerOrder}
          finishOrder={state.finishOrder ?? []}
          stats={state.stats}
          finishedCount={state.finishedCount}
          // Hands off to the platform game-over flow (auto-leave countdown +
          // rematch), which the generic scorecard used to own.
          onClose={m.closeScorecard}
          onRematch={m.rematch}
        />
      )}
    </>
  );
}
