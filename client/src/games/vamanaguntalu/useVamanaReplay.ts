import { useEffect, useRef, useState } from "react";
import type { VamanaPublicState } from "@shared/types.js";
import { buildReplayFrames, type ReplayFrame } from "./vamanaReplay";

/** Time between two seeds on screen; long turns are sped up so the whole sowing stays short. */
const MAX_STEP_MS = 140;
const MIN_STEP_MS = 30;
const TARGET_TOTAL_MS = 3_200;

interface Snapshot {
  moveCount: number;
  pits: number[];
  captured: Record<string, number>;
}

const snapshotOf = (state: VamanaPublicState): Snapshot => ({
  moveCount: state.moveCount,
  pits: state.pits,
  captured: state.captured,
});

export interface VamanaReplay {
  /** The seeds to draw in each pit right now: mid-animation, or the server's board once it has settled. */
  pits: number[];
  captured: Record<string, number>;
  activePit: number | null;
  capturedPit: number | null;
  isReplaying: boolean;
}

/**
 * Plays the last turn out seed by seed. It only ever animates between two boards the server has
 * already sent, and it never delays the truth: if animations are off, or the page has just loaded, or
 * several turns arrived at once, the server's board is shown immediately.
 */
export function useVamanaReplay(state: VamanaPublicState, animate: boolean): VamanaReplay {
  // The board before the latest move. Updated while rendering, but only when the move count changes,
  // so repeating the render (StrictMode, re-renders) cannot overwrite it.
  const history = useRef<{ previous: Snapshot | null; current: Snapshot }>({ previous: null, current: snapshotOf(state) });
  if (history.current.current.moveCount !== state.moveCount) {
    history.current = { previous: history.current.current, current: snapshotOf(state) };
  }

  const [frame, setFrame] = useState<ReplayFrame | null>(null);

  useEffect(() => {
    const { previous } = history.current;
    const move = state.lastMove;
    const isNextMove = previous !== null && state.moveCount === previous.moveCount + 1;
    if (!animate || !isNextMove || !move) {
      setFrame(null);
      return;
    }

    const frames = buildReplayFrames(previous.pits, move);
    const stepMs = Math.max(MIN_STEP_MS, Math.min(MAX_STEP_MS, Math.round(TARGET_TOTAL_MS / frames.length)));
    let index = 0;
    let timer: number | undefined;

    const advance = (): void => {
      if (index >= frames.length) {
        setFrame(null);
        return;
      }
      setFrame(frames[index]);
      index += 1;
      timer = window.setTimeout(advance, stepMs);
    };
    advance();

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    // Only a new move starts a replay; `animate` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveCount]);

  if (frame === null) {
    return { pits: state.pits, captured: state.captured, activePit: null, capturedPit: null, isReplaying: false };
  }
  return {
    pits: frame.pits,
    captured: history.current.previous?.captured ?? state.captured,
    activePit: frame.activePit,
    capturedPit: frame.capturedPit,
    isReplaying: true,
  };
}
