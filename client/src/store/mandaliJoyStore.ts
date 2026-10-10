/**
 * The one moment a coin request being paid produces: what to celebrate, for whom, and with whom.
 *
 * The person who asked gets "a friend sent you coins"; the person who paid gets a quieter "you sent
 * coins". It lives only while it is on screen and is never stored. A newer moment replaces an older
 * one, so two payments in a row celebrate the latest rather than queueing.
 */

import { create } from "zustand";

export type JoyKind = "received" | "sent";

export interface JoyMoment {
  kind: JoyKind;
  amount: number;
  /** The friend's display name, or `null` when it is not known here (the banner then says "A friend"). */
  otherName: string | null;
  /** Changes on every moment, so the animation restarts even when two moments look identical. */
  key: number;
}

export interface MandaliJoyStore {
  moment: JoyMoment | null;
  show: (kind: JoyKind, amount: number, otherName: string | null) => void;
  clear: () => void;
}

let nextKey = 1;

export const useMandaliJoyStore = create<MandaliJoyStore>((set) => ({
  moment: null,
  show: (kind, amount, otherName) => set({ moment: { kind, amount, otherName, key: nextKey++ } }),
  clear: () => set({ moment: null }),
}));
