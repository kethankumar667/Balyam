import type { StreakMilestoneChest } from "@shared/streak-types";

interface PremiumRewardChestProps {
  type: StreakMilestoneChest;
  size?: number;
  className?: string;
}

const SPRITE_POSITION: Record<StreakMilestoneChest, string> = {
  bronze: "0% 0%",
  silver: "100% 0%",
  gold: "0% 100%",
  diamond: "100% 100%",
};

const CHEST_LABEL: Record<StreakMilestoneChest, string> = {
  bronze: "Bronze reward chest",
  silver: "Silver reward chest",
  gold: "Gold reward chest",
  diamond: "Ultimate diamond reward vault",
};

/**
 * Crops one quadrant from the generated premium reward-chest sprite sheet.
 * A single source file keeps material, perspective, and lighting consistent
 * across all four milestone tiers and avoids four extra network requests.
 */
export function PremiumRewardChest({
  type,
  size = 112,
  className = "",
}: PremiumRewardChestProps) {
  return (
    <div
      role="img"
      aria-label={CHEST_LABEL[type]}
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-no-repeat drop-shadow-[0_12px_16px_rgba(3,8,20,0.42)]"
        style={{
          backgroundImage: "url('/assets/streak/reward-chests-premium.webp')",
          backgroundPosition: SPRITE_POSITION[type],
          backgroundSize: "200% 200%",
        }}
      />
    </div>
  );
}

export default PremiumRewardChest;
