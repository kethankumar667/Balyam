import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LudoColor, LudoState, Player } from "@shared/types";
import { enterFullscreen, exitFullscreen, isFullscreenActive, onFullscreenChange } from "../../lib/fullscreen";
import type { CameraShakeOptions, CameraPunchOptions } from "../../animations/camera/useTableCamera";

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
import { GotchaCaptureOverlay, SafeShieldPop, OutOfGateBurst, HomeEntryBurst, LuckySixBurst } from "./LudoAnimations";
import SettingsMenu from "./SettingsMenu";
import PrintBoardSVG from "./PrintBoardSVG";
import { seatColor, seatColorDark } from "./print-board";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { COLOR_HEX, COLOR_HEX_DARK, HOME_TOKEN_PCT, PLAYER_COLORS_ORDER } from "./board-layout";
import { ordinal } from "@shared/ludo-rules";
import { Avatar } from "./Avatar";
import { BoardSVG, HoverPreviewMarker, MiniBurst, polygonTokenSize } from "./ludo-board-shared";
import type { LudoBoardModel } from "./useLudoBoard";
import { LUDO_THEMES, LUDO_THEME_LABELS, type LudoTheme } from "./settings";
import {
  MenuIcon,
  SpeakerIcon,
  SpeakerMutedIcon,
  ExpandIcon,
  CompressIcon,
  HelpIcon,
  LeaveDoorIcon,
  CrownIcon,
  BotIcon,
  QuitIcon,
  WarningIcon,
  HomeIcon,
  ChatIcon,
  SmileyIcon,
  MicIcon,
  MoreIcon,
  DiceIcon,
  ImpactIcon,
  BlockedIcon,
  SkipIcon,
} from "./ludo-icons";

/** Maps the `LudoFeedItem.emoji` values `useLudoBoard`'s event recorder
 *  produces to the stroke-icon set, so the match feed reads as chrome
 *  rather than OS emoji. Falls back to the raw emoji for anything new. */
function FeedGlyph({ emoji, size = 12 }: { emoji: string; size?: number }) {
  switch (emoji) {
    case "💥":
      return <ImpactIcon size={size} />;
    case "🏠":
      return <HomeIcon size={size} />;
    case "🏆":
      return <CrownIcon size={size} />;
    case "⛔":
      return <BlockedIcon size={size} />;
    case "↪":
      return <SkipIcon size={size} />;
    default:
      return <span aria-hidden>{emoji}</span>;
  }
}

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

/** Line-art die (outline square + 5 pips), for background decoration only —
 *  not a UI control, so it doesn't belong in ludo-icons.tsx. `currentColor`,
 *  no fill on the body, so it reads as a soft silhouette at any size/opacity. */
function DecorDie({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" style={style} aria-hidden focusable="false">
      <rect x="6" y="6" width="88" height="88" rx="20" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle cx="30" cy="30" r="7" fill="currentColor" />
      <circle cx="70" cy="30" r="7" fill="currentColor" />
      <circle cx="50" cy="50" r="7" fill="currentColor" />
      <circle cx="30" cy="70" r="7" fill="currentColor" />
      <circle cx="70" cy="70" r="7" fill="currentColor" />
    </svg>
  );
}

/** Line-art Ludo pawn silhouette (ball head + flared skirt), for background
 *  decoration only. */
