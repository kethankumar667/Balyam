import { useEffect, useRef, useState } from "react";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import type { AnimationConfig } from "../helpers/types";

/**
 * "Reverse" — animation #3 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Lighter than +2/+4: no big cinematic component, because most of the
 * guide's library split is satisfied by pieces that already exist or are
 * trivially composed by the caller, not a new mounted overlay:
 *   - GSAP         → `useTableCamera.tilt()` (new method, this pass) —
 *                    called imperatively from here.
 *   - Framer Motion → `UnoDirectionArc`'s new `spinTrigger` prop (this
 *                     pass) — the caller feeds this hook's return value
 *                     straight into it.
 *   - React Spring  → `usePlayerWobble` REUSED as-is on the pile wrapper
 *                     (its "elastic squash → overshoot → settle" physics
 *                     read as a card wobble just as well as a player
 *                     wobble — the caller wires this hook's return value
 *                     into it directly, no new spring needed).
 *   - Howler        → the "swish" is already played by the existing
 *                     `useUnoEventFlourish` the instant `lastAction`
 *                     updates; this hook adds the second layer — a
 *                     delayed "rewind" once the spin visually settles —
 *                     rather than re-triggering a redundant swish.
 *
 * Reverse fires far more often than a +2/+4 hit (every Reverse card, in
 * any player count, table-wide), so everything here stays quick
 * (~750ms) and non-blocking by design.
 */
export function useReverseFlip(
  flourish: "reverse" | "skip" | null,
  config: AnimationConfig,
  tilt: (opts?: { disabled?: boolean; degrees?: number }) => void,
): string | null {
  const { play } = useAudio();
  const [trigger, setTrigger] = useState<string | null>(null);
  const prev = useRef<"reverse" | "skip" | null>(null);

  useEffect(() => {
    if (flourish === "reverse" && prev.current !== "reverse") {
      prev.current = flourish;
      const key = `reverse-${Date.now()}`;
      setTrigger(key);
      tilt({ disabled: config.reducedMotion });

      const rewindDelay = config.reducedMotion ? 0 : 420;
      const rewindTimer = window.setTimeout(() => {
        if (config.soundEnabled) play(AUDIO.UNO_FX_REWIND, { rate: pitchVariant(0.05) });
      }, rewindDelay);
      const clearTimer = window.setTimeout(() => setTrigger(null), 750);
      return () => {
        window.clearTimeout(rewindTimer);
        window.clearTimeout(clearTimer);
      };
    }
    prev.current = flourish;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flourish]);

  return trigger;
}
