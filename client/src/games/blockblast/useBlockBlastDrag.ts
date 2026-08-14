import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockBlastPieceView } from "@shared/types";
import { BLOCK_GRID } from "@shared/types";
import type { GridPreview } from "./blockblast-shared";

/**
 * Dragging a piece onto the board with silky 60/120fps hardware-accelerated tracking.
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

  // Measured, not assumed: fluid board sizing.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setCellSize(el.getBoundingClientRect().width / BLOCK_GRID);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const latest = useRef({ grid, onPlace, onRefuse, cellSize });
  latest.current = { grid, onPlace, onRefuse, cellSize };

  const beginDrag = useCallback(
    (slot: number, piece: BlockBlastPieceView, e: React.PointerEvent) => {
      if (disabled) return;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setDrag({ slot, piece, pointerId: e.pointerId, x: e.clientX, y: e.clientY });
      onPickUp?.();
    },
    [disabled, onPickUp],
  );

  useEffect(() => {
    if (!drag) return;

    let rafId = 0;
    let latestPos = { x: drag.x, y: drag.y };
    let hasNewPos = false;

    // Throttle React state updates to screen refresh rate (60/120fps)
    const scheduleUpdate = () => {
      if (hasNewPos) {
        hasNewPos = false;
        setDrag((d) => (d ? { ...d, x: latestPos.x, y: latestPos.y } : null));
      }
      rafId = requestAnimationFrame(scheduleUpdate);
    };
    rafId = requestAnimationFrame(scheduleUpdate);

    const move = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      latestPos = { x: e.clientX, y: e.clientY };
      hasNewPos = true;
    };

    const finish = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      cancelAnimationFrame(rafId);
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

    const cancel = () => {
      cancelAnimationFrame(rafId);
      setDrag(null);
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag?.slot, drag?.pointerId]);

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

export function resolveDrop(
  rect: GridRect,
  drag: Pick<DragState, "piece" | "x" | "y">,
  grid: number[],
): ResolvedTarget | null {
  const cell = rect.width / BLOCK_GRID;
  if (cell <= 0) return null;

  const lift = cell * LIFT_CELLS;

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
