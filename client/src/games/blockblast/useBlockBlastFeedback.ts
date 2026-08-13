import { useEffect, useRef, useState } from "react";
import type { BlockBlastSelfState } from "@shared/types";
import { AUDIO } from "../../constants/audio";
import { useAudio } from "../../hooks/useAudio";
import { useHaptics } from "../../hooks/useHaptics";

const BEST_KEY = "bb.best";

export interface BlockBlastFeedback {
  /** Cells that vanished in the last clear, flashed on the way out. */
  justCleared: Set<number>;
  /** The floating "+N". `key` changes each time so the animation restarts. */
  gain: { value: number; key: number } | null;
  /** Personal best across sessions, solo only. */
  best: number;
  onPickUp: () => void;
  onRefuse: () => void;
}

/**
 * Everything that happens *because* of a placement — the flash, the score
 * pop, the sound, the buzz.
 *
 * All of it is derived from watching state arrive rather than fired at the
 * moment of the tap. The server owns whether a placement happened at all, so
 * celebrating on tap would mean occasionally celebrating a rejected move.
 */
export function useBlockBlastFeedback(state: BlockBlastSelfState, selfId: string): BlockBlastFeedback {
  const { play } = useAudio();
  const haptics = useHaptics();

  const me = state.players.find((p) => p.id === selfId);
  const grid = me?.grid;
  const score = state.you.score;

  const [justCleared, setJustCleared] = useState<Set<number>>(() => new Set());
  const [gain, setGain] = useState<{ value: number; key: number } | null>(null);
  const [best, setBest] = useState(0);

  const prevGrid = useRef<number[] | undefined>(grid);
  const prevScore = useRef(score);
  const gainSeq = useRef(0);

  useEffect(() => {
    try {
      setBest(Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0);
    } catch {
      /* Private mode. A missing personal best is not worth a crash. */
    }
  }, []);

  // ── the clear ──────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = prevGrid.current;
    prevGrid.current = grid;
    if (!prev || !grid) return;

    const gone = new Set<number>();
    for (let i = 0; i < grid.length; i++) {
      if (prev[i] !== 0 && grid[i] === 0) gone.add(i);
    }
    if (gone.size === 0) return;

    setJustCleared(gone);
    // Two or more lines is the moment worth a real cue; a single line is a
    // tick. Treating them the same makes the good one feel like nothing.
    play(gone.size >= 16 ? AUDIO.SYS_SUCCESS : AUDIO.UI_CLICK);
    if (gone.size >= 16) haptics.win();
    else haptics.subtle();

    const id = window.setTimeout(() => setJustCleared(new Set()), 380);
    return () => window.clearTimeout(id);
  }, [grid, play, haptics]);

  // ── the score ──────────────────────────────────────────────────────────
  useEffect(() => {
    const delta = score - prevScore.current;
    prevScore.current = score;
    if (delta <= 0) return;
    gainSeq.current += 1;
    setGain({ value: delta, key: gainSeq.current });
    const id = window.setTimeout(() => setGain(null), 900);
    return () => window.clearTimeout(id);
  }, [score]);

  // ── the personal best ──────────────────────────────────────────────────
  useEffect(() => {
    // Solo only. A race score is against a specific field on a specific
    // seed, so filing it as a personal best would be comparing two different
    // things and quietly flattering whoever raced the most.
    if (!state.isOver || state.mode !== "solo") return;
    if (score <= best) return;
    setBest(score);
    try {
      window.localStorage.setItem(BEST_KEY, String(score));
    } catch {
      /* ignore */
    }
  }, [state.isOver, state.mode, score, best]);

  return {
    justCleared,
    gain,
    best,
    onPickUp: () => haptics.subtle(),
    onRefuse: () => {
      play(AUDIO.SYS_ERROR);
      haptics.subtle();
    },
  };
}
