import React from "react";
import { getLevelTier, getLevelTitle } from "@shared/progression/MiniclipProgression";
import type { LevelTier } from "@shared/progression/MiniclipProgression";
import { MiniclipHoloTilt } from "./MiniclipHoloTilt";

export type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface MiniclipLevelBadgeProps {
  level: number;
  size?: BadgeSize;
  className?: string;
  showTooltip?: boolean;
  showTitle?: boolean;
  onClick?: () => void;
  animated?: boolean;
  enableHoloTilt?: boolean;
}

const SIZE_CONFIG: Record<
  BadgeSize,
  {
    pixelSize: number;
    fontSize: string;
    starSize: number;
    laurelScale: number;
    crownOffset: number;
  }
> = {
  xs: { pixelSize: 22, fontSize: "text-[9px]", starSize: 5, laurelScale: 0.5, crownOffset: -3 },
  sm: { pixelSize: 30, fontSize: "text-[11px]", starSize: 7, laurelScale: 0.7, crownOffset: -5 },
  md: { pixelSize: 42, fontSize: "text-sm", starSize: 9, laurelScale: 1.0, crownOffset: -7 },
  lg: { pixelSize: 64, fontSize: "text-xl", starSize: 12, laurelScale: 1.4, crownOffset: -10 },
  xl: { pixelSize: 96, fontSize: "text-3xl", starSize: 16, laurelScale: 1.9, crownOffset: -14 },
};

/**
 * Authentic Miniclip-style Level Badge (inspired by 8 Ball Pool).
 * Features metallic multi-ring borders, tier-specific laurels, wings, crowns,
 * star pips, and rich gaming typography.
 */
