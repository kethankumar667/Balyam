/**
 * How often the room fires a real-time engine's tick.
 *
 * An engine advances a fixed slice of simulated time per tick (Carrom: 1/60 s) and declares that as
 * `tickRateHz`. The room must tick every `1000 / tickRateHz` ms of wall-clock time, exactly, or the
 * simulation runs at the wrong speed. This used to be `Math.max(20, Math.round(1000 / hz))`: the
 * 20 ms floor turned Carrom's 16.67 ms into 20 ms, so every coin moved at 83% of its real speed, and
 * the rounding added its own error on top.
 *
 * The period is deliberately NOT rounded. The caller steps by "whole periods owed since the last
 * step" against `Date.now()`, which works fine with a fractional period.
 */

/** A safety floor so an absurd declared rate cannot spin the CPU. 8 ms is 125 Hz, above any game here. */
export const MIN_TICK_PERIOD_MS = 8;

export function tickPeriodMs(tickRateHz: number): number {
  return Math.max(MIN_TICK_PERIOD_MS, 1000 / tickRateHz);
}
