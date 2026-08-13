import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockBlastPieceView } from "@shared/types";
import { BLOCK_GRID } from "@shared/types";
import type { GridPreview } from "./blockblast-shared";

/**
 * Dragging a piece onto the board.
 *
 * This is the product. Everything else — scoring, race, bots — is
 * scaffolding around one gesture, and if the gesture is not right nothing
 * else can rescue it. Four things make it right, and all four are load-bearing:
 *
 *  1. **Pointer events, not click.** Same reason Snake's D-pad had to move
 *     off `onClick`: a click fires on release, which is far too late for
 *     anything you steer.
 *  2. **The piece rides ABOVE the finger.** A piece under the thumb is a
 *     piece you cannot see, and a placement you cannot see is a guess. This
 *     is the single biggest difference between a block game that feels
 *     precise and one that feels slippery.
 *  3. **Snapped preview, with a distinct refusal.** The player must know
 *     where it lands and whether it lands BEFORE letting go.
 *  4. **`touch-none` on the surfaces.** Otherwise the browser reads the drag
 *     as a scroll and takes the finger away mid-gesture.
 */

/** How far above the pointer the piece floats, in cells. */
const LIFT_CELLS = 1.5;

export interface DragState {
  slot: number;
  piece: BlockBlastPieceView;
  pointerId: number;
  /** Viewport coordinates of the pointer. */
  x: number;
  y: number;
}

export interface BlockBlastDrag {
  gridRef: React.RefObject<HTMLDivElement>;
  drag: DragState | null;
  preview: GridPreview | null;
  /** Side of one board cell in px. 0 until the grid has been measured. */
  cellSize: number;
  beginDrag: (slot: number, piece: BlockBlastPieceView, e: React.PointerEvent) => void;
}

export function useBlockBlastDrag({
  grid,
  disabled,
  onPlace,
  onPickUp,
  onRefuse,
}: {
  grid: number[];
  disabled: boolean;
  onPlace: (slot: number, r: number, c: number) => void;
  onPickUp?: () => void;
  /** Fired when a drag is released somewhere the piece cannot go. */
  onRefuse?: () => void;
}): BlockBlastDrag {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [cellSize, setCellSize] = useState(0);

  // Measured, not assumed: the board is fluid and the drag maths is all in
  // px. A stale cell size puts every piece in the wrong square.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setCellSize(el.getBoundingClientRect().width / BLOCK_GRID);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Latest handlers, read from a ref inside the window listeners.
   *
   * Without this the listener effect would have to depend on `onPlace` and
   * `grid`, so it would tear down and re-add mid-drag every time a broadcast
   * arrived — and a pointer-up landing in that gap is a piece that vanishes.
   */
  const latest = useRef({ grid, onPlace, onRefuse, cellSize });
  latest.current = { grid, onPlace, onRefuse, cellSize };

  const beginDrag = useCallback(
    (slot: number, piece: BlockBlastPieceView, e: React.PointerEvent) => {
      if (disabled) return;
      // Claim the pointer so the gesture survives the finger leaving the
      // tray slot — which it does immediately, by design.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* Safari occasionally refuses on an already-captured pointer. The
           window listeners below still see the whole gesture. */
      }
      setDrag({ slot, piece, pointerId: e.pointerId, x: e.clientX, y: e.clientY });
      onPickUp?.();
    },
    [disabled, onPickUp],
  );

  useEffect(() => {
    if (!drag) return;

    const move = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      // Stops the page rubber-banding under the gesture on iOS, which
      // `touch-none` alone does not always prevent once a drag is in flight.
      e.preventDefault();
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };

    const finish = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const target = resolveTarget(
        gridRef.current,
        { ...drag, x: e.clientX, y: e.clientY },
        latest.current.grid,
      );
      if (target && target.valid) {
        latest.current.onPlace(drag.slot, target.r, target.c);
      } else {
        latest.current.onRefuse?.();
      }
      setDrag(null);
    };

    const cancel = () => setDrag(null);

    // Window-level, not element-level: the tray slot under the finger
    // unmounts the moment the tray refills, and an element listener would go
    // with it — leaving a piece stuck to the cursor.
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag]);

  // A board update that makes the held piece illegal (or ends the game)
  // should not leave a ghost attached to the finger.
  useEffect(() => {
    if (disabled && drag) setDrag(null);
  }, [disabled, drag]);

  const target = drag ? resolveTarget(gridRef.current, drag, grid) : null;

  return {
    gridRef,
    drag,
    cellSize,
    preview: target
      ? {
          cells: target.cells,
          clearing: target.clearing,
          valid: target.valid,
          color: drag!.piece.color,
        }
      : null,
    beginDrag,
  };
}

