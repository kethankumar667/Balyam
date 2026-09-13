import { useMemo } from "react";
import type { HcBall, HcInnings } from "@shared/types";
import type { HcPlayerProfile } from "@shared/hc-rosters";
import { oversFromBalls } from "../hc-stats";
import { CricbuzzBallChip } from "./cricbuzz-kit";

export interface CricbuzzCommentaryEntry {
  id: string;
  overBall: string;
  bowlerName: string;
  batterName: string;
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  headline: string;
  description: string;
  overSummary?: {
    overNumber: number;
    runsConceded: number;
    wicketsLost: number;
    totalRuns: number;
    totalWickets: number;
  };
}

const SHOT_DESCRIPTIONS_FOUR = [
  "cracking cover drive! Pierces the gap between cover and mid-off with immaculate timing.",
  "glorious straight drive! Struck right out of the screws, races away past the bowler to the fence.",
  "short and punished! Rocked back in a flash and pulled with authority through midwicket.",
  "flashed away behind point! Used the bowler's pace expertly to find the third-man boundary.",
  "lofted over extra cover! Stood tall and caressed it over the infield with magnificent extension of the arms.",
  "clever late cut! Waited for it patiently and steered it fine past backward point.",
];

const SHOT_DESCRIPTIONS_SIX = [
  "MASSIVE! Smashed high and handsome way over the deep midwicket boundary into the upper deck!",
  "OUT OF THE GROUND! Clean as a whistle, picked up off the pads and dispatched deep into the stands!",
  "STEPPED OUT AND SMOKED IT! Advanced down the track and launched it straight back over the sightscreen!",
  "SUPERB TIMING! Picked the slower ball early and muscled it over wide long-on for a gigantic maximum!",
  "STAND AND DELIVER! Pounded over long-off with sheer brute power! What a breathtaking hit!",
];

const SHOT_DESCRIPTIONS_WICKET = [
  "CLEAN BOWLED! Slower yorker right in the blockhole, batsman plays all over it and the timber is shattered!",
  "CAUGHT! Miscued the lofted drive, went high into the sky and long-on settles underneath to take a safe catch!",
  "EDGED AND TAKEN! Pushed at a teasing delivery outside off, faint edge carries straight to the keeper!",
  "TRAPPED IN FRONT! Full and skidding through, struck right on the knee-roll in front of middle! Plumb LBW!",
  "HOLE OUT AT DEEP MIDWICKET! Went for the glory shot, didn't get all of it and finds the fielder in the deep!",
];

const SHOT_DESCRIPTIONS_SINGLE = [
  "tucked off the hips towards deep square leg for a comfortable single.",
  "pushed into the gap at cover-point and they scamper across for one.",
  "driven gently down to long-on to turn the strike over.",
  "guided softly down to third man for an easy run.",
  "worked into the midwicket pocket, sharp calling and an easy single completed.",
];

const SHOT_DESCRIPTIONS_TWO = [
  "punched off the back foot through extra cover, good aggressive running allows them to come back for a brace.",
  "clipped past midwicket, deep fielder chases it down as they hustle back for two runs.",
  "placed into vacant space at deep point, great sprint between the wickets to turn one into two.",
];

const SHOT_DESCRIPTIONS_DOT = [
  "defended solidly right under the eyes with a straight bat back towards the bowler.",
  "left alone outside off stump as the ball sails through cleanly to the wicketkeeper.",
  "beaten by the sharp bounce and seam movement! Whistles past the outside edge.",
  "pushed firmly to short extra cover, no run possible there.",
  "tight line on off stump, tapped cautiously into the offside.",
];

function getCommentaryText(runs: number, isWicket: boolean, indexSeed: number): { headline: string; description: string } {
  if (isWicket) {
    const desc = SHOT_DESCRIPTIONS_WICKET[indexSeed % SHOT_DESCRIPTIONS_WICKET.length];
    return { headline: "OUT!", description: desc };
  }
  if (runs === 6) {
    const desc = SHOT_DESCRIPTIONS_SIX[indexSeed % SHOT_DESCRIPTIONS_SIX.length];
    return { headline: "SIX", description: desc };
  }
  if (runs === 4) {
    const desc = SHOT_DESCRIPTIONS_FOUR[indexSeed % SHOT_DESCRIPTIONS_FOUR.length];
    return { headline: "FOUR", description: desc };
  }
  if (runs === 2) {
    const desc = SHOT_DESCRIPTIONS_TWO[indexSeed % SHOT_DESCRIPTIONS_TWO.length];
    return { headline: "2 runs", description: desc };
  }
  if (runs === 1) {
    const desc = SHOT_DESCRIPTIONS_SINGLE[indexSeed % SHOT_DESCRIPTIONS_SINGLE.length];
    return { headline: "1 run", description: desc };
  }
  if (runs === 0) {
    const desc = SHOT_DESCRIPTIONS_DOT[indexSeed % SHOT_DESCRIPTIONS_DOT.length];
    return { headline: "no run", description: desc };
  }
  return { headline: `${runs} runs`, description: `lofted into the deep, batters complete ${runs} runs.` };
}

