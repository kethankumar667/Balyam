import React from "react";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

interface AchievementBadgeProps {
  icon?: string;
  rarity?: AchievementRarity;
  unlocked?: boolean;
  size?: number;
  className?: string;
}

export const AchievementRarityBadge: React.FC<AchievementBadgeProps> = ({
  icon = "🏆",
  rarity = "common",
  unlocked = false,
  size = 48,
  className = "",
}) => {
  const getGlowStyles = () => {
    if (!unlocked) {
      return "border-stone-800 bg-stone-950/60 opacity-50 grayscale";
    }
    switch (rarity) {
      case "mythic":
        return "border-rose-500/80 bg-gradient-to-tr from-rose-950/80 via-purple-950/80 to-zinc-900 shadow-[0_0_20px_rgba(244,63,94,0.4)] ring-1 ring-rose-400";
      case "legendary":
        return "border-amber-500/80 bg-gradient-to-tr from-amber-950/80 via-yellow-950/80 to-zinc-900 shadow-[0_0_18px_rgba(245,158,11,0.35)] ring-1 ring-amber-400";
      case "epic":
        return "border-purple-500/80 bg-gradient-to-tr from-purple-950/80 via-indigo-950/80 to-zinc-900 shadow-[0_0_16px_rgba(168,85,247,0.3)] ring-1 ring-purple-400";
      case "rare":
        return "border-sky-500/80 bg-gradient-to-tr from-sky-950/80 via-cyan-950/80 to-zinc-900 shadow-[0_0_14px_rgba(14,165,233,0.25)] ring-1 ring-sky-400";
      case "common":
      default:
        return "border-stone-700 bg-stone-900/90 shadow-md";
    }
  };

  const getRarityPill = () => {
    switch (rarity) {
      case "mythic":
        return <span className="text-[9px] font-mono font-black uppercase text-rose-300">MYTHIC</span>;
      case "legendary":
        return <span className="text-[9px] font-mono font-black uppercase text-amber-300">LEGENDARY</span>;
      case "epic":
        return <span className="text-[9px] font-mono font-black uppercase text-purple-300">EPIC</span>;
      case "rare":
        return <span className="text-[9px] font-mono font-black uppercase text-sky-300">RARE</span>;
      case "common":
      default:
        return <span className="text-[9px] font-mono font-bold uppercase text-stone-400">COMMON</span>;
    }
  };

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-2xl border flex flex-col items-center justify-center relative transition-transform hover:scale-105 ${getGlowStyles()} ${className}`}
      aria-label={`${rarity} achievement badge`}
    >
      <span className="text-xl sm:text-2xl leading-none select-none">{icon}</span>
      {unlocked && (
        <div className="absolute -bottom-1.5 px-1.5 py-0.5 bg-stone-950/90 rounded-full border border-stone-800 shadow">
          {getRarityPill()}
        </div>
      )}
    </div>
  );
};
