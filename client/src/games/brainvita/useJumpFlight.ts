import { useEffect, useRef, useState } from "react";
import { DISSOLVE_DURATION_MS, JUMP_DURATION_MS } from "./brainvitaJump";
import type { Move } from "./brainvitaRules";

export interface JumpFlight {
  /** Changes with every jump, so a layer can restart its animation even for the same move twice. */
  id: number;
  move: Move;
}

export interface JumpEffects {
  /** The marble in the air; null once it has landed. */
  flight: JumpFlight | null;
  /** The captured marble dissolving; outlasts the flight a little. */
  burst: JumpFlight | null;
}

const NONE: JumpEffects = { flight: null, burst: null };

/**
 * Watches the list of jumps and, when exactly one has just been added, reports it for as long as its
 * flight and dissolve take. Undo, restart and a game being replayed all shorten or reset the list, which
 * is not a jump, so they never animate. With motion disabled it reports nothing at all and the board
 * simply changes, which is the whole of the reduced-motion fallback.
 */
export function useJumpFlight(moves: readonly Move[], isMotionOn: boolean): JumpEffects {
  const [effects, setEffects] = useState<JumpEffects>(NONE);
  const previousLength = useRef(moves.length);
  const counter = useRef(0);

  useEffect(() => {
    const before = previousLength.current;
    previousLength.current = moves.length;
    if (!isMotionOn || moves.length !== before + 1) {
      setEffects(NONE);
      return;
    }
    counter.current += 1;
    const jump: JumpFlight = { id: counter.current, move: moves[moves.length - 1] };
    setEffects({ flight: jump, burst: jump });
    const landed = window.setTimeout(() => setEffects((current) => (current.flight?.id === jump.id ? { ...current, flight: null } : current)), JUMP_DURATION_MS);
    const dissolved = window.setTimeout(() => setEffects((current) => (current.burst?.id === jump.id ? { ...current, burst: null } : current)), DISSOLVE_DURATION_MS);
    return () => {
      window.clearTimeout(landed);
      window.clearTimeout(dissolved);
    };
  }, [moves, isMotionOn]);

  return effects;
}
