import { useEffect, useState } from "react";

/** More than this per frame, typically (about 30 fps), means the device is struggling. */
const SLOW_FRAME_MS = 34;
/** Enough frames to tell a struggling device from a single hiccup, few enough to react before the eye notices. */
const SAMPLE_FRAMES = 20;

/**
 * Whether this device is struggling to keep up, judged from how long its first frames take.
 *
 * Device hints (cores, memory) are only a guess: a phone with plenty of cores can still be slow, and
 * one with few can be fine. So a celebration also watches what actually happens. It measures the first
 * `SAMPLE_FRAMES` frames, and if the median frame is slower than about 30 fps it reports pressure once,
 * and the celebration drops half its particles and its costliest effect on the spot. It never goes back
 * up, because a celebration lasts a few seconds and flickering between qualities would look worse.
 *
 * Reads nothing from the device but the browser's own frame clock, stores nothing and sends nothing.
 */
export function useFramePressure(): boolean {
  const [pressured, setPressured] = useState(false);

  useEffect(() => {
    let frame = 0;
    const gaps: number[] = [];
    let last = performance.now();

    const tick = (now: number) => {
      gaps.push(now - last);
      last = now;
      if (gaps.length < SAMPLE_FRAMES) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const sorted = [...gaps].sort((a, b) => a - b);
      if (sorted[Math.floor(sorted.length / 2)] > SLOW_FRAME_MS) setPressured(true);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return pressured;
}

/** Half of a list, for a device that is struggling. Never empties it. */
export function lighten<T>(items: readonly T[], pressured: boolean): readonly T[] {
  return pressured ? items.slice(0, Math.max(6, Math.ceil(items.length / 2))) : items;
}
