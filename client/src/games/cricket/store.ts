/**
 * Bhalyam Cricket — flow store.
 *
 * Cross-screen setup state: category (international/IPL), format, the two
 * team ids, toss, each side's confirmed XI, and the match's two real innings
 * once played. All team/player ids reference the real shared roster. Mirrors
 * the app's Zustand convention.
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

  /** The two real played innings. `secondInnings` is null until the chase
   *  starts; the match is decided the moment both exist. */
  firstInnings: InningsState | null;
  secondInnings: InningsState | null;
  /** Which innings the Scorecard/analytics screens are currently showing. */
  reviewInningsNo: 1 | 2;
  /** Wall-clock ms when innings 1 started — used for the real "time played"
   *  duration in the match summary (not a fabricated cricket-time figure). */
  matchStartedAt: number | null;
  /** Wall-clock ms when innings 2 ends — set once, drives the same real
   *  "time played" figure. */
  matchEndedAt: number | null;

  setCategory: (category: HcCategory) => void;
  setFormat: (format: HcFormat) => void;
  setTeams: (home: HcTeamId, away: HcTeamId) => void;
  setTossWinner: (winner: HcTeamId) => void;
  setTossDecision: (decision: TossDecision) => void;
  setLoadingProgress: (value: number) => void;
  setHomeXI: (ids: string[]) => void;
  setAwayXI: (ids: string[]) => void;
  setFirstInnings: (innings: InningsState) => void;
  setSecondInnings: (innings: InningsState) => void;
  setReviewInningsNo: (no: 1 | 2) => void;
  startMatchClock: () => void;
  finishMatchClock: () => void;
  resetMatch: () => void;
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
    firstInnings: null as InningsState | null,
    secondInnings: null as InningsState | null,
    reviewInningsNo: 1 as 1 | 2,
    matchStartedAt: null as number | null,
    matchEndedAt: null as number | null,
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
  setFirstInnings: (innings) => set({ firstInnings: innings, reviewInningsNo: 1 }),
  setSecondInnings: (innings) => set({ secondInnings: innings, reviewInningsNo: 2 }),
  setReviewInningsNo: (no) => set({ reviewInningsNo: no }),
  startMatchClock: () => set((s) => (s.matchStartedAt == null ? { matchStartedAt: Date.now() } : {})),
  finishMatchClock: () => set((s) => (s.matchEndedAt == null ? { matchEndedAt: Date.now() } : {})),
  /** Clears the played innings + clock for a rematch, keeping team/XI setup. */
  resetMatch: () => set({ firstInnings: null, secondInnings: null, reviewInningsNo: 1, matchStartedAt: null, matchEndedAt: null }),
  reset: () => set({ ...initialState() }),
}));

/** The innings currently selected for review (Scorecard's 1st/2nd toggle
 *  drives this) — used by every analytics screen so they all agree. */
export function useReviewedInnings(): InningsState | null {
  return useCricketStore((s) => (s.reviewInningsNo === 2 && s.secondInnings ? s.secondInnings : s.firstInnings));
}
