import { Dices, Trophy } from "lucide-react";
import type { CoinColor, Player, SnlEvent, SnlState } from "@shared/types";
import { COIN_COLOR_HEX } from "../../components/CoinColorPicker";
import { Dice } from "../ludo/Dice";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatProfileButton from "../../components/room/SeatProfileButton";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import { useRoomStore } from "../../store/roomStore";
import { SnakeBiteOverlay, LadderClimbOverlay } from "./SnlAnimations";
import { BOARD_ASPECT, BoardGlowLayer, BoardStaticLayer, TokensLayer } from "./snl-board-art";
import {
  BACKDROP_CENTER,
  BACKDROP_EDGE,
  EVENT_BOUNCE,
  EVENT_LADDER,
  EVENT_SNAKE,
  EVENT_WIN,
  FRAME_LED,
  FRAME_METAL_BOTTOM,
  FRAME_METAL_TOP,
  HOLO_CYAN,
} from "./snl-theme";

export { cellInfo } from "./snl-geometry";

/**
 * Snakes & Ladders — shared presentational layer.
 *
 * The mobile and desktop shells import ONE source of truth for the board and
 * every HUD widget; only the arrangement differs (`variant` / `layout` props).
 * Logic and state live in useSnlBoard; this file is render-only.
 */

// Auto-assign coin colors to players who didn't pick in the lobby.
const AUTO_FALLBACK_ORDER: CoinColor[] = [
  "red", "blue", "green", "yellow", "purple",
  "cyan", "orange", "pink", "lime", "magenta",
];

export function resolveCoinColors(playerOrder: string[], players: Player[]): Record<string, CoinColor> {
  const map: Record<string, CoinColor> = {};
  const taken = new Set<CoinColor>();
  for (const id of playerOrder) {
    const p = players.find((pp) => pp.id === id);
    if (p?.coinColor) {
      map[id] = p.coinColor;
      taken.add(p.coinColor);
    }
  }
  for (const id of playerOrder) {
    if (map[id]) continue;
    const next = AUTO_FALLBACK_ORDER.find((c) => !taken.has(c)) ?? "red";
    map[id] = next;
    taken.add(next);
  }
  return map;
}

/** Shared glass surface for every HUD panel. */
const GLASS_PANEL =
  "rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(30,41,59,0.78),rgba(8,13,26,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.35)]";
const PANEL_LABEL = "text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200/80";
const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

function playerNameOf(id: string, players: Player[]): string {
  return players.find((p) => p.id === id)?.name ?? useRoomStore.getState().knownPlayers[id]?.name ?? "Player";
}

/* ─────────────────────────── Difficulty badge ─────────────────────────── */

const DIFFICULTY_META: Record<SnlState["config"]["difficulty"], { label: string; color: string }> = {
  easy: { label: "Easy", color: "#22c55e" },
  medium: { label: "Medium", color: "#3b82f6" },
  hard: { label: "Hard", color: "#f97316" },
  extreme: { label: "Extreme", color: "#ef4444" },
};

export function DifficultyBadge({ difficulty }: { difficulty: SnlState["config"]["difficulty"] }) {
  const m = DIFFICULTY_META[difficulty] ?? DIFFICULTY_META.medium;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-slate-100">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
      {m.label}
    </span>
  );
}

/* ─────────────────────────── The board ─────────────────────────── */

function boardLabel(state: SnlState, players: Player[]): string {
  const where = state.playerOrder
    .map((id) => {
      const sq = state.positions[id] ?? 0;
      return `${playerNameOf(id, players)} ${sq <= 0 ? "at start" : `on square ${sq}`}`;
    })
    .join(", ");
  return `Snakes and Ladders board, 100 squares. ${where}.`;
}

/** Four glowing corner brackets on the bezel — pure decoration. */
function BezelCorners() {
  const base = "pointer-events-none absolute h-4 w-4 border-cyan-300/80";
  return (
    <>
      <span aria-hidden="true" className={`${base} left-1.5 top-1.5 rounded-tl-md border-l-2 border-t-2`} />
      <span aria-hidden="true" className={`${base} right-1.5 top-1.5 rounded-tr-md border-r-2 border-t-2`} />
      <span aria-hidden="true" className={`${base} bottom-1.5 left-1.5 rounded-bl-md border-b-2 border-l-2`} />
      <span aria-hidden="true" className={`${base} bottom-1.5 right-1.5 rounded-br-md border-b-2 border-r-2`} />
    </>
  );
}

