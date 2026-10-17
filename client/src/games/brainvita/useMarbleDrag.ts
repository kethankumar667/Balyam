import { useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { HapticsManager } from "../../services/HapticsManager";
import { clampToBoard, hasDragged, pointerToCells, snapTarget, type Point } from "./brainvitaDrag";
import { movesFrom, type Board } from "./brainvitaRules";

export interface DragState {
  /** The marble being carried. */
  hole: number;
  /** Where it is held, in hole widths: under the pointer, or in the landing hole it has snapped to. */
  point: Point;
  /** The landing hole it will drop into if let go now, or null over open wood. */
  snap: number | null;
}

interface Press {
  hole: number;
  startX: number;
  startY: number;
  isDragging: boolean;
  /** True when this press had to pick the marble up itself, so a cancelled drag can put it back. */
  didSelect: boolean;
  targets: number[];
}

export interface UseMarbleDragArgs {
  board: Board;
  selected: number | null;
  isDisabled: boolean;
  onTap: (hole: number) => void;
  /** The pit area, whose on-screen box turns a pointer position into hole widths. */
  gridRef: RefObject<HTMLElement>;
}

/**
 * Lets a marble be carried to a landing hole as well as tapped there. A press that barely moves is left
 * alone, so tap-then-tap and the keyboard behave exactly as before. A press that travels picks the marble
 * up through the same `onTap` a tap uses, follows the pointer, and pulls into a legal landing hole when it
 * comes close; letting go there makes the jump through `onTap` again, and letting go anywhere else puts
 * the marble back. The game never learns it was a drag.
 */
export function useMarbleDrag({ board, selected, isDisabled, onTap, gridRef }: UseMarbleDragArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const press = useRef<Press | null>(null);
  const suppressClick = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  const setBoth = (next: DragState | null): void => {
    dragRef.current = next;
    setDrag(next);
  };

  const finish = (shouldLand: boolean): void => {
    const current = press.current;
    const held = dragRef.current;
    press.current = null;
    setBoth(null);
    if (!current?.isDragging) return;
    // The click that follows the release belongs to the drag, not to a tap.
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    if (shouldLand && held?.snap != null) onTap(held.snap);
    else if (current.didSelect) onTap(current.hole);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>): void => {
    if (isDisabled || event.button !== 0) return;
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-hole]");
    if (!button) return;
    const hole = Number(button.dataset.hole);
    if (!board[hole]) return;
    const targets = movesFrom(board, hole).map((move) => move.to);
    if (targets.length === 0) return;
    press.current = { hole, startX: event.clientX, startY: event.clientY, isDragging: false, didSelect: false, targets };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const current = press.current;
    const element = gridRef.current;
    if (!current || !element) return;
    if (!current.isDragging) {
      if (!hasDragged(current.startX, current.startY, event.clientX, event.clientY)) return;
      current.isDragging = true;
      if (selected !== current.hole) {
        current.didSelect = true;
        onTap(current.hole);
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is a convenience: without it the drag simply ends if the pointer leaves the board.
      }
    }
    const held = clampToBoard(pointerToCells(element.getBoundingClientRect(), event.clientX, event.clientY));
    const snap = snapTarget(held, current.targets);
    if (snap !== null && dragRef.current?.snap !== snap) HapticsManager.getInstance().subtle();
    setBoth({ hole: current.hole, point: held, snap });
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>): void => {
    if (!suppressClick.current) return;
    event.stopPropagation();
    event.preventDefault();
  };

  return {
    drag,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
      onClickCapture,
    },
  };
}
