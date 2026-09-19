import React, { useState } from "react";
import { CheckCircle2, Zap } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import {
  readConfigString,
  useCompleteOnce,
  type ConfigurableSandboxProps,
} from "./sandboxShared";

type OutcomeType = "run" | "out" | "yorker_bowled" | "yorker_defended" | "idle";

interface Outcome {
  type: OutcomeType;
  message: string;
}

interface Delivery {
  bowler: number;
  isOut: boolean;
}

/** Chance that a standard ball matches the batter's number (a wicket). */
const WICKET_MATCH_CHANCE = 0.3;
/** Against a Mystery Yorker, a slog of this number or higher is clean bowled. */
const YORKER_OUT_MIN = 4;
const DICE_FACES = 6;
const NUMBER_CHOICES: readonly number[] = [1, 2, 3, 4, 5, 6];

const STANDARD_HINT = "Standard ball: Match number = OUT, Differ = Runs.";
const START_HINT = "Select a number from 1 to 6 to face the delivery.";
const YORKER_HINT =
  "Mystery Yorker: Slogging 4/5/6 is instant clean bowled! Defend with 1/2/3.";

const MODE_BUTTON_IDLE = "text-stone-400 hover:text-stone-200";
const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300";

/** A number that is guaranteed to differ from the batter's. */
function differentNumber(batter: number): number {
  return (batter % DICE_FACES) + 1;
}

/**
 * Resolves one delivery. In Hand Cricket the batter is OUT exactly when the
 * two numbers match, so the number the bowler shows always agrees with the
 * outcome: a Yorker that bowls a slog shows the same number as the batter.
 */
function resolveDelivery(
  batter: number,
  isYorker: boolean,
  random: number,
): Delivery {
  if (isYorker) {
    const isOut = batter >= YORKER_OUT_MIN;
    return { bowler: isOut ? batter : differentNumber(batter), isOut };
  }
  const isOut = random < WICKET_MATCH_CHANCE;
  return { bowler: isOut ? batter : differentNumber(batter), isOut };
}

function describeOutcome(
  batter: number,
  delivery: Delivery,
  isYorker: boolean,
): Outcome {
  if (isYorker && delivery.isOut) {
    return {
      type: "yorker_bowled",
      message: `CLEAN BOWLED! You slogged for ${batter} and the Mystery Yorker matched it. Stumps shattered!`,
    };
  }
  if (isYorker) {
    return {
      type: "yorker_defended",
      message: `TACTICAL DEFENSE! You dug out the Yorker with ${batter}. Scored ${batter} safe ${batter === 1 ? "run" : "runs"}!`,
    };
  }
  if (delivery.isOut) {
    return {
      type: "out",
      message: `WICKET (OUT)! Both players showed ${batter}. Batter dismissed!`,
    };
  }
  return {
    type: "run",
    message: `RUNS SCORED! Batter showed ${batter} vs Bowler ${delivery.bowler}. Scored +${batter} runs!`,
  };
}

function outcomeClass(type: OutcomeType): string {
  if (type === "run" || type === "yorker_defended") {
    return "bg-emerald-500/10 border-emerald-500/40 text-emerald-300";
  }
  if (type === "out" || type === "yorker_bowled") {
    return "bg-red-500/10 border-red-500/40 text-red-300";
  }
  return "bg-stone-800/60 border-stone-700 text-stone-400";
}

function numberButtonClass(
  isSelected: boolean,
  isYorker: boolean,
  n: number,
): string {
  if (isSelected) return "bg-emerald-400 text-slate-950 shadow-md scale-105";
  if (isYorker && n >= YORKER_OUT_MIN) {
    return "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30";
  }
  return "bg-slate-800 hover:bg-slate-700 text-stone-200 border border-stone-700";
}

