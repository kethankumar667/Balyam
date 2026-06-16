import type { LudoColor, LudoToken } from "@shared/types";
import {
  STRETCH_LENGTH,
  TRACK_LENGTH,
  lastTrackPosFor,
} from "./board-layout";

export function isSameTokenState(a: LudoToken, b: LudoToken): boolean {
  return (
    a.state === b.state &&
    a.trackPos === b.trackPos &&
    a.stretchPos === b.stretchPos
  );
}

/**
 * Build the sequence of intermediate token states a token visits between
 * `from` and `to`. Each entry represents one visible cell along the route,
 * so the UI can animate the token step-by-step rather than sliding straight
 * from origin to destination.
 *
 * - Yard → anywhere (boarding): single "appear" step.
 * - Anywhere → Yard (capture): single "jump" step.
 * - Track → Track (possibly wrapping around): walk one cell at a time.
 * - Track → Stretch: walk to the last track cell, then into the stretch.
 * - Stretch → Stretch: advance one cell at a time.
 * - Track / Stretch → Home: walk through remaining stretch cells, then home.
 */
export function computeStepPath(
  from: LudoToken,
  to: LudoToken,
  color: LudoColor,
  trackLength: number = TRACK_LENGTH
): LudoToken[] {
  // Capture: snap back to yard (no animation through reverse path)
  if (to.state === "yard") {
    return [cloneAt(to, "yard")];
  }
  // Boarding from yard: single appearance step (CSS handles the bounce)
  if (from.state === "yard") {
    return [cloneAt(to, to.state, to.trackPos, to.stretchPos)];
  }

  const steps: LudoToken[] = [];
  const lastTrack = lastTrackPosFor(color, trackLength);

  // Walk forward on the track if we start there
  if (from.state === "track") {
    let cur = from.trackPos ?? 0;
    const targetIsTrack = to.state === "track";
    const trackEndAt = targetIsTrack ? to.trackPos ?? cur : lastTrack;

    let safety = trackLength + 2;
    while (cur !== trackEndAt && safety-- > 0) {
      cur = (cur + 1) % trackLength;
      steps.push(cloneAt(to, "track", cur));
    }

    if (targetIsTrack) return steps;
  }

  // Walk into / through the stretch
  if (to.state === "stretch") {
    const startStretch =
      from.state === "stretch" ? (from.stretchPos ?? 0) + 1 : 0;
    const targetStretch = to.stretchPos ?? 0;
    for (let s = startStretch; s <= targetStretch; s++) {
      steps.push(cloneAt(to, "stretch", undefined, s));
    }
    return steps;
  }

  if (to.state === "home") {
    const startStretch =
      from.state === "stretch" ? (from.stretchPos ?? 0) + 1 : 0;
    for (let s = startStretch; s < STRETCH_LENGTH; s++) {
      steps.push(cloneAt(to, "stretch", undefined, s));
    }
    steps.push(cloneAt(to, "home"));
    return steps;
  }

  return steps.length > 0 ? steps : [to];
}

function cloneAt(
  template: LudoToken,
  state: LudoToken["state"],
  trackPos?: number,
  stretchPos?: number
): LudoToken {
  const out: LudoToken = {
    id: template.id,
    color: template.color,
    state,
  };
  if (trackPos !== undefined) out.trackPos = trackPos;
  if (stretchPos !== undefined) out.stretchPos = stretchPos;
  return out;
}
