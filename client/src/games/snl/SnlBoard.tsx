import { useEffect, useMemo, useRef, useState } from "react";
import type { CoinColor, Player, SnlEvent, SnlState } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { COIN_COLOR_HEX } from "../../components/CoinColorPicker";
import { Dice } from "../ludo/Dice";

const BOARD_SIZE = 100;
const CELL = BOARD_SIZE / 10;
const START_ZONE_Y = 105.5;

// Cell palette: five muted jewel tones cycled across the grid. Bright
// enough to read as a "real board" yet desaturated so they sit politely
// under the snake/ladder graphics. Numbers print in deep walnut on every
// tone — the palette is tuned so dark walnut hits ≥4.5:1 contrast across
// all five cells.
const CELL_COLORS = [
  "#FBE7D2", // warm peach
  "#D8E8C8", // soft sage
  "#F8E1A0", // butter cream
  "#C8DBE8", // dusty blue
  "#E4D0E8", // soft lavender
];
const CELL_DARK   = ["#A88248", "#A88248", "#A88248", "#A88248", "#A88248"];
const CELL_BORDER  = "#C8A66B";
const CELL_INK     = "#2B1B0F";
const FINISH_GOLD  = "#E0AE3B";
const FINISH_GOLD_DEEP = "#9A6E1A";

// Snake palettes — dignified, muted, scaled-creature feel.
//   body+gradEnd → linear gradient down the spine
//   outline      → thin dark contour
//   spot         → small accent dots that hint at scale pattern
const SNAKE_PALETTES = [
  { body: "#4D7C3A", gradEnd: "#22421E", outline: "#0F2A0E", spot: "#A8C879" }, // forest green
  { body: "#A86E2F", gradEnd: "#5A3B16", outline: "#2F1A06", spot: "#E5BE7E" }, // bronze
  { body: "#48556C", gradEnd: "#1F2937", outline: "#0F172A", spot: "#94A3B8" }, // slate
  { body: "#7C5295", gradEnd: "#3F2A52", outline: "#1E0F2E", spot: "#D4B8E5" }, // plum
  { body: "#B65441", gradEnd: "#6B2918", outline: "#2C0F08", spot: "#F5C4B5" }, // terracotta
];

// Ladder wood tones.
const LADDER_WOOD_TOP    = "#B07740";
const LADDER_WOOD_BOTTOM = "#6E4422";
const LADDER_WOOD_DARK   = "#3F2412";
const LADDER_RUNG        = "#8E5B30";

function cellInfo(n: number): { x: number; y: number; row: number; col: number; color: string; dark: string } {
  const idx = n - 1;
  const row = Math.floor(idx / 10);
  let col = idx % 10;
  if (row % 2 === 1) col = 9 - col;
  const colorIdx = (row + col) % CELL_COLORS.length;
  return {
    x: col * CELL + CELL / 2,
    y: (9 - row) * CELL + CELL / 2,
    row,
    col,
    color: CELL_COLORS[colorIdx],
    dark: CELL_DARK[colorIdx],
  };
}

function squareCenter(n: number, slot: number, totalAtStart: number): { x: number; y: number } {
  if (n <= 0) {
    // Spread up to 10 spots evenly across the start zone (x in [6, 94]).
    const span = totalAtStart > 1 ? 88 / (totalAtStart - 1) : 0;
    return { x: 6 + slot * span, y: START_ZONE_Y };
  }
  const info = cellInfo(n);
  return { x: info.x, y: info.y };
}

function tokenFanOffset(slot: number, total: number): { dx: number; dy: number; r: number } {
  if (total <= 1) return { dx: 0, dy: 0, r: 2.4 };
  const angle = (slot / total) * Math.PI * 2 - Math.PI / 2;
  const ringR = total <= 4 ? 1.8 : total <= 6 ? 2.0 : 2.3;
  const tokenR = total <= 4 ? 2.0 : total <= 7 ? 1.55 : 1.3;
  return { dx: Math.cos(angle) * ringR, dy: Math.sin(angle) * ringR, r: tokenR };
}

function bezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

