import React from "react";

interface RankIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const BronzeRankIcon: React.FC<RankIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-[0_2px_8px_rgba(180,83,9,0.35)] ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="bronze_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" />
        <stop offset="50%" stopColor="#92400E" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="bronze_rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    {/* Shield Base */}
    <path
      d="M24 4L7 11V22C7 32.5 14.3 42.2 24 44.5C33.7 42.2 41 32.5 41 22V11L24 4Z"
      fill="url(#bronze_grad)"
      stroke="url(#bronze_rim)"
      strokeWidth="2"
    />
    {/* Inner Armor Plate */}
    <path
      d="M24 9L12 14.5V22C12 29.8 17.1 36.9 24 39.5C30.9 36.9 36 29.8 36 22V14.5L24 9Z"
      fill="#451A03"
      opacity="0.6"
    />
    {/* Crossed Daggers / Emblem */}
    <path
      d="M24 14V34M17 19L31 29M31 19L17 29"
      stroke="#FDE68A"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const SilverRankIcon: React.FC<RankIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-[0_2px_8px_rgba(148,163,184,0.35)] ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="silver_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F1F5F9" />
        <stop offset="50%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="silver_rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <path
      d="M24 4L7 11V22C7 32.5 14.3 42.2 24 44.5C33.7 42.2 41 32.5 41 22V11L24 4Z"
      fill="url(#silver_grad)"
      stroke="url(#silver_rim)"
      strokeWidth="2"
    />
    <path
      d="M24 9L12 14.5V22C12 29.8 17.1 36.9 24 39.5C30.9 36.9 36 29.8 36 22V14.5L24 9Z"
      fill="#1E293B"
      opacity="0.6"
    />
    {/* Silver Wing Crest */}
    <path
      d="M16 20C18 25 24 29 24 34C24 29 30 25 32 20M24 13V30"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const GoldRankIcon: React.FC<RankIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-[0_2px_12px_rgba(234,179,8,0.45)] ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#854D0E" />
      </linearGradient>
      <linearGradient id="gold_rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
    </defs>
    <path
      d="M24 4L7 11V22C7 32.5 14.3 42.2 24 44.5C33.7 42.2 41 32.5 41 22V11L24 4Z"
      fill="url(#gold_grad)"
      stroke="url(#gold_rim)"
      strokeWidth="2"
    />
    <path
      d="M24 9L12 14.5V22C12 29.8 17.1 36.9 24 39.5C30.9 36.9 36 29.8 36 22V14.5L24 9Z"
      fill="#422006"
      opacity="0.65"
    />
    {/* Gilded Crown Emblem */}
    <path
      d="M17 26L19 18L24 22L29 18L31 26H17Z"
      fill="#FEF08A"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="30" r="2.5" fill="#FDE047" stroke="#FEF08A" strokeWidth="1" />
  </svg>
);

export const PlatinumRankIcon: React.FC<RankIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-[0_2px_12px_rgba(45,212,191,0.45)] ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="plat_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#99F6E4" />
        <stop offset="50%" stopColor="#2DD4BF" />
        <stop offset="100%" stopColor="#115E59" />
      </linearGradient>
      <linearGradient id="plat_rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#CCFBF1" />
        <stop offset="100%" stopColor="#0F766E" />
      </linearGradient>
    </defs>
    <path
      d="M24 3L6 11V22C6 33 13.8 42.8 24 45.5C34.2 42.8 42 33 42 22V11L24 3Z"
      fill="url(#plat_grad)"
      stroke="url(#plat_rim)"
      strokeWidth="2"
    />
    <path
      d="M24 8L11 14V22C11 30.2 16.5 37.8 24 40.5C31.5 37.8 37 30.2 37 22V14L24 8Z"
      fill="#042F2E"
      opacity="0.7"
    />
    {/* Crystal Shards Blade */}
    <path
      d="M24 12L28 22L24 32L20 22L24 12Z"
      fill="#CCFBF1"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    <path d="M15 22H33" stroke="#99F6E4" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DiamondRankIcon: React.FC<RankIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-[0_2px_14px_rgba(56,189,248,0.55)] ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="dia_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="40%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>
      <linearGradient id="dia_rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <path
      d="M24 3L5 12V22C5 33.5 13.2 43.5 24 46C34.8 43.5 43 33.5 43 22V12L24 3Z"
      fill="url(#dia_grad)"
      stroke="url(#dia_rim)"
      strokeWidth="2"
    />
    <path
      d="M24 8L10 15V22C10 30.5 16 38.5 24 41C32 38.5 38 30.5 38 22V15L24 8Z"
      fill="#082F49"
      opacity="0.75"
    />
    {/* Multifaceted Diamond Core */}
    <path
      d="M17 18L24 13L31 18L24 33L17 18Z"
      fill="#BAE6FD"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M17 18H31M24 13V33" stroke="#FFFFFF" strokeWidth="1.2" />
  </svg>
);

