import { useSyncExternalStore } from "react";
import { isMinor, needsAgeAnswer, subscribeAge } from "../lib/privacy/ageGate";

/**
 * Is the first-run age question still waiting for an answer?
 *
 * The first-run order is age, then the privacy choice, then (for members) the profile questions.
 * Anything that has to come after the age answer reads this and stays away until it turns false.
 */
export function useAgeGatePending(): boolean {
  return useSyncExternalStore(subscribeAge, needsAgeAnswer, () => false);
}

/** True when the player said they are under 18, so limited mode applies. */
export function useIsMinor(): boolean {
  return useSyncExternalStore(subscribeAge, isMinor, () => false);
}

export default useAgeGatePending;
