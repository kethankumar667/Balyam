/**
 * Bhalyam Cricket — persisted sticker album.
 *
 * Records which real achievements (achievements.ts) have ever been earned,
 * and how many times. Separate persisted store, same convention as
 * historyStore.ts.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UnlockedSticker {
  id: string;
  unlockedAt: number;
  timesEarned: number;
  lastMatchId: string;
}

interface StickerState {
  unlocked: Record<string, UnlockedSticker>;
  unlockMany: (ids: string[], matchId: string) => void;
}

export const useStickerStore = create<StickerState>()(
  persist(
    (set) => ({
      unlocked: {},
      unlockMany: (ids, matchId) =>
        set((s) => {
          if (ids.length === 0) return s;
          const next = { ...s.unlocked };
          const now = Date.now();
          for (const id of ids) {
            const existing = next[id];
            next[id] = existing
              ? { ...existing, timesEarned: existing.timesEarned + 1, lastMatchId: matchId }
              : { id, unlockedAt: now, timesEarned: 1, lastMatchId: matchId };
          }
          return { unlocked: next };
        }),
    }),
    { name: "bhalyam.cricket.stickers" },
  ),
);
