/**
 * The one moment a coin request being paid produces: what to celebrate, for whom, and with whom.
 *
 * The person who asked sees coins arrive from the friend who paid; the person who paid sees them
 * leave for the friend who asked. It lives only while it is on screen and is never stored. A newer
 * moment replaces an older one, so two payments in a row celebrate the latest rather than queueing.
 */

import { create } from "zustand";

export type JoyKind = "received" | "sent";

/** One side of the transfer, as much as this screen knows of them. */
export interface JoyParty {
  /** Display name, or `null` when it is not known here (the stage then says "A friend"). */
  name: string | null;
  /** The member's avatar as the server stored it; absent means the BHALYAM logo is drawn. */
  avatar?: string;
}

export interface JoyMoment {
  kind: JoyKind;
  amount: number;
  /** The friend's display name, or `null` when it is not known here (the banner then says "A friend"). */
  otherName: string | null;
  /** This player. */
  self: JoyParty;
  /** The friend on the other side of the payment. */
  other: JoyParty;
  /** Changes on every moment, so the animation restarts even when two moments look identical. */
  key: number;
}

export interface MandaliJoyStore {
  moment: JoyMoment | null;
  show: (kind: JoyKind, amount: number, otherName: string | null, parties?: { self?: JoyParty; other?: JoyParty }) => void;
  clear: () => void;
}

let nextKey = 1;

export const useMandaliJoyStore = create<MandaliJoyStore>((set) => ({
  moment: null,
  show: (kind, amount, otherName, parties) =>
    set({
      moment: {
        kind,
        amount,
        otherName,
        self: parties?.self ?? { name: null },
        other: parties?.other ?? { name: otherName },
        key: nextKey++,
      },
    }),
  clear: () => set({ moment: null }),
}));
