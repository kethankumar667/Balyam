import type { HcInnings, HcState, Player } from "@shared/types";
import { computeManOfTheMatch, teamLabel } from "../hc-shared";
import { resolveTeamProfiles } from "../useHcSquad";
import { useInningsBreakCountdown } from "../useInningsBreakCountdown";
import { oversFromBalls, strikeRate, economy } from "../hc-stats";
import { DD, DoordarshanScreen, DdButton, DdLabel, DdChip, IconTrophy } from "./doordarshan-kit";

function InningsTables({ innings, battingName, bowlingName, state }: { innings: HcInnings; battingName: string; bowlingName: string; state: HcState }) {
  const battingProfiles = resolveTeamProfiles(state, innings.battingPlayerId);
  const bowlingProfiles = resolveTeamProfiles(state, innings.bowlingPlayerId);
  const batters = Object.entries(innings.batterStats);
  const bowlers = Object.entries(innings.bowlerStats).filter(([, s]) => s.balls > 0);

  return (
    <div className="space-y-2.5">
      <div className="font-typewriter text-[14px]" style={{ color: DD.ink }}>
        {battingName} — {innings.runs}-{innings.wickets} ({oversFromBalls(innings.balls)} ov)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-crt text-[13px]" style={{ color: DD.ink }}>
          <thead>
            <tr className="text-left" style={{ color: DD.inkLo }}>
              <th className="pb-1 font-normal">BATTER</th>
              <th className="pb-1 font-normal text-right">R</th>
              <th className="pb-1 font-normal text-right">B</th>
              <th className="pb-1 font-normal text-right">4S</th>
              <th className="pb-1 font-normal text-right">6S</th>
              <th className="pb-1 font-normal text-right">SR</th>
            </tr>
          </thead>
          <tbody>
            {batters.map(([id, s]) => (
              <tr key={id} style={{ borderTop: `1px solid ${DD.line}` }}>
                <td className="py-1 font-typewriter text-[11px]">{battingProfiles.get(id)?.name ?? "Batter"}{s.isOut ? "" : " *"}</td>
                <td className="py-1 text-right tabular-nums">{s.runs}</td>
                <td className="py-1 text-right tabular-nums">{s.balls}</td>
                <td className="py-1 text-right tabular-nums">{s.fours}</td>
                <td className="py-1 text-right tabular-nums">{s.sixes}</td>
                <td className="py-1 text-right tabular-nums">{strikeRate(s.runs, s.balls)?.toFixed(0) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="font-typewriter text-[13px] pt-1" style={{ color: DD.ink }}>{bowlingName} bowling</div>
      <div className="overflow-x-auto">
        <table className="w-full font-crt text-[13px]" style={{ color: DD.ink }}>
          <thead>
            <tr className="text-left" style={{ color: DD.inkLo }}>
              <th className="pb-1 font-normal">BOWLER</th>
              <th className="pb-1 font-normal text-right">O</th>
              <th className="pb-1 font-normal text-right">R</th>
              <th className="pb-1 font-normal text-right">W</th>
              <th className="pb-1 font-normal text-right">ECON</th>
            </tr>
          </thead>
          <tbody>
            {bowlers.map(([id, s]) => (
              <tr key={id} style={{ borderTop: `1px solid ${DD.line}` }}>
                <td className="py-1 font-typewriter text-[11px]">{bowlingProfiles.get(id)?.name ?? "Bowler"}</td>
                <td className="py-1 text-right tabular-nums">{oversFromBalls(s.balls)}</td>
                <td className="py-1 text-right tabular-nums">{s.runs}</td>
                <td className="py-1 text-right tabular-nums">{s.wickets}</td>
                <td className="py-1 text-right tabular-nums">{economy(s.runs, s.balls)?.toFixed(1) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DoordarshanInningsBreak({ state, players, selfId }: { state: HcState; players: Player[]; selfId: string }) {
  const countdown = useInningsBreakCountdown(state, players, selfId);
  const innings1 = state.innings1;
  if (!countdown.active || !innings1) return null;

  const target = innings1.runs + 1;
  const battingName = teamLabel(state, innings1.battingPlayerId, players).playerName;
  const bowlingName = teamLabel(state, innings1.bowlingPlayerId, players).playerName;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-3" style={{ background: "rgba(10,7,5,0.92)" }} role="dialog" aria-modal="true" aria-label="Innings break">
      <div className="my-auto w-full max-w-2xl space-y-3">
        <div className="text-center">
          <DdLabel color="rgba(232,198,140,0.6)">END OF INNINGS 1</DdLabel>
          <div className="font-crt text-[34px] mt-1" style={{ color: DD.amber }}>TARGET {target}</div>
        </div>
        <DoordarshanScreen glow>
          <InningsTables innings={innings1} battingName={battingName} bowlingName={bowlingName} state={state} />
        </DoordarshanScreen>
        <div className="space-y-2">
          <DdButton variant="primary" disabled={countdown.iAmReady} onClick={countdown.continueInnings} className="w-full !py-3 !text-[16px]">
            {countdown.iAmReady ? "Standing by…" : "Continue"}
          </DdButton>
          <p className="text-center font-typewriter text-[11px]" style={{ color: "rgba(232,198,140,0.7)" }} aria-live="polite">
            {countdown.iAmReady && countdown.waitingOn.length > 0
              ? `Waiting for ${countdown.waitingOn.join(", ")}`
              : `Innings 2 starts in ${countdown.secondsLeft}s`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DoordarshanSummary({ state, players, selfId, onContinue }: { state: HcState; players: Player[]; selfId: string; onContinue?: () => void }) {
  const mom = computeManOfTheMatch(state, players);
  const youWon = state.winnerId === selfId;
  const isTie = state.result === "tie";
  const winnerName = state.winnerId ? players.find((p) => p.id === state.winnerId)?.name ?? "Winner" : null;

  return (
    <div className="space-y-3">
      <DoordarshanScreen glow className="text-center space-y-1.5">
        <IconTrophy size={28} />
        <div className="font-crt text-[28px]" style={{ color: isTie ? DD.ink : youWon ? DD.win : DD.loss }}>
          {isTie ? "MATCH TIED" : youWon ? "YOU WON" : `${winnerName?.toUpperCase()} WON`}
        </div>
        {mom && (
          <DdChip tone="amber">★ {mom.name} ({mom.playerName}) — {mom.line}</DdChip>
        )}
      </DoordarshanScreen>

      {state.innings1 && (
        <DoordarshanScreen>
          <InningsTables innings={state.innings1} battingName={teamLabel(state, state.innings1.battingPlayerId, players).playerName} bowlingName={teamLabel(state, state.innings1.bowlingPlayerId, players).playerName} state={state} />
        </DoordarshanScreen>
      )}
      {state.innings2 && (
        <DoordarshanScreen>
          <InningsTables innings={state.innings2} battingName={teamLabel(state, state.innings2.battingPlayerId, players).playerName} bowlingName={teamLabel(state, state.innings2.bowlingPlayerId, players).playerName} state={state} />
        </DoordarshanScreen>
      )}

      {onContinue && (
        <DdButton variant="primary" onClick={onContinue} className="w-full !py-3 !text-[16px]">Continue</DdButton>
      )}
    </div>
  );
}
