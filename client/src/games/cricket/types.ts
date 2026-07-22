/**
 * Bhalyam Cricket — centralized game model.
 *
 * Teams and players are sourced from the real shared roster data
 * (`@shared/hc-rosters`) via data.ts — no mock player data. The roster carries
 * name/role/captain/extra only, so this model deliberately does NOT invent
 * ratings, averages or power values.
 */

import type { HcCategory, HcFormat, HcTeamId } from "@shared/types";

export type { HcCategory, HcFormat, HcTeamId } from "@shared/types";

export type PlayerRole = "BAT" | "BOWL" | "AR" | "WK";

export type MatchPhase =
  | "loading"
  | "teamSelection"
  | "playingXI"
  | "toss"
  | "rules"
  | "intro"
  | "firstInnings"
  | "inningsBreak"
  | "secondInnings"
  | "completed";

export type BallOutcome = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "W";

export type TossDecision = "bat" | "bowl";

/** A team as the cricket UI consumes it — resolved from a country or IPL
 *  franchise profile. `flag` is an emoji (countries only); franchises render a
 *  colored short-code chip instead. `color` is presentation-only theming. */
export interface TeamRef {
  id: HcTeamId;
  category: HcCategory;
  name: string;
  short: string;
  flag?: string;
  color: string;
}

/** A player, mapped from the shared HcPlayerProfile. Only real fields. */
export interface CricketPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  teamId: HcTeamId;
  isCaptain: boolean;
  /** From the legends/extras pool rather than the current squad. */
  isExtra: boolean;
}

export interface BallEvent {
  id: string;
  over: number;
  ball: number;
  outcome: BallOutcome;
  batterId: string;
  bowlerId: string;
  runs: number;
  isWicket: boolean;
  timestamp: string;
}

export interface BattingScore {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalText?: string;
}

export interface BowlingScore {
  playerId: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface MatchScore {
  teamId: HcTeamId;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  target?: number;
  runRate: number;
}

export interface MatchSummary {
  id: string;
  firstTeam: HcTeamId;
  secondTeam: HcTeamId;
  winner: HcTeamId;
  marginText: string;
  topBatterId: string;
  topBowlerId: string;
  playerOfMatchId: string;
  durationText: string;
}

export interface Reward {
  id: string;
  label: string;
  type: "coins" | "xp" | "badge" | "sticker" | "pack";
  amount?: number;
  unlocked: boolean;
}

/** Named inline pencil sketches the SketchAccent component can draw. */
export type SketchName =
  | "stadium"
  | "bat"
  | "ball"
  | "stump"
  | "pencil"
  | "trophy"
  | "star";

/** A rule chapter on the Match Rules notebook page (game content, not data). */
export interface RuleSection {
  id: string;
  title: string;
  body: string;
  sketch: SketchName;
}

export interface FunFact {
  id: string;
  text: string;
}
