import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { WorldId } from "@shared/worlds";

const ZOOM = 2;
const LENS_SIZE = 176;
const EDGE = 8;
const FINGER_GAP = 32;
const KEY_STEP = 0.05;

interface Viewport { left: number; top: number; width: number; height: number }
interface InspectionPoint { x: number; y: number; board: DOMRect }

export function lensPlacement(x: number, y: number, viewport: Viewport) {
  const size = Math.max(0, Math.min(LENS_SIZE, viewport.width - EDGE * 2, viewport.height - EDGE * 2));
  const clamp = (value: number, start: number, length: number) =>
    Math.min(start + length - size - EDGE, Math.max(start + EDGE, value));
  const above = y - size - FINGER_GAP;
  const top = above >= viewport.top + EDGE ? above : y + FINGER_GAP;
  return {
    size,
    left: clamp(x - size / 2, viewport.left, viewport.width),
    top: clamp(top, viewport.top, viewport.height),
  };
}

function viewportBounds(): Viewport {
  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight,
  };
}

export function LudoMagnifier({ playerCount, world, highContrast = false, onEnable, children }: {
  playerCount: number;
  world: WorldId;
  highContrast?: boolean;
  onEnable?: () => void;
  /** Render the same current board state; read-only copies must have no input or effect handlers. */
  children: (readOnly: boolean, inLens: boolean) => ReactNode;
}) {
  const eligible = playerCount >= 5 && playerCount <= 8;
  const [enabled, setEnabled] = useState(false);
  const active = eligible && enabled;
  const [point, setPoint] = useState<InspectionPoint | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pointerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<InspectionPoint | null>(null);
  const helpId = useId();
  const board = useMemo(() => children(active, false), [children, active]);
  const hasPoint = point !== null;
  // Pointer movement changes only the lens transform, not the board subtree.
  const enlargedBoard = useMemo(() => hasPoint ? children(true, true) : null, [children, hasPoint]);

  const hideLens = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    pendingRef.current = null;
    setPoint(null);
  };

  useEffect(() => {
    if (!eligible) setEnabled(false);
  }, [eligible]);

  useEffect(() => {
    if (!active) return;
    const blockGameplayShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches("input, textarea") || target.isContentEditable)) return;
      if (/^[1-4rR]$/.test(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("keydown", blockGameplayShortcut, true);
    return () => document.removeEventListener("keydown", blockGameplayShortcut, true);
  }, [active]);

  useEffect(() => {
    if (active) surfaceRef.current?.focus({ preventScroll: true });
    else hideLens();
    const hide = () => hideLens();
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    document.addEventListener("fullscreenchange", hide);
    window.visualViewport?.addEventListener("resize", hide);
    window.visualViewport?.addEventListener("scroll", hide);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
      document.removeEventListener("fullscreenchange", hide);
      window.visualViewport?.removeEventListener("resize", hide);
      window.visualViewport?.removeEventListener("scroll", hide);
    };
  }, [active]);

  const inspectPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.isPrimary === false || (event.pointerType !== "mouse" && pointerRef.current !== event.pointerId)) return;
    const board = event.currentTarget.getBoundingClientRect();
    if (!board.width || !board.height) return;
    pendingRef.current = {
      x: Math.max(0, Math.min(1, (event.clientX - board.left) / board.width)),
      y: Math.max(0, Math.min(1, (event.clientY - board.top) / board.height)), board,
    };
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setPoint(pendingRef.current);
    });
  };

  const stopPointer = () => {
    pointerRef.current = null;
    hideLens();
  };
  const exit = () => {
    setEnabled(false);
    stopPointer();
    toggleRef.current?.focus({ preventScroll: true });
  };
  const placement = point ? lensPlacement(
    point.board.left + point.x * point.board.width,
    point.board.top + point.y * point.board.height,
    viewportBounds(),
  ) : null;

  return (
    <>
      {board}
      {eligible && (
        <button
          ref={toggleRef}
          type="button"
          aria-label={active ? "Disable board magnifier" : "Enable board magnifier"}
          aria-pressed={active}
          title={active ? "Magnifier on. Disable to move tokens." : "Magnify the board"}
          onClick={() => {
            if (active) exit();
            else { onEnable?.(); setEnabled(true); }
          }}
          onKeyDown={(event) => {
            if (active && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); exit(); }
          }}
          className="absolute left-1 top-1 z-40 flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-amber-700 bg-amber-50 text-amber-950 shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          {active ? <ZoomOut className="h-5 w-5" aria-hidden /> : <ZoomIn className="h-5 w-5" aria-hidden />}
        </button>
      )}
      {active && (
        <>
          <div
            ref={surfaceRef}
            role="group"
            aria-label="Ludo board inspection"
            aria-describedby={helpId}
            tabIndex={0}
            className="absolute inset-0 z-30 cursor-crosshair rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-amber-500"
            style={{ touchAction: "pinch-zoom" }}
            onBlur={hideLens}
            onMouseMove={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              if (event.isPrimary === false || event.button > 0) return;
              pointerRef.current = event.pointerId;
              event.currentTarget.setPointerCapture?.(event.pointerId);
              inspectPointer(event);
            }}
            onPointerMove={inspectPointer}
            onPointerUp={stopPointer}
            onPointerCancel={stopPointer}
            onLostPointerCapture={stopPointer}
            onPointerLeave={() => { if (pointerRef.current === null) hideLens(); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); exit(); return; }
              const dx = event.key === "ArrowRight" ? KEY_STEP : event.key === "ArrowLeft" ? -KEY_STEP : 0;
              const dy = event.key === "ArrowDown" ? KEY_STEP : event.key === "ArrowUp" ? -KEY_STEP : 0;
              if (!dx && !dy) return;
              event.preventDefault();
              const board = event.currentTarget.getBoundingClientRect();
              if (!board.width || !board.height) return;
              setPoint(previous => ({
                x: Math.max(0, Math.min(1, (previous?.x ?? 0.5) + dx)),
                y: Math.max(0, Math.min(1, (previous?.y ?? 0.5) + dy)), board,
              }));
            }}
          />
          <p id={helpId} role="status" className="pointer-events-none absolute inset-x-1 bottom-1 z-40 rounded-xl bg-slate-950/95 px-2 py-1 text-center text-xs font-semibold text-white">
            Inspect only · Drag or use arrow keys · Disable to play
          </p>
        </>
      )}
      {active && point && placement && createPortal(
        <div
          data-testid="ludo-magnifier-lens"
          aria-hidden="true"
          className={`ludo-board theme-${world} ${highContrast ? "hc" : ""} fixed z-40 overflow-hidden rounded-full border-4 border-amber-500 bg-white shadow-2xl`}
          style={{ pointerEvents: "none", left: placement.left, top: placement.top, width: placement.size, height: placement.size }}
        >
          <div className="absolute" style={{
            width: point.board.width * ZOOM, height: point.board.height * ZOOM,
            left: placement.size / 2 - 4 - point.x * point.board.width * ZOOM,
            top: placement.size / 2 - 4 - point.y * point.board.height * ZOOM,
          }}>
            {enlargedBoard}
          </div>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-950 px-2 text-xs font-bold text-white">2×</span>
        </div>,
        document.fullscreenElement ?? document.body,
      )}
    </>
  );
}
