import { create } from "zustand";
import type { RecordScoreResult } from "@shared/profile/Scorecard";

/**
 * The "you beat your own record" popups waiting to be shown, oldest first.
 *
 * Two doors lead here: a solo game's own save (`scorecardStore.recordScore`) and the server telling a room's player
 * (`scorecard:newBest`). Both can describe the same result, so a result is identified by game, mode and the match
 * that set the record and is queued once. Memory only: a popup that was never seen is not worth remembering
 * across a reload, and nothing here may touch the device's storage.
 */
interface NewRecordStore {
  queue: RecordScoreResult[];
  announce: (result: RecordScoreResult) => void;
  dismiss: () => void;
}

/** Only a score that BEAT an earlier one is a record worth a popup: a first score had nothing to beat. */
export function isBeatenRecord(result: RecordScoreResult): boolean {
  return result.isNewPersonalBest && typeof result.previousBest === "number";
}

function recordKey(result: RecordScoreResult): string {
  return `${result.game}:${result.scorecard.modeId}:${result.scorecard.bestScoreMatchId}`;
}

/** Remembered for the visit so a record shown (or dismissed) a moment ago is not shown again by the other door. */
const seenKeys = new Set<string>();

export const useNewRecordStore = create<NewRecordStore>((set) => ({
  queue: [],
  announce: (result) => {
    if (!isBeatenRecord(result)) return;
    const key = recordKey(result);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    set((state) => ({ queue: [...state.queue, result] }));
  },
  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
}));

/** Test hook: forget what has been shown. */
export function resetNewRecordStore(): void {
  seenKeys.clear();
  useNewRecordStore.setState({ queue: [] });
}
