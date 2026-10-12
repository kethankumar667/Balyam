import { useSyncExternalStore } from "react";
import { needsConsent, subscribeConsent } from "../lib/privacy/consent";

/**
 * Is the privacy choice still waiting to be answered?
 *
 * The first-run order is privacy, then the profile questions, then the welcome. Anything that has to
 * come after the privacy answer reads this and stays away until it turns false, then appears the
 * moment the answer is recorded — no polling, and it works across tabs.
 */
export function useConsentPending(): boolean {
  return useSyncExternalStore(subscribeConsent, needsConsent, () => false);
}

export default useConsentPending;
