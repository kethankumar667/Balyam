import { create } from "zustand";
import type { RecordsAtRisk } from "../lib/signOutGuard";

export type SignOutChoice = "signout" | "cancel";

interface SignOutGuardState {
  /** What signing out would destroy, while the player is being asked. `null` when no question is open. */
  risk: RecordsAtRisk | null;
  /** Open the question and wait for the player's answer. A second question replaces the first, which is cancelled. */
  ask: (risk: RecordsAtRisk) => Promise<SignOutChoice>;
  answer: (choice: SignOutChoice) => void;
}

let settle: ((choice: SignOutChoice) => void) | null = null;

/**
 * The one question sign-out can ask: "these records are only on this device, what now?". Kept in a store so the
 * sign-out hook can await the answer while a dialog mounted once at the app root shows it.
 */
export const useSignOutGuardStore = create<SignOutGuardState>((set) => ({
  risk: null,

  ask: (risk) =>
    new Promise<SignOutChoice>((resolve) => {
      settle?.("cancel");
      settle = resolve;
      set({ risk });
    }),

  answer: (choice) => {
    const resolve = settle;
    settle = null;
    set({ risk: null });
    resolve?.(choice);
  },
}));