// Auto-assign coin colors to players who didn't pick in the lobby.
const AUTO_FALLBACK_ORDER: CoinColor[] = [
  "red", "blue", "green", "yellow", "purple",
  "cyan", "orange", "pink", "lime", "magenta",
];

function resolveCoinColors(playerOrder: string[], players: Player[]): Record<string, CoinColor> {
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

export default function SnlBoard({
  state,
  players,
  selfId,
}: {
  state: SnlState;
  players: Player[];
  selfId: string | null;
}) {
  const myTurn = state.turnPlayerId === selfId;
  const canRoll = myTurn && state.turnPhase === "rolling" && state.phase === "playing";

  const coinColorOf = useMemo(
    () => resolveCoinColors(state.playerOrder, players),
    [state.playerOrder, players]
  );

  const initialOf = useMemo(() => {
    const map: Record<string, string> = {};
    for (const id of state.playerOrder) {
      const p = players.find((pp) => pp.id === id);
      map[id] = (p?.name.trim().charAt(0) ?? "?").toUpperCase();
    }
    return map;
  }, [state.playerOrder, players]);

  // Group tokens by square for fanning.
  const squareGroups = useMemo(() => {
    const groups: Map<number, string[]> = new Map();
    for (const id of state.playerOrder) {
      const sq = state.positions[id] ?? 0;
      if (!groups.has(sq)) groups.set(sq, []);
      groups.get(sq)!.push(id);
    }
    return groups;
  }, [state.positions, state.playerOrder]);

  const startCount = squareGroups.get(0)?.length ?? 0;

  const [rolling, setRolling] = useState(false);
  const prevDice = useRef<number | null>(state.diceValue);
  useEffect(() => {
    // Trigger the rolling animation on ANY change to diceValue — not just
    // the first transition from null. The server now keeps the last rolled
    // value alive between turns (so the player can actually see what they
    // rolled), which means subsequent rolls go number → number rather than
    // null → number. The old condition skipped them silently.
    if (
      state.diceValue != null &&
      state.diceValue !== prevDice.current
    ) {
      setRolling(true);
      const t = setTimeout(() => setRolling(false), 700);
      prevDice.current = state.diceValue;
      return () => clearTimeout(t);
    }
    prevDice.current = state.diceValue;
  }, [state.diceValue]);

  const [toast, setToast] = useState<{ text: string; emoji: string; color: string } | null>(null);
  const lastEventTs = useRef<number>(0);
  useEffect(() => {
    const latest = state.recentEvents[state.recentEvents.length - 1];
    if (!latest || latest.ts === lastEventTs.current) return;
    lastEventTs.current = latest.ts;
    const t = toastForEvent(latest, players);
    if (t) {
      setToast(t);
      const tid = setTimeout(() => setToast(null), 2400);
      return () => clearTimeout(tid);
    }
  }, [state.recentEvents, players]);

  function doRoll() {
    if (!canRoll) return;
    // Include playerId so the server can proxy moves when Room.tsx has
    // overridden `selfId` to a local pass-and-play seat. For normal play
    // selfId === the caller's own id and the proxy is a no-op.
    getSocket().emit("game:move", { type: "roll", playerId: selfId ?? undefined });
  }

  const turnPlayer = players.find((p) => p.id === state.turnPlayerId);
  const turnColor = coinColorOf[state.turnPlayerId];

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,#0f172a,#020617)] p-3 sm:p-4 space-y-3 shadow-2xl">
      {/* Compact header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
            🐍 Snakes &amp; Ladders
          </div>
          <DifficultyBadge difficulty={state.config.difficulty} />
        </div>
        <div className="text-sm flex items-center gap-2">
          <span className="text-slate-400">Turn:</span>
          {turnColor && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-extrabold"
              style={{
                background: COIN_COLOR_HEX[turnColor].fill,
                color: "#0f172a",
                boxShadow: `0 0 12px ${COIN_COLOR_HEX[turnColor].fill}88`,
              }}
            >
              {turnPlayer?.name ?? "—"}
            </span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_220px] gap-3">
        {/* MAIN BOARD — takes most of the width */}
        <div className="relative">
          <svg
            viewBox="0 0 100 112"
            className="w-full max-w-[min(92vw,720px)] mx-auto block rounded-2xl"
            style={{
              aspectRatio: "100 / 112",
              background:
                "radial-gradient(ellipse at 50% 35%, #FBF4DE 0%, #EFD7A6 65%, #DCBE83 100%)",
              border: "6px solid #3F2412",
              boxShadow:
                "0 22px 58px rgba(0,0,0,0.55), inset 0 0 0 2px #E0AE3B, inset 0 0 0 4px #6B4422",
            }}
          >
            <BoardDefs ladderCount={Object.keys(state.config.ladders).length} snakeCount={Object.keys(state.config.snakes).length} />
            <BoardGrid />
            <StartZone count={startCount} />
            <LaddersLayer ladders={state.config.ladders} />
            <SnakesLayer snakes={state.config.snakes} />
            <TokensLayer
              positions={state.positions}
              playerOrder={state.playerOrder}
              turnPlayerId={state.turnPlayerId}
              coinColorOf={coinColorOf}
              initialOf={initialOf}
              squareGroups={squareGroups}
            />
          </svg>

          {toast && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-3 px-4 py-2 rounded-full shadow-2xl text-sm font-bold toast-in pointer-events-none"
              style={{
                background: toast.color,
                color: "#fff",
                boxShadow: `0 0 24px ${toast.color}, 0 4px 12px rgba(0,0,0,0.4)`,
              }}
            >
              <span className="mr-2">{toast.emoji}</span>
              {toast.text}
            </div>
          )}
        </div>

        {/* SIDE RAIL — dice + players + feed */}
        <div className="space-y-3">
          <DiceTray
            value={state.diceValue}
            rolling={rolling}
            canRoll={canRoll}
            myTurn={myTurn}
            phase={state.phase}
            turnName={turnPlayer?.name ?? "Player"}
            onRoll={doRoll}
          />
          <PlayerList
            players={players}
            state={state}
            coinColorOf={coinColorOf}
            initialOf={initialOf}
            selfId={selfId}
          />
          <EventFeed events={state.recentEvents} players={players} />
        </div>
      </div>

      {state.phase === "finished" && (
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
            border: "2px solid #10b981",
            boxShadow: "0 0 32px rgba(16,185,129,0.4)",
          }}
        >
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-xl font-bold text-emerald-200">
            {players.find((p) => p.id === state.winnerId)?.name ?? "Someone"} reached 100!
          </div>
        </div>
      )}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: SnlState["config"]["difficulty"] }) {
  const meta: Record<typeof difficulty, { emoji: string; label: string; color: string }> = {
    easy:    { emoji: "🌱", label: "Easy",    color: "#22c55e" },
    medium:  { emoji: "⚖️", label: "Medium",  color: "#3b82f6" },
    hard:    { emoji: "🔥", label: "Hard",    color: "#f97316" },
    extreme: { emoji: "💀", label: "Extreme", color: "#ef4444" },
  };
  const m = meta[difficulty] ?? meta.medium;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1"
      style={{ background: m.color, color: "#0f172a" }}
    >
      <span>{m.emoji}</span>
      {m.label}
    </span>
  );
}