function DecorPawn({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 140" style={style} aria-hidden focusable="false">
      <circle cx="50" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M34 58 Q50 52 66 58 L80 124 Q50 138 20 124 Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

/** Small 4-point sparkle accent, for background decoration only. */
function DecorSpark({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" style={style} aria-hidden focusable="false">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="currentColor" />
    </svg>
  );
}

/**
 * Purely decorative Ludo motifs (dice, pawns, sparkles) scattered behind the
 * board/rails to fill the wide bare margin a landscape desktop viewport
 * leaves around a board that's capped by height, not width. `currentColor`
 * is `--ludo-label` — the one variable every theme already tunes to read
 * clearly-but-quietly against its own screen background, so this needs no
 * new per-theme colors and never clashes light-on-light or dark-on-dark.
 * `-z-10` on a `relative` parent keeps it behind every real child
 * regardless of DOM order; `pointer-events-none` keeps it inert.
 */
export function LudoDecorBackdrop() {
  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none"
      style={{ color: "var(--ludo-label)" }}
      aria-hidden
    >
      <DecorDie style={{ position: "absolute", top: "3%", left: "1%", width: 100, height: 100, opacity: 0.16, transform: "rotate(-14deg)" }} />
      <DecorPawn style={{ position: "absolute", top: "6%", right: "1%", width: 84, height: 118, opacity: 0.16, transform: "rotate(11deg)" }} />
      <DecorPawn style={{ position: "absolute", bottom: "5%", left: "1.5%", width: 92, height: 130, opacity: 0.14, transform: "rotate(-9deg)" }} />
      <DecorDie style={{ position: "absolute", bottom: "4%", right: "1%", width: 88, height: 88, opacity: 0.15, transform: "rotate(19deg)" }} />
      <DecorSpark style={{ position: "absolute", top: "24%", right: "16%", width: 26, height: 26, opacity: 0.5 }} />
      <DecorSpark style={{ position: "absolute", bottom: "22%", left: "17%", width: 20, height: 20, opacity: 0.4 }} />
    </div>
  );
}

/** Bubble-candy "LUDO" wordmark with a gold crown, matching the reference
 *  brand mark — each letter a distinct bright color with a white bubble
 *  outline and a soft drop shadow, independent of the active theme so the
 *  mark reads the same "flag" whether the chrome around it is Classic's
 *  gold or Neon's violet. The script tagline only shows where there's
 *  room to breathe (desktop's header has it; mobile's compact bar doesn't). */
function LudoLogo() {
  const letters: ReadonlyArray<[string, string]> = [
    ["L", "#FF4D6D"], ["U", "#3B82F6"], ["D", "#F97316"], ["O", "#22C55E"],
  ];
  return (
    <div className="relative select-none flex-shrink-0 flex items-end gap-2" aria-label="Ludo">
      <div className="relative flex items-end leading-none font-display" style={{ fontSize: "2rem" }}>
        <span
          className="absolute -top-2.5 left-1/2 -translate-x-1/2"
          style={{ color: "#FBBF24", filter: "drop-shadow(0 1px 1px rgba(120,53,15,0.5))", transform: "rotate(-6deg)" }}
        >
          <CrownIcon size={16} />
        </span>
        {letters.map(([ch, col], i) => (
          <span
            key={i}
            className="font-black"
            style={{
              color: col,
              WebkitTextStroke: "2.5px white",
              paintOrder: "stroke fill",
              filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.28))",
              transform: `rotate(${(i % 2 ? 1 : -1) * 3}deg)`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
      <span className="hidden lg:flex flex-col leading-tight pb-0.5 font-script text-[13px] -rotate-2" style={{ color: "var(--ludo-card-subtext, #8C7355)" }}>
        <span>Good Friends</span>
        <span className="inline-flex items-center gap-1">
          Greater Games <span aria-hidden style={{ color: "#EF4444" }}>♥</span>
        </span>
      </span>
    </div>
  );
}

/** Paper header: menu · LUDO logo · turn banner · sound · Rules · Leave.
 *  `rightSlot` lets the desktop shell dock the room rail inline. */
/** Theme accent shown as a small swatch dot on the theme-toggle chip — one
 *  representative hue per theme, reusing colors the theme blocks already
 *  define instead of new ones. Cycles through all of `LUDO_THEMES` (the same
 *  order the Display Settings picker shows), not just a subset — this used
 *  to hardcode a 3-way classic/neon/paper flip that silently stranded
 *  players on whichever of neon/paper they last picked, since emerald,
 *  midnight and sunset were never reachable from the header at all. */
const THEME_SWATCH: Record<LudoTheme, string> = {
  classic: "#E8720C",
  paper: "#6D4323",
  neon: "#A78BFA",
  emerald: "#34D399",
  midnight: "#64748B",
  sunset: "#C2603A",
};

function nextLudoTheme(current: LudoTheme): LudoTheme {
  const i = LUDO_THEMES.indexOf(current);
  return LUDO_THEMES[(i + 1) % LUDO_THEMES.length];
}

export function LudoStatusBar({ m, state, rightSlot }: { m: LudoBoardModel; state: LudoState; rightSlot?: ReactNode }) {
  const finished = state.phase === "finished";
  // Glass-chip chrome: a tinted, blurred, glowing-border chip rather than a
  // flat fill — the same "real depth" material UNO's stadium chrome uses,
  // tuned to this game's own warm palette via the theme's own CSS vars.
  const chipStyle = {
    background: "var(--ludo-chip-bg, rgba(255,251,240,0.85))",
    border: "2px solid var(--ludo-chip-border, #E8A23A)",
    color: "var(--ludo-chip-text, #6B3F1D)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
  } as const;
  const iconChip =
    "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition";
  // Icon chip that grows to hold a text label from sm+ (phones stay compact).
  const labelChip =
    "flex-shrink-0 h-9 px-3 rounded-full flex items-center gap-1.5 justify-center text-sm font-bold active:scale-95 transition";
  const themeLabel = LUDO_THEME_LABELS[m.settings.theme];
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
        <MenuIcon size={17} />
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
            <CrownIcon size={16} className="inline-block align-[-2px] mr-0.5" />
            {state.winnerId ? `${m.nameOf(state.winnerId)} wins!` : "Game over"}
            <span className="text-xs bg-[#6D4323]/10 text-[#6D4323] px-2 py-0.5 rounded-full border border-[#6D4323]/20 font-sans font-bold">Recap</span>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => m.updateSettings({ theme: nextLudoTheme(m.settings.theme) })}
        className={labelChip}
        style={chipStyle}
        title={`Current theme: ${m.settings.theme}. Click to switch theme.`}
        aria-label="Toggle board theme"
      >
        <span
          aria-hidden
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: THEME_SWATCH[m.settings.theme], boxShadow: "0 0 4px currentColor" }}
        />
        <span className="hidden sm:inline">{themeLabel}</span>
      </button>
      <button onClick={m.toggleSound} className={iconChip} style={chipStyle} title={m.soundOn ? "Mute" : "Unmute"} aria-label="Toggle sound">
        {m.soundOn ? <SpeakerIcon size={16} /> : <SpeakerMutedIcon size={16} />}
      </button>
      <button
        onClick={toggleFullscreen}
        className={`${iconChip} hidden sm:flex`}
        style={chipStyle}
        title={isFs ? "Exit fullscreen" : "Fullscreen"}
        aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFs ? <CompressIcon size={16} /> : <ExpandIcon size={16} />}
      </button>
      <button onClick={() => m.setShowInstructions(true)} className={labelChip} style={chipStyle} title="How to play" aria-label="How to play">
        <HelpIcon size={16} />
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
          <LeaveDoorIcon size={15} />
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
  /** Force-removed by the server's auto-play turn cap. Tokens stay on the
   *  board exactly where they were — this seat is simply never handed a
   *  turn again. Distinct from `autoPlaying`: this never reverts. */
  hasQuit: boolean;
  tokensHome: number;
  active: boolean;
  /** Won the finished game — gets the gold winner treatment. */
  isWinner: boolean;
  /** 1-based finishing place once this seat is all-home, else null. Shown
   *  DURING play too: with ranked finishing a player can be done while the
   *  rest are still going, and the table needs to see that. */
  rank: number | null;
};


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

