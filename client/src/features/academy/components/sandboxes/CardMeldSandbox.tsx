import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Star } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useReducedMotion } from "../../../../animations/helpers/useReducedMotion";
import {
  readConfigString,
  useCompleteOnce,
  type ConfigurableSandboxProps,
} from "./sandboxShared";

type MeldMode = "pure" | "impure" | "set";

interface MiniCard {
  id: string;
  suit: "♠" | "♥" | "♦" | "♣" | "joker";
  rank: string;
  color: "red" | "black" | "gold";
  isJoker?: boolean;
}

interface ModeCopy {
  tab: string;
  title: string;
  detail: string;
  activeTab: string;
  panel: string;
}

const MIN_MODES_VIEWED = 2;

/** Slide `mode` values that demand specific options be tried. */
const REQUIRED_MODES_BY_SLIDE_MODE: Record<string, readonly MeldMode[]> = {
  compare: ["pure", "impure"],
};

const MODES: readonly MeldMode[] = ["pure", "impure", "set"];

const CARDS_BY_MODE: Record<MeldMode, readonly MiniCard[]> = {
  pure: [
    { id: "c1", suit: "♠", rank: "4", color: "black" },
    { id: "c2", suit: "♠", rank: "5", color: "black" },
    { id: "c3", suit: "♠", rank: "6", color: "black" },
  ],
  impure: [
    { id: "c4", suit: "♥", rank: "8", color: "red" },
    { id: "c5", suit: "joker", rank: "JKR", color: "gold", isJoker: true },
    { id: "c6", suit: "♥", rank: "10", color: "red" },
  ],
  set: [
    { id: "c7", suit: "♠", rank: "K", color: "black" },
    { id: "c8", suit: "♥", rank: "K", color: "red" },
    { id: "c9", suit: "♦", rank: "K", color: "red" },
  ],
};

const COPY_BY_MODE: Record<MeldMode, ModeCopy> = {
  pure: {
    tab: "Pure Run (No Jokers)",
    title: "Pure Sequence (Mandatory Tier 1)",
    detail:
      "3+ consecutive cards in ♠ spades with ZERO jokers. You MUST hold at least one pure sequence to declare.",
    activeTab: "bg-emerald-500 text-slate-950 shadow-md font-black",
    panel: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
  },
  impure: {
    tab: "Impure Run (With Joker)",
    title: "Impure Sequence (Wild Joker Supported)",
    detail:
      "Wild Joker substitutes for 9♥. Valid only AFTER your pure sequence is completed.",
    activeTab: "bg-amber-500 text-slate-950 shadow-md font-black",
    panel: "bg-amber-500/10 border-amber-500/40 text-amber-300",
  },
  set: {
    tab: "Set (3 of Kind)",
    title: "Valid Set (Same Rank, Different Suits)",
    detail:
      "Three Kings with different suits (♠, ♥, ♦). Sets cannot contain duplicate suits.",
    activeTab: "bg-cyan-500 text-slate-950 shadow-md font-black",
    panel: "bg-cyan-500/10 border-cyan-500/40 text-cyan-300",
  },
};

/** A demo counts as done once the learner has tried the options it needs. */
function isDemoComplete(
  viewed: readonly MeldMode[],
  slideMode: string | undefined,
): boolean {
  const required = slideMode
    ? REQUIRED_MODES_BY_SLIDE_MODE[slideMode]
    : undefined;
  if (required) return required.every((mode) => viewed.includes(mode));
  return viewed.length >= MIN_MODES_VIEWED;
}

function SuitMark({
  suit,
  starClass,
}: {
  suit: MiniCard["suit"];
  starClass: string;
}): React.ReactElement {
  if (suit === "joker") return <Star className={starClass} aria-hidden="true" />;
  return <>{suit}</>;
}

function CardFace({ card }: { card: MiniCard }): React.ReactElement {
  const inkClass = card.color === "red" ? "text-red-600" : "text-stone-900";
  return (
    <>
      <div className="flex justify-between items-center text-xs font-black">
        <span>{card.rank}</span>
        <span className={inkClass}>
          <SuitMark suit={card.suit} starClass="w-3 h-3" />
        </span>
      </div>
      <div className="text-xl sm:text-2xl font-bold flex items-center justify-center">
        <span className={card.isJoker ? "text-slate-950" : inkClass}>
          <SuitMark suit={card.suit} starClass="w-5 h-5" />
        </span>
      </div>
      <div
        className={`text-[10px] font-mono font-bold text-right ${
          card.isJoker ? "text-slate-950" : "text-stone-700"
        }`}
      >
        {card.isJoker ? "WILD" : card.rank}
      </div>
    </>
  );
}

export const CardMeldSandbox: React.FC<ConfigurableSandboxProps> = ({
  onComplete,
  config,
}) => {
  const slideMode = readConfigString(config, "mode");
  const [testMode, setTestMode] = useState<MeldMode>("pure");
  const [viewed, setViewed] = useState<readonly MeldMode[]>(["pure"]);
  const reduceMotion = useReducedMotion();
  const complete = useCompleteOnce(onComplete);

  const currentCards = CARDS_BY_MODE[testMode];
  const copy = COPY_BY_MODE[testMode];

  const handleSelectMode = (mode: MeldMode) => {
    if (mode === testMode) return;
    HapticsManager.getInstance().subtle();
    setTestMode(mode);

    const nextViewed = viewed.includes(mode) ? viewed : [...viewed, mode];
    setViewed(nextViewed);
    if (isDemoComplete(nextViewed, slideMode)) {
      HapticsManager.getInstance().win();
      complete();
    }
  };

  return (
    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black">
        Interactive Meld Lab
      </div>

      {/* Mode Selector Tabs */}
      <div
        role="group"
        aria-label="Meld type"
        className="flex flex-wrap justify-center items-center gap-2 p-1 mt-4 bg-slate-950/80 rounded-xl border border-stone-800"
      >
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={testMode === mode}
            onClick={() => handleSelectMode(mode)}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
              testMode === mode
                ? COPY_BY_MODE[mode].activeTab
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {COPY_BY_MODE[mode].tab}
          </button>
        ))}
      </div>

      {/* Mini Card Layout */}
      <div className="flex items-center justify-center gap-3 my-1">
        {currentCards.map((card) => (
          <motion.div
            key={card.id}
            initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 flex flex-col justify-between p-2 shadow-xl ${
              card.isJoker
                ? "bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 border-amber-300 font-black"
                : "bg-stone-100 text-slate-900 border-stone-300"
            }`}
          >
            <CardFace card={card} />
          </motion.div>
        ))}
      </div>

      {/* Validation Status Box */}
      <div
        role="status"
        className={`w-full max-w-sm p-3 rounded-xl border text-xs font-mono text-left flex items-start gap-2.5 ${copy.panel}`}
      >
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-current" aria-hidden="true" />
        <div>
          <span className="font-bold block uppercase tracking-wide">
            {copy.title}
          </span>
          <p className="text-[11px] text-stone-400 mt-0.5">{copy.detail}</p>
        </div>
      </div>
    </div>
  );
};
