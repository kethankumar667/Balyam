/**
 * Bhalyam Cricket — flow store.
 *
 * Cross-screen setup state: category (international/IPL), format, the two
 * team ids, toss, and each side's confirmed XI. All team/player ids reference
 * the real shared roster. Mirrors the app's Zustand convention.
 */

import { create } from "zustand";
import type { HcCategory, HcFormat, HcTeamId, TossDecision } from "./types";
import type { InningsState } from "./innings";
import { defaultXI } from "./data";

interface CricketFlowState {
  category: HcCategory;
  format: HcFormat;
  homeTeamId: HcTeamId;
  awayTeamId: HcTeamId;
  tossWinner: HcTeamId | null;
  tossDecision: TossDecision | null;
  loadingProgress: number;
  homeXI: string[];
  awayXI: string[];
  lastInnings: InningsState | null;

  setCategory: (category: HcCategory) => void;
  setFormat: (format: HcFormat) => void;
  setTeams: (home: HcTeamId, away: HcTeamId) => void;
  setTossWinner: (winner: HcTeamId) => void;
  setTossDecision: (decision: TossDecision) => void;
  setLoadingProgress: (value: number) => void;
  setHomeXI: (ids: string[]) => void;
  setAwayXI: (ids: string[]) => void;
  setLastInnings: (innings: InningsState) => void;
  reset: () => void;
}

const DEFAULT_CATEGORY: HcCategory = "international";
const DEFAULT_FORMAT: HcFormat = "t20";
const DEFAULT_HOME: HcTeamId = "india";
const DEFAULT_AWAY: HcTeamId = "australia";

function initialState() {
  return {
    category: DEFAULT_CATEGORY,
    format: DEFAULT_FORMAT,
    homeTeamId: DEFAULT_HOME,
    awayTeamId: DEFAULT_AWAY,
    tossWinner: null as HcTeamId | null,
    tossDecision: null as TossDecision | null,
    loadingProgress: 0,
    homeXI: defaultXI(DEFAULT_HOME, DEFAULT_FORMAT),
    awayXI: defaultXI(DEFAULT_AWAY, DEFAULT_FORMAT),
    lastInnings: null as InningsState | null,
  };
}

export const useCricketStore = create<CricketFlowState>((set) => ({
  ...initialState(),
  setCategory: (category) => set({ category }),
  setFormat: (format) => set({ format }),
  setTeams: (home, away) =>
    set((s) => ({
      homeTeamId: home,
      awayTeamId: away,
      homeXI: defaultXI(home, s.format),
      awayXI: defaultXI(away, s.format),
    })),
  setTossWinner: (winner) => set({ tossWinner: winner }),
  setTossDecision: (decision) => set({ tossDecision: decision }),
  setLoadingProgress: (value) => set({ loadingProgress: Math.max(0, Math.min(100, value)) }),
  setHomeXI: (ids) => set({ homeXI: ids }),
  setAwayXI: (ids) => set({ awayXI: ids }),
  setLastInnings: (innings) => set({ lastInnings: innings }),
  reset: () => set({ ...initialState() }),
}));