function orderedSeats(state: LudoState, players: Player[] = [], selfId?: string | null): LudoSeatMeta[] {
  const byId = new Map((players ?? []).map((p) => [p.id, p]));
  const seats = (state.playerOrder ?? [])
    .map((pid) => {
      const color = state.playerArms?.[pid] ?? state.playerColors?.[pid] ?? "red";
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
        hasQuit: p?.hasQuit === true,
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

  // 5-8 players: polygon board order rotated so local player is first
  if ((state.playerOrder?.length ?? 0) >= 5) {
    if (!selfId) return seats;
    const selfIdx = seats.findIndex((s) => s.pid === selfId);
    if (selfIdx <= 0) return seats;
    return [...seats.slice(selfIdx), ...seats.slice(0, selfIdx)];
  }

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

/** Compact, beautiful player seat card. Progressive disclosure per the AAA
 *  critique: one progress indicator only (4 pips — the redundant "x/4 home"
 *  caption is dropped; exact count lives in the title tooltip), slimmer
 *  padding, clean typography, crisp avatar ring, and a clear active turn
 *  timer pill without visual clipping.
 */
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
  const rim = (seat.color && COLOR_HEX_DARK[seat.color]) || "#971B2B";
  const tint = (seat.color && COLOR_HEX[seat.color]) || "#D7263D";
  const offline = !seat.online;
  const avatarPx = ultra ? 26 : dense ? 28 : isManyPlayers ? 28 : 34;

  // Turn timer.
  const timedKey = seat.active && !offline ? (deadline ?? null) : null;
  const secondsLeft = useTurnSecondsLeft(timedKey);
  const showTimer = timedKey != null;

  // Ultra-compact card layout for 7-8 players on small mobile screens
  if (ultra) {
    return (
      <div
        ref={(el) => registerCard?.(seat.pid, el)}
        onClick={onTarget && !isSelf ? () => onTarget(seat.pid) : undefined}
        role={onTarget && !isSelf ? "button" : undefined}
        tabIndex={onTarget && !isSelf ? 0 : undefined}
        title={onTarget && !isSelf ? `React at ${seat.name}` : undefined}
        className={`ludo-card-in relative w-full min-w-0 rounded-xl p-1.5 flex flex-col items-center justify-between gap-1 transition-all ${
          onTarget && !isSelf ? "cursor-pointer" : ""
        }`}
        style={{
          background: seat.isWinner
            ? "linear-gradient(135deg, #FFFDF0 0%, #FEF9C3 100%)"
            : seat.active
            ? `linear-gradient(135deg, #FFFFFF 0%, ${tint}18 100%)`
            : "var(--ludo-card-bg, #FFFDF8)",
          border: `1.5px solid ${
            seat.isWinner
              ? "#E0AE3B"
              : seat.active
              ? tint
              : isSelf
              ? "#E0AE3B"
              : "var(--ludo-card-border, rgba(200, 166, 107, 0.45))"
          }`,
          boxShadow: seat.isWinner
            ? "0 0 0 2px #E0AE3B, 0 4px 10px rgba(224,174,59,0.25)"
            : seat.active
            ? `0 0 0 1.5px ${tint}, 0 4px 12px ${tint}30`
            : "0 1px 4px rgba(0,0,0,0.04)",
          opacity: offline || seat.hasQuit ? 0.65 : 1,
          filter: offline || seat.hasQuit ? "grayscale(0.45)" : undefined,
          animationDelay: `${Math.min(index, 8) * 40}ms`,
        }}
      >
        {seat.active && !offline && (
          <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none" aria-hidden>
            <span
              className="ludo-turn-sweep absolute inset-y-0 left-0 w-1/3"
              style={{ background: `linear-gradient(100deg, transparent, ${tint}55, transparent)` }}
            />
          </span>
        )}
        {/* Top: Avatar + Tokens Badge or Active Timer */}
        <div className="relative flex items-center justify-center w-full">
          <div
            className={`rounded-full p-0.5 transition-all flex items-center justify-center ${
              seat.active ? "ring-2 ring-offset-1 ring-amber-400 dark:ring-amber-500 shadow-xs ludo-chip" : ""
            }`}
            style={seat.active ? chipVars(tint, rim) : { background: `${tint}35` }}
          >
            <div className="rounded-full overflow-hidden flex items-center justify-center bg-white shadow-inner">
              <Avatar name={seat.name} avatar={seat.avatar} color={seat.color} size={avatarPx} />
            </div>
          </div>

          {/* Online status indicator */}
          <span
            className={`absolute -bottom-0.5 right-1/4 w-2 h-2 rounded-full z-10 ${
              offline ? "ludo-reconnect" : ""
            }`}
            style={{
              background: seat.online ? "#10B981" : "#F59E0B",
              border: "1px solid #FFFDF8",
            }}
          />

          {/* Floating turn indicator when active */}
          {seat.active && !offline && (
            <span
              className="absolute -top-2 -right-1 font-mono font-black text-[9px] px-1 py-0.2 rounded-full bg-amber-500 text-white shadow-xs border border-amber-300 animate-pulse"
            >
              {showTimer ? `${secondsLeft}s` : "Turn"}
            </span>
          )}

          {/* Winner Crown */}
          {seat.isWinner && (
            <span className="absolute -top-2.5 -left-1 leading-none text-amber-500" aria-hidden>
              <CrownIcon size={11} />
            </span>
          )}
        </div>

        {/* Bottom: Name & Token Count */}
        <div className="w-full min-w-0 flex flex-col items-center gap-0.5 text-center">
          <div className="flex items-center justify-center gap-0.5 w-full min-w-0">
            <span
              className="truncate font-extrabold uppercase text-[10.5px] leading-tight text-stone-900 max-w-full"
              style={{ color: rim }}
              title={`${seat.name}${seat.isBot ? " (bot)" : ""}`}
            >
              {seat.name}
            </span>
            {isSelf && (
              <span className="text-[7.5px] font-black px-1 rounded bg-amber-200 text-amber-900 shrink-0">
                You
              </span>
            )}
          </div>

          {/* Tokens home notation */}
          <span
            className="inline-flex items-center gap-0.5 font-mono font-black text-[9px] tabular-nums px-1 rounded leading-none text-stone-600"
            style={{
              background: seat.tokensHome > 0 ? `${tint}20` : "rgba(109,67,35,0.06)",
              color: seat.tokensHome > 0 ? rim : "#6D4C3D",
            }}
          >
            <HomeIcon size={9} />
            {seat.tokensHome}/4
          </span>
        </div>
      </div>
    );
  }

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
      className={`ludo-card-in relative flex-1 min-w-0 rounded-2xl flex items-center justify-between gap-2 transition-all ${
        isManyPlayers ? "px-2.5 py-1.5 min-h-[44px]" : "px-3 py-2 min-h-[50px]"
      } ${
        onTarget && !isSelf ? "cursor-pointer" : ""
      }`}
      style={{
        background: seat.isWinner
          ? "linear-gradient(135deg, #FFFDF0 0%, #FEF9C3 100%)"
          : seat.active
          ? `linear-gradient(135deg, #FFFFFF 0%, ${tint}14 100%)`
          : "var(--ludo-card-bg, #FFFDF8)",
        border: `2px solid ${
          seat.isWinner
            ? "#E0AE3B"
            : seat.active
            ? tint
            : isSelf
            ? "#E0AE3B"
            : "var(--ludo-card-border, rgba(200, 166, 107, 0.45))"
        }`,
        boxShadow: seat.isWinner
          ? "0 0 0 2px #E0AE3B, 0 4px 14px rgba(224,174,59,0.25)"
          : seat.active
          ? `0 0 0 1.5px ${tint}, 0 4px 14px ${tint}30`
          : isSelf
          ? "0 0 0 1.5px #E0AE3B40, 0 2px 6px rgba(0,0,0,0.06)"
          : "0 2px 6px rgba(0,0,0,0.04)",
        opacity: offline || seat.hasQuit ? 0.65 : 1,
        filter: offline || seat.hasQuit ? "grayscale(0.45)" : undefined,
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      {seat.active && !offline && (
        <span className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" aria-hidden>
          <span
            className="ludo-turn-sweep absolute inset-y-0 left-0 w-1/3"
            style={{ background: `linear-gradient(100deg, transparent, ${tint}45, transparent)` }}
          />
        </span>
      )}
      {/* Left: Avatar Hub */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <div
            className={`rounded-full p-0.5 transition-all flex items-center justify-center ${
              seat.active ? "ring-2 ring-offset-1 ring-amber-400 dark:ring-amber-500 shadow-xs ludo-chip" : ""
            }`}
            style={seat.active ? chipVars(tint, rim) : { background: `${tint}35` }}
          >
            <div className="rounded-full overflow-hidden flex items-center justify-center bg-white shadow-inner">
              <Avatar name={seat.name} avatar={seat.avatar} color={seat.color} size={avatarPx} />
            </div>
          </div>

          {/* Presence Status Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full z-10 ${
              offline ? "ludo-reconnect" : ""
            }`}
            style={{
              background: seat.online ? "#10B981" : "#F59E0B",
              border: "1.5px solid #FFFDF8",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
            title={seat.online ? "Online" : "Reconnecting…"}
          />
        </div>

        {/* Center: Player Name & Tokens Progress */}
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
          {/* Row 1: Name + Role Badges */}
          <div className="flex items-center gap-1 min-w-0 leading-tight">
            {seat.isWinner && (
              <span className="flex-shrink-0 leading-none text-amber-500" aria-hidden>
                <CrownIcon size={12} />
              </span>
            )}
            {!seat.isWinner && seat.rank != null && (
              <span
                className="flex-shrink-0 rounded px-1 text-[8px] font-black leading-none bg-[#6D4323] text-[#FFF7E0] py-0.5"
                title={`Finished ${ordinal(seat.rank)}`}
              >
                {ordinal(seat.rank)}
              </span>
            )}
            <span
              className="truncate font-extrabold uppercase tracking-tight text-xs sm:text-[13px] text-stone-900"
              style={{ color: rim }}
              title={`${seat.name}${seat.isBot ? " (bot)" : ""}`}
            >
              {seat.name}
            </span>
            {isSelf && (
              <span
                className="flex-shrink-0 px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider leading-none text-amber-950 shadow-2xs"
                style={{ background: "linear-gradient(135deg, #FDE047, #F59E0B)" }}
              >
                You
              </span>
            )}
            {seat.isBot && (
              <span className="flex-shrink-0 opacity-70" title="Bot">
                <BotIcon size={11} />
              </span>
            )}
          </div>

          {/* Row 2: Tokens Home Progress, Away Status, or Quit */}
          {seat.hasQuit ? (
            <div
              className="text-[9.5px] font-extrabold truncate leading-none flex items-center gap-1 text-stone-500"
              title="Quit — the table played their turns for too long and moved on without them"
            >
              <QuitIcon size={11} />
              <span>Quit</span>
            </div>
          ) : offline || seat.autoPlaying ? (
            <div
              className="text-[9.5px] font-extrabold truncate leading-none flex items-center gap-1 text-amber-700"
            >
              <WarningIcon size={11} />
              <span>
                {seat.autoReason === "idle"
                  ? "Away · auto"
                  : seat.autoPlaying
                    ? "Reconnecting"
                    : "Reconnecting…"}
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 mt-0.5 leading-none"
              title={`${seat.tokensHome}/4 tokens reached home`}
            >
              {isManyPlayers ? (
                /* Numeric notation for 5-6 players */
                <span
                  className="inline-flex items-center gap-1 font-mono font-black text-[9.5px] tabular-nums px-1.5 py-0.5 rounded leading-none"
                  style={{
                    background: seat.tokensHome > 0 ? `${tint}20` : "rgba(109,67,35,0.08)",
                    color: seat.tokensHome > 0 ? rim : "#6D4C3D",
                    border: `1px solid ${seat.tokensHome > 0 ? `${tint}40` : "rgba(109,67,35,0.15)"}`,
                  }}
                >
                  <HomeIcon size={9} />
                  <span>{seat.tokensHome}/4</span>
                </span>
              ) : (
                /* Elegant token dots notation for 2-4 players */
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((i) => {
                    const isHome = i < seat.tokensHome;
                    return (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                          isHome ? "scale-110 shadow-xs ludo-chip" : "opacity-40"
                        }`}
                        style={{
                          ...(isHome ? chipVars(tint, rim) : { background: "#CBD5E1" }),
                          border: isHome
                            ? "1px solid rgba(255,255,255,0.9)"
                            : "1px solid rgba(148,163,184,0.4)",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Status & Turn Countdown Hub — ONLY rendered for active turn or finished ranks to eliminate clutter */}
      {(seat.isWinner || (seat.active && !offline) || seat.rank != null) && (
        <div className="flex-shrink-0 flex items-center justify-end">
          {seat.isWinner ? (
            <span
              className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 text-amber-950 border border-amber-300"
              style={{ background: "linear-gradient(135deg, #FDE047, #F59E0B)" }}
            >
              <CrownIcon size={11} />
              <span>Won</span>
            </span>
          ) : seat.active && !offline ? (
            <div
              className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 border transition-all ${
                showTimer && secondsLeft <= 5
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-300 animate-pulse shadow-red-500/30"
                  : "text-amber-950 border-amber-300/80 shadow-amber-500/20"
              }`}
              style={{
                background:
                  showTimer && secondsLeft <= 5
                    ? undefined
                    : "linear-gradient(135deg, #FDE047 0%, #F59E0B 100%)",
              }}
              title={showTimer ? `${secondsLeft}s left in this turn` : "Active turn"}
            >
              <DiceIcon size={10} />
              <span className="tabular-nums font-mono font-black">
                {showTimer ? `${secondsLeft}s` : "Turn"}
              </span>
            </div>
          ) : seat.rank != null ? (
            <span
              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-stone-600 bg-stone-200/80 border border-stone-300"
            >
              {ordinal(seat.rank)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** A row (or column) of player cards with responsive layouts for 2 to 8 players. */
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
  const count = seats.length;
  const isManyPlayers = count >= 5;
  const isUltra = count >= 7;

  if (orientation === "col") {
    return (
      <div className="flex flex-col gap-2 w-full">
        {seats.map((s, i) => (
          <LudoPlayerCard
            key={s.pid}
            seat={s}
            deadline={state.turnDeadline}
            index={i}
            isManyPlayers={isManyPlayers}
            ultra={false}
            registerCard={registerCard}
            onTarget={onTarget}
            isSelf={s.pid === selfId}
          />
        ))}
      </div>
    );
  }

  // Responsive Grid Layout for Mobile and Boards
  if (row === "grid" || row === "all") {
    // 2 Players: 1 row of 2 spacious cards
    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-2 w-full max-w-[36rem] px-1">
          {seats.map((s, i) => (
            <LudoPlayerCard
              key={s.pid}
              seat={s}
              deadline={state.turnDeadline}
              index={i}
              isManyPlayers={false}
              registerCard={registerCard}
              onTarget={onTarget}
              isSelf={s.pid === selfId}
            />
          ))}
        </div>
      );
    }

    // 3 Players: 1 row of 3 cards
    if (count === 3) {
      return (
        <div className="grid grid-cols-3 gap-1.5 w-full max-w-[36rem] px-1">
          {seats.map((s, i) => (
            <LudoPlayerCard
              key={s.pid}
              seat={s}
              deadline={state.turnDeadline}
              index={i}
              isManyPlayers={true}
              registerCard={registerCard}
              onTarget={onTarget}
              isSelf={s.pid === selfId}
            />
          ))}
        </div>
      );
    }

    // 4 Players: 2x2 grid (generous ~175px width per card on mobile!)
    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-2 w-full max-w-[36rem] px-1">
          {seats.map((s, i) => (
            <LudoPlayerCard
              key={s.pid}
              seat={s}
              deadline={state.turnDeadline}
              index={i}
              isManyPlayers={false}
              registerCard={registerCard}
              onTarget={onTarget}
              isSelf={s.pid === selfId}
            />
          ))}
        </div>
      );
    }

    // 5 or 6 Players: 2 rows of 3 columns
    if (count === 5 || count === 6) {
      return (
        <div className="grid grid-cols-3 gap-1.5 w-full max-w-[36rem] px-1">
          {seats.map((s, i) => (
            <LudoPlayerCard
              key={s.pid}
              seat={s}
              deadline={state.turnDeadline}
              index={i}
              isManyPlayers={true}
              registerCard={registerCard}
              onTarget={onTarget}
              isSelf={s.pid === selfId}
            />
          ))}
        </div>
      );
    }

    // 7 or 8 Players: 2 rows of 4 columns with ultra-compact vertical cards
    return (
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full max-w-[36rem] px-1">
        {seats.map((s, i) => (
          <LudoPlayerCard
            key={s.pid}
            seat={s}
            deadline={state.turnDeadline}
            index={i}
            isManyPlayers={true}
            ultra={true}
            registerCard={registerCard}
            onTarget={onTarget}
            isSelf={s.pid === selfId}
          />
        ))}
      </div>
    );
  }

  const shown = row === "top" ? seats.slice(0, Math.ceil(seats.length / 2)) : seats.slice(Math.ceil(seats.length / 2));
  const perRow = Math.max(1, shown.length);
  const cardW = `calc((100% - ${(perRow - 1) * 0.5}rem) / ${perRow})`;
  return (
    <div className="flex justify-center gap-1.5 w-full">
      {shown.map((s, i) => (
        <div key={s.pid} className="min-w-0" style={{ width: cardW, display: "flex" }}>
          <LudoPlayerCard
            seat={s}
            deadline={state.turnDeadline}
            index={i}
            isManyPlayers={isManyPlayers}
            ultra={isUltra}
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
 * Table-level impact-feel for capture/home events — a shake for a hit, a
 * lighter punch for a token reaching home. Reads `state.lastEvent` (already
 * on the wire for the toast/feed) rather than needing new model state, so
 * either shell can wire it to its own `useTableCamera()` instance with one
 * line, matching how UNO fires `shake`/`punch` from its own impact beats.
 */
export function useLudoTableImpact(
  lastEvent: LudoState["lastEvent"],
  camera: { shake: (opts?: CameraShakeOptions) => void; punch: (opts?: CameraPunchOptions) => void },
) {
  const seenTs = useRef(0);
  useEffect(() => {
    if (!lastEvent || lastEvent.ts <= seenTs.current) return;
    seenTs.current = lastEvent.ts;
    if (lastEvent.kind === "capture") camera.shake({ intensity: 8 });
    else if (lastEvent.kind === "home") camera.punch({ scale: 1.05 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);
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
        style={{ background: "var(--ludo-feed-bg, rgba(247,232,196,0.55))", border: "2px solid var(--ludo-feed-border, #C8A66B)" }}
        aria-live="polite"
      >
        {items.map((f, i) => (
          <div
            key={f.id}
            className="flex items-center gap-1.5 truncate text-[11px] font-bold leading-tight"
            style={{ color: "var(--ludo-feed-text, #6D4323)", opacity: i === 0 ? 1 : 0.6 }}
          >
            <FeedGlyph emoji={f.emoji} />
            <span className="truncate">{f.text}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-2xl px-2 py-2"
      style={{ background: "var(--ludo-feed-bg, rgba(247,232,196,0.55))", border: "2px solid var(--ludo-feed-border, #C8A66B)" }}
      aria-live="polite"
    >
      <div className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "var(--ludo-feed-text, #8A6A45)" }}>
        Match feed
      </div>
      <ul className="flex flex-col gap-1">
        {items.length === 0 && (
          <li className="px-1.5 py-1 text-[11px] font-semibold" style={{ color: "var(--ludo-feed-text, #A08A6B)", opacity: 0.7 }}>
            {empty}
          </li>
        )}
        {items.map((f, i) => (
          <li
            key={f.id}
            className="flex items-start gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-semibold leading-snug"
            style={{
              color: "var(--ludo-feed-text, #6D4323)",
              background: i === 0 ? "rgba(255,255,255,0.15)" : "transparent",
              opacity: 1 - i * 0.13,
            }}
          >
            <FeedGlyph emoji={f.emoji} />
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
            background: mine ? hex : "var(--ludo-panel-bg, #F7E8C4)",
            border: `3px solid ${mine ? dark : "var(--ludo-panel-border, #C8A66B)"}`,
            boxShadow: mine
              ? `0 0 0 4px ${hex}33, 0 6px 16px rgba(0,0,0,0.18)`
              : "0 3px 10px rgba(0,0,0,0.10)",
          }}
        >
          <div
            className="text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ color: mine ? "#FFFBF0" : "var(--ludo-panel-text, #8A6A45)" }}
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
            style={{ color: mine ? "#FFFBF0" : "var(--ludo-panel-text, #8A6A45)" }}
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
                background: urgent ? "#DC2626" : mine ? "rgba(255,255,255,0.9)" : "var(--ludo-chip-bg, #EFE0BC)",
                color: urgent ? "#fff" : mine ? dark : "var(--ludo-panel-text, #6D4323)",
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
        className="relative rounded-2xl flex items-center justify-center active:scale-95 transition disabled:cursor-default focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        style={{
          width: 116,
          height: 116,
          background: `radial-gradient(circle at 50% 35%, ${cupTint}ee 0%, ${cupDark} 75%, #051408 100%)`,
          border: `4.5px solid ${cupDark}`,
          boxShadow: canRoll
            ? `0 0 0 4px ${cupTint}66, inset 0 6px 14px rgba(0,0,0,0.55), inset 0 -3px 6px rgba(255,255,255,0.2), 0 10px 22px rgba(0,0,0,0.35)`
            : "inset 0 6px 14px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(255,255,255,0.15), 0 6px 16px rgba(0,0,0,0.24)",
        }}
      >
        {/* Felt textured arena inner rim — deliberately much smaller than
            the square background now, so the background reads as a frame
            behind the die rather than a tight-fitting cup around it. */}
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
            className="ludo-chip absolute -top-1 -right-1 min-w-[26px] h-[22px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center gap-0.5 z-20 text-white"
            style={{ ...chipVars("#EF4444", "#7F1D1D"), border: "2px solid #FFFBF0" }}
            title={`${state.consecutiveSixes} sixes in a row — a third forfeits the turn`}
          >
            <DiceIcon size={10} />
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
          background: m.displayMyTurn ? cupTint : "var(--ludo-chip-bg, #F7E8C4)",
          border: `2px solid ${m.displayMyTurn ? cupDark : "var(--ludo-chip-border, #C8A66B)"}`,
          color: m.displayMyTurn ? "#FFFFFF" : "var(--ludo-chip-text, #6D4323)",
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
  const NavBtn = ({ label, icon, panel, badge }: { label: string; icon: ReactNode; panel: string; badge?: number }) => (
    <button type="button" onClick={() => openPanel(panel)} className="flex flex-col items-center gap-1 active:scale-95 transition cursor-pointer" aria-label={label}>
      <span
        className="relative w-11 h-11 rounded-full flex items-center justify-center shadow-md"
        style={{
          background: "var(--ludo-nav-bg, linear-gradient(135deg, #FFFDF8 0%, #F5E5C0 100%))",
          border: "2.5px solid var(--ludo-nav-border, #6D4323)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
          color: "var(--ludo-nav-text, #4A2E18)",
        }}
      >
        {icon}
        {badge != null && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow"
            style={{ background: "#DC2626", color: "#fff", border: "1.5px solid #FFFBF0" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--ludo-nav-text, #4A2E18)" }}>{label}</span>
    </button>
  );
  return (
    /* Invite is gone from the persistent bar and lives in the room panel
     * (still one tap from "More"). It is the rarest action here by a wide
     * margin — you invite once, before the match — and it was carrying the
     * same weight as Chat, which is used constantly. */
    <div className={`flex items-end justify-center ${withTray ? "gap-2 sm:gap-4" : "gap-6"}`}>
      <NavBtn label="Chat" icon={<ChatIcon size={19} />} panel="chat" badge={unread} />
      <NavBtn label="Emoji" icon={<SmileyIcon size={19} />} panel="emoji" />
      {withTray && <LudoRollTray m={m} state={state} />}
      <NavBtn label="Voice" icon={<MicIcon size={19} />} panel="voice" />
      <NavBtn label="More" icon={<MoreIcon size={19} />} panel="room" />
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
          finishOrder={state.finishOrder ?? []}
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

      {/* GAL: Gotcha Capture Overlay */}
      {m.activeCapture && (
        <GotchaCaptureOverlay
          victimName={m.activeCapture.victimName}
          attackerName={m.activeCapture.attackerName}
          attackerColor={m.activeCapture.attackerColor}
          left={m.activeCapture.left}
          top={m.activeCapture.top}
        />
      )}

      {/* GAL: Safe Square Shield Pops */}
      {m.activeSafePops.map((sp) => (
        <SafeShieldPop key={sp.id} left={sp.left} top={sp.top} color={sp.color} />
      ))}

      {/* GAL: Out of Gate Entry Bursts */}
      {m.activeOutOfGates.map((og) => (
        <OutOfGateBurst key={og.id} left={og.left} top={og.top} color={og.color} />
      ))}

      {/* GAL: Home Entry Badges */}
      {m.activeHomeEntries.map((he) => (
        <HomeEntryBurst key={he.id} left={he.left} top={he.top} color={he.color} />
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
      {m.activeLuckySix && <LuckySixBurst />}
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
