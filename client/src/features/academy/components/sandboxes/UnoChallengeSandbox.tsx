import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Megaphone } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useCompleteOnce, type SandboxProps } from "./sandboxShared";

type ChallengeResult = "idle" | "illegal" | "legal";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300";

function ChallengeFeedback({
  result,
}: {
  result: ChallengeResult;
}): React.ReactElement | null {
  if (result === "illegal") {
    return (
      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs text-left flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-bold">CHALLENGE SUCCESSFUL!</span>
          <p className="text-[11px] text-stone-400">
            Opponent was caught with a Red 2 in hand. Offender draws 4 cards instead of you!
          </p>
        </div>
      </div>
    );
  }
  if (result === "legal") {
    return (
      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs text-left flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-bold">Challenge Accepted:</span>
          <p className="text-[11px] text-stone-400">
            You drew 4 cards and your turn was skipped. Choose your color carefully next round.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export const UnoChallengeSandbox: React.FC<SandboxProps> = ({ onComplete }) => {
  const [challengeResult, setChallengeResult] = useState<ChallengeResult>("idle");
  const [unoShouted, setUnoShouted] = useState(false);
  const complete = useCompleteOnce(onComplete);

  const handleChallenge = (type: "illegal" | "legal") => {
    HapticsManager.getInstance().subtle();
    setChallengeResult(type);
    if (type !== "illegal") return;
    HapticsManager.getInstance().win();
    complete();
  };

  const handleShoutUno = () => {
    if (unoShouted) return;
    HapticsManager.getInstance().win();
    setUnoShouted(true);
    complete();
  };

  return (
    <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-black">
        Interactive Match & Challenge
      </div>

      {/* Discard Pile Simulation */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">Discard Pile</span>
          <div className="w-14 h-20 rounded-xl bg-red-600 border-2 border-white flex flex-col items-center justify-center text-white font-black shadow-lg">
            <span className="text-xl">5</span>
            <span className="text-[9px] uppercase tracking-wider">Red</span>
          </div>
        </div>

        <div className="text-stone-400 font-mono text-xs" aria-hidden="true">vs</div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">Played Card</span>
          <div className="w-14 h-20 rounded-xl bg-slate-950 border-2 border-amber-400 flex flex-col items-center justify-center gap-1 text-amber-300 font-black shadow-lg">
            <span
              className="w-4 h-4 rounded-full bg-[conic-gradient(#dc2626,#eab308,#16a34a,#2563eb,#dc2626)]"
              aria-hidden="true"
            />
            <span className="text-xs font-black">+4</span>
          </div>
        </div>
      </div>

      {/* Challenge Simulation Controls */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <span className="text-xs font-mono text-stone-300 font-semibold">
          Opponent played Wild Draw 4! Did they hold matching Red cards?
        </span>

        <div className="flex items-center gap-2 justify-center">
          <button
            type="button"
            onClick={() => handleChallenge("illegal")}
            className={`flex-1 py-2 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-mono text-xs font-bold transition active:scale-95 ${FOCUS_RING}`}
          >
            Challenge: They Had Red!
          </button>
          <button
            type="button"
            onClick={() => handleChallenge("legal")}
            className={`flex-1 py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs font-bold transition active:scale-95 ${FOCUS_RING}`}
          >
            Accept Draw 4
          </button>
        </div>

        <div role="status">
          <ChallengeFeedback result={challengeResult} />
        </div>
      </div>

      {/* 1-Card UNO Shout Demonstration */}
      <div className="pt-2 border-t border-stone-800 w-full flex items-center justify-between">
        <span className="text-[11px] font-mono text-stone-400">Down to 1 card?</span>
        <button
          type="button"
          aria-pressed={unoShouted}
          onClick={handleShoutUno}
          className={`px-4 py-2 rounded-xl font-black font-mono text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${FOCUS_RING} ${
            unoShouted
              ? "bg-emerald-500 text-slate-950 shadow-lg"
              : "bg-gradient-to-r from-red-700 to-amber-700 text-white motion-safe:animate-pulse shadow-md active:scale-95"
          }`}
        >
          {unoShouted ? (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {unoShouted ? "UNO! Shouted" : "Shout UNO!"}
        </button>
      </div>
    </div>
  );
};
