import { useState } from "react";
import type { HcState, Player, HcTossCall } from "@shared/types";
import { getSocket } from "../../../lib/socket";
import {
  CricbuzzButton,
  CricbuzzCard,
  IconCoin,
} from "./cricbuzz-kit";
import { CricbuzzPowerplayRulesCard } from "./CricbuzzInnings";

function nameOf(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "Player";
}

export function CricbuzzTossCall({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const callerId = state.tossCallerId ?? state.playerOrder[0];
  const isCaller = callerId === selfId;
  const callerName = nameOf(players, callerId);
  const [selectedCall, setSelectedCall] = useState<HcTossCall | null>(null);

  function submitCall(call: HcTossCall) {
    getSocket().emit("game:move", { type: "tossCall", data: { call } });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-4">
      <CricbuzzCard className="overflow-hidden border-t-4 border-t-[#009270] p-6 text-center">
        {/* Step Indicator */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E9] dark:bg-[#10261E] px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#00796B] dark:text-[#00B38A] border border-[#009270]/30">
          <span>Step 1 of 2 · The Call</span>
        </div>

        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9] text-[#009270] dark:bg-[#10261E] dark:text-[#00B38A] shadow-xs">
          <IconCoin size={32} />
        </div>

        <h2 className="text-[19px] font-extrabold uppercase tracking-wide text-[#222222] dark:text-white">
          PICK UP THE CALL
        </h2>
        <p className="mt-1 text-[13px] text-[#666666] dark:text-[#A0A5A8] max-w-md mx-auto">
          {isCaller
            ? "Just like calling Heads or Tails! Choose ODD or EVEN. Next, both players will pick numbers (1–6) — their SUM determines who wins the toss."
            : `${callerName} is calling the toss (ODD or EVEN). On the next screen, you will both pick numbers (1–6) to determine the winner.`}
        </p>

        {/* 3-Step Mini Visual Guide */}
        <div className="mt-4 rounded-xl bg-[#F5F7F8] dark:bg-[#151B19] p-3 text-left border border-[#E3E6E8] dark:border-[#2C3533]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A0A5A8] mb-2 text-center">
            How The Gully Toss Works:
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-white dark:bg-[#1E2523] p-2 border border-[#E3E6E8] dark:border-[#2C3533]">
              <span className="block font-extrabold text-[#009270]">1. Pick Call</span>
              <span className="text-[#555555] dark:text-[#A0A5A8] text-[10px]">ODD or EVEN</span>
            </div>
            <div className="rounded-lg bg-white dark:bg-[#1E2523] p-2 border border-[#E3E6E8] dark:border-[#2C3533]">
              <span className="block font-extrabold text-[#009270]">2. Show Fingers</span>
              <span className="text-[#555555] dark:text-[#A0A5A8] text-[10px]">Both pick 1 to 6</span>
            </div>
            <div className="rounded-lg bg-white dark:bg-[#1E2523] p-2 border border-[#E3E6E8] dark:border-[#2C3533]">
              <span className="block font-extrabold text-[#009270]">3. Sum Total</span>
              <span className="text-[#555555] dark:text-[#A0A5A8] text-[10px]">Sum matches call = Win</span>
            </div>
          </div>
          <div className="mt-2 text-center text-[11px] text-[#777777] dark:text-[#888888]">
            <span className="font-semibold">Example:</span> You pick <strong>3</strong> + Opponent picks <strong>4</strong> = <strong>7 (ODD)</strong>
          </div>
        </div>

        {isCaller ? (
          <div className="my-5 space-y-4">
            <span className="block text-[12px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A0A5A8]">
              Choose Your Call:
            </span>

            <div className="grid grid-cols-2 gap-4">
              {/* ODD Card */}
              <button
                type="button"
                onClick={() => setSelectedCall("odd")}
                className={`flex flex-col items-center justify-center rounded-xl p-5 border-2 transition active:scale-95 ${
                  selectedCall === "odd"
                    ? "border-[#009270] bg-[#E8F5E9] dark:bg-[#10261E] text-[#00796B] dark:text-[#00B38A] shadow-md ring-2 ring-[#009270]/40"
                    : "border-[#E3E6E8] bg-white hover:border-[#009270]/60 dark:bg-[#1B2220] dark:border-[#2C3533] text-[#222222] dark:text-white"
                }`}
              >
                <span className="text-[26px] font-black tracking-widest">ODD</span>
                <span className="mt-1 text-[11px] font-medium opacity-80">1, 3, 5, 7, 9, 11</span>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-black/30 px-2.5 py-0.5 text-[10px] font-bold">
                  {selectedCall === "odd" ? "Selected ✓" : "Tap to Call Odd"}
                </span>
              </button>

              {/* EVEN Card */}
              <button
                type="button"
                onClick={() => setSelectedCall("even")}
                className={`flex flex-col items-center justify-center rounded-xl p-5 border-2 transition active:scale-95 ${
                  selectedCall === "even"
                    ? "border-[#009270] bg-[#E8F5E9] dark:bg-[#10261E] text-[#00796B] dark:text-[#00B38A] shadow-md ring-2 ring-[#009270]/40"
                    : "border-[#E3E6E8] bg-white hover:border-[#009270]/60 dark:bg-[#1B2220] dark:border-[#2C3533] text-[#222222] dark:text-white"
                }`}
              >
                <span className="text-[26px] font-black tracking-widest">EVEN</span>
                <span className="mt-1 text-[11px] font-medium opacity-80">2, 4, 6, 8, 10, 12</span>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-black/30 px-2.5 py-0.5 text-[10px] font-bold">
                  {selectedCall === "even" ? "Selected ✓" : "Tap to Call Even"}
                </span>
              </button>
            </div>

            <div className="pt-2">
              <CricbuzzButton
                variant="primary"
                size="lg"
                disabled={selectedCall == null}
                onClick={() => selectedCall && submitCall(selectedCall)}
                className="w-full text-[14px] font-bold uppercase tracking-wider"
              >
                Lock In Call: {selectedCall ? selectedCall.toUpperCase() : "Select Above"} →
              </CricbuzzButton>
            </div>
          </div>
        ) : (
          <div className="my-5 space-y-4">
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#F5F7F8] p-6 text-center dark:bg-[#151B19] border border-[#E3E6E8] dark:border-[#2C3533]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#009270] border-t-transparent" />
              <div>
                <p className="text-[14px] font-bold text-[#222222] dark:text-white">
                  Waiting for {callerName} to make the call…
                </p>
                <p className="mt-1 text-[12px] text-[#666666] dark:text-[#A0A5A8]">
                  Once {callerName} chooses ODD or EVEN, both of you will pick your numbers on the next screen.
                </p>
              </div>
            </div>
          </div>
        )}
      </CricbuzzCard>

      {/* Pre-Match Powerplay & Mystery Yorker Rules Card */}
      <CricbuzzPowerplayRulesCard />
    </div>
  );
}
