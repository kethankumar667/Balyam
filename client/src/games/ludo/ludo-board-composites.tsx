import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LudoColor, LudoEvent, LudoState, Player } from "@shared/types";
import { getSocket } from "../../lib/socket";
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
import { COLOR_HEX, COLOR_HEX_DARK, PLAYER_COLORS_ORDER } from "./board-layout";
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
        {finished ? (
          <div className="font-script text-lg font-bold" style={{ color: "#2E7D32" }}>
            🏆 {state.winnerId ? `${m.nameOf(state.winnerId)} wins!` : "Game over"}
          </div>
        ) : m.myTurn ? (
          <>
            <div className="font-script text-sm font-bold leading-tight" style={{ color: "#2E7D32" }}>Your turn</div>
            <div className="font-display text-base leading-tight" style={{ color: "#6D4323" }}>
              {state.turnPhase === "rolling" ? "Roll the dice" : "Pick a token"}
            </div>
          </>
        ) : (
          <div className="font-script text-sm" style={{ color: "#8A6D4B" }}>
            {m.nameOf(state.turnPlayerId)}&rsquo;s turn…
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
  tokensHome: number;
  active: boolean;
  /** Won the finished game — gets the gold winner treatment. */
  isWinner: boolean;
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

const CARD_COLOR_ORDER: LudoColor[] = ["red", "green", "blue", "yellow"];

function orderedSeats(state: LudoState, players: Player[], byPlay = false): LudoSeatMeta[] {
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
        tokensHome: state.finishedCount?.[pid] ?? 0,
        active: state.turnPlayerId === pid && state.phase !== "finished",
        isWinner: state.phase === "finished" && state.winnerId === pid,
      };
    })
    .filter((s): s is LudoSeatMeta => !!s.color);
  // `byPlay` keeps the server's rotation order (turn sequence) — used by the
  // desktop single list so it reads in gameplay order. Otherwise sort by board
  // color position so the mobile top/bottom halves line up with the board.
  return byPlay ? seats : seats.sort((a, b) => CARD_COLOR_ORDER.indexOf(a.color) - CARD_COLOR_ORDER.indexOf(b.color));
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
}: {
  seat: LudoSeatMeta;
  /** Active turn's deadline — drives the countdown ring on the active seat. */
  deadline?: number | null;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
}) {
  const rim = COLOR_HEX_DARK[seat.color];
  const tint = COLOR_HEX[seat.color];
  const offline = !seat.online;

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
      className="ludo-card-in relative flex-1 min-w-0 flex items-center gap-2 rounded-2xl px-2 py-1 overflow-hidden"
      style={{
        background: seat.isWinner ? "rgba(255,247,214,0.98)" : "rgba(255,251,240,0.94)",
        border: `2.5px solid ${seat.isWinner ? "#E0AE3B" : rim}`,
        boxShadow: seat.isWinner
          ? "0 0 0 3px rgba(224,174,59,0.45), 0 8px 18px rgba(0,0,0,0.2)"
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
          <Avatar name={seat.name} color={seat.color} size={30} />
        </div>
        {showTimer && <TurnCountdownRing pct={pct} color={timerColor} box={44} />}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full z-10 ${offline ? "ludo-reconnect" : ""}`}
          style={{ background: seat.online ? "#37B24D" : "#F59E0B", border: "2px solid #FFFBF0" }}
          title={seat.online ? "Online" : "Reconnecting…"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          {seat.isWinner && <span className="flex-shrink-0 text-[11px] leading-none" aria-hidden>👑</span>}
          <span className="truncate font-black text-[12px] uppercase tracking-wide" style={{ color: rim }}>
            {seat.name}
          </span>
          {seat.isBot && <span className="flex-shrink-0 text-[8px] opacity-60">BOT</span>}
        </div>
        {offline ? (
          <div className="text-[9px] font-bold mt-0.5 truncate" style={{ color: "#B45309" }}>
            Reconnecting…
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5" title={`${seat.tokensHome}/4 tokens home`}>
            {[0, 1, 2, 3].map((i) =>
              i < seat.tokensHome ? (
                // filled = glossy seat-color chip bead (the global color treatment)
                <span key={i} className="ludo-chip w-3 h-3 rounded-full" style={chipVars(tint, rim)} />
              ) : (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{ background: "rgba(109,67,35,0.14)", border: "1px solid rgba(109,67,35,0.22)" }}
                />
              ),
            )}
          </div>
        )}
      </div>
      {seat.isWinner ? (
        <span
          className="ludo-chip flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ ...chipVars("#F4B400", "#AB7E00"), color: "#4A3300" }}
        >
          <span className="relative">Won</span>
        </span>
      ) : seat.active ? (
        // Compact on purpose: with 8 players the cards are narrow (4 per row on
        // mobile), and "TURN 15s" truncated to "TUR". The pulsing glow + the
        // countdown ring already say "active", so the chip carries just the
        // seconds when a timer is running.
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
}: {
  state: LudoState;
  players: Player[];
  /** "all" = every seat in one list (desktop single left rail); "top"/"bottom"
   *  = the color-ordered halves (mobile above/below the board). */
  row: "top" | "bottom" | "all";
  orientation?: "row" | "col";
}) {
  const seats = orderedSeats(state, players, row === "all");
  const mid = Math.ceil(seats.length / 2);
  const shown = row === "all" ? seats : row === "top" ? seats.slice(0, mid) : seats.slice(mid);
  if (shown.length === 0) return null;
  return (
    <div className={orientation === "col" ? "flex flex-col gap-2" : "flex justify-between gap-2"}>
      {shown.map((s, i) => (
        <LudoPlayerCard key={s.pid} seat={s} deadline={state.turnDeadline} index={i} />
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

export function LudoRollTray({ m, state }: { m: LudoBoardModel; state: LudoState }) {
  const streak = state.consecutiveSixes > 0 && state.consecutiveSixes < 3;
  const canRoll = m.myTurn && m.canRoll && !m.rolling;
  const settleKey = useSettleKey(m.rolling);
  const finished = state.phase === "finished";
  // Name who we're waiting on — "Waiting…" alone leaves the player guessing,
  // and on desktop this tray sits far from the header's turn banner.
  const waitingFor = !finished && !m.myTurn ? m.nameOf(state.turnPlayerId) : null;
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
          background: "radial-gradient(circle at 50% 35%, #57B65B, #2E7D32)",
          border: "5px solid #1B5E20",
          boxShadow: canRoll
            ? "0 0 0 4px rgba(87,182,91,0.4), 0 8px 18px rgba(0,0,0,0.3)"
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
        className="px-4 py-0.5 text-[12px] font-black max-w-[11rem] truncate text-center"
        style={{ background: "#F7E8C4", border: "2px solid #C8A66B", color: "#6D4323", borderRadius: 6 }}
      >
        {finished
          ? "Game over"
          : m.myTurn
            ? state.turnPhase === "rolling"
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
export function LudoBottomBar({ m, state, unread = 0 }: { m: LudoBoardModel; state: LudoState; unread?: number }) {
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
      <span className="text-[9px] font-semibold" style={{ color: "#6D4323" }}>{label}</span>
    </button>
  );
  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4">
      <NavBtn label="Chat" glyph="💬" panel="chat" badge={unread} />
      <NavBtn label="Emoji" glyph="😊" panel="emoji" />
      <LudoRollTray m={m} state={state} />
      <NavBtn label="Voice" glyph="🎙️" panel="voice" />
      <NavBtn label="Invite" glyph="🔗" panel="room" />
    </div>
  );
}

// ---------------------------------------------------------------------
// Engagement zone — fills the dead space below the nav on tall phones
// (esp. 8-player, where you wait through 7 other turns). A LIVE match feed
// of REAL server events (state.lastEvent) + a one-tap reactions bar that
// flings emoji onto the board via the existing `room:reaction` socket
// (rendered by FloatingReactionsLayer/EmojiRain already mounted in
// LudoOverlays). No fabricated stats/rewards — every feed row is a real
// game event. The zone is `flex-1` so it consumes whatever vertical slack
// the width-capped board leaves, and collapses gracefully on short screens.
// ---------------------------------------------------------------------

type LudoFeedItem = { key: number; emoji: string; name: string; text: string; color: string };

const QUICK_REACTS = ["👍", "🔥", "😂", "🎉", "😮", "💯"];

function buildFeedItem(
  e: LudoEvent,
  nameOf: (id: string) => string,
  colors: Record<string, LudoColor>,
): LudoFeedItem | null {
  const by = e.byPlayerId ? nameOf(e.byPlayerId) : "";
  const victim = e.victimPlayerId ? nameOf(e.victimPlayerId) : "someone";
  const color = e.byPlayerId && colors[e.byPlayerId] ? COLOR_HEX[colors[e.byPlayerId]] : "#6D4323";
  const base = { key: e.ts, name: by, color };
  switch (e.kind) {
    case "capture": return { ...base, emoji: "💥", text: `sent ${victim} home` };
    case "home": return { ...base, emoji: "🏠", text: "brought a token home" };
    case "win": return { ...base, emoji: "🏆", text: "won the game!" };
    case "forfeit": return { ...base, emoji: "⛔", text: "rolled three 6s — forfeited" };
    case "noMove": return { ...base, emoji: "↪", text: "couldn’t move — passed" };
    default: return null; // "move" / "autoSkip" are too noisy for the feed
  }
}

export function LudoEngagementZone({ state, nameOf }: { state: LudoState; nameOf: (id: string) => string }) {
  const [feed, setFeed] = useState<LudoFeedItem[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const lastTs = useRef(0);

  useEffect(() => {
    const e = state.lastEvent;
    if (!e || e.ts <= lastTs.current) return;
    lastTs.current = e.ts;
    const item = buildFeedItem(e, nameOf, state.playerColors);
    if (item) setFeed((f) => [item, ...f].slice(0, 24));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastEvent?.ts]);

  function react(emoji: string) {
    if (cooldown) return;
    getSocket().emit("room:reaction", { emoji });
    setCooldown(true);
    window.setTimeout(() => setCooldown(false), 400);
  }

  const turnName = state.phase === "finished" ? null : nameOf(state.turnPlayerId);

  return (
    <div
      className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,251,240,0.6)", border: "2px solid #E6D4B7" }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: "1.5px solid #ECDCC0" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="ludo-live-dot w-2 h-2 rounded-full" style={{ background: "#DC2626" }} aria-hidden />
          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: "#6D4323" }}>
            Table Feed
          </span>
        </div>
        {turnName && (
          <span className="text-[10px] font-bold truncate max-w-[55%]" style={{ color: "#8A6D4B" }}>
            {turnName}&rsquo;s turn
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-1.5 space-y-1" role="log" aria-live="polite" aria-label="Match feed">
        {feed.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-4 min-h-[2.5rem]">
            <span className="text-[11px] font-semibold" style={{ color: "#A3886E" }}>
              Watch the action here — captures, home runs &amp; passes show up live. React below! 🎲
            </span>
          </div>
        ) : (
          feed.map((it) => (
            <div key={it.key} className="ludo-feed-in flex items-center gap-2 text-[12px]">
              <span className="flex-shrink-0 text-sm leading-none">{it.emoji}</span>
              <span className="font-black flex-shrink-0" style={{ color: it.color }}>{it.name}</span>
              <span className="truncate" style={{ color: "#6D4323" }}>{it.text}</span>
            </div>
          ))
        )}
      </div>

      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 flex-shrink-0"
        style={{ borderTop: "1.5px solid #ECDCC0" }}
      >
        {QUICK_REACTS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => react(e)}
            disabled={cooldown}
            aria-label={`React ${e}`}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg active:scale-90 transition disabled:opacity-40"
            style={{ background: "#F7E8C4", border: "1.5px solid #C8A66B" }}
          >
            {e}
          </button>
        ))}
      </div>
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
      className={`ludo-board relative w-full mx-auto aspect-square select-none rounded-2xl border-4 border-slate-950 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] theme-${m.settings.theme} ${m.settings.highContrast ? "hc" : ""}`}
      style={{ maxWidth }}
    >
      {m.polygonGeo ? (
        <PrintBoardSVG
          geo={m.polygonGeo}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={state.playerColors}
          activeColors={m.activeColors}
          hasCaptured={state.hasCaptured ?? {}}
        />
      ) : (
        <BoardSVG
          playerColorsInRoom={Object.values(state.playerColors)}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={state.playerColors}
          hasCaptured={state.hasCaptured ?? {}}
          unlockBurst={m.unlockBurst}
          registerCard={m.registerPlayerCard}
          selfId={m.selfId}
          finishedCount={state.finishedCount}
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
          const armIdx = m.polygonGeo
            ? PLAYER_COLORS_ORDER.indexOf(state.playerColors[pid])
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
                  ? 4.2
                  : 6) * (pos.scale ?? 1)
              }
              movable={movable}
              onClick={movable ? () => m.move(token.id) : undefined}
              onMouseEnter={() => m.onHoverToken(pid, token)}
              onMouseLeave={m.clearHoverPreview}
              label={String(idx + 1)}
              cbMode={m.settings.colorBlindMode}
              golden={m.settings.goldenTokens}
              celebrating={m.celebratingIds.has(token.id)}
            />
          );
        })}
      </div>
      {/* Capture sad-faces (briefly visible at the victim's last position) */}
      {m.captureFaces.map((cf) => (
        <span key={cf.id} className="capture-face" style={{ left: `${cf.left}%`, top: `${cf.top}%` }}>
          😵
        </span>
      ))}

      {/* Per-home mini confetti bursts */}
      {m.homeBursts.map((b) => (
        <MiniBurst key={b.id} left={b.left} top={b.top} color={b.color} />
      ))}
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
          stats={state.stats}
          finishedCount={state.finishedCount}
          onClose={() => m.setShowEndCard(false)}
          onRematch={m.rematch}
        />
      )}
    </>
  );
}
