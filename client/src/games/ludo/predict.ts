import type { LudoColor, LudoToken } from "@shared/types";
import {
  playerCountFromTrackLength,
  resolveDestination,
  type LudoDestination,
} from "@shared/ludo-rules";
import { TRACK_LENGTH } from "./board-layout";

/**
 * Where a hovered token would land — resolved by the SAME function the server
 * uses to actually move it (`shared/ludo-rules.ts#resolveDestination`).
 *
 * This file used to re-implement the rule by hand, described as "stays in sync
 * with LudoEngine#simulateMove". It did not stay in sync: it applied Mandatory
 * Capture whenever the player had not yet captured, while the engine FIRST
 * checks whether the room has that option enabled at all. In a room with the
 * option off, the hover preview showed a token sailing past its own home
 * entrance when the engine would have turned it in — the preview lied about
 * the move the player was about to make.
 *
 * `mandatoryCapture` defaults to true to match DEFAULT_LUDO_OPTIONS; callers
 * that know the room's real setting should pass it.
 */
export function predictDestination(
  token: LudoToken,
  dice: number,
  color: LudoColor,
  hasCaptured: boolean,
  trackLength: number = TRACK_LENGTH,
  mandatoryCapture = true,
): LudoDestination | null {
  return resolveDestination(token, dice, {
    color,
    playerCount: playerCountFromTrackLength(trackLength),
    mandatoryCapture,
    hasCaptured,
  });
}
