import { SPACEWAR_TICK_HZ, SPACEWAR_WORLD } from "@shared/types";

/**
 * Local prediction for the ship you are flying.
 *
 * The world is interpolated a step or so behind live (see SnapshotTimeline),
 * and on top of that the server does not learn a thumb went down until the
 * message gets there. Add the two and a phone shows your own ship reacting
 * ~150ms after you moved — long enough that players stop trusting the control
 * and start over-correcting, which is what "struggling to play" looks like
 * from the outside.
 *
 * Everything else on screen should stay honestly late; only the ship under
 * your thumb gets to run ahead, because only that one has input the server
 * has not seen yet. So rather than simulating a second copy of the game, we
 * keep a small LEAD vector — how far ahead of the last known server position
 * the pilot's own input says they should be:
 *
 *     lead ← lead·e^(−dt/τ) + input·speed·dt
 *
 * Holding a direction, the lead grows until the decay balances the input, and
 * settles at roughly `speed × τ` — about one round trip's worth of travel,
 * which is exactly the amount the server is behind. Release, and it bleeds
 * back to zero over τ instead of snapping, so there is no rubber-band.
 *
 * The decay is what makes this safe: it is a display offset that is always
 * being pulled back to the authoritative position, so a disagreement with the
 * server corrects itself within a few frames rather than accumulating. The
 * client still never decides where the ship IS.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** How quickly the lead gives way to the server, in ms. */
const SETTLE_MS = 110;

const TICK_MS = 1000 / SPACEWAR_TICK_HZ;

const MAX_X = SPACEWAR_WORLD.width - SPACEWAR_WORLD.shipWidth;
const MIN_Y = SPACEWAR_WORLD.shipMarginY;
const MAX_Y = SPACEWAR_WORLD.height - SPACEWAR_WORLD.shipHeight - SPACEWAR_WORLD.shipMarginY;

/** World-axis intent from the keys currently held. Mirrors the engine's reads. */
export function steerAxis(held: ReadonlySet<string>): Vec2 {
  const left = held.has("ArrowLeft") || held.has("a") || held.has("A");
  const right = held.has("ArrowRight") || held.has("d") || held.has("D");
  const up = held.has("ArrowUp") || held.has("w") || held.has("W");
  const down = held.has("ArrowDown") || held.has("s") || held.has("S");
  return {
    x: (right ? 1 : 0) - (left ? 1 : 0),
    y: (down ? 1 : 0) - (up ? 1 : 0),
  };
}

/**
 * Advance the lead by one rendered frame.
 *
 * `server` is the interpolated authoritative position; the returned lead is
 * clamped so `server + lead` can never be drawn outside the flight envelope —
 * a ship visually pushed through the wall it is pinned against is worse than
 * the lag it was meant to hide.
 */
export function advanceShipLead(
  lead: Vec2,
  held: ReadonlySet<string>,
  server: Vec2,
  dtMs: number,
): Vec2 {
  // A frame this long means the tab was asleep. Restarting from zero is
  // correct: whatever was held has long since been applied by the server.
  if (!(dtMs > 0) || dtMs > 250) return { x: 0, y: 0 };

  const axis = steerAxis(held);
  const decay = Math.exp(-dtMs / SETTLE_MS);
  const travel = (SPACEWAR_WORLD.shipSpeed * dtMs) / TICK_MS;

  let x = lead.x * decay + axis.x * travel;
  let y = lead.y * decay + axis.y * travel;

  x = clamp(x, -server.x, MAX_X - server.x);
  y = clamp(y, MIN_Y - server.y, MAX_Y - server.y);

  // Sub-pixel residue is invisible and keeps the ship marked as "moving"
  // forever; snapping it to rest keeps the settle crisp.
  if (Math.abs(x) < 0.05) x = 0;
  if (Math.abs(y) < 0.05) y = 0;
  return { x, y };
}

function clamp(v: number, lo: number, hi: number): number {
  if (lo > hi) return 0;
  return v < lo ? lo : v > hi ? hi : v;
}
