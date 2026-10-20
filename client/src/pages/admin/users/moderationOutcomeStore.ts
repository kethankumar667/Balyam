import { create } from "zustand";
import type { ModerationOutcome } from "./UserInspection";

/** The result of a suspension or resumption, and the identity it was for. */
export type StoredModerationOutcome = ModerationOutcome & { userId: string };

interface ModerationOutcomeState {
  outcome: StoredModerationOutcome | null;
  setOutcome: (outcome: StoredModerationOutcome | null) => void;
}

/**
 * Where a moderation result is reported.
 *
 * A suspension request can still be in flight when the operator leaves the player's page for the
 * list. The page is gone by then, so the result cannot be kept in its state; it is written here, and
 * whichever of the two pages is on screen shows it. A failure that arrives late is therefore still
 * seen, instead of being dropped with the page that started the request.
 */
export const useModerationOutcomeStore = create<ModerationOutcomeState>((set) => ({
  outcome: null,
  setOutcome: (outcome) => set({ outcome }),
}));
