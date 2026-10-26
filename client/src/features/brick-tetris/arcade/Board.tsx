import { memo, useMemo, type Dispatch, type CSSProperties, useRef, useEffect } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, RotateCcw, RotateCw, Package } from "lucide-react";
import type { GameState, PieceType, GameAction, BoardCell } from "../types";
import { createActivePiece } from "../pieces/pieceFactory";
import { getGhostPosition } from "../engine/ghostEngine";
import { BLOCK_COLORS } from "./rules";

const bevel = "inset 0 2px 0 #ffffff80, inset 2px 0 0 #ffffff30, inset 0 -3px 0 #00000030, 0 1px 2px #00000040";
export const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rim bg-surface-1 px-4 text-sm font-bold text-ink-hi transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40";
export const primaryClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 text-sm font-bold text-white shadow-lg shadow-violet-900/15 transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400 disabled:opacity-40";

export function MiniPiece({ type, small = false }: { type: PieceType | null; small?: boolean }) {
  if (!type) return <span className="text-xs text-ink-mid">Empty</span>;
  const source = createActivePiece(type).matrix;
  const rows = source.filter(row => row.some(Boolean));
  const columns = source[0].map((_, c) => c).filter(c => source.some(row => row[c]));
  const matrix = rows.map(row => columns.map(c => row[c]));
  return (
    <div aria-label={`${type} shape`} role="img" className="grid shrink-0 gap-0.5" style={{ gridTemplateColumns: `repeat(${columns.length}, ${small ? 7 : 14}px)` }}>
      {matrix.flatMap((row, r) => row.map((cell, c) => (
        <span key={`${r}-${c}`} className="aspect-square rounded-[3px]" style={cell ? { background: BLOCK_COLORS[type], boxShadow: bevel } : undefined} />
      )))}
    </div>
  );
}

export const ColorBoard = memo(function ColorBoard({ state, effects, fitHeight = false }: { state: GameState; effects: boolean; fitHeight?: boolean }) {
  const cells = useMemo(() => {
    const grid: { value: BoardCell; ghost: boolean; active: boolean }[][] = state.board.map(row => row.map(value => ({ value, ghost: false, active: false })));
    const active = state.activePiece;
    if (active && (state.status === "playing" || state.status === "paused")) {
      const ghost = getGhostPosition(state.board, active);
      for (const [position, isGhost] of [[ghost, true], [active.position, false]] as const) {
        if (isGhost && !state.settings.ghostPieceEnabled) continue;
        active.matrix.forEach((row, r) => row.forEach((cell, c) => {
          const y = position.y + r, x = position.x + c;
          if (cell && grid[y]?.[x] && (!isGhost || !grid[y][x].value)) {
            grid[y][x] = { value: active.type, ghost: isGhost, active: !isGhost };
          }
        }));
      }
    }
    return grid;
  }, [state.board, state.activePiece, state.status, state.settings.ghostPieceEnabled]);
  return (
    <div className={`relative overflow-hidden rounded-[22px] border-[5px] border-slate-700 bg-[#101d34] p-1.5 shadow-2xl shadow-slate-950/25 ${fitHeight ? "aspect-[1/2] h-full max-h-[600px] max-w-full" : ""}`}>
      <div role="img" aria-label={`Brick Blocks board. ${state.linesCleared} lines cleared. ${state.activePiece?.type ?? "No"} active shape.`}
        className={`grid grid-cols-10 grid-rows-[repeat(20,minmax(0,1fr))] gap-[2px] touch-none ${fitHeight ? "h-full" : "aspect-[1/2]"}`} data-testid="color-board">
        {cells.flatMap((row, r) => row.map((cell, c) => {
          const color = typeof cell.value === "string" ? BLOCK_COLORS[cell.value] : "#94a3b8";
          const clearing = state.clearingLines.includes(r);
          const style: CSSProperties = cell.value ? {
            background: cell.ghost ? `${color}18` : color,
            border: cell.ghost ? `1.5px dashed ${color}` : "1px solid #ffffff25",
            boxShadow: cell.ghost ? undefined : bevel,
          } : { background: "#ffffff06", border: "1px solid #ffffff05" };
          return <span key={`${r}-${c}`} data-block={cell.value || undefined} data-ghost={cell.ghost || undefined}
            className={`min-h-0 rounded-[3px] ${clearing && effects ? "motion-safe:animate-pulse" : ""}`} style={style}>
            {cell.active && <span className="block h-1 w-1 rounded-full bg-white/70 m-0.5" />}
          </span>;
        }))}
      </div>
      {state.status === "line-clearing" && (
        <div role="status" className="pointer-events-none absolute inset-x-1 top-1/3 text-center">
          <span className="rounded-xl bg-violet-900 px-4 py-2 text-lg font-black text-white shadow-xl">
            {state.clearingLines.length} LINE{state.clearingLines.length === 1 ? "" : "S"}
            {state.combo >= 0 ? ` · COMBO ${state.combo + 2}` : ""}
          </span>
          {effects && <div aria-hidden="true" className="mt-5 flex justify-center gap-4 motion-safe:animate-bounce">
            {["#22d3ee", "#a3e635", "#fb7185", "#fbbf24", "#b18aff"].map(color => <span key={color} className="h-2 w-2 rotate-45" style={{ background: color }} />)}
          </div>}
        </div>
      )}
      {state.status === "paused" && <div className="absolute inset-0 flex items-center justify-center bg-[#101d34]/95 text-center text-white">
        <div className="min-w-0 px-1"><p className="break-words font-[Fredoka] text-lg sm:text-2xl">Take a breath.</p><p className="mt-2 text-xs text-slate-300 sm:text-sm">Your board is paused.</p></div>
      </div>}
    </div>
  );
}, (previous, next) => previous.effects === next.effects && previous.fitHeight === next.fitHeight &&
  previous.state.board === next.state.board && previous.state.activePiece === next.state.activePiece &&
  previous.state.status === next.state.status && previous.state.clearingLines === next.state.clearingLines &&
  previous.state.combo === next.state.combo && previous.state.linesCleared === next.state.linesCleared &&
  previous.state.settings.ghostPieceEnabled === next.state.settings.ghostPieceEnabled);

