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
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
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
        {finished && (
          <button
            onClick={() => m.setShowEndCard(true)}
            className="font-script text-lg font-bold hover:underline cursor-pointer inline-flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition"
            style={{ color: "var(--paper-ink-hi)" }}
            title="View Game Recap & Scorecard"
          >
            🏆 {state.winnerId ? `${m.nameOf(state.winnerId)} wins!` : "Game over"}
            <span className="text-xs bg-[#6D4323]/10 text-[#6D4323] px-2 py-0.5 rounded-full border border-[#6D4323]/20 font-sans font-bold">Recap</span>
          </button>
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
  /** The seat's chosen avatar filename, from server state. Not optional for
   *  the same reason as `autoReason` below — an optional field here breaks
   *  the type predicate that filters colourless seats out of the list. */
  avatar: string | undefined;
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

const CROSS_YARD_ANGLES: Record<string, number> = {
  red: 315,
  green: 45,
  yellow: 135,
  blue: 225,
};

const QUADRANT_ORDER: Record<number, number> = {
  315: 1, // Top-Left
  45: 2,  // Top-Right
  225: 3, // Bottom-Left
  135: 4, // Bottom-Right
};

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
        avatar: p?.avatar,
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

  const selfSeat = selfId ? seats.find((s) => s.pid === selfId) : null;
  const selfBase = selfSeat ? (CROSS_YARD_ANGLES[selfSeat.color] ?? 225) : 225;
  const rot = (225 - selfBase + 360) % 360;

  return seats.sort((a, b) => {
    const angleA = ((CROSS_YARD_ANGLES[a.color] ?? 0) + rot) % 360;
    const angleB = ((CROSS_YARD_ANGLES[b.color] ?? 0) + rot) % 360;
    const orderA = QUADRANT_ORDER[angleA] ?? 99;
    const orderB = QUADRANT_ORDER[angleB] ?? 99;
    return orderA - orderB;
  });
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
  isManyPlayers = false,
  registerCard,
  onTarget,
}: {
  seat: LudoSeatMeta;
  /** Active turn's deadline — drives the countdown ring on the active seat. */
  deadline?: number | null;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
  dense?: boolean;
  ultra?: boolean;
  /** The local player — marked so you can find yourself at a glance. */
  isSelf?: boolean;
  /** True for 5-8 player boards — renders numeric notation (0/4) and larger pill. */
  isManyPlayers?: boolean;
  /** Registers this card as the anchor a reaction flies TO/FROM. */
  registerCard?: (playerId: string, el: Element | null) => void;
  /** Tapping an opponent's card aims a reaction at them. */
  onTarget?: (playerId: string) => void;
}) {
  const rim = COLOR_HEX_DARK[seat.color];
  const tint = COLOR_HEX[seat.color];
  const offline = !seat.online;
  const avatarPx = dense ? 26 : isManyPlayers ? 28 : 32;

  // Turn timer.
  const timedKey = seat.active && !offline ? (deadline ?? null) : null;
  const secondsLeft = useTurnSecondsLeft(timedKey);
  const [track, setTrack] = useState<{ key: number | null; total: number }>({ key: null, total: 1 });
  if (timedKey !== track.key) setTrack({ key: timedKey, total: Math.max(1, secondsLeft) });
  const showTimer = timedKey != null;
  const pct = Math.max(0, Math.min(1, secondsLeft / Math.max(1, track.total)));
  const timerColor = secondsLeft <= 5 ? "#DC2626" : secondsLeft <= 10 ? "#F59E0B" : tint;

  return (
    <div
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
      className={`ludo-card-in relative flex-1 min-w-0 rounded-2xl overflow-hidden flex items-center gap-2 sm:gap-2.5 ${
        isManyPlayers ? "px-2.5 py-2 min-h-[48px] sm:min-h-[52px]" : "px-3.5 py-2.5 min-h-[52px]"
      } ${
        onTarget && !isSelf ? "cursor-pointer" : ""
      }`}
      style={{
        background: seat.isWinner ? "rgba(255,247,214,0.98)" : "rgba(255,251,240,0.96)",
        border: `2px solid ${seat.isWinner ? "#E0AE3B" : tint}`,
        boxShadow: seat.isWinner
          ? "0 0 0 2.5px #E0AE3B, 0 4px 14px rgba(0,0,0,0.16)"
          : isSelf
            ? "0 0 0 2.5px #E0AE3B, 0 4px 12px rgba(0,0,0,0.12)"
            : seat.active
              ? `0 0 0 2.5px ${tint}, 0 4px 14px ${tint}40`
              : "0 2px 8px rgba(0,0,0,0.08)",
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
          style={{ boxShadow: `0 0 0 2.5px ${tint}, 0 0 16px 2px ${tint}80` }}
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
        <div className="ludo-chip rounded-full" style={{ padding: 2.5, ...chipVars(tint, rim) }}>
          <Avatar name={seat.name} avatar={seat.avatar} color={seat.color} size={avatarPx} />
        </div>
        {showTimer && <TurnCountdownRing pct={pct} color={timerColor} box={avatarPx + 12} />}
        <span
          className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full z-10 ${offline ? "ludo-reconnect" : ""}`}
          style={{ background: seat.online ? "#37B24D" : "#F59E0B", border: "1.5px solid #FFFBF0" }}
          title={seat.online ? "Online" : "Reconnecting…"}
        />
        {isSelf && (
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10 px-1 rounded-full text-[7.5px] font-black uppercase tracking-[0.05em] leading-[1.3] whitespace-nowrap shadow-xs"
            style={{ background: "linear-gradient(135deg,#F7DA8B,#E0AE3B)", color: "#4A3300", border: "1px solid #FFFBF0" }}
          >
            You
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 flex flex-col justify-center">
        {/* Row 1: Player Name */}
        <div className="flex items-center gap-1 min-w-0 leading-tight">
          {seat.isWinner && <span className="flex-shrink-0 text-[11px] leading-none" aria-hidden>👑</span>}
          {!seat.isWinner && seat.rank != null && (
            <span
              className="flex-shrink-0 rounded px-1 text-[8.5px] font-black leading-none"
              style={{ background: "#6D4323", color: "#FFF7E0", paddingBlock: 1.5 }}
              title={`Finished ${ordinal(seat.rank)}`}
            >
              {ordinal(seat.rank)}
            </span>
          )}
          <span
            className="truncate font-black uppercase tracking-tight text-[11px] sm:text-[12.5px]"
            style={{ color: rim }}
            title={`${seat.name}${seat.isBot ? " (bot)" : ""}`}
          >
            {seat.name}
          </span>
          {seat.isBot && <span className="flex-shrink-0 text-[9px] opacity-50" title="Bot">🤖</span>}
        </div>

        {/* Row 2: Tokens / Turn / Status */}
        {offline || seat.autoPlaying ? (
          <div
            className="text-[9px] font-bold mt-0.5 truncate leading-none"
            style={{ color: "#B45309" }}
            title={
              seat.autoReason === "idle"
                ? `${seat.name} isn't responding — the table is playing their turns.`
                : seat.autoPlaying
                  ? `${seat.name} lost connection — auto playing.`
                  : `${seat.name} is reconnecting`
            }
          >
            {seat.autoReason === "idle"
              ? "Away · auto"
              : seat.autoPlaying
                ? "Reconnecting"
                : "Reconnecting…"}
          </div>
        ) : (
          <div
            className="flex items-center gap-1 mt-0.5 min-w-0 leading-none"
            title={`${seat.tokensHome}/4 tokens home`}
          >
            {isManyPlayers ? (
              /* Numeric 0/4 notation for 5-8 player boards */
              <span
                className="inline-flex items-center font-mono font-black text-[10px] sm:text-[11px] tabular-nums tracking-tight px-1.5 py-0.5 rounded leading-none"
                style={{
                  background: seat.tokensHome > 0 ? `${tint}25` : "rgba(109,67,35,0.08)",
                  color: seat.tokensHome > 0 ? rim : "#6D4C3D",
                  border: `1px solid ${seat.tokensHome > 0 ? `${tint}50` : "rgba(109,67,35,0.18)"}`,
                }}
              >
                {seat.tokensHome}/4
              </span>
            ) : (
              /* Dot pips notation for 2-4 player boards */
              [0, 1, 2, 3].map((i) =>
                i < seat.tokensHome ? (
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

/** A row (or column) of player cards. */
export function LudoPlayerCards({
  state,
  players,
  row = "all",
  orientation = "row",
  selfId,
  registerCard,
  onTarget,
}: {
  state: LudoState;
  players: Player[];
  row?: "top" | "bottom" | "all" | "grid";
  orientation?: "row" | "col";
  selfId?: string | null;
  registerCard?: (playerId: string, el: Element | null) => void;
  onTarget?: (playerId: string) => void;
}) {
  const seats = orderedSeats(state, players, selfId);
  if (seats.length === 0) return null;
  const isManyPlayers = seats.length >= 5;

  if (orientation === "col") {
    return (
      <div className="flex flex-col gap-2">
        {seats.map((s, i) => (
          <LudoPlayerCard
            key={s.pid}
            seat={s}
            deadline={state.turnDeadline}
            index={i}
            isManyPlayers={isManyPlayers}
            registerCard={registerCard}
            onTarget={onTarget}
            isSelf={s.pid === selfId}
          />
        ))}
      </div>
    );
  }

  if (row === "grid" || (row === "all" && seats.length > 2)) {
    const mid = Math.ceil(seats.length / 2);
    const row1 = seats.slice(0, mid);
    const row2 = seats.slice(mid);
    return (
      <div className="flex flex-col gap-2 w-full max-w-[36rem] px-1">
        <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-2.5">
          {row1.map((s, i) => (
            <LudoPlayerCard
              key={s.pid}
              seat={s}
              deadline={state.turnDeadline}
              index={i}
              isManyPlayers={isManyPlayers}
              registerCard={registerCard}
              onTarget={onTarget}
              isSelf={s.pid === selfId}
            />
          ))}
        </div>
        {row2.length > 0 && (
          <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-2.5">
            {row2.map((s, i) => (
              <LudoPlayerCard
                key={s.pid}
                seat={s}
                deadline={state.turnDeadline}
                index={mid + i}
                isManyPlayers={isManyPlayers}
                registerCard={registerCard}
                onTarget={onTarget}
                isSelf={s.pid === selfId}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const shown = row === "top" ? seats.slice(0, Math.ceil(seats.length / 2)) : seats.slice(Math.ceil(seats.length / 2));
  const perRow = Math.max(1, shown.length);
  const cardW = `calc((100% - ${(perRow - 1) * 0.5}rem) / ${perRow})`;
  return (
    <div className="flex justify-center gap-2">
      {shown.map((s, i) => (
        <div key={s.pid} className="min-w-0" style={{ width: cardW, display: "flex" }}>
          <LudoPlayerCard
            seat={s}
            deadline={state.turnDeadline}
            index={i}
            isManyPlayers={isManyPlayers}
            registerCard={registerCard}
            onTarget={onTarget}
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
          width: 96,
          height: 96,
          background: `radial-gradient(circle at 50% 35%, ${cupTint}ee 0%, ${cupDark} 75%, #051408 100%)`,
          border: `4.5px solid ${cupDark}`,
          boxShadow: canRoll
            ? `0 0 0 4px ${cupTint}66, inset 0 6px 14px rgba(0,0,0,0.55), inset 0 -3px 6px rgba(255,255,255,0.2), 0 10px 22px rgba(0,0,0,0.35)`
            : "inset 0 6px 14px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(255,255,255,0.15), 0 6px 16px rgba(0,0,0,0.24)",
        }}
      >
        {/* Felt textured arena inner rim */}
        <div
          key={settleKey}
          style={{ width: 62, height: 62 }}
          className={`flex items-center justify-center ${
            canRoll ? "ludo-cup-breathe" : settleKey > 0 ? "ludo-dice-impact" : ""
          }`}
        >
          <Dice value={state.diceValue} rolling={m.rolling} highlight={canRoll} wooden={m.settings.woodenDice} size="56px" />
        </div>
        {streak && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-black flex items-center justify-center z-20 shadow-md"
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
    <button type="button" onClick={() => openPanel(panel)} className="flex flex-col items-center gap-1 active:scale-95 transition cursor-pointer" aria-label={label}>
      <span
        className="relative w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-md"
        style={{
          background: "linear-gradient(135deg, #FFFDF8 0%, #F5E5C0 100%)",
          border: "2.5px solid #6D4323",
          boxShadow: "0 4px 10px rgba(109,67,35,0.22)",
        }}
      >
        {glyph}
        {badge != null && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow"
            style={{ background: "#DC2626", color: "#fff", border: "1.5px solid #FFFBF0" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "#4A2E18", textShadow: "0 1px 0 rgba(255,255,255,0.8)" }}>{label}</span>
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
      id="game-board-container"
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
            💥 Govinda Govinda! 💥
          </div>
        </div>
      )}
      {m.toast && <Toast text={m.toast.text} emoji={m.toast.emoji} color={m.toast.color} />}
      {!m.reduceMotion && Date.now() < m.confettiUntil && <Confetti />}
      <FloatingReactionsLayer
        reactions={m.reactions}
        anchorOf={m.reactionAnchor}
        glowOf={(id) => {
          const color = state.playerColors[id];
          return color ? COLOR_HEX[color] : undefined;
        }}
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
