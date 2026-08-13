import type { PadDir } from "../../components/quadPad";

/**
 * What the pilot presses vs. what the simulation is told.
 *
 * Space War is simulated in landscape: an 840x480 world with the ship on the
 * LEFT flying right, so "forward" is +x and `ArrowRight` is the throttle.
 * Portrait rotates that world a quarter turn to fit a phone —
 * `render.ts` does `translate(0, 640); rotate(-90deg)` — which maps
 *
 *      world +x  ──▶  screen UP        (ship sits at the bottom, fires upward)
 *      world +y  ──▶  screen RIGHT
 *
 * The mobile pad was wired straight through as if no rotation existed: UP sent
 * `ArrowLeft`. Pressing up flew the ship DOWN, into the bottom edge, where it
 * stuck against the clamp — and since enemies fall from the top, "reverse" is
 * the single worst thing that axis could do. Left and right happened to be
 * right, which is why it read as a control that half-worked rather than as an
 * obvious wiring fault.
 *
 * Both maps live here so the next orientation is a table entry rather than a
 * fresh chance to get the sign wrong.
 */

export type ShipKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export type ScreenOrientation = "horizontal" | "vertical";

const PORTRAIT: Record<PadDir, ShipKey> = {
  UP: "ArrowRight",
  DOWN: "ArrowLeft",
  LEFT: "ArrowUp",
  RIGHT: "ArrowDown",
};

const LANDSCAPE: Record<PadDir, ShipKey> = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
};

/** The engine key a pad press means, given how the world is being drawn. */
export function shipKeyFor(dir: PadDir, orientation: ScreenOrientation): ShipKey {
  return orientation === "vertical" ? PORTRAIT[dir] : LANDSCAPE[dir];
}

/** Every key the engine treats as steering, in either orientation. */
export const STEERING_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "w",
  "W",
  "a",
  "A",
  "s",
  "S",
  "d",
  "D",
]);
