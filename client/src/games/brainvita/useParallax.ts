import { useEffect, useRef, type RefObject } from "react";

/**
 * Parallax for the board: it leans a few degrees with the phone (or the mouse), and the props lying on
 * the table shift by a different amount, which reads as depth. It is plain CSS 3D driven by two custom
 * properties, `--tx` and `--ty`, each in -1..1 and written straight onto the element so a tilt event never
 * re-renders React. There is no 3D library, so nothing is added to the bundle.
 */

/** How far, in degrees, the phone must be tipped from where it was first held for the full lean. */
export const TILT_RANGE_DEGREES = 22;
/** How much of the way to the target the lean moves each frame; small is smooth. */
const SMOOTHING = 0.12;

export const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

/** The lean for a phone tipped from `base` to `now`, each reading in degrees. */
export function tiltFromOrientation(base: { beta: number; gamma: number }, now: { beta: number; gamma: number }): { x: number; y: number } {
  return {
    x: clampUnit((now.gamma - base.gamma) / TILT_RANGE_DEGREES),
    y: clampUnit((now.beta - base.beta) / TILT_RANGE_DEGREES),
  };
}

/** The lean for a mouse at (x, y) in a window of the given size: 0 in the middle, 1 at the edges. */
export function tiltFromPointer(x: number, y: number, width: number, height: number): { x: number; y: number } {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return { x: clampUnit((x / width - 0.5) * 2), y: clampUnit((y / height - 0.5) * 2) };
}

export type MotionPermission = "granted" | "denied" | "unsupported";

/**
 * Asks for motion access where the platform makes you ask (iOS), and says "granted" where it does not.
 * Must be called from a tap, because that is the only moment iOS will show the question.
 */
export async function requestMotionPermission(): Promise<MotionPermission> {
  if (typeof DeviceOrientationEvent === "undefined") return "unsupported";
  const asker = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof asker.requestPermission !== "function") return "granted";
  try {
    return (await asker.requestPermission()) === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * While `isOn`, leans `target` with the phone's tilt or the mouse. `isPaused` flattens it, so the board
 * is square to the screen for a moment such as a drag, when the pointer's position must be exact.
 */
export function useParallax(target: RefObject<HTMLElement>, isOn: boolean, isPaused: boolean): void {
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  useEffect(() => {
    const element = target.current;
    if (!element || !isOn) return;

    let current = { x: 0, y: 0 };
    let goal = { x: 0, y: 0 };
    let base: { beta: number; gamma: number } | null = null;
    let frame = 0;

    const apply = (): void => {
      element.style.setProperty("--tx", current.x.toFixed(3));
      element.style.setProperty("--ty", current.y.toFixed(3));
    };
    const step = (): void => {
      const wanted = pausedRef.current ? { x: 0, y: 0 } : goal;
      current = { x: current.x + (wanted.x - current.x) * SMOOTHING, y: current.y + (wanted.y - current.y) * SMOOTHING };
      apply();
      frame = window.requestAnimationFrame(step);
    };
    const onOrientation = (event: DeviceOrientationEvent): void => {
      if (event.beta === null || event.gamma === null) return;
      base = base ?? { beta: event.beta, gamma: event.gamma };
      goal = tiltFromOrientation(base, { beta: event.beta, gamma: event.gamma });
    };
    const onPointer = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse") return;
      goal = tiltFromPointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
    };

    window.addEventListener("deviceorientation", onOrientation);
    window.addEventListener("pointermove", onPointer);
    frame = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("pointermove", onPointer);
      element.style.removeProperty("--tx");
      element.style.removeProperty("--ty");
    };
  }, [target, isOn]);
}
