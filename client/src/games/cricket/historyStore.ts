/**
 * Bhalyam Cricket — persisted match history.
 *
 * Every completed match (both real innings played out) is recorded here and
 * survives page reloads via localStorage, following the app's existing
 * localStorage-persisted-singleton convention (see AudioManager). A separate
 * store from the flow store (store.ts) on purpose: that one resets on every
 * new match; this one is the permanent record. Only a lightweight summary is
 * kept — not the full ball-by-ball log — to keep storage bounded.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HcCategory, HcFormat, HcTeamId } from "./types";

export interface HistoryPlayerOfMatch {
  playerId: string;
  playerName: string;
  teamId: HcTeamId;
  runs: number;
  balls: number;
}

export interface HistoryScoreLine {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  fours: number;
  sixes: number;
}

export interface HistoryMatchRecord {
  id: string;
  playedAt: number;
  category: HcCategory;
  format: HcFormat;
  firstTeamId: HcTeamId;
  secondTeamId: HcTeamId;
  winner: HcTeamId | "tie";
  marginKind: "runs" | "wickets" | "tie";
  marginValue: number;
  marginText: string;
  first: HistoryScoreLine;
  second: HistoryScoreLine;
  playerOfMatch: HistoryPlayerOfMatch | null;
  durationText: string;
}

/** Caps localStorage growth — oldest matches drop off past this count. */
const MAX_HISTORY = 100;

interface HistoryState {
  matches: HistoryMatchRecord[];
  recordMatch: (record: HistoryMatchRecord) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      matches: [],
      recordMatch: (record) => set((s) => ({ matches: [record, ...s.matches].slice(0, MAX_HISTORY) })),
      clearHistory: () => set({ matches: [] }),
    }),
    { name: "bhalyam.cricket.history" },
  ),
);
