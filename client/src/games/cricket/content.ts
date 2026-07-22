/**
 * Bhalyam Cricket — static game content.
 *
 * Fun facts and the rules chapter are game copy (UI text), not player/team
 * data. All team and player data lives in data.ts sourced from the real
 * shared roster.
 */

import type { FunFact, RuleSection } from "./types";

export const FUN_FACTS: FunFact[] = [
  { id: "ff-1", text: "The highest individual T20I score is 175 not out." },
  { id: "ff-2", text: "A maximum of six runs can be scored off a single legal ball — the classic six." },
  { id: "ff-3", text: "The first ever T20 international was played in 2005." },
  { id: "ff-4", text: "A 'duck' means a batter is dismissed without scoring a run." },
  { id: "ff-5", text: "A 'hat-trick' is three wickets on three consecutive balls." },
];

export const RULE_SECTIONS: RuleSection[] = [
  { id: "r-overs", title: "Overs", body: "Each side bats its allotted overs for the chosen format. Make them count.", sketch: "stadium" },
  { id: "r-scoring", title: "Scoring", body: "Score 1, 2, 4 or 6 runs. Extras are counted too.", sketch: "bat" },
  { id: "r-wickets", title: "Wickets", body: "Lose 10 wickets and you are all out.", sketch: "stump" },
  { id: "r-powerplay", title: "Powerplay", body: "Early overs have special powerplay rules with safer balls to attack.", sketch: "ball" },
  { id: "r-duck", title: "Duck", body: "Get out on 0 and it is a duck — no runs to your name.", sketch: "pencil" },
  { id: "r-winning", title: "Winning", body: "The highest runs at the end wins the match.", sketch: "trophy" },
];
