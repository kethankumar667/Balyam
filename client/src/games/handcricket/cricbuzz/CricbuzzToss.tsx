import { useState } from "react";
import type { HcState, Player } from "@shared/types";
import { getSocket } from "../../../lib/socket";
import {
  CricbuzzButton,
  CricbuzzCard,
  IconCoin,
  IconBat,
  IconBall,
} from "./cricbuzz-kit";
import { CricbuzzPowerplayRulesCard } from "./CricbuzzInnings";

function nameOf(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "Player";
}

export function CricbuzzToss({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const oppId = state.playerOrder.find((id) => id !== selfId) ?? "";
  const myPick = state.tossPicks[selfId];
  const oppLockedIn = state.tossPicks[oppId] != null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";

  function pick(n: number) {
    getSocket().emit("game:move", { type: "tossPick", data: { pick: n } });
  }

  const callerId = state.tossCallerId ?? state.playerOrder[0];
  const callerName = nameOf(players, callerId);
  const callerCall = state.tossCall ?? "even";
  const myCall = selfId === callerId ? callerCall : callerCall === "even" ? "odd" : "even";

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-4">
      <CricbuzzCard className="overflow-hidden border-t-4 border-t-[#009270] p-6 text-center">
        {/* Step Indicator */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E9] dark:bg-[#10261E] px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#00796B] dark:text-[#00B38A] border border-[#009270]/30">
          <span>Step 2 of 2 · Number Selection</span>
        </div>

        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9] text-[#009270] dark:bg-[#10261E] dark:text-[#00B38A] shadow-xs">
          <IconCoin size={32} />
        </div>

        <h2 className="text-[19px] font-extrabold uppercase tracking-wide text-[#222222] dark:text-white">
          SHOW YOUR NUMBER
        </h2>
        <p className="mt-1 text-[13px] text-[#666666] dark:text-[#A0A5A8]">
          Pick a number (1–6). Both picks will be added together to find the winner!
        </p>

        {/* Clear Winning Stakes Box */}
        <div className="mt-3 rounded-xl bg-[#E8F5E9]/60 dark:bg-[#10261E]/80 p-3 border border-[#009270]/30 text-center space-y-1">
          <div className="text-[12px] font-bold text-[#00796B] dark:text-[#00B38A]">
            {callerId === selfId ? "You called" : `${callerName} called`}{" "}
            <span className="uppercase font-black underline text-[#004D40] dark:text-white">{callerCall}</span>
          </div>
          <div className="text-[12px] font-medium text-[#333333] dark:text-[#E0E0E0]">
            🎯 <strong className="text-[#00796B] dark:text-[#00B38A]">You WIN</strong> if Total Sum (You + {oppName}) is{" "}
            <strong className="uppercase font-black text-[#004D40] dark:text-white">{myCall}</strong>{" "}
            <span className="text-[11px] opacity-75 font-mono">
              ({myCall === "even" ? "2, 4, 6, 8, 10, 12" : "1, 3, 5, 7, 9, 11"})
            </span>
          </div>
        </div>

        {/* Toss Hand Face-off Box */}
        <div className="my-6 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A0A5A8]">YOU</span>
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-[#009270] bg-[#E8F5E9] text-[26px] font-black text-[#00796B] dark:bg-[#10261E] dark:text-[#00B38A] shadow-xs">
              {myPick ?? "?"}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[16px] font-extrabold text-[#999999]">+</span>
            <span className="text-[10px] font-bold uppercase text-[#888888] tracking-widest">SUM</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A0A5A8] max-w-[90px] truncate">{oppName}</span>
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-[#035A46] bg-[#ECEEF2] text-[26px] font-black text-[#035A46] dark:bg-[#151B19] dark:text-[#A7F3D0] shadow-xs">
              {oppLockedIn ? "✓" : "?"}
            </div>
          </div>
        </div>

        {myPick == null ? (
          <div>
            <span className="block mb-2 text-[12px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A0A5A8]">
              Select Your Number (1 to 6):
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => pick(n)}
                  className="h-12 w-12 rounded-lg border border-[#E3E6E8] bg-white font-mono text-[18px] font-black text-[#222222] shadow-xs hover:border-[#009270] hover:bg-[#E8F5E9] active:scale-95 transition dark:bg-[#1B2220] dark:border-[#2C3533] dark:text-white dark:hover:bg-[#10261E]"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-md bg-[#F5F7F8] p-4 text-[13px] font-semibold text-[#555555] dark:bg-[#151B19] dark:text-[#A0A5A8]">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#009270]" />
            <span>{oppLockedIn ? "Tallying the toss outcome..." : `Waiting for ${oppName} to pick...`}</span>
          </div>
        )}
      </CricbuzzCard>

      {/* Pre-Match Powerplay & Mystery Yorker Rules Card */}
      <CricbuzzPowerplayRulesCard />
    </div>
  );
}

export function CricbuzzTossChoice({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const winnerId = state.tossWinnerId;
  const winnerName = winnerId ? nameOf(players, winnerId) : "Winner";
  const iWon = winnerId === selfId;

  const callerId = state.tossCallerId ?? state.playerOrder[0];
  const callerName = nameOf(players, callerId);
  const callerCall = state.tossCall ?? "even";

  function choose(choice: "bat" | "bowl") {
    getSocket().emit("game:move", { type: "tossChoice", data: { choice } });
  }

  const p1 = state.playerOrder[0];
  const p2 = state.playerOrder[1];
  const pick1 = p1 ? state.tossPicks[p1] : null;
  const pick2 = p2 ? state.tossPicks[p2] : null;
  const sum = state.tossSum;
  const parity = sum != null ? (sum % 2 === 0 ? "EVEN" : "ODD") : null;

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-4">
      <CricbuzzCard className="overflow-hidden border-t-4 border-t-[#009270] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9] text-[#009270] dark:bg-[#10261E] dark:text-[#00B38A] shadow-xs">
          <IconBat size={32} />
        </div>

        {/* Outcome Breakdown Pill */}
        {sum != null && (
          <div className="mb-3 rounded-xl bg-[#F5F7F8] dark:bg-[#151B19] p-3 text-center border border-[#E3E6E8] dark:border-[#2C3533] space-y-1">
            <div className="text-[12px] font-bold text-[#444444] dark:text-[#D0D5D8]">
              {nameOf(players, p1)} ({pick1 ?? "?"}) + {nameOf(players, p2)} ({pick2 ?? "?"}) ={" "}
              <span className="font-extrabold text-[#009270]">{sum} ({parity})</span>
            </div>
            <div className="text-[11px] text-[#666666] dark:text-[#A0A5A8]">
              {callerName} called <strong className="uppercase">{callerCall}</strong> ·{" "}
              {callerCall.toUpperCase() === parity ? `${callerName} called right!` : `${callerName} called wrong!`}
            </div>
          </div>
        )}

        <h2 className="text-[19px] font-black uppercase text-[#222222] dark:text-white">
          {iWon ? "🎉 You Won The Toss!" : `${winnerName} Won The Toss!`}
        </h2>
        <p className="mt-1 text-[13px] text-[#666666] dark:text-[#A0A5A8]">
          {iWon
            ? "Choose whether your team will Bat or Bowl first."
            : `Standing by for ${winnerName} to make the decision.`}
        </p>

        {iWon ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => choose("bat")}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-[#009270] bg-[#E8F5E9] p-5 font-bold text-[#00796B] hover:bg-[#009270] hover:text-white transition-all active:scale-[0.98] dark:bg-[#10261E] dark:text-[#4DB6AC] dark:hover:bg-[#009270] dark:hover:text-white"
            >
              <IconBat size={28} />
              <span className="text-[14px] uppercase tracking-wider">Opt To Bat</span>
            </button>

            <button
              type="button"
              onClick={() => choose("bowl")}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-[#035A46] bg-[#ECEEF2] p-5 font-bold text-[#035A46] hover:bg-[#035A46] hover:text-white transition-all active:scale-[0.98] dark:bg-[#1B2220] dark:text-[#A7F3D0] dark:hover:bg-[#035A46] dark:hover:text-white"
            >
              <IconBall size={28} />
              <span className="text-[14px] uppercase tracking-wider">Opt To Bowl</span>
            </button>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-md bg-[#F5F7F8] p-4 text-[13px] font-semibold text-[#555555] dark:bg-[#151B19] dark:text-[#A0A5A8]">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#009270]" />
            <span>{winnerName} is deciding the match strategy...</span>
          </div>
        )}
      </CricbuzzCard>
    </div>
  );
}