/**
 * SVG <defs> block — gradients, filters, and patterns reused across the
 * board so individual cells/snakes/ladders stay declarative.
 */
function BoardDefs({ ladderCount, snakeCount }: { ladderCount: number; snakeCount: number }) {
  return (
    <defs>
      {/* Ladder wood — rails get a vertical gradient so they read as round
          poles instead of flat lines. */}
      <linearGradient id="snl-ladder-rail" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={LADDER_WOOD_DARK} />
        <stop offset="38%" stopColor={LADDER_WOOD_TOP} />
        <stop offset="58%" stopColor="#D6A06A" />
        <stop offset="100%" stopColor={LADDER_WOOD_BOTTOM} />
      </linearGradient>

      {/* Subtle drop shadow used by ladders + snakes so they appear to sit
          ABOVE the board cells instead of flat with them. */}
      <filter id="snl-drop" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.35" />
        <feOffset dx="0" dy="0.45" result="off" />
        <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Square 100 — gold finish square uses a sun-burst gradient. */}
      <radialGradient id="snl-finish" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stopColor="#FFF1B8" />
        <stop offset="45%" stopColor={FINISH_GOLD} />
        <stop offset="100%" stopColor={FINISH_GOLD_DEEP} />
      </radialGradient>

      {/* Per-snake body gradients — generated once for every snake in the
          config so the body fades from head to tail. */}
      {Array.from({ length: snakeCount }, (_, i) => {
        const p = SNAKE_PALETTES[i % SNAKE_PALETTES.length];
        return (
          <linearGradient
            key={`snake-grad-${i}`}
            id={`snl-snake-${i}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor={p.body} />
            <stop offset="100%" stopColor={p.gradEnd} />
          </linearGradient>
        );
      })}

      {/* Reserved for ladder shadow indexing — keeps prop unused but ready. */}
      <metadata>{ladderCount}</metadata>
    </defs>
  );
}

function BoardGrid() {
  const cells: JSX.Element[] = [];
  for (let n = 1; n <= 100; n++) {
    const info = cellInfo(n);
    const x = info.x - CELL / 2;
    const y = info.y - CELL / 2;
    const isFinish = n === 100;
    cells.push(
      <g key={n}>
        {/* Base cell — small inset so a hairline of board parchment shows
            between cells, giving the grid a subtle relief. */}
        <rect
          x={x + 0.12}
          y={y + 0.12}
          width={CELL - 0.24}
          height={CELL - 0.24}
          rx={0.7}
          fill={isFinish ? "url(#snl-finish)" : info.color}
          stroke={CELL_BORDER}
          strokeWidth={0.18}
        />
        {/* Inner highlight — thin top stroke that suggests a beveled edge. */}
        <line
          x1={x + 0.5}
          y1={y + 0.5}
          x2={x + CELL - 0.5}
          y2={y + 0.5}
          stroke="#FFFFFF"
          strokeOpacity={0.55}
          strokeWidth={0.12}
        />
        {/* Number — top-left, deep walnut for both tones, hairline halo. */}
        <text
          x={x + 1.2}
          y={y + 3.2}
          fontSize="2.6"
          fill={CELL_INK}
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          style={{
            paintOrder: "stroke",
            stroke: "#FFFFFF",
            strokeWidth: 0.45,
            strokeOpacity: 0.7,
          }}
        >
          {n}
        </text>
        {isFinish && (
          <>
            {/* A simple flag glyph; sits in the lower-right so it doesn't
                fight the "100" number. */}
            <g transform={`translate(${info.x + 1.5}, ${info.y + 2.0})`}>
              <line x1={0} y1={-1.8} x2={0} y2={2.4} stroke={FINISH_GOLD_DEEP} strokeWidth={0.35} strokeLinecap="round" />
              <path d="M 0 -1.8 L 2.4 -1.2 L 0 -0.4 Z" fill={FINISH_GOLD_DEEP} />
            </g>
          </>
        )}
      </g>
    );
  }
  return <>{cells}</>;
}

function StartZone({ count }: { count: number }) {
  return (
    <g>
      <rect
        x={1.5}
        y={101.5}
        width={97}
        height={9}
        rx={1.4}
        fill="#FBF4DE"
        stroke="#6B4422"
        strokeWidth={0.35}
      />
      {/* Inner gold bevel */}
      <rect
        x={2.0}
        y={102.0}
        width={96}
        height={8}
        rx={1.1}
        fill="none"
        stroke={FINISH_GOLD}
        strokeWidth={0.18}
        opacity={0.85}
      />
      <text
        x={3.5}
        y={107.8}
        fontSize="2.4"
        fill={CELL_INK}
        fontWeight="900"
        letterSpacing="0.3"
      >
        START
      </text>
      {count > 0 && (
        <text x={96.5} y={107.6} fontSize="1.8" fill="#5C3A1A" fontWeight="700" textAnchor="end">
          {count} waiting
        </text>
      )}
    </g>
  );
}

function LaddersLayer({ ladders }: { ladders: Record<number, number> }) {
  const parts: JSX.Element[] = [];
  for (const [startStr, endN] of Object.entries(ladders)) {
    const startN = Number(startStr);
    const a = cellInfo(startN);
    const b = cellInfo(endN);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    // Rail separation (a touch wider than before for a sturdier look).
    const w = 1.7;
    const ax1 = a.x + nx * w, ay1 = a.y + ny * w;
    const ax2 = a.x - nx * w, ay2 = a.y - ny * w;
    const bx1 = b.x + nx * w, by1 = b.y + ny * w;
    const bx2 = b.x - nx * w, by2 = b.y - ny * w;
    const rungs = Math.max(3, Math.floor(len / 3.0));
    const rungLines: JSX.Element[] = [];
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      const rx1 = ax1 + (bx1 - ax1) * t;
      const ry1 = ay1 + (by1 - ay1) * t;
      const rx2 = ax2 + (bx2 - ax2) * t;
      const ry2 = ay2 + (by2 - ay2) * t;
      rungLines.push(
        <g key={`r-${startN}-${i}`}>
          {/* Rung shadow under the rung gives it depth */}
          <line
            x1={rx1}
            y1={ry1 + 0.18}
            x2={rx2}
            y2={ry2 + 0.18}
            stroke={LADDER_WOOD_DARK}
            strokeWidth={0.85}
            strokeLinecap="round"
            opacity={0.55}
          />
          <line
            x1={rx1}
            y1={ry1}
            x2={rx2}
            y2={ry2}
            stroke={LADDER_RUNG}
            strokeWidth={0.75}
            strokeLinecap="round"
          />
          {/* Thin upper highlight on the rung */}
          <line
            x1={rx1}
            y1={ry1 - 0.18}
            x2={rx2}
            y2={ry2 - 0.18}
            stroke="#E0B981"
            strokeWidth={0.18}
            strokeLinecap="round"
            opacity={0.7}
          />
        </g>
      );
    }
    parts.push(
      <g key={`ladder-${startN}`} filter="url(#snl-drop)">
        {/* Rail outline */}
        <line x1={ax1} y1={ay1} x2={bx1} y2={by1} stroke={LADDER_WOOD_DARK} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={ax2} y1={ay2} x2={bx2} y2={by2} stroke={LADDER_WOOD_DARK} strokeWidth={1.5} strokeLinecap="round" />
        {/* Rail wood */}
        <line x1={ax1} y1={ay1} x2={bx1} y2={by1} stroke="url(#snl-ladder-rail)" strokeWidth={1.1} strokeLinecap="round" />
        <line x1={ax2} y1={ay2} x2={bx2} y2={by2} stroke="url(#snl-ladder-rail)" strokeWidth={1.1} strokeLinecap="round" />
        {/* Subtle rail highlight strip on the lit edge */}
        <line
          x1={ax1 - nx * 0.18}
          y1={ay1 - ny * 0.18}
          x2={bx1 - nx * 0.18}
          y2={by1 - ny * 0.18}
          stroke="#F2C78A"
          strokeWidth={0.18}
          strokeLinecap="round"
          opacity={0.7}
        />
        <line
          x1={ax2 + nx * 0.18}
          y1={ay2 + ny * 0.18}
          x2={bx2 + nx * 0.18}
          y2={by2 + ny * 0.18}
          stroke="#F2C78A"
          strokeWidth={0.18}
          strokeLinecap="round"
          opacity={0.7}
        />
        {rungLines}
      </g>
    );
  }
  return <>{parts}</>;
}

function SnakesLayer({ snakes }: { snakes: Record<number, number> }) {
  const entries = Object.entries(snakes)
    .map(([h, t]) => [Number(h), t] as const)
    .sort((a, b) => a[0] - b[0]);

  return (
    <>
      {entries.map(([headN, tailN], idx) => {
        const palette = SNAKE_PALETTES[idx % SNAKE_PALETTES.length];
        const gradientId = `snl-snake-${idx}`;
        const head = cellInfo(headN);
        const tail = cellInfo(tailN);
        const mx = (head.x + tail.x) / 2;
        const my = (head.y + tail.y) / 2;
        const dx = tail.x - head.x;
        const dy = tail.y - head.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const sway = Math.min(8, len * 0.22);
        const c1 = { x: mx + nx * sway, y: my + ny * sway };
        const c2 = { x: mx - nx * sway, y: my - ny * sway };
        const headP = { x: head.x, y: head.y };
        const tailP = { x: tail.x, y: tail.y };
        const d = `M ${headP.x} ${headP.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${tailP.x} ${tailP.y}`;

        // Scale pattern — small offset dots paired along the spine give a
        // subtle reptile texture without competing with the cell numbers.
        const scaleTs = [0.18, 0.28, 0.4, 0.52, 0.62, 0.74, 0.84];
        const scales = scaleTs.map((t, i) => {
          const p = bezierPoint(headP, c1, c2, tailP, t);
          // Tangent for perpendicular offset
          const ahead = bezierPoint(headP, c1, c2, tailP, Math.min(0.99, t + 0.01));
          const tx = ahead.x - p.x;
          const ty = ahead.y - p.y;
          const tl = Math.hypot(tx, ty) || 1;
          const px = -ty / tl;
          const py = tx / tl;
          return (
            <g key={`scale-${headN}-${i}`}>
              <ellipse
                cx={p.x + px * 0.4}
                cy={p.y + py * 0.4}
                rx={0.4}
                ry={0.22}
                fill={palette.spot}
                opacity={0.85}
              />
              <ellipse
                cx={p.x - px * 0.4}
                cy={p.y - py * 0.4}
                rx={0.4}
                ry={0.22}
                fill={palette.spot}
                opacity={0.55}
              />
            </g>
          );
        });

        // Head orientation — used to align the head shape along the body.
        const tangent = bezierPoint(headP, c1, c2, tailP, 0.05);
        const headAngle = Math.atan2(tangent.y - headP.y, tangent.x - headP.x);
        const headDeg = (headAngle * 180) / Math.PI;

        return (
          <g key={`snake-${headN}`} filter="url(#snl-drop)">
            {/* Outer outline — thin dark contour */}
            <path d={d} stroke={palette.outline} strokeWidth={2.7} fill="none" strokeLinecap="round" />
            {/* Body — gradient down the spine */}
            <path d={d} stroke={`url(#${gradientId})`} strokeWidth={2.1} fill="none" strokeLinecap="round" />
            {/* Belly stripe — thin lighter line on the lit edge */}
            <path d={d} stroke="#FBF4DE" strokeWidth={0.45} fill="none" strokeLinecap="round" opacity={0.35} />
            {scales}
            {/* Tail taper */}
            <circle cx={tailP.x} cy={tailP.y} r={0.55} fill={palette.outline} />
            <circle cx={tailP.x} cy={tailP.y} r={0.32} fill={palette.body} />

            {/* Head — refined teardrop: an outlined ellipse rotated to follow
                the body direction, plus two small slit eyes. No blush, no
                smile, no tongue — those were the cartoonish elements that
                made the board look amateur. */}
            <g transform={`translate(${headP.x}, ${headP.y}) rotate(${headDeg})`}>
              <ellipse
                cx={-0.4}
                cy={0}
                rx={2.6}
                ry={1.7}
                fill={palette.outline}
              />
              <ellipse
                cx={-0.4}
                cy={0}
                rx={2.25}
                ry={1.4}
                fill={palette.body}
              />
              {/* Subtle dorsal stripe */}
              <ellipse
                cx={-0.4}
                cy={-0.5}
                rx={2.0}
                ry={0.35}
                fill={palette.gradEnd}
                opacity={0.55}
              />
              {/* Eyes — tiny slits, not big cartoon circles */}
              <ellipse cx={-1.4} cy={-0.55} rx={0.32} ry={0.22} fill="#FBF4DE" />
              <ellipse cx={-1.4} cy={0.55} rx={0.32} ry={0.22} fill="#FBF4DE" />
              <ellipse cx={-1.35} cy={-0.55} rx={0.14} ry={0.18} fill="#0F172A" />
              <ellipse cx={-1.35} cy={0.55} rx={0.14} ry={0.18} fill="#0F172A" />
            </g>
          </g>
        );
      })}
    </>
  );
}

function TokensLayer({
  positions,
  playerOrder,
  turnPlayerId,
  coinColorOf,
  initialOf,
  squareGroups,
}: {
  positions: Record<string, number>;
  playerOrder: string[];
  turnPlayerId: string;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  squareGroups: Map<number, string[]>;
}) {
  return (
    <>
      {playerOrder.map((id) => {
        const sq = positions[id] ?? 0;
        const groupIds = squareGroups.get(sq) ?? [id];
        const slotInGroup = groupIds.indexOf(id);
        const total = groupIds.length;
        const startTotal = (squareGroups.get(0) ?? []).length;

        let cx: number, cy: number, r: number;
        if (sq <= 0) {
          const start = squareCenter(0, slotInGroup, startTotal);
          cx = start.x;
          cy = start.y;
          r = 2.2;
        } else {
          const center = cellInfo(sq);
          const { dx, dy, r: ringR } = tokenFanOffset(slotInGroup, total);
          cx = center.x + dx;
          cy = center.y + dy;
          r = ringR;
        }

        const isActive = id === turnPlayerId;
        const colorKey = coinColorOf[id];
        const palette = COIN_COLOR_HEX[colorKey];

        return (
          <g
            key={id}
            style={{
              transform: `translate(${cx}px, ${cy}px)`,
              transition: "transform 520ms cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            {isActive && (
              <circle
                r={r + 0.85}
                fill="none"
                stroke={palette.fill}
                strokeWidth={0.5}
                opacity={0.95}
                className="snl-token-pulse"
              />
            )}
            {/* Shadow */}
            <ellipse cx={0} cy={r + 0.3} rx={r * 0.7} ry={r * 0.25} fill="rgba(0,0,0,0.35)" />
            {/* Coin body */}
            <circle r={r} fill={palette.fill} stroke="#0f172a" strokeWidth={0.4} />
            <circle r={r - 0.35} fill="none" stroke={palette.dark} strokeWidth={0.25} opacity={0.6} />
            {/* Highlight */}
            <circle r={r * 0.42} cx={-r * 0.3} cy={-r * 0.35} fill="#ffffff" opacity={0.5} />
            {/* Initial */}
            <text
              x={0}
              y={r * 0.45}
              fontSize={r * 1.15}
              textAnchor="middle"
              fill="#ffffff"
              fontWeight="900"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              style={{ paintOrder: "stroke", stroke: palette.dark, strokeWidth: 0.3 }}
            >
              {initialOf[id]}
            </text>
          </g>
        );
      })}
    </>
  );
}

function DiceTray({
  value,
  rolling,
  canRoll,
  myTurn,
  phase,
  turnName,
  onRoll,
}: {
  value: number | null;
  rolling: boolean;
  canRoll: boolean;
  myTurn: boolean;
  phase: SnlState["phase"];
  turnName: string;
  onRoll: () => void;
}) {
  const finished = phase === "finished";
  return (
    <div
      className={`rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3 transition ${
        myTurn ? "" : "opacity-60"
      }`}
      style={{
        background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
      }}
    >
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
            {myTurn ? "Your dice" : `${turnName}'s dice`}
          </span>
          <Dice value={value} rolling={rolling} highlight={myTurn && canRoll && !finished} />
        </div>

        {myTurn ? (
          <button
            onClick={onRoll}
            disabled={!canRoll || rolling || finished}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 px-5 py-3 font-bold transition"
          >
            🎲 Roll
          </button>
        ) : (
          <div className="text-sm text-slate-300 max-w-[12rem]">
            <span className="block font-semibold">{turnName}'s turn</span>
            <span className="block text-xs text-slate-400">
              {finished
                ? "Game over"
                : canRoll
                ? "Waiting for them to roll…"
                : "Waiting for move to resolve…"}
            </span>
          </div>
        )}

        {value === 6 && !rolling && !finished && (
          <span className="text-amber-300 text-xs whitespace-nowrap">Six! Roll again if rules allow.</span>
        )}
      </div>
    </div>
  );
}

function PlayerList({
  players,
  state,
  coinColorOf,
  initialOf,
  selfId,
}: {
  players: Player[];
  state: SnlState;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  selfId: string | null;
}) {
  return (
    <div
      className="rounded-xl p-2 space-y-1.5 max-h-[280px] overflow-y-auto"
      style={{
        background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
        border: "1px solid #334155",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 px-1 pt-1">
        Players ({state.playerOrder.length})
      </div>
      {state.playerOrder.map((id) => {
        const p = players.find((pp) => pp.id === id);
        const pos = state.positions[id] ?? 0;
        const stats = state.stats[id];
        const isTurn = state.turnPlayerId === id;
        const finished = state.finishedOrder.includes(id);
        const palette = COIN_COLOR_HEX[coinColorOf[id]];
        return (
          <div
            key={id}
            className={`flex items-center gap-2 p-1.5 rounded-lg transition ${
              isTurn ? "bg-slate-800/80" : "bg-slate-800/30"
            }`}
            style={{
              borderLeft: `3px solid ${isTurn ? palette.fill : "transparent"}`,
              boxShadow: isTurn ? `0 0 10px ${palette.fill}40` : undefined,
            }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-extrabold flex-shrink-0"
              style={{
                background: palette.fill,
                color: "#fff",
                boxShadow: `inset 0 -2px 0 ${palette.dark}`,
              }}
            >
              {initialOf[id]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-100 font-semibold truncate flex items-center gap-1">
                {p?.name ?? "—"}
                {id === selfId && <span className="text-[9px] text-slate-500 font-normal">(you)</span>}
                {finished && <span title="Finished">🏁</span>}
              </div>
              <div className="text-[9px] text-slate-400 flex gap-1.5">
                <span>sq <b className="text-slate-200">{pos}</b></span>
                {stats && (
                  <>
                    <span title="Ladders">🪜{stats.laddersClimbed}</span>
                    <span title="Snake bites">🐍{stats.snakesBitten}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventFeed({
  events,
  players,
}: {
  events: SnlEvent[];
  players: Player[];
}) {
  const recent = events.slice(-6).reverse();
  function name(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }
  return (
    <div
      className="rounded-xl p-2 space-y-0.5 max-h-[180px] overflow-y-auto"
      style={{
        background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
        border: "1px solid #334155",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 px-1 pt-1">Feed</div>
      {recent.length === 0 ? (
        <div className="text-[11px] text-slate-600 italic px-1 py-2">Waiting for first roll…</div>
      ) : (
        recent.map((e, i) => (
          <div key={`${e.ts}-${i}`} className="text-[11px] text-slate-300 px-1 py-0.5 leading-snug">
            {renderEvent(e, name)}
          </div>
        ))
      )}
    </div>
  );
}

function renderEvent(e: SnlEvent, name: (id: string) => string): string {
  switch (e.kind) {
    case "roll":   return `🎲 ${name(e.playerId)} rolled ${e.roll}`;
    case "ladder": return `🪜 ${name(e.playerId)} climbed ${e.from} → ${e.to}`;
    case "snake":  return `🐍 ${name(e.playerId)} bit at ${e.from} → ${e.to}`;
    case "bounce": return `↩ ${name(e.playerId)} bounced back to ${e.landing}`;
    case "stay":   return `· ${name(e.playerId)} stayed put`;
    case "win":    return `🏆 ${name(e.playerId)} reached 100!`;
    default:       return "";
  }
}

function toastForEvent(e: SnlEvent, players: Player[]): { text: string; emoji: string; color: string } | null {
  const n = players.find((p) => p.id === e.playerId)?.name ?? "Player";
  switch (e.kind) {
    case "ladder": return { text: `${n} climbed to ${e.to}!`, emoji: "🪜", color: "#16a34a" };
    case "snake":  return { text: `${n} got bit! Down to ${e.to}`, emoji: "🐍", color: "#dc2626" };
    case "bounce": return { text: `${n} bounced back to ${e.landing}`, emoji: "↩", color: "#ea580c" };
    case "win":    return { text: `${n} wins!`, emoji: "🏆", color: "#a855f7" };
    default:       return null;
  }
}
