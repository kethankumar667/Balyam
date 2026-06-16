import { useEffect, useMemo, useRef, useState } from "react";
import type { CoinColor, Player, SnlEvent, SnlState } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { COIN_COLOR_HEX } from "../../components/CoinColorPicker";
import { Dice } from "../ludo/Dice";

const BOARD_SIZE = 100;
const CELL = BOARD_SIZE / 10;
const START_ZONE_Y = 105.5;

// Five bright cell colors arranged in a (row+col) % 5 pattern.
const CELL_COLORS = ["#b91c1c", "#facc15", "#15803d", "#1d4ed8", "#f8fafc"];
const CELL_DARK   = ["#450a0a", "#713f12", "#052e16", "#172554", "#334155"];

// 5 cartoon snake palettes cycled across the snake list.
const SNAKE_PALETTES = [
  { body: "#fbbf24", outline: "#92400e", belly: "#fef3c7", spot: "#dc2626" }, // yellow / red spots
  { body: "#22c55e", outline: "#14532d", belly: "#bbf7d0", spot: "#0f5132" }, // green / dark green spots
  { body: "#3b82f6", outline: "#1e3a8a", belly: "#dbeafe", spot: "#facc15" }, // blue / yellow spots
  { body: "#ef4444", outline: "#7f1d1d", belly: "#fecaca", spot: "#fbbf24" }, // red / yellow spots
  { body: "#a855f7", outline: "#581c87", belly: "#f3e8ff", spot: "#ec4899" }, // purple / pink spots
];

