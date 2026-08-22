import React from "react";

interface FancyLockProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * FancyLockIcon — An intricately styled, metallic golden gaming padlock.
 * Features dual metallic gradient shading, embossed bezel, and a glowing keyhole.
 */
export const FancyLockIcon: React.FC<FancyLockProps> = ({
  className = "",
  size = 16,
  glow = false,
}) => {
  const id = React.useId();
  const shackleGrad = `shackle-${id}`;
  const bodyGrad = `body-${id}`;
  const rimGrad = `rim-${id}`;
  const glowFilter = `glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${glow ? "drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" : ""} ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Shackle Gradient: polished chrome-gold metal */}
        <linearGradient id={shackleGrad} x1="6" y1="2" x2="18" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Padlock Body Gradient: warm luxury brass/gold */}
        <linearGradient id={bodyGrad} x1="4" y1="9" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="80%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Outer Rim Highlight */}
        <linearGradient id={rimGrad} x1="4" y1="9" x2="20" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#FDE68A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0.6" />
        </linearGradient>

        {glow && (
          <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#F59E0B" floodOpacity="0.6" />
          </filter>
        )}
      </defs>

      {/* ── Shackle / Loop ── */}
      <path
        d="M7 10V6.8C7 4.15 9.24 2 12 2C14.76 2 17 4.15 17 6.8V10"
        stroke={`url(#${shackleGrad})`}
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      {/* Shackle Inner Highlight */}
      <path
        d="M8.5 7.5V6.8C8.5 4.98 10.07 3.5 12 3.5C13.93 3.5 15.5 4.98 15.5 6.8V7.5"
        stroke="#FEF08A"
        strokeWidth="0.8"
        strokeOpacity="0.75"
        strokeLinecap="round"
      />

      {/* ── Main Padlock Body ── */}
      <rect
        x="4"
        y="9.5"
        width="16"
        height="12.5"
        rx="3.5"
        fill={`url(#${bodyGrad})`}
        stroke={`url(#${rimGrad})`}
        strokeWidth="1"
      />

      {/* Body Top Sheen Bevel */}
      <path
        d="M7 10.75H17"
        stroke="#FEF9C3"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />

      {/* Inset Plate Shadow */}
      <rect
        x="5.5"
        y="11"
        width="13"
        height="9.5"
        rx="2"
        fill="#451A03"
        fillOpacity="0.35"
      />

      {/* ── Glowing Keyhole ── */}
      {/* Keyhole Upper Circle */}
      <circle cx="12" cy="14.2" r="1.75" fill="#1C1917" />
      <circle cx="12" cy="14.2" r="0.9" fill="#FEF08A" fillOpacity="0.9" />
      {/* Keyhole Stem */}
      <path
        d="M11.2 14.5L11.5 18H12.5L12.8 14.5H11.2Z"
        fill="#1C1917"
      />
      {/* Keyhole Golden Rim Glow */}
      <circle cx="12" cy="14.2" r="2.2" stroke="#FDE68A" strokeWidth="0.4" strokeOpacity="0.6" />
    </svg>
  );
};

/**
 * FancyLockBadge — A self-contained golden lock badge with gradient glass pill container.
 */
export const FancyLockBadge: React.FC<{
  size?: number;
  className?: string;
  glow?: boolean;
}> = ({ size = 18, className = "", glow = true }) => {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-amber-500/20 via-amber-600/10 to-amber-950/30 border border-amber-500/40 p-1 shadow-[0_0_10px_rgba(245,158,11,0.2)] shrink-0 ${className}`}
    >
      <FancyLockIcon size={size} glow={glow} />
    </span>
  );
};

export default FancyLockIcon;
