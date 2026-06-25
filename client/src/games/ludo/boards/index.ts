import type { LudoBoard } from "./types";
import { buildBoard5 } from "./Board5";
import { buildBoard6 } from "./Board6";
import { buildBoard7 } from "./Board7";
import { buildBoard8 } from "./Board8";

export type { LudoBoard, Pt } from "./types";
export { default as BoardView } from "./BoardView";

/**
 * Picks the hand-built board for a given player count. Each builder owns its
 * own geometry so the layout is tuned per design; there is intentionally no
 * shared generator. 2–4 players use the classic cross board elsewhere, so this
 * only covers 5–8 (anything else falls back to the pentagon).
 */
export function buildLudoBoard(N: number): LudoBoard {
  switch (N) {
    case 5:
      return buildBoard5();
    case 6:
      return buildBoard6();
    case 7:
      return buildBoard7();
    case 8:
      return buildBoard8();
    default:
      return buildBoard5();
  }
}