export const MasterRankIcon: React.FC<RankIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-[0_2px_16px_rgba(168,85,247,0.6)] ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="master_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F3E8FF" />
        <stop offset="35%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#581C87" />
      </linearGradient>
      <linearGradient id="master_rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FAF5FF" />
        <stop offset="100%" stopColor="#7E22CE" />
      </linearGradient>
    </defs>
    <path
      d="M24 2L4 12V22C4 34 12.5 44.5 24 47C35.5 44.5 44 34 44 22V12L24 2Z"
      fill="url(#master_grad)"
      stroke="url(#master_rim)"
      strokeWidth="2"
    />
    <path
      d="M24 7L9 15V22C9 31.2 15.4 39.5 24 42C32.6 39.5 39 31.2 39 22V15L24 7Z"
      fill="#3B0764"
      opacity="0.8"
    />
    {/* Master Imperial Crown */}
    <path
      d="M15 28L18 16L24 21L30 16L33 28H15Z"
      fill="#E9D5FF"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="33" r="3" fill="#C084FC" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
);

export const GrandmasterRankIcon: React.FC<RankIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-[0_2px_18px_rgba(244,63,94,0.65)] ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="gm_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE4E6" />
        <stop offset="30%" stopColor="#F43F5E" />
        <stop offset="70%" stopColor="#881337" />
        <stop offset="100%" stopColor="#111827" />
      </linearGradient>
      <linearGradient id="gm_rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFF1F2" />
        <stop offset="50%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
    </defs>
    <path
      d="M24 2L3 12V22C3 34.5 12 45.2 24 47.5C36 45.2 45 34.5 45 22V12L24 2Z"
      fill="url(#gm_grad)"
      stroke="url(#gm_rim)"
      strokeWidth="2.5"
    />
    <path
      d="M24 6L8 14V22C8 31.8 14.8 40.5 24 43C33.2 40.5 40 31.8 40 22V14L24 6Z"
      fill="#4C0519"
      opacity="0.85"
    />
    {/* Celestial Cosmic Star */}
    <path
      d="M24 11L27 20L36 21L29 27L31 36L24 31L17 36L19 27L12 21L21 20L24 11Z"
      fill="#FDE047"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="24" r="3.5" fill="#E11D48" stroke="#FFE4E6" strokeWidth="1" />
  </svg>
);

export const RankTierIcon: React.FC<{ tier: string; size?: number | string; className?: string }> = ({
  tier,
  size = 28,
  className = "",
}) => {
  const normalized = tier.toLowerCase();
  switch (normalized) {
    case "grandmaster":
      return <GrandmasterRankIcon size={size} className={className} />;
    case "master":
      return <MasterRankIcon size={size} className={className} />;
    case "diamond":
      return <DiamondRankIcon size={size} className={className} />;
    case "platinum":
      return <PlatinumRankIcon size={size} className={className} />;
    case "gold":
      return <GoldRankIcon size={size} className={className} />;
    case "silver":
      return <SilverRankIcon size={size} className={className} />;
    case "bronze":
    default:
      return <BronzeRankIcon size={size} className={className} />;
  }
};