export interface ResolvedTarget {
  r: number;
  c: number;
  valid: boolean;
  cells: number[];
  clearing: number[];
}

/** The board's on-screen box. Split out from the element so this is testable. */
export interface GridRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
}

function resolveTarget(
  el: HTMLDivElement | null,
  drag: DragState,
  grid: number[],
): ResolvedTarget | null {
  if (!el) return null;
  return resolveDrop(el.getBoundingClientRect(), drag, grid);
}

/**
 * Where the held piece would land, given the pointer.
 *
 * Clamped rather than refused at the edges: dragging past the left of the
 * board should mean column 0, not "nothing", because the alternative is a
 * preview that blinks out exactly when the player is being most careful.
 *
 * Exported for tests. The geometry here has one failure mode that is
 * invisible until a board is nearly full — see the bottom margin below —
 * and it is not the kind of thing to find out about from a player.
 */
export function resolveDrop(
  rect: GridRect,
  drag: Pick<DragState, "piece" | "x" | "y">,
  grid: number[],
): ResolvedTarget | null {
  const cell = rect.width / BLOCK_GRID;
  if (cell <= 0) return null;

  const lift = cell * LIFT_CELLS;

  /**
   * Is the gesture anywhere near the board?
   *
   * The bottom margin is deliberately generous: because the piece rides a
   * cell and a half above the finger, placing on the bottom row puts the
   * finger BELOW the board entirely. A symmetric margin here would make the
   * last row unreachable — a bug that only shows up on a nearly-full board,
   * which is when it hurts most.
   */
  const near =
    drag.x >= rect.left - cell * 2 &&
    drag.x <= rect.right + cell * 2 &&
    drag.y >= rect.top - cell &&
    drag.y <= rect.bottom + lift + cell;
  if (!near) return null;

  const centreX = drag.x;
  const centreY = drag.y - lift;
  const rawC = Math.round((centreX - (drag.piece.w * cell) / 2 - rect.left) / cell);
  const rawR = Math.round((centreY - (drag.piece.h * cell) / 2 - rect.top) / cell);

  const c = clamp(rawC, 0, BLOCK_GRID - drag.piece.w);
  const r = clamp(rawR, 0, BLOCK_GRID - drag.piece.h);

  const cells = drag.piece.cells.map((p) => (r + p.r) * BLOCK_GRID + (c + p.c));
  const valid = cells.every((i) => grid[i] === 0);

  return { r, c, valid, cells, clearing: valid ? clearingCells(grid, cells) : [] };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Which cells a placement would take down.
 *
 * A deliberate duplicate of the server's clear rule, used ONLY to draw the
 * preview. The server still decides what actually happens; if these ever
 * disagree the worst case is a preview that promised a line and did not
 * deliver, not a score anybody can forge.
 */
function clearingCells(grid: number[], placing: number[]): number[] {
  const next = grid.slice();
  for (const i of placing) next[i] = 1;

  const out: number[] = [];
  for (let r = 0; r < BLOCK_GRID; r++) {
    let full = true;
    for (let c = 0; c < BLOCK_GRID; c++) {
      if (next[r * BLOCK_GRID + c] === 0) {
        full = false;
        break;
      }
    }
    if (full) for (let c = 0; c < BLOCK_GRID; c++) out.push(r * BLOCK_GRID + c);
  }
  for (let c = 0; c < BLOCK_GRID; c++) {
    let full = true;
    for (let r = 0; r < BLOCK_GRID; r++) {
      if (next[r * BLOCK_GRID + c] === 0) {
        full = false;
        break;
      }
    }
    if (full) for (let r = 0; r < BLOCK_GRID; r++) out.push(r * BLOCK_GRID + c);
  }
  return out;
}