const DEFAULT_BOARD_SIZE = "max-w-[min(94vw,720px)]";

type BoardEventOverlay ={ playerName: string; from: number; to: number; x: number; y: number } | null;

/**
 * The full table: a graphite bezel with an LED edge around three stacked SVG
 * layers (tiles/ladders/snakes, glow, tokens), plus the event toast and the
 * snake-bite / ladder-climb overlays. Shared verbatim by both shells.
 */
export function SnlBoardSvg({
  state,
  players,
  coinColorOf,
  initialOf,
  squareGroups,
  startCount,
  toast,
  activeSnakeBite,
  activeLadderClimb,
  sizeClass = DEFAULT_BOARD_SIZE,
}: {
  state: SnlState;
  players: Player[];
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  squareGroups: Map<number, string[]>;
  startCount: number;
  toast: { text: string; emoji: string; color: string } | null;
  activeSnakeBite?: BoardEventOverlay;
  activeLadderClimb?: BoardEventOverlay;
  /** Tailwind width classes; each shell sizes the board for its own screen. */
  sizeClass?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-full rounded-[22px] p-2.5 sm:p-3 ${sizeClass}`}
      style={{
        background: `linear-gradient(145deg, ${FRAME_METAL_TOP}, ${FRAME_METAL_BOTTOM} 70%)`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 28px ${FRAME_LED}33, inset 0 1px 0 rgba(255,255,255,0.18)`,
      }}
    >
      <BezelCorners />
      <div
        role="img"
        aria-label={boardLabel(state, players)}
        className="relative w-full rounded-2xl"
        style={{
          aspectRatio: BOARD_ASPECT,
          background: `radial-gradient(ellipse at 50% 30%, ${BACKDROP_CENTER} 0%, ${BACKDROP_EDGE} 100%)`,
          boxShadow: `inset 0 0 0 1px ${FRAME_LED}55, inset 0 6px 24px rgba(0,0,0,0.6)`,
        }}
      >
        <BoardStaticLayer ladders={state.config.ladders} snakes={state.config.snakes} waiting={startCount} />
        <BoardGlowLayer ladders={state.config.ladders} snakes={state.config.snakes} />
        <TokensLayer
          positions={state.positions}
          playerOrder={state.playerOrder}
          turnPlayerId={state.turnPlayerId}
          coinColorOf={coinColorOf}
          initialOf={initialOf}
          squareGroups={squareGroups}
        />

        {activeSnakeBite && (
          <SnakeBiteOverlay
            playerName={activeSnakeBite.playerName}
            from={activeSnakeBite.from}
            to={activeSnakeBite.to}
            x={activeSnakeBite.x}
            y={activeSnakeBite.y}
          />
        )}
        {activeLadderClimb && (
          <LadderClimbOverlay
            playerName={activeLadderClimb.playerName}
            from={activeLadderClimb.from}
            to={activeLadderClimb.to}
            x={activeLadderClimb.x}
            y={activeLadderClimb.y}
          />
        )}

        {toast && (
          <div
            className="toast-in pointer-events-none absolute left-1/2 top-3 z-30 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-full border bg-slate-950/90 px-4 py-2 text-sm font-bold text-white"
            style={{ borderColor: toast.color, boxShadow: `0 0 22px ${toast.color}88, 0 6px 16px rgba(0,0,0,0.5)` }}
          >
            <span aria-hidden="true" style={{ color: toast.color }}>
              {toast.emoji}
            </span>
            <span className="truncate">{toast.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Dice console ─────────────────────────── */

/**
 * The roll control. `dock` is the phone version (dice + a full-width, thumb-sized
 * Roll button on one row); `panel` is the desktop rail card with a keyboard hint.
 */
export function DiceTray({
  value,
  rolling,
  canRoll,
  myTurn,
  phase,
  turnName,
  onRoll,
  variant = "panel",
}: {
  value: number | null;
  rolling: boolean;
  canRoll: boolean;
  myTurn: boolean;
  phase: SnlState["phase"];
  turnName: string;
  onRoll: () => void;
  variant?: "dock" | "panel";
}) {
  const finished = phase === "finished";
  const isDock = variant === "dock";
  const status = finished
    ? "Game over"
    : myTurn
      ? canRoll
        ? "Your turn — roll the dice"
        : "Resolving your move…"
      : canRoll
        ? `Waiting for ${turnName} to roll…`
        : `${turnName} is moving…`;

  return (
    <section
      aria-label="Dice"
      className={`${GLASS_PANEL} ${isDock ? "p-3" : "p-4"} transition-opacity ${myTurn || finished ? "" : "opacity-80"}`}
      style={myTurn && canRoll && !finished ? { boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px ${HOLO_CYAN}40` } : undefined}
    >
      <div className={`flex items-center ${isDock ? "gap-3" : "flex-col gap-3"}`}>
        <div className="flex flex-col items-center gap-1">
          <span className={PANEL_LABEL}>{myTurn ? "Your dice" : `${turnName}'s dice`}</span>
          <Dice value={value} rolling={rolling} highlight={myTurn && canRoll && !finished} size={isDock ? "3.5rem" : "4.5rem"} />
        </div>

        <div className={`flex min-w-0 flex-1 flex-col gap-2 ${isDock ? "" : "w-full"}`}>
          <p className="text-sm font-semibold text-slate-100" aria-live="polite">
            {status}
          </p>
          {myTurn ? (
            <button
              type="button"
              onClick={onRoll}
              disabled={!canRoll || rolling || finished}
              aria-label="Roll the dice"
              className={`inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-5 text-base font-extrabold text-[#04121C] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
              style={{
                background: `linear-gradient(180deg, #7DEBFF, ${HOLO_CYAN})`,
                boxShadow: `0 0 22px ${HOLO_CYAN}66, inset 0 1px 0 rgba(255,255,255,0.6)`,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Dices className="h-5 w-5" aria-hidden="true" />
              Roll
              {!isDock && (
                <kbd className="ml-1 rounded border border-black/30 bg-black/10 px-1.5 text-[11px] font-bold">Space</kbd>
              )}
            </button>
          ) : null}
          {value === 6 && !rolling && !finished && <p className="text-xs font-semibold text-amber-300">Rolled a six</p>}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Roster ─────────────────────────── */

interface RosterReactionProps {
  /** From useSeatReactions() — registers this row as the anchor a targeted
   *  reaction flies to/from and shakes on landing. Optional so this
   *  component still renders fine anywhere reactions aren't wired up. */
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
  onTarget?: (playerId: string) => void;
  activeTargetId?: string | null;
  onCloseTarget?: () => void;
}

/**
 * SnlPlayerRail — the in-board roster (coin colour, square, progress to 100,
 * climb/bite stats). `strip` is the phone version: one swipeable row of chips.
 * `list` is the desktop version: a card per player with a progress bar.
 */
export function SnlPlayerRail({
  players,
  state,
  coinColorOf,
  initialOf,
  selfId,
  layout = "list",
  registerCardRef,
  onTarget,
  activeTargetId,
  onCloseTarget,
}: {
  players: Player[];
  state: SnlState;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  selfId: string | null;
  layout?: "strip" | "list";
} & RosterReactionProps) {
  const isStrip = layout === "strip";
  return (
    <section aria-label="Players" className={`${GLASS_PANEL} ${isStrip ? "p-2" : "p-3"}`}>
      {!isStrip && <h3 className={`${PANEL_LABEL} px-1 pb-2`}>Players ({state.playerOrder.length})</h3>}
      <ul
        className={
          isStrip
            ? "touch-pan-x -mx-0.5 flex snap-x gap-2 overflow-x-auto px-0.5 pb-1"
            : "max-h-[340px] space-y-2 overflow-y-auto pr-0.5"
        }
      >
        {state.playerOrder.map((id) => {
          const p = players.find((pp) => pp.id === id);
          const name = p?.name ?? "—";
          const pos = state.positions[id] ?? 0;
          const stats = state.stats[id];
          const isTurn = state.turnPlayerId === id;
          const finished = state.finishedOrder.includes(id);
          const palette = COIN_COLOR_HEX[coinColorOf[id]];
          const isSelf = id === selfId;
          const canReact = !isSelf && !!onTarget;
          const progress = Math.max(0, Math.min(100, pos)) / 100;

          const identity = (
            <>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff8, ${palette.fill} 35%, ${palette.dark})`,
                  boxShadow: `0 0 ${isTurn ? 12 : 0}px ${palette.fill}`,
                }}
              >
                {initialOf[id]}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-100">
                  {/* The phone chip already carries the coin; the avatar would squeeze the name. */}
                  {!isStrip && (
                    <SeatAvatar avatar={p?.avatar} playerId={id} name={name} className="h-5 w-5" textClassName="text-[8px]" />
                  )}
                  <span className="truncate">{name}</span>
                  {!isStrip && isSelf && <span className="text-[10px] font-normal text-slate-300">(you)</span>}
                  {!isStrip && finished && <span className="text-[10px] font-bold text-amber-300">FINISHED</span>}
                </span>
                <span className="flex gap-2 text-[11px] text-slate-300">
                  <span>
                    sq <b className="font-mono text-slate-50">{pos}</b>
                  </span>
                  {isStrip && isSelf && <span>you</span>}
                  {isStrip && finished && <span className="font-bold text-amber-300">finished</span>}
                  {!isStrip && stats && (
                    <>
                      <span title="Ladders climbed">▲ {stats.laddersClimbed}</span>
                      <span title="Snake bites">▼ {stats.snakesBitten}</span>
                    </>
                  )}
                </span>
              </span>
            </>
          );

          return (
            <li
              key={id}
              ref={registerCardRef?.(id)}
              className={`relative flex-shrink-0 snap-start rounded-xl border transition ${
                isStrip ? "w-[11.5rem] min-h-[52px]" : ""
              } ${isTurn ? "border-white/25 bg-white/10" : "border-white/5 bg-white/[0.04]"}`}
              style={{ boxShadow: isTurn ? `0 0 14px ${palette.fill}55, inset 3px 0 0 ${palette.fill}` : `inset 3px 0 0 ${palette.fill}66` }}
              aria-current={isTurn ? "true" : undefined}
            >
              {activeTargetId === id && onCloseTarget && (
                <SeatTargetReactionWheel
                  game="snl"
                  targetPlayerId={id}
                  targetPlayerName={p?.name}
                  onClose={onCloseTarget}
                  position="top"
                />
              )}
              <div className="flex items-center gap-1 p-1.5">
                {canReact ? (
                  <button
                    type="button"
                    onClick={() => onTarget?.(id)}
                    title={`React at ${name}`}
                    aria-label={`React at ${name}`}
                    className={`flex min-h-[44px] min-w-0 flex-1 touch-manipulation items-center gap-2 rounded-lg text-left hover:bg-white/5 ${FOCUS_RING}`}
                  >
                    {identity}
                  </button>
                ) : (
                  <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2">{identity}</div>
                )}
                {p && <SeatProfileButton player={p} isSelf={isSelf} compact className="text-slate-300 hover:text-white" />}
              </div>
              {!isStrip && (
                <div
                  role="progressbar"
                  aria-label={`${name} progress to square 100`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pos}
                  className="mx-2 mb-2 h-1.5 overflow-hidden rounded-full bg-black/40"
                >
                  <div
                    className="h-full origin-left rounded-full transition-transform duration-500"
                    style={{ transform: `scaleX(${progress})`, background: `linear-gradient(90deg, ${palette.dark}, ${palette.fill})` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─────────────────────────── Feed ─────────────────────────── */

interface FeedLine {
  glyph: string;
  color: string;
  text: string;
}

function describeEvent(e: SnlEvent, name: (id: string) => string): FeedLine | null {
  switch (e.kind) {
    case "roll":
      return { glyph: "◆", color: HOLO_CYAN, text: `${name(e.playerId)} rolled ${e.roll}` };
    case "ladder":
      return { glyph: "▲", color: EVENT_LADDER, text: `${name(e.playerId)} climbed ${e.from} → ${e.to}` };
    case "snake":
      return { glyph: "▼", color: EVENT_SNAKE, text: `${name(e.playerId)} bitten at ${e.from} → ${e.to}` };
    case "bounce":
      return { glyph: "↩", color: EVENT_BOUNCE, text: `${name(e.playerId)} bounced back to ${e.landing}` };
    case "stay":
      return { glyph: "•", color: "#94a3b8", text: `${name(e.playerId)} stayed put` };
    case "win":
      return { glyph: "★", color: EVENT_WIN, text: `${name(e.playerId)} reached 100!` };
    default:
      return null;
  }
}

/**
 * The live feed. A visually hidden polite live region always announces the
 * latest event; `compact` (phone) folds the list behind the newest line so the
 * board and the dice stay on screen.
 */
export function EventFeed({
  events,
  players,
  compact = false,
}: {
  events: SnlEvent[];
  players: Player[];
  compact?: boolean;
}) {
  const name = (id: string) => playerNameOf(id, players);
  const lines = events
    .slice(-6)
    .reverse()
    .map((e, i) => ({ key: `${e.ts}-${i}`, line: describeEvent(e, name) }))
    .filter((l): l is { key: string; line: FeedLine } => l.line !== null);
  const latest = lines[0]?.line;

  const rows = lines.map(({ key, line }) => (
    <li key={key} className="flex items-start gap-2 px-1 py-0.5 text-[12px] leading-snug text-slate-200">
      <span aria-hidden="true" className="w-3 flex-shrink-0 text-center font-bold" style={{ color: line.color }}>
        {line.glyph}
      </span>
      <span>{line.text}</span>
    </li>
  ));

  return (
    <section aria-label="Match feed" className={`${GLASS_PANEL} ${compact ? "px-3 py-2" : "p-3"}`}>
      <p className="sr-only" aria-live="polite">
        {latest?.text ?? ""}
      </p>
      {compact ? (
        <details className="group">
          <summary className={`flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 rounded-lg ${FOCUS_RING}`}>
            <span className="flex min-w-0 items-center gap-2 text-xs text-slate-200">
              <span className={PANEL_LABEL}>Feed</span>
              <span className="truncate">{latest ? latest.text : "Waiting for the first roll…"}</span>
            </span>
            <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="max-h-[180px] overflow-y-auto pb-1">{rows}</ul>
        </details>
      ) : (
        <>
          <h3 className={`${PANEL_LABEL} px-1 pb-2`}>Live feed</h3>
          {lines.length === 0 ? (
            <p className="px-1 py-2 text-xs italic text-slate-300">Waiting for the first roll…</p>
          ) : (
            <ul className="max-h-[200px] space-y-0.5 overflow-y-auto">{rows}</ul>
          )}
        </>
      )}
    </section>
  );
}

export function toastForEvent(e: SnlEvent, players: Player[]): { text: string; emoji: string; color: string } | null {
  const n = playerNameOf(e.playerId, players);
  switch (e.kind) {
    case "ladder": return { text: `${n} climbed to ${e.to}!`, emoji: "▲", color: EVENT_LADDER };
    case "snake":  return { text: `${n} got bitten! Down to ${e.to}`, emoji: "▼", color: EVENT_SNAKE };
    case "bounce": return { text: `${n} bounced back to ${e.landing}`, emoji: "↩", color: EVENT_BOUNCE };
    case "win":    return { text: `${n} wins!`, emoji: "★", color: EVENT_WIN };
    default:       return null;
  }
}

/* ─────────────────────────── Header + finish banner ─────────────────────────── */

export function SnlHeader({
  state,
  turnPlayer,
  turnColor,
}: {
  state: SnlState;
  turnPlayer: Player | undefined;
  turnColor: CoinColor | undefined;
}) {
  const accent = turnColor ? COIN_COLOR_HEX[turnColor].fill : HOLO_CYAN;
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-base tracking-wide text-slate-50 sm:text-lg">
          Snakes <span style={{ color: HOLO_CYAN }}>&amp;</span> Ladders
        </h2>
        <DifficultyBadge difficulty={state.config.difficulty} />
      </div>
      <p className="flex items-center gap-2 text-sm" aria-live="polite">
        <span className="text-slate-300">Turn</span>
        {turnColor && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-extrabold text-slate-50"
            style={{ borderColor: accent, background: `${accent}26`, boxShadow: `0 0 14px ${accent}55` }}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: accent }} />
            {turnPlayer?.name ?? "—"}
          </span>
        )}
      </p>
    </header>
  );
}

export function SnlFinishedBanner({ players, winnerId }: { players: Player[]; winnerId: string | null }) {
  const winnerName = winnerId ? playerNameOf(winnerId, players) : "Someone";
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 rounded-2xl border border-amber-300/60 bg-[linear-gradient(135deg,rgba(120,80,10,0.55),rgba(20,14,4,0.9))] p-4 text-center"
      style={{ boxShadow: "0 0 32px rgba(245,184,61,0.35)" }}
    >
      <Trophy className="h-7 w-7 text-amber-300" aria-hidden="true" />
      <p className="text-lg font-bold text-amber-100">{winnerName} reached 100!</p>
    </div>
  );
}