function cellInfo(n: number): { x: number; y: number; row: number; col: number; color: string; dark: string } {
  const idx = n - 1;
  const row = Math.floor(idx / 10);
  let col = idx % 10;
  if (row % 2 === 1) col = 9 - col;
  const colorIdx = (row + col) % 5;
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
    if (prevDice.current == null && state.diceValue != null) {
      setRolling(true);
      const t = setTimeout(() => setRolling(false), 700);
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
    getSocket().emit("game:move", { type: "roll" });
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
            className="w-full max-w-[min(92vw,720px)] mx-auto block rounded-2xl shadow-2xl"
            style={{
              aspectRatio: "100 / 112",
              background: "#fff7ed",
              border: "5px solid #0f172a",
              boxShadow: "0 18px 48px rgba(0,0,0,0.55), inset 0 0 0 2px #ffffff",
            }}
          >
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

function BoardGrid() {
  const cells: JSX.Element[] = [];
  for (let n = 1; n <= 100; n++) {
    const info = cellInfo(n);
    const x = info.x - CELL / 2;
    const y = info.y - CELL / 2;
    cells.push(
      <g key={n}>
        <rect
          x={x + 0.15}
          y={y + 0.15}
          width={CELL - 0.3}
          height={CELL - 0.3}
          rx={0.5}
          fill={info.color}
          stroke="#1f2937"
          strokeWidth={0.18}
        />
        {/* Number — bold, top-left corner with subtle outline for contrast */}
        <text
          x={x + 1.4}
          y={y + 3.2}
          fontSize="2.8"
          fill={info.color === "#fbbf24" || info.color === "#f8fafc" ? "#1f2937" : "#ffffff"}
          fontWeight="900"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          style={{
            paintOrder: "stroke",
            stroke: info.color === "#fbbf24" || info.color === "#f8fafc" ? "#ffffff" : "#0f172a",
            strokeWidth: 0.35,
          }}
        >
          {n}
        </text>
        {n === 100 && (
          <text x={info.x} y={info.y + 2.6} fontSize="6" textAnchor="middle">🏁</text>
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
        fill="#fff"
        stroke="#1f2937"
        strokeWidth={0.35}
      />
      <text x={3.5} y={107.6} fontSize="2.2" fill="#1f2937" fontWeight="900">
        START
      </text>
      {count > 0 && (
        <text x={96.5} y={107.6} fontSize="1.8" fill="#475569" fontWeight="700" textAnchor="end">
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
    const w = 1.6;
    const ax1 = a.x + nx * w, ay1 = a.y + ny * w;
    const ax2 = a.x - nx * w, ay2 = a.y - ny * w;
    const bx1 = b.x + nx * w, by1 = b.y + ny * w;
    const bx2 = b.x - nx * w, by2 = b.y - ny * w;
    const rungs = Math.max(3, Math.floor(len / 3.2));
    const rungLines: JSX.Element[] = [];
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      const rx1 = ax1 + (bx1 - ax1) * t;
      const ry1 = ay1 + (by1 - ay1) * t;
      const rx2 = ax2 + (bx2 - ax2) * t;
      const ry2 = ay2 + (by2 - ay2) * t;
      rungLines.push(
        <line
          key={`r-${startN}-${i}`}
          x1={rx1}
          y1={ry1}
          x2={rx2}
          y2={ry2}
          stroke="#0f172a"
          strokeWidth={0.7}
          strokeLinecap="round"
        />
      );
    }
    parts.push(
      <g key={`ladder-${startN}`}>
        {/* Rails — solid dark */}
        <line x1={ax1} y1={ay1} x2={bx1} y2={by1} stroke="#0f172a" strokeWidth={0.9} strokeLinecap="round" />
        <line x1={ax2} y1={ay2} x2={bx2} y2={by2} stroke="#0f172a" strokeWidth={0.9} strokeLinecap="round" />
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

        // Spots along the body at fractions of the bezier.
        const spotTs = [0.22, 0.42, 0.6, 0.78];
        const spots = spotTs.map((t, i) => {
          const p = bezierPoint(headP, c1, c2, tailP, t);
          return <circle key={`sp-${headN}-${i}`} cx={p.x} cy={p.y} r={0.55} fill={palette.spot} />;
        });

        // Eye direction: perpendicular to first tangent.
        const tangent = bezierPoint(headP, c1, c2, tailP, 0.05);
        const eyeAngle = Math.atan2(tangent.y - headP.y, tangent.x - headP.x);
        const eyeNx = Math.cos(eyeAngle + Math.PI / 2);
        const eyeNy = Math.sin(eyeAngle + Math.PI / 2);
        const eye1 = { x: headP.x + eyeNx * 0.85 - Math.cos(eyeAngle) * 0.4, y: headP.y + eyeNy * 0.85 - Math.sin(eyeAngle) * 0.4 };
        const eye2 = { x: headP.x - eyeNx * 0.85 - Math.cos(eyeAngle) * 0.4, y: headP.y - eyeNy * 0.85 - Math.sin(eyeAngle) * 0.4 };

        // Smile: small arc below the eyes.
        const mouthCenter = { x: headP.x + Math.cos(eyeAngle) * 0.6, y: headP.y + Math.sin(eyeAngle) * 0.6 };
        const smileD = `M ${mouthCenter.x - eyeNx * 0.6} ${mouthCenter.y - eyeNy * 0.6}
                        Q ${mouthCenter.x + Math.cos(eyeAngle) * 0.5} ${mouthCenter.y + Math.sin(eyeAngle) * 0.5},
                          ${mouthCenter.x + eyeNx * 0.6} ${mouthCenter.y + eyeNy * 0.6}`;

        return (
          <g key={`snake-${headN}`}>
            {/* Outline (slightly thicker, dark) */}
            <path d={d} stroke={palette.outline} strokeWidth={3.0} fill="none" strokeLinecap="round" />
            {/* Body */}
            <path d={d} stroke={palette.body} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            {/* Belly stripe */}
            <path d={d} stroke={palette.belly} strokeWidth={0.7} fill="none" strokeLinecap="round" opacity={0.7} />
            {/* Spots */}
            {spots}
            {/* Tail tip */}
            <circle cx={tailP.x} cy={tailP.y} r={0.6} fill={palette.outline} />
            {/* Head — chunky oval slightly bigger than body */}
            <circle cx={headP.x} cy={headP.y} r={2.4} fill={palette.outline} />
            <circle cx={headP.x} cy={headP.y} r={2.05} fill={palette.body} />
            {/* Cheek blush */}
            <circle cx={headP.x + eyeNx * 1.2} cy={headP.y + eyeNy * 1.2} r={0.4} fill={palette.spot} opacity={0.55} />
            <circle cx={headP.x - eyeNx * 1.2} cy={headP.y - eyeNy * 1.2} r={0.4} fill={palette.spot} opacity={0.55} />
            {/* Eyes — big white circles + black pupils + tiny white highlight */}
            <circle cx={eye1.x} cy={eye1.y} r={0.65} fill="#ffffff" stroke="#0f172a" strokeWidth={0.12} />
            <circle cx={eye2.x} cy={eye2.y} r={0.65} fill="#ffffff" stroke="#0f172a" strokeWidth={0.12} />
            <circle cx={eye1.x + 0.1} cy={eye1.y + 0.05} r={0.32} fill="#0f172a" />
            <circle cx={eye2.x + 0.1} cy={eye2.y + 0.05} r={0.32} fill="#0f172a" />
            <circle cx={eye1.x + 0.2} cy={eye1.y - 0.08} r={0.1} fill="#ffffff" />
            <circle cx={eye2.x + 0.2} cy={eye2.y - 0.08} r={0.1} fill="#ffffff" />
            {/* Smile */}
            <path d={smileD} stroke="#0f172a" strokeWidth={0.18} fill="none" strokeLinecap="round" />
            {/* Forked tongue */}
            <path
              d={`M ${headP.x + Math.cos(eyeAngle) * 2.0} ${headP.y + Math.sin(eyeAngle) * 2.0}
                  l ${Math.cos(eyeAngle) * 1.2 - 0.35 * Math.sin(eyeAngle)} ${Math.sin(eyeAngle) * 1.2 + 0.35 * Math.cos(eyeAngle)}
                  M ${headP.x + Math.cos(eyeAngle) * 2.0} ${headP.y + Math.sin(eyeAngle) * 2.0}
                  l ${Math.cos(eyeAngle) * 1.2 + 0.35 * Math.sin(eyeAngle)} ${Math.sin(eyeAngle) * 1.2 - 0.35 * Math.cos(eyeAngle)}`}
              stroke="#dc2626"
              strokeWidth={0.28}
              fill="none"
              strokeLinecap="round"
            />
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
