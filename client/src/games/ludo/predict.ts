import type { LudoColor, LudoToken } from "@shared/types";
import {
  COLOR_START_POSITION,
  STRETCH_LENGTH,
  TRACK_LENGTH,
  lastTrackPosFor,
} from "./board-layout";

/**
 * Client-side mirror of the server's move simulator. Used to highlight the
 * destination cell when a player hovers a movable token. Stays in sync with
 * `server/src/games/ludo/LudoEngine.ts#simulateMove`.
 */
export function predictDestination(
  token: LudoToken,
  dice: number,
  color: LudoColor,
  hasCaptured: boolean,
  trackLength: number = TRACK_LENGTH
):
  | { state: "track"; trackPos: number }
  | { state: "stretch"; stretchPos: number }
  | { state: "home" }
  | null {
  if (token.state === "yard") {
    if (dice !== 6) return null;
    return { state: "track", trackPos: COLOR_START_POSITION[color] };
  }
  if (token.state === "stretch") {
    const next = (token.stretchPos ?? 0) + dice;
    if (next > STRETCH_LENGTH) return null;
    if (next === STRETCH_LENGTH) return { state: "home" };
    return { state: "stretch", stretchPos: next };
  }
  if (token.state === "track") {
    const last = lastTrackPosFor(color, trackLength);
    const cur = token.trackPos ?? 0;
    const distToLast = (last - cur + trackLength) % trackLength;
    if (dice <= distToLast) {
      return { state: "track", trackPos: (cur + dice) % trackLength };
    }
    if (!hasCaptured) {
      // Mandatory Capture: token must bypass its entrance
      return { state: "track", trackPos: (cur + dice) % trackLength };
    }
    const intoStretch = dice - distToLast;
    if (intoStretch > STRETCH_LENGTH) return null;
    if (intoStretch === STRETCH_LENGTH) return { state: "home" };
    return { state: "stretch", stretchPos: intoStretch - 1 };
  }
  return null;
}
