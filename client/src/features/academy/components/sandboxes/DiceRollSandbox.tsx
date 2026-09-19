import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Dice5, Sparkles, Star } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useReducedMotion } from "../../../../animations/helpers/useReducedMotion";
import { useCompleteOnce, type SandboxProps } from "./sandboxShared";

type TokenPosition = "yard" | "start" | "track";

interface RollResult {
  tokenPos: TokenPosition;
  message: string;
  isLaunch: boolean;
}

const ROLL_ANIMATION_MS = 600;
const DICE_SIDES = 6;
const LAUNCH_VALUE = 6;
const INITIAL_MESSAGE =
  "Tap the tactical die to roll a 6 and deploy your token from the yard.";

const TOKEN_CLASS = "w-4 h-4 rounded-full bg-amber-500 border border-amber-200";

function TokenSwatch(): React.ReactElement {
  return <span className={TOKEN_CLASS} aria-hidden="true" />;
}

/** Pure ruling for one roll: where the token goes and what to tell the learner. */
function resolveRoll(tokenPos: TokenPosition, value: number): RollResult {
  if (value === LAUNCH_VALUE && tokenPos === "yard") {
    return {
      tokenPos: "start",
      isLaunch: true,
      message:
        "Rolled 6! Token deployed to the Start cell and you earn a BONUS ROLL!",
    };
  }
  if (value === LAUNCH_VALUE) {
    return {
      tokenPos: "track",
      isLaunch: false,
      message: "Rolled 6! Advanced 6 cells forward and earned an EXTRA TURN!",
    };
  }
  if (tokenPos === "yard") {
    return {
      tokenPos,
      isLaunch: false,
      message: `Rolled ${value}. Keep rolling until you hit 6 to launch!`,
    };
  }
  return {
    tokenPos: "track",
    isLaunch: false,
    message: `Rolled ${value}! Token advanced ${value} cells along the perimeter.`,
  };
}

function stageClass(isActive: boolean, activeClass: string): string {
  return `flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
    isActive ? activeClass : "border-stone-800 opacity-60"
  }`;
}

export const DiceRollSandbox: React.FC<SandboxProps> = ({ onComplete }) => {
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [tokenPos, setTokenPos] = useState<TokenPosition>("yard");
  const [statusMessage, setStatusMessage] = useState(INITIAL_MESSAGE);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const complete = useCompleteOnce(onComplete);

  // The roll timer must never fire after the sandbox is gone.
  useEffect(() => {
    return () => {
      if (rollTimerRef.current === null) return;
      clearTimeout(rollTimerRef.current);
      rollTimerRef.current = null;
    };
  }, []);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    HapticsManager.getInstance().subtle();

    rollTimerRef.current = setTimeout(() => {
      rollTimerRef.current = null;
      // The first roll from the yard is a guaranteed 6 so the core rule shows immediately.
      const value =
        tokenPos === "yard"
          ? LAUNCH_VALUE
          : Math.floor(Math.random() * DICE_SIDES) + 1;
      const result = resolveRoll(tokenPos, value);

      setDiceValue(value);
      setIsRolling(false);
      setTokenPos(result.tokenPos);
      setStatusMessage(result.message);
      if (result.isLaunch) {
        HapticsManager.getInstance().win();
        complete();
      } else {
        HapticsManager.getInstance().subtle();
      }
    }, ROLL_ANIMATION_MS);
  };

  const shouldSpin = isRolling && !reduceMotion;

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-between gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black">
        Interactive Sandbox
      </div>

      {/* Mini Board Track Simulation */}
      <div className="w-full max-w-xs flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-stone-800">
        <div
          className={stageClass(
            tokenPos === "yard",
            "border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
          )}
        >
          <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">Yard</span>
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
            <TokenSwatch />
          </div>
        </div>

        <span className="flex items-center gap-0.5 text-stone-400 font-mono text-[10px]" aria-hidden="true">
          <ArrowRight className="w-3 h-3" />
          Roll 6
          <ArrowRight className="w-3 h-3" />
        </span>

        <div
          className={stageClass(
            tokenPos === "start",
            "border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
          )}
        >
          <span className="flex items-center gap-1 text-[10px] font-mono text-stone-400 font-bold uppercase">
            Start
            <Star className="w-2.5 h-2.5" aria-hidden="true" />
          </span>
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center text-emerald-400">
            {tokenPos === "start" ? (
              <TokenSwatch />
            ) : (
              <Star className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </div>
        </div>

        <ArrowRight className="w-3 h-3 text-stone-400" aria-hidden="true" />

        <div
          className={stageClass(
            tokenPos === "track",
            "border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
          )}
        >
          <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">Track</span>
          <div className="w-8 h-8 rounded-full border border-cyan-400/40 flex items-center justify-center text-xs text-cyan-300 font-bold">
            {tokenPos === "track" ? <TokenSwatch /> : "52"}
          </div>
        </div>
      </div>

      {/* Interactive Dice Widget */}
      <div className="flex items-center gap-4">
        <motion.button
          type="button"
          onClick={handleRoll}
          aria-disabled={isRolling}
          animate={shouldSpin ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex flex-col items-center justify-center shadow-lg border-2 border-yellow-300 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
          aria-label="Roll tactical dice"
        >
          {diceValue ? (
            <span className="text-2xl font-black font-mono">{diceValue}</span>
          ) : (
            <Dice5 className="w-8 h-8" aria-hidden="true" />
          )}
          <span className="text-[9px] font-black uppercase tracking-tighter">
            {isRolling ? "Rolling..." : "Roll"}
          </span>
        </motion.button>

        <div className="text-left text-xs font-mono text-stone-300 max-w-[180px]">
          <span className="flex items-center gap-1 text-amber-400 font-bold mb-0.5">
            {diceValue === LAUNCH_VALUE && (
              <Sparkles className="w-3 h-3" aria-hidden="true" />
            )}
            {diceValue === LAUNCH_VALUE ? "Launch Eligible!" : "Tap to Test Roll"}
          </span>
          <p role="status" className="text-[11px] text-stone-400 leading-tight">
            {statusMessage}
          </p>
        </div>
      </div>

      {tokenPos !== "yard" && (
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Demo complete</span>
        </div>
      )}
    </div>
  );
};
