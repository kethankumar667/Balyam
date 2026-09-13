import { useState } from "react";
import type { HcInnings, HcState, Player } from "@shared/types";
import { resolveTeamProfiles } from "../useHcSquad";
import {
  economy,
  fallOfWickets,
  oversFromBalls,
  strikeRate,
} from "../hc-stats";
import {
  CricbuzzButton,
  CricbuzzCard,
  CricbuzzChip,
  CricbuzzTeamBadge,
  IconBat,
  IconBall,
  IconWicket,
} from "./cricbuzz-kit";
import { useInningsBreakCountdown } from "../useInningsBreakCountdown";

function nameOf(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "Player";
}

export function CricbuzzInningsScorecardTable({
  innings,
  state,
  players,
  teamName,
}: {
  innings: HcInnings;
  state: HcState;
  players: Player[];
  teamName: string;
}) {
  const battingProfiles = resolveTeamProfiles(state, innings.battingPlayerId);
  const bowlingProfiles = resolveTeamProfiles(state, innings.bowlingPlayerId);
  const battingXiIds = state.teamSelections[innings.battingPlayerId]?.squadPlayerIds ?? [];
  const bowlingXiIds = state.teamSelections[innings.bowlingPlayerId]?.squadPlayerIds ?? [];

  const fow = fallOfWickets(innings);

  return (
    <div className="space-y-4">
      {/* Batting Scorecard Table */}
      <CricbuzzCard className="overflow-hidden">
        <div className="flex items-center justify-between bg-[#004838] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <IconBat size={16} />
            <span className="font-bold text-[13px] uppercase tracking-wider">{teamName} Batting</span>
          </div>
          <span className="font-bold text-[13px]">
            {innings.runs}/{innings.wickets} ({oversFromBalls(innings.balls)} Ov)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E3E6E8] bg-[#F5F7F8] font-bold text-[#666666] dark:border-[#2C3533] dark:bg-[#151B19] dark:text-[#A0A5A8]">
                <th className="py-2.5 px-3">Batter</th>
                <th className="py-2.5 px-3">Dismissal</th>
                <th className="py-2.5 px-2 text-right">R</th>
                <th className="py-2.5 px-2 text-right">B</th>
                <th className="py-2.5 px-2 text-right">4s</th>
                <th className="py-2.5 px-2 text-right">6s</th>
                <th className="py-2.5 px-3 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E6E8] dark:divide-[#2C3533]">
              {battingXiIds.map((playerId, idx) => {
                const profile = battingProfiles.get(playerId);
                const stats = innings.batterStats[playerId];
                const isOut = stats?.isOut ?? false;
                const isStriker = idx === innings.strikerIdx && !isOut;
                const isNonStriker = idx === innings.nonStrikerIdx && !isOut;
                const hasBatted = stats != null;

                if (!hasBatted) return null;

                const sr = stats ? strikeRate(stats.runs, stats.balls) : null;

                let dismissalText = "not out";
                if (isOut) {
                  const outBowler = stats.dismissedBy ? bowlingProfiles.get(stats.dismissedBy)?.name : "";
                  dismissalText = outBowler ? `b ${outBowler}` : "out";
                }

                return (
                  <tr
                    key={playerId}
                    className={`hover:bg-[#F9FAFB] dark:hover:bg-[#151B19] ${
                      isStriker || isNonStriker ? "bg-[#E8F5E9]/40 dark:bg-[#10261E]/40 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-[#222222] dark:text-white">
                        {profile?.name ?? "Batter"}
                        {isStriker ? " *" : ""}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[12px] text-[#666666] dark:text-[#A0A5A8]">
                      {dismissalText}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#222222] dark:text-white">
                      {stats?.runs ?? 0}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#666666] dark:text-[#A0A5A8]">
                      {stats?.balls ?? 0}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#0066CC] font-bold">
                      {stats?.fours ?? 0}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#E65100] font-bold">
                      {stats?.sixes ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[#444444] dark:text-[#CCCCCC]">
                      {sr != null ? sr.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Fall of Wickets */}
        {fow.length > 0 && (
          <div className="border-t border-[#E3E6E8] bg-[#F9FAFB] p-3 text-[12px] dark:border-[#2C3533] dark:bg-[#151B19]">
            <span className="font-bold text-[#666666] dark:text-[#A0A5A8] uppercase tracking-wider block mb-1">
              Fall of Wickets:
            </span>
            <div className="flex flex-wrap gap-2 text-[#444444] dark:text-[#CCCCCC]">
              {fow.map((w) => {
                const bName = battingProfiles.get(w.batterId)?.name ?? "Batter";
                return (
                  <span key={w.wicket} className="rounded bg-white px-2 py-0.5 border border-[#E3E6E8] dark:bg-[#1B2220] dark:border-[#2C3533]">
                    <strong className="text-[#CB0606]">{w.wicket}-{w.score}</strong> ({bName}, {w.over} ov)
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CricbuzzCard>

      {/* Bowling Scorecard Table */}
      <CricbuzzCard className="overflow-hidden">
        <div className="flex items-center justify-between bg-[#035A46] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <IconBall size={16} />
            <span className="font-bold text-[13px] uppercase tracking-wider">Bowling Figures</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E3E6E8] bg-[#F5F7F8] font-bold text-[#666666] dark:border-[#2C3533] dark:bg-[#151B19] dark:text-[#A0A5A8]">
                <th className="py-2.5 px-3">Bowler</th>
                <th className="py-2.5 px-2 text-right">O</th>
                <th className="py-2.5 px-2 text-right">R</th>
                <th className="py-2.5 px-2 text-right">W</th>
                <th className="py-2.5 px-3 text-right">Econ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E6E8] dark:divide-[#2C3533]">
              {bowlingXiIds.map((playerId) => {
                const profile = bowlingProfiles.get(playerId);
                const stats = innings.bowlerStats[playerId];
                if (!stats || stats.balls === 0) return null;

                const isCurrent = playerId === innings.currentBowlerId;
                const eco = economy(stats.runs, stats.balls);

                return (
                  <tr
                    key={playerId}
                    className={`hover:bg-[#F9FAFB] dark:hover:bg-[#151B19] ${
                      isCurrent ? "bg-[#E8F5E9]/40 dark:bg-[#10261E]/40 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-[#222222] dark:text-white">
                      {profile?.name ?? "Bowler"}
                      {isCurrent ? " *" : ""}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#666666] dark:text-[#A0A5A8]">
                      {oversFromBalls(stats.balls)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#222222] dark:text-white">
                      {stats.runs}
                    </td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-[#CB0606] dark:text-[#EF4444]">
                      {stats.wickets}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[#444444] dark:text-[#CCCCCC]">
                      {eco != null ? eco.toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CricbuzzCard>
    </div>
  );
}

export function CricbuzzFullScorecard({
  state,
  players,
}: {
  state: HcState;
  players: Player[];
}) {
  const [activeTab, setActiveTab] = useState<"inn1" | "inn2" | "info">("inn1");

  const [p0, p1] = state.playerOrder;
  const p0Name = p0 ? nameOf(players, p0) : "Team 1";
  const p1Name = p1 ? nameOf(players, p1) : "Team 2";

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-[#E3E6E8] bg-white dark:border-[#2C3533] dark:bg-[#1B2220] rounded-t-lg">
        {state.innings1 && (
          <button
            type="button"
            onClick={() => setActiveTab("inn1")}
            className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === "inn1"
                ? "border-[#009270] text-[#009270] dark:text-[#00B38A]"
                : "border-transparent text-[#666666] hover:text-[#222222] dark:text-[#9E9E9E]"
            }`}
          >
            1st Innings ({nameOf(players, state.innings1.battingPlayerId)})
          </button>
        )}

        {state.innings2 && (
          <button
            type="button"
            onClick={() => setActiveTab("inn2")}
            className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === "inn2"
                ? "border-[#009270] text-[#009270] dark:text-[#00B38A]"
                : "border-transparent text-[#666666] hover:text-[#222222] dark:text-[#9E9E9E]"
            }`}
          >
            2nd Innings ({nameOf(players, state.innings2.battingPlayerId)})
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === "info"
              ? "border-[#009270] text-[#009270] dark:text-[#00B38A]"
              : "border-transparent text-[#666666] hover:text-[#222222] dark:text-[#9E9E9E]"
          }`}
        >
          Match Info
        </button>
      </div>

      {activeTab === "inn1" && state.innings1 && (
        <CricbuzzInningsScorecardTable
          innings={state.innings1}
          state={state}
          players={players}
          teamName={nameOf(players, state.innings1.battingPlayerId)}
        />
      )}

      {activeTab === "inn2" && state.innings2 && (
        <CricbuzzInningsScorecardTable
          innings={state.innings2}
          state={state}
          players={players}
          teamName={nameOf(players, state.innings2.battingPlayerId)}
        />
      )}

      {activeTab === "info" && (
        <CricbuzzCard className="p-5 space-y-4">
          <h3 className="font-bold text-[15px] uppercase tracking-wider text-[#222222] dark:text-white border-b border-[#E3E6E8] pb-2 dark:border-[#2C3533]">
            Match Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
            <div>
              <span className="font-semibold text-[#888888] block">Match:</span>
              <span className="font-bold text-[#222222] dark:text-white">{p0Name} vs {p1Name}</span>
            </div>
            <div>
              <span className="font-semibold text-[#888888] block">Format:</span>
              <span className="font-bold text-[#222222] dark:text-white uppercase">{state.options.format} ({state.oversPerInnings ?? 5} Overs)</span>
            </div>
            <div>
              <span className="font-semibold text-[#888888] block">Toss:</span>
              <span className="font-medium text-[#222222] dark:text-white">
                {state.tossWinnerId ? `${nameOf(players, state.tossWinnerId)} won the toss` : "—"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[#888888] block">Venue:</span>
              <span className="font-medium text-[#222222] dark:text-white">Bhalyam Lounge Arena</span>
            </div>
          </div>
        </CricbuzzCard>
      )}
    </div>
  );
}

export function CricbuzzInningsBreak({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const countdown = useInningsBreakCountdown(state, players, selfId);
  if (!countdown.active) return null;

  const innings1 = state.innings1;
  if (!innings1) return null;

  const target = innings1.runs + 1;
  const battingName = nameOf(players, innings1.battingPlayerId);
  const chasingName = nameOf(players, innings1.bowlingPlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <CricbuzzCard className="w-full max-w-lg border-t-4 border-t-[#009270] p-6 shadow-2xl space-y-4">
        <div className="text-center">
          <span className="inline-block rounded-full bg-[#E8F5E9] px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#00796B] dark:bg-[#10261E] dark:text-[#4DB6AC] mb-1">
            Mid-Innings Break
          </span>
          <h2 className="text-[22px] font-black uppercase text-[#222222] dark:text-white">
            Target: {target} Runs
          </h2>
          <p className="text-[13px] text-[#666666] dark:text-[#A0A5A8] mt-0.5">
            {battingName} scored {innings1.runs}/{innings1.wickets} in {oversFromBalls(innings1.balls)} overs. {chasingName} needs {target} to win!
          </p>
        </div>

        <div className="border-t border-b border-[#E3E6E8] py-3 text-center dark:border-[#2C3533]">
          <span className="text-[13px] font-bold text-[#009270] dark:text-[#00B38A]">
            {countdown.iAmReady && countdown.waitingOn.length > 0
              ? `Waiting for ${countdown.waitingOn.join(", ")}...`
              : `2nd Innings starts in ${countdown.secondsLeft} seconds`}
          </span>
        </div>

        <CricbuzzButton
          onClick={countdown.continueInnings}
          disabled={countdown.iAmReady}
          size="lg"
          className="w-full text-[15px]"
        >
          {countdown.iAmReady ? "Ready! Waiting..." : "Ready For 2nd Innings"}
        </CricbuzzButton>
      </CricbuzzCard>
    </div>
  );
}

