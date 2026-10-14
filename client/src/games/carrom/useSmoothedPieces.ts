import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CarromPiece } from "@shared/types";
import { RENDER_DELAY_MS, caughtUp, pushSnapshot, samplePieces, type Snapshot } from "./pieceSmoothing";

/**
 * The pieces to DRAW. While a shot is resolving this plays the server's snapshots back
 * RENDER_DELAY_MS late, blended frame by frame, so coins glide instead of stepping. Outside a
 * shot (aiming, placing the striker) it is the server's pieces unchanged, so dragging the
 * striker gains no lag. Game logic keeps reading the raw `pieces`.
 */
export function useSmoothedPieces(pieces: readonly CarromPiece[], isResolving: boolean): readonly CarromPiece[] {
  const bufferRef = useRef<Snapshot[]>([]);
  const frameRequestRef = useRef<number | null>(null);
  const [frame, setFrame] = useState<readonly CarromPiece[] | null>(null);

  // Layout effect so the first smoothed frame is set before the browser paints the raw one.
  useLayoutEffect(() => {
    if (!isResolving) {
      bufferRef.current = [];
      setFrame(null);
      return;
    }
    const now = performance.now();
    bufferRef.current = pushSnapshot(bufferRef.current, pieces, now);
    setFrame(samplePieces(bufferRef.current, now - RENDER_DELAY_MS));

    if (frameRequestRef.current !== null) return;
    const step = (): void => {
      const t = performance.now();
      if (caughtUp(bufferRef.current, t)) {
        frameRequestRef.current = null;
        setFrame(null);
        return;
      }
      setFrame(samplePieces(bufferRef.current, t - RENDER_DELAY_MS));
      frameRequestRef.current = requestAnimationFrame(step);
    };
    frameRequestRef.current = requestAnimationFrame(step);
  }, [pieces, isResolving]);

  useEffect(
    () => () => {
      if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    },
    [],
  );

  return isResolving && frame ? frame : pieces;
}