/**
 * Transforms an innings history into a chronological commentary log
 * (newest deliveries on top).
 */
export function generateCricbuzzCommentary(
  innings: HcInnings,
  battingProfiles: Map<string, HcPlayerProfile>,
  bowlingProfiles: Map<string, HcPlayerProfile>
): CricbuzzCommentaryEntry[] {
  const history = innings.history;
  const entries: CricbuzzCommentaryEntry[] = [];

  let runningRuns = 0;
  let runningWickets = 0;
  let overRuns = 0;
  let overWickets = 0;

  for (let i = 0; i < history.length; i++) {
    const ball = history[i];
    runningRuns += ball.runs;
    if (ball.wicket) runningWickets += 1;
    overRuns += ball.runs;
    if (ball.wicket) overWickets += 1;

    const batterName = battingProfiles.get(ball.batterId)?.name || "Batter";
    const bowlerName = bowlingProfiles.get(ball.bowlerId)?.name || "Bowler";
    const overBall = oversFromBalls(i + 1);

    const { headline, description } = getCommentaryText(ball.runs, ball.wicket, i + ball.runs);

    let overSummary: CricbuzzCommentaryEntry["overSummary"] | undefined;
    const isOverEnd = (i + 1) % 6 === 0 || i === history.length - 1;
    if (isOverEnd && (i + 1) % 6 === 0) {
      overSummary = {
        overNumber: Math.floor((i + 1) / 6),
        runsConceded: overRuns,
        wicketsLost: overWickets,
        totalRuns: runningRuns,
        totalWickets: runningWickets,
      };
      overRuns = 0;
      overWickets = 0;
    }

    entries.push({
      id: `ball-${i}-${ball.overNumber}-${ball.runs}`,
      overBall,
      bowlerName,
      batterName,
      runs: ball.runs,
      isWicket: ball.wicket,
      isBoundary: ball.isBoundary,
      headline,
      description,
      overSummary,
    });
  }

  return entries.reverse();
}

export function CricbuzzCommentaryFeed({
  innings,
  battingProfiles,
  bowlingProfiles,
  className = "",
}: {
  innings: HcInnings;
  battingProfiles: Map<string, HcPlayerProfile>;
  bowlingProfiles: Map<string, HcPlayerProfile>;
  className?: string;
}) {
  const commentary = useMemo(
    () => generateCricbuzzCommentary(innings, battingProfiles, bowlingProfiles),
    [innings, battingProfiles, bowlingProfiles]
  );

  if (commentary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-[#888888] dark:text-[#777777]">
        <span className="text-[28px] mb-2">🏏</span>
        <p className="text-[14px] font-medium">Match commentary will appear here once play begins.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 divide-y divide-[#E3E6E8] dark:divide-[#2C3533] ${className}`}>
      {commentary.map((entry) => (
        <div key={entry.id} className="pt-3 first:pt-0">
          {entry.overSummary && (
            <div className="mb-3 rounded bg-[#E8F5E9] px-3 py-2 text-[12px] font-bold text-[#00796B] dark:bg-[#10261E] dark:text-[#4DB6AC] border border-[#A7F3D0] dark:border-[#047857]">
              <div className="flex items-center justify-between">
                <span>END OF OVER {entry.overSummary.overNumber} ({entry.overSummary.runsConceded} RUNS, {entry.overSummary.wicketsLost} WKTS)</span>
                <span>{entry.overSummary.totalRuns}/{entry.overSummary.totalWickets}</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5">
            <div className="w-11 shrink-0 pt-0.5 text-right font-mono text-[13px] font-bold text-[#666666] dark:text-[#9E9E9E]">
              {entry.overBall}
            </div>

            <div className="shrink-0 pt-0.5">
              <CricbuzzBallChip value={entry.isWicket ? "W" : entry.runs} isWicket={entry.isWicket} size="sm" />
            </div>

            <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
              <span className="font-semibold text-[#222222] dark:text-white">
                {entry.bowlerName} to {entry.batterName}
              </span>
              ,{" "}
              <span
                className={
                  entry.isWicket
                    ? "font-extrabold text-[#CB0606] dark:text-[#EF4444]"
                    : entry.runs === 6
                    ? "font-extrabold text-[#E65100] dark:text-[#F97316]"
                    : entry.runs === 4
                    ? "font-extrabold text-[#0066CC] dark:text-[#3B82F6]"
                    : "font-semibold text-[#444444] dark:text-[#CCCCCC]"
                }
              >
                {entry.headline}
              </span>
              ,{" "}
              <span className="text-[#555555] dark:text-[#A0A5A8]">{entry.description}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