export const MiniclipLevelBadge: React.FC<MiniclipLevelBadgeProps> = ({
  level,
  size = "md",
  className = "",
  showTooltip = true,
  showTitle = false,
  onClick,
  animated = false,
  enableHoloTilt,
}) => {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const tier: LevelTier = getLevelTier(safeLevel);
  const title = getLevelTitle(safeLevel);
  const config = SIZE_CONFIG[size];
  const shouldTilt = enableHoloTilt === true || ((size === "lg" || size === "xl") && enableHoloTilt !== false);

  const tooltipText = `Level ${safeLevel} • ${tier.name} Tier (${title})`;

  // Unique SVG gradient IDs to prevent DOM collision across multiple badges
  const gradId = `mc_grad_${tier.id}_${size}`;
  const rimId = `mc_rim_${tier.id}_${size}`;
  const darkCenterId = `mc_dark_${tier.id}_${size}`;

  const badgeContent = (
    <div
      data-testid="miniclip-level-badge"
      className={`relative inline-flex flex-col items-center justify-center select-none ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
      title={showTooltip ? tooltipText : undefined}
      aria-label={tooltipText}
    >
      <div
        className={`relative flex items-center justify-center transition-transform duration-200 ${
          onClick ? "group-hover:scale-110 active:scale-95" : ""
        } ${animated ? "animate-pulse" : ""}`}
        style={{ width: config.pixelSize, height: config.pixelSize }}
      >
        {/* Ambient Glow Halo */}
        <div
          className="absolute inset-0 rounded-full blur-md opacity-60 pointer-events-none transition-opacity duration-300 group-hover:opacity-100"
          style={{ backgroundColor: tier.themeColor }}
        />

        {/* Decorative Wings for Cobalt/Gold/Ruby/Amethyst/Emerald/Celestial */}
        {tier.hasWings && (size === "md" || size === "lg" || size === "xl") && (
          <svg
            className="absolute pointer-events-none"
            style={{
              width: config.pixelSize * 1.5,
              height: config.pixelSize * 0.8,
              top: "10%",
              left: "-25%",
              filter: `drop-shadow(0 2px 4px ${tier.themeColor}55)`,
            }}
            viewBox="0 0 100 50"
            fill="none"
          >
            <path
              d="M10 28 C 2 20, 0 12, 18 10 C 26 9, 32 16, 38 24 C 28 22, 18 24, 10 28 Z"
              fill={tier.themeColor}
              opacity="0.85"
            />
            <path
              d="M90 28 C 98 20, 100 12, 82 10 C 74 9, 68 16, 62 24 C 72 22, 82 24, 90 28 Z"
              fill={tier.themeColor}
              opacity="0.85"
            />
          </svg>
        )}

        {/* Laurel Wreath for Gold, Ruby, Amethyst, Emerald, Celestial */}
        {tier.hasLaurel && (size === "md" || size === "lg" || size === "xl") && (
          <svg
            className="absolute pointer-events-none"
            style={{
              width: config.pixelSize * 1.35,
              height: config.pixelSize * 1.35,
              top: "-17.5%",
              left: "-17.5%",
            }}
            viewBox="0 0 100 100"
            fill="none"
          >
            <path
              d="M24 75 C 10 60, 10 35, 24 20 M76 75 C 90 60, 90 35, 76 20"
              stroke={tier.themeColor}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* Laurel leaves */}
            <circle cx="20" cy="30" r="3" fill="#fde047" />
            <circle cx="16" cy="45" r="3.5" fill="#fde047" />
            <circle cx="18" cy="60" r="3" fill="#fde047" />
            <circle cx="80" cy="30" r="3" fill="#fde047" />
            <circle cx="84" cy="45" r="3.5" fill="#fde047" />
            <circle cx="82" cy="60" r="3" fill="#fde047" />
          </svg>
        )}

        {/* Royal Crown for Ruby, Amethyst, Emerald, Celestial */}
        {tier.hasCrown && (size === "md" || size === "lg" || size === "xl") && (
          <div
            className="absolute z-20 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
            style={{ top: config.crownOffset }}
          >
            <svg
              width={config.pixelSize * 0.45}
              height={config.pixelSize * 0.35}
              viewBox="0 0 24 16"
              fill="none"
            >
              <path
                d="M2 14L4 4L9 9L12 1L15 9L20 4L22 14H2Z"
                fill="url(#crown_gold)"
                stroke="#78350f"
                strokeWidth="1"
              />
              <circle cx="12" cy="2" r="1.5" fill="#ffffff" />
              <circle cx="4" cy="5" r="1.2" fill={tier.themeColor} />
              <circle cx="20" cy="5" r="1.2" fill={tier.themeColor} />
              <defs>
                <linearGradient id="crown_gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#a16207" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* Main Emblem SVG */}
        <svg
          width={config.pixelSize}
          height={config.pixelSize}
          viewBox="0 0 100 100"
          className="relative z-10"
        >
          <defs>
            {/* Outer Rim Gradient */}
            <linearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="25%" stopColor={tier.themeColor} />
              <stop offset="70%" stopColor={tier.secondaryColor} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
            </linearGradient>

            {/* Inner Tier Body Gradient */}
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={tier.themeColor} />
              <stop offset="100%" stopColor={tier.secondaryColor} />
            </linearGradient>

            {/* Dark Metallic Center for number contrast */}
            <radialGradient id={darkCenterId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e1b18" />
              <stop offset="75%" stopColor="#0a0a0c" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
          </defs>

          {/* Badge Shapes depending on tier */}
          {tier.badgeShape === "octagon" ? (
            // Octagon (Silver)
            <polygon
              points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30"
              fill={`url(#${rimId})`}
              stroke={tier.themeColor}
              strokeWidth="2"
            />
          ) : tier.badgeShape === "shield" || tier.badgeShape === "crowned-shield" ? (
            // Shield (Cobalt / Ruby)
            <path
              d="M50 5 L92 18 C92 55, 75 85, 50 96 C25 85, 8 55, 8 18 Z"
              fill={`url(#${rimId})`}
              stroke={tier.themeColor}
              strokeWidth="2"
            />
          ) : tier.badgeShape === "sunburst" ? (
            // Sunburst (Gold)
            <polygon
              points="50,4 62,14 78,8 84,24 98,28 94,44 100,56 88,66 88,82 72,84 64,98 50,92 36,98 28,84 12,82 12,66 0,56 6,44 2,28 16,24 22,8 38,14"
              fill={`url(#${rimId})`}
              stroke="#fbbf24"
              strokeWidth="2"
            />
          ) : (
            // Circle & Crests (Bronze, Amethyst, Emerald, Celestial)
            <circle
              cx="50"
              cy="50"
              r="46"
              fill={`url(#${rimId})`}
              stroke={tier.themeColor}
              strokeWidth="2"
            />
          )}

          {/* Inner Inset Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill={`url(#${darkCenterId})`}
            stroke={`url(#${gradId})`}
            strokeWidth="3.5"
          />

          {/* Subtle Top Metallic Highlight Arch */}
          <path
            d="M20 40 A 32 32 0 0 1 80 40"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* Bottom Star Indicator Pips */}
          {size !== "xs" && (
            <g transform="translate(50, 78)">
              {Array.from({ length: tier.stars }).map((_, i) => {
                const total = tier.stars;
                const offset = (i - (total - 1) / 2) * 11;
                return (
                  <polygon
                    key={i}
                    points="0,-4 1.2,-1 4,-1 1.8,0.8 2.6,3.6 0,2 -2.6,3.6 -1.8,0.8 -4,-1 -1.2,-1"
                    transform={`translate(${offset}, 0) scale(0.9)`}
                    fill={tier.name === "Bronze" ? "#f59e0b" : "#fef08a"}
                    stroke="#78350f"
                    strokeWidth="0.5"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Centered Level Number */}
        <span
          data-testid="miniclip-level-number"
          className={`absolute z-20 font-black font-mono tracking-tighter ${config.fontSize} text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}
          style={{
            textShadow: `0 0 4px ${tier.themeColor}, 0 2px 3px #000000`,
            marginTop: size === "xs" ? 0 : tier.hasCrown ? "2px" : "1px",
          }}
        >
          {safeLevel}
        </span>
      </div>

      {/* Optional Below-Badge Title */}
      {showTitle && (
        <span
          className="mt-1 text-[11px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-full border shadow-sm"
          style={{
            color: tier.themeColor,
            borderColor: `${tier.themeColor}55`,
            backgroundColor: "rgba(10, 10, 12, 0.8)",
          }}
        >
          {title}
        </span>
      )}
    </div>
  );

  const element = onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full"
      aria-label={`Open level roadmap for ${tooltipText}`}
    >
      {badgeContent}
    </button>
  ) : (
    badgeContent
  );

  if (shouldTilt) {
    return <MiniclipHoloTilt tier={tier}>{element}</MiniclipHoloTilt>;
  }

  return element;
};

export default MiniclipLevelBadge;
