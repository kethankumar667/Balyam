import React from "react";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { Coins, Trophy, Shield, Crown, Star, Award, Zap, Smile } from "lucide-react";
import type { LootItem, LootItemRarity } from "./types";
import CountUp from "../CountUp";
import { bhalyamSpring } from "../../lib/motion";

interface LootRevealCardProps {
  item: LootItem;
  index?: number;
  total?: number;
  isCompact?: boolean;
  /** Compact below `sm`, full size from `sm` up: the summary shows several cards, a phone cannot fit them full size. */
  compactOnMobile?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  compact: "w-44 h-60 p-5",
  compactOnMobile: "w-40 h-56 p-3 sm:w-72 sm:h-[22rem] sm:p-5",
  full: "w-64 sm:w-72 h-80 sm:h-[22rem] p-5",
} as const;

const RARITY_THEMES: Record<
  LootItemRarity,
  {
    name: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    cardBg: string;
    glow: string;
    accent: string;
  }
> = {
  common: {
    name: "STANDARD",
    badgeBg: "bg-stone-800 text-stone-200 border-stone-600",
    badgeText: "text-stone-300",
    border: "border-stone-500/50",
    cardBg: "from-stone-900 via-stone-800 to-stone-950",
    glow: "rgba(168, 162, 158, 0.3)",
    accent: "#a8a29e",
  },
  rare: {
    name: "RARE",
    badgeBg: "bg-amber-950 text-amber-200 border-amber-600",
    badgeText: "text-amber-300",
    border: "border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.35)]",
    cardBg: "from-amber-950 via-stone-900 to-stone-950",
    glow: "rgba(251, 191, 36, 0.5)",
    accent: "#fbbf24",
  },
  epic: {
    name: "EPIC",
    badgeBg: "bg-purple-950 text-purple-200 border-purple-500",
    badgeText: "text-purple-300",
    border: "border-purple-400/80 shadow-[0_0_24px_rgba(192,132,252,0.4)]",
    cardBg: "from-purple-950 via-stone-900 to-stone-950",
    glow: "rgba(192, 132, 252, 0.55)",
    accent: "#c084fc",
  },
  legendary: {
    name: "LEGENDARY",
    badgeBg: "bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500 text-white border-white/60 font-black",
    badgeText: "text-amber-200",
    border: "border-cyan-400/90 shadow-[0_0_32px_rgba(34,211,238,0.6)] ring-2 ring-amber-300/60",
    cardBg: "from-cyan-950 via-purple-950 to-stone-950",
    glow: "rgba(34, 211, 238, 0.7)",
    accent: "#22d3ee",
  },
};

export const LootRevealCard: React.FC<LootRevealCardProps> = ({
  item,
  isCompact = false,
  compactOnMobile = false,
  className = "",
}) => {
  const sizeClasses = isCompact
    ? SIZE_CLASSES.compact
    : compactOnMobile
      ? SIZE_CLASSES.compactOnMobile
      : SIZE_CLASSES.full;
  const rarity = RARITY_THEMES[item.rarity] ?? RARITY_THEMES.common;
  const isLegendary = item.rarity === "legendary";

  const renderIcon = () => {
    if (item.icon) return item.icon;

    switch (item.type) {
      case "coins":
        return (
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 flex items-center justify-center shadow-lg border-2 border-white/40">
              <Coins className="w-9 h-9 text-amber-950 fill-amber-950" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-2 rounded-full border border-amber-300/40 border-dashed pointer-events-none"
            />
          </div>
        );
      case "title":
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center shadow-lg border-2 border-white/30">
            <Award className="w-9 h-9 text-amber-300" />
          </div>
        );
      case "badge":
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center shadow-lg border-2 border-white/30">
            <Trophy className="w-9 h-9 text-yellow-200 fill-yellow-400/40" />
          </div>
        );
      case "shield":
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center shadow-lg border-2 border-white/30">
            <Shield className="w-9 h-9 text-cyan-200 fill-cyan-400/30" />
          </div>
        );
      case "emojis":
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center shadow-lg border-2 border-white/30">
            <Smile className="w-9 h-9 text-white" />
          </div>
        );
      case "xp":
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-lg border-2 border-white/30">
            <Zap className="w-9 h-9 text-yellow-300 fill-yellow-300" />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-stone-800 flex items-center justify-center shadow-lg border-2 border-white/30">
            <Crown className="w-9 h-9 text-amber-200" />
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.2, y: 70, opacity: 0, rotateY: 180 }}
      animate={{ scale: 1, y: 0, opacity: 1, rotateY: 0 }}
      transition={bhalyamSpring}
      className={`select-none ${className}`}
      style={{ perspective: "1000px" }}
    >
      <Tilt
        tiltMaxAngleX={isCompact ? 10 : 16}
        tiltMaxAngleY={isCompact ? 10 : 16}
        perspective={1000}
        glareEnable={true}
        glareMaxOpacity={0.35}
        glareColor={isLegendary ? "#ffffff" : rarity.accent}
        glarePosition="all"
        glareBorderRadius="1.5rem"
        className="w-full h-full"
      >
        <div
          className={`relative rounded-3xl flex flex-col items-center justify-between text-center border-2 backdrop-blur-md overflow-hidden bg-gradient-to-b ${rarity.cardBg} ${rarity.border} ${sizeClasses}`}
          style={{
            boxShadow: `0 16px 36px -10px rgba(0, 0, 0, 0.8), 0 0 24px -4px ${rarity.glow}`,
          }}
        >
          {/* Holographic prismatic sheen pattern */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[linear-gradient(135deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:16px_16px]"
          />

          {/* Radiant Backlight */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-2xl pointer-events-none opacity-45"
            style={{ backgroundColor: rarity.accent }}
          />

          {/* Top Rarity Header & Badge */}
          <div className="relative z-10 w-full flex items-center justify-between">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border shadow-xs ${rarity.badgeBg}`}
            >
              {item.badgeText || rarity.name}
            </span>

            {isLegendary && (
              <Crown className="w-5 h-5 text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            )}
          </div>

          {/* Center Artwork / Icon / Count */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center">
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              className="mb-3"
            >
              {renderIcon()}
            </motion.div>

            {item.amount !== undefined && (
              <div className="flex items-center gap-1.5 text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                <span className="text-amber-400">+</span>
                <CountUp end={item.amount} duration={1.2} />
              </div>
            )}
          </div>

          {/* Bottom Title & Description */}
          <div className="relative z-10 w-full">
            <h4 className="text-sm sm:text-lg font-black text-white tracking-wide leading-tight line-clamp-2 break-words drop-shadow-sm">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-stone-300/90 line-clamp-2 mt-0.5 font-medium leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </Tilt>
    </motion.div>
  );
};

export default LootRevealCard;
