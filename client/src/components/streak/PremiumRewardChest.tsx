import type { StreakMilestoneChest } from "@shared/streak-types";
import { getChestImageUrl, CHEST_IMAGES } from "./StreakHeroArtwork";
export { getChestImageUrl, CHEST_IMAGES };

interface PremiumRewardChestProps {
  type: StreakMilestoneChest;
  size?: number;
  scale?: number;
  className?: string;
}

const CHEST_LABEL: Record<StreakMilestoneChest, string> = {
  bronze: "Bronze reward chest",
  silver: "Silver reward chest",
  gold: "Gold reward chest",
  diamond: "Legendary diamond reward chest",
};

export function PremiumRewardChest({
  type,
  size = 112,
  scale = 1.38,
  className = "",
}: PremiumRewardChestProps) {
  const imgSrc = getChestImageUrl(type);

  return (
    <div
      role="img"
      aria-label={CHEST_LABEL[type]}
      className={`relative shrink-0 flex items-center justify-center select-none overflow-visible ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={imgSrc}
        alt={CHEST_LABEL[type]}
        className="w-full h-full object-contain filter drop-shadow-[0_3px_8px_rgba(0,0,0,0.4)]"
        style={{ transform: `scale(${scale}) translateY(-3%)` }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}

export default PremiumRewardChest;

