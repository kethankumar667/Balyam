import type { HcState, Player } from "@shared/types";
import { computeManOfTheMatch } from "../hc-shared";
import {
  CricbuzzButton,
  CricbuzzCard,
  IconTrophy,
} from "./cricbuzz-kit";
import { CricbuzzFullScorecard } from "./CricbuzzScorecard";

export function CricbuzzSummary({
  state,
  players,
  selfId,
  onContinue,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
  onContinue?: () => void;
}) {
  const mom = computeManOfTheMatch(state, players);
  const youWon = state.winnerId === selfId;
  const isTie = state.result === "tie";
  const winnerName = state.winnerId
    ? players.find((p) => p.id === state.winnerId)?.name ?? "Winner"
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6 pt-2">
      {/* Match Result Banner Card */}
      <CricbuzzCard className="overflow-hidden border-t-4 border-t-[#009270] p-6 text-center shadow-md">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9] text-[#009270] dark:bg-[#10261E] dark:text-[#00B38A] shadow-xs">
          <IconTrophy size={32} />
        </div>

        <div className="inline-block rounded-full bg-[#E8F5E9] px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#00796B] dark:bg-[#10261E] dark:text-[#4DB6AC] mb-2">
          Match Conclusion
        </div>

        <h1 className="text-[22px] font-black uppercase tracking-tight text-[#222222] dark:text-white sm:text-[26px]">
          {isTie ? "Match Tied!" : youWon ? "Victory! You Won The Match!" : `${winnerName} Won The Match!`}
        </h1>

        {/* Player of the Match Showcase */}
        {mom && (
          <div className="mt-5 rounded-lg border border-[#A7F3D0] bg-[#E8F5E9] p-3.5 text-center dark:border-[#047857] dark:bg-[#10261E]">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00796B] dark:text-[#4DB6AC] block mb-0.5">
              ⭐ PLAYER OF THE MATCH
            </span>
            <div className="font-extrabold text-[15px] text-[#222222] dark:text-white">
              {mom.name} <span className="text-[12px] font-medium text-[#666666] dark:text-[#A0A5A8]">({mom.playerName})</span>
            </div>
            <p className="text-[13px] font-semibold text-[#00796B] dark:text-[#4DB6AC] mt-0.5">
              {mom.line}
            </p>
          </div>
        )}
      </CricbuzzCard>

      {/* Full Multi-tab Scorecards */}
      <CricbuzzFullScorecard state={state} players={players} />

      {/* Continue Action */}
      {onContinue && (
        <div className="pt-2">
          <CricbuzzButton onClick={onContinue} size="lg" className="w-full text-[15px] shadow-md">
            Continue To Match Lounge
          </CricbuzzButton>
        </div>
      )}
    </div>
  );
}