export const CricketDuelSandbox: React.FC<ConfigurableSandboxProps> = ({
  onComplete,
  config,
}) => {
  const startsInYorker = readConfigString(config, "mode") === "yorker";
  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [bowlerNum, setBowlerNum] = useState<number | null>(null);
  const [isYorker, setIsYorker] = useState<boolean>(startsInYorker);
  const [outcome, setOutcome] = useState<Outcome>({
    type: "idle",
    message: startsInYorker ? YORKER_HINT : START_HINT,
  });
  const complete = useCompleteOnce(onComplete);

  const handleSelectMode = (yorker: boolean) => {
    if (yorker === isYorker) return;
    setIsYorker(yorker);
    setSelectedNum(null);
    setBowlerNum(null);
    setOutcome({ type: "idle", message: yorker ? YORKER_HINT : STANDARD_HINT });
  };

  const handlePickNumber = (batterChoice: number) => {
    HapticsManager.getInstance().subtle();
    const delivery = resolveDelivery(batterChoice, isYorker, Math.random());
    const next = describeOutcome(batterChoice, delivery, isYorker);

    setSelectedNum(batterChoice);
    setBowlerNum(delivery.bowler);
    setOutcome(next);

    if (next.type === "run") return;
    HapticsManager.getInstance().win();
    // Completion needs the rule to be seen: a standard wicket or a defended Yorker.
    if (next.type === "out" || next.type === "yorker_defended") complete();
  };

  return (
    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black">
        Classroom Pitch Duel
      </div>

      {/* Mode Switch: Standard vs Mystery Yorker */}
      <div
        role="group"
        aria-label="Delivery type"
        className="flex flex-wrap justify-center items-center gap-2 p-1 mt-4 bg-slate-950/80 rounded-xl border border-stone-800"
      >
        <button
          type="button"
          aria-pressed={!isYorker}
          onClick={() => handleSelectMode(false)}
          className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors ${FOCUS_RING} ${
            !isYorker ? "bg-emerald-500 text-slate-950 font-black shadow-md" : MODE_BUTTON_IDLE
          }`}
        >
          Standard Ball
        </button>
        <button
          type="button"
          aria-pressed={isYorker}
          onClick={() => handleSelectMode(true)}
          className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1 ${FOCUS_RING} ${
            isYorker ? "bg-amber-500 text-slate-950 font-black shadow-md" : MODE_BUTTON_IDLE
          }`}
        >
          Powerplay Mystery Yorker
          <Zap className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

      {/* Duel Display */}
      <div className="flex items-center justify-center gap-8 my-1">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">Batter (You)</span>
          <div
            data-testid="cricket-batter-number"
            className="w-14 h-14 rounded-2xl bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-300 text-2xl font-black font-mono shadow-md"
          >
            {selectedNum ?? "?"}
          </div>
        </div>

        <div className="text-stone-400 font-mono text-sm font-bold" aria-hidden="true">VS</div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">
            {isYorker ? "Mystery Yorker" : "Bowler"}
          </span>
          <div
            data-testid="cricket-bowler-number"
            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black font-mono shadow-md ${
              isYorker
                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                : "bg-red-600/20 border-red-500 text-red-300"
            }`}
          >
            {bowlerNum ?? "?"}
          </div>
        </div>
      </div>

      {/* Number Selector (1 to 6) */}
      <div className="w-full max-w-xs">
        <span className="text-xs font-mono text-stone-300 font-bold block mb-2">
          {isYorker ? "Choose your shot carefully:" : "Pick your finger reveal:"}
        </span>
        <div className="grid grid-cols-6 gap-1.5">
          {NUMBER_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Show ${n}`}
              aria-pressed={selectedNum === n}
              onClick={() => handlePickNumber(n)}
              className={`py-2.5 rounded-xl font-mono font-black text-sm transition active:scale-95 ${FOCUS_RING} ${numberButtonClass(
                selectedNum === n,
                isYorker,
                n,
              )}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Outcome Feedback */}
      <div
        role="status"
        className={`w-full max-w-sm p-3 rounded-xl border text-xs font-mono text-left flex items-start gap-2 ${outcomeClass(
          outcome.type,
        )}`}
      >
        {outcome.type === "run" || outcome.type === "yorker_defended" ? (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <p className="text-[11px] leading-relaxed">{outcome.message}</p>
      </div>
    </div>
  );
};
