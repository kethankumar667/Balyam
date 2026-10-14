import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { pointerToBoard, type AimData } from "./carrom-shared";
import { currentAim, moveGesture, releaseAim, startGesture, type AimGesture } from "./aimControl";

interface UseCarromAimOptions {
  svgRef: React.RefObject<SVGSVGElement>;
  /** True for the second seat, whose board is drawn upside down. */
  isFlipped: boolean;
  /** True only while it is this player's turn to aim. Turning false mid-drag drops the aim. */
  enabled: boolean;
  /** Called once with the shot when the finger lifts. Never called for a cancelled or interrupted touch. */
  onShoot: (aim: AimData) => void;
}

export interface CarromAimHandlers {
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void;
}

/**
 * The aiming input for both Carrom layouts, so the mobile and desktop boards stop carrying their own
 * copy. All the arithmetic is in `aimControl.ts`; this wires it to pointer events.
 *
 * One finger, primary button only. A touch the system interrupts, Escape, or the turn passing
 * cancels the aim and never fires it.
 */
export function useCarromAim({ svgRef, isFlipped, enabled, onShoot }: UseCarromAimOptions): {
  aim: AimData | null;
  handlers: CarromAimHandlers;
} {
  const gestureRef = useRef<AimGesture | null>(null);
  const [aim, setAim] = useState<AimData | null>(null);
  const onShootRef = useRef(onShoot);
  onShootRef.current = onShoot;

  const cancel = useCallback(() => {
    gestureRef.current = null;
    setAim(null);
  }, []);

  const toBoard = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      return svg ? pointerToBoard(svg.getBoundingClientRect(), e.clientX, e.clientY, isFlipped) : null;
    },
    [svgRef, isFlipped],
  );

  const releaseCapture = (e: React.PointerEvent<SVGSVGElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Capture may already be gone, for instance after a cancel.
    }
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!enabled || gestureRef.current || e.button !== 0) return;
    const anchor = toBoard(e);
    if (!anchor) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gestureRef.current = startGesture(e.pointerId, anchor, e.timeStamp);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const p = toBoard(e);
    if (!p) return;
    const next = moveGesture(gesture, e.pointerId, p, e.timeStamp);
    gestureRef.current = next;
    setAim(currentAim(next));
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const shot = enabled ? releaseAim(gesture, e.timeStamp) : null;
    cancel();
    releaseCapture(e);
    if (shot) onShootRef.current(shot);
  };

  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    cancel();
    releaseCapture(e);
  };

  // The turn passing, or the page losing focus, must not leave a half-made aim behind.
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", cancel);
    };
  }, [cancel]);

  return { aim, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
}
