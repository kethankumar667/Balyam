import type { VamanaLastMove } from "@shared/types.js";
import { VAMANA_PIT_COUNT } from "@shared/types.js";

/**
 * Turns the server's account of the last turn (the pits lifted, in order, and the capture) into the
 * sequence of boards to show while the seeds are sown. It is purely visual: the final frame always
 * agrees with the board the server sent, and a client that skips the animation loses nothing.
 */

export interface ReplayFrame {
  /** The seeds in every pit at this instant. */
  pits: number[];
  /** The pit a seed was just dropped into, or the one just lifted. */
  activePit: number | null;
  /** The pit emptied by the capture, on the last frame only. */
  capturedPit: number | null;
}

/** A turn can lift a pit up to 200 times; the animation shows at most this many steps of it. */
export const MAX_REPLAY_FRAMES = 160;

function thin(frames: ReplayFrame[], maxFrames: number): ReplayFrame[] {
  if (frames.length <= maxFrames) return frames;
  const stride = Math.ceil(frames.length / maxFrames);
  return frames.filter((_, index) => index % stride === 0 || index === frames.length - 1);
}

export function buildReplayFrames(
  before: readonly number[],
  lastMove: VamanaLastMove,
  maxFrames: number = MAX_REPLAY_FRAMES,
): ReplayFrame[] {
  const board = [...before];
  const frames: ReplayFrame[] = [];
  const push = (activePit: number | null, capturedPit: number | null): void => {
    frames.push({ pits: [...board], activePit, capturedPit });
  };

  for (const lift of lastMove.lifts) {
    board[lift.pit] = 0;
    push(lift.pit, null);
    let pit = lift.pit;
    for (let placed = 0; placed < lift.seeds; placed++) {
      pit = (pit + 1) % VAMANA_PIT_COUNT;
      board[pit] += 1;
      push(pit, null);
    }
  }

  if (lastMove.capture) {
    board[lastMove.capture.pit] = 0;
    push(null, lastMove.capture.pit);
  }

  return thin(frames, maxFrames);
}