function RepeatButton({ action, dispatch, children, label }: { action: "MOVE_LEFT" | "MOVE_RIGHT" | "SOFT_DROP_START"; dispatch: Dispatch<GameAction>; children: React.ReactNode; label: string }) {
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});
  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
    if (action === "SOFT_DROP_START") dispatch({ type: "SOFT_DROP_END" });
  };
  useEffect(() => stop, []);
  return <button type="button" className={`${buttonClass} touch-none px-2`} aria-label={label}
    onPointerDown={e => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dispatch({ type: action });
      if (action !== "SOFT_DROP_START") timers.current.delay = setTimeout(() => {
        dispatch({ type: action });
        timers.current.repeat = setInterval(() => dispatch({ type: action }), 50);
      }, 150);
    }}
    onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    onClick={e => { if (e.detail === 0) { dispatch({ type: action }); if (action === "SOFT_DROP_START") dispatch({ type: "SOFT_DROP_END" }); } }}>
    {children}
  </button>;
}

export function ControlDeck({ dispatch, canHold }: { dispatch: Dispatch<GameAction>; canHold: boolean }) {
  return <div className="mx-auto grid w-full max-w-md grid-cols-5 gap-2" aria-label="Game controls">
    <button type="button" className={`${buttonClass} px-2`} disabled={!canHold} aria-label="Hold shape" onClick={() => dispatch({ type: "HOLD_PIECE" })}><Package size={20} /></button>
    <RepeatButton action="MOVE_LEFT" label="Move left" dispatch={dispatch}><ArrowLeft size={22} /></RepeatButton>
    <RepeatButton action="SOFT_DROP_START" label="Soft drop" dispatch={dispatch}><ArrowDown size={22} /></RepeatButton>
    <RepeatButton action="MOVE_RIGHT" label="Move right" dispatch={dispatch}><ArrowRight size={22} /></RepeatButton>
    <button type="button" className={`${buttonClass} px-2`} aria-label="Rotate clockwise" onClick={() => dispatch({ type: "ROTATE_CW" })}><RotateCw size={22} /></button>
    <button type="button" className={`${buttonClass} col-span-2 text-xs`} onClick={() => dispatch({ type: "ROTATE_CCW" })}><RotateCcw size={16} />Rotate left</button>
    <button type="button" className={`${primaryClass} col-span-3 min-h-11`} onClick={() => dispatch({ type: "HARD_DROP" })}><ChevronsDown size={20} />Drop</button>
  </div>;
}
