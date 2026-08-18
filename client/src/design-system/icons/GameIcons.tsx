import React from "react";
import type { GameKind } from "@shared/types";

interface GameIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const LudoGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#1E293B" stroke="#334155" strokeWidth="2" />
    {/* 4 Player quadrants */}
    <rect x="8" y="8" width="14" height="14" rx="4" fill="#EF4444" />
    <rect x="26" y="8" width="14" height="14" rx="4" fill="#22C55E" />
    <rect x="8" y="26" width="14" height="14" rx="4" fill="#EAB308" />
    <rect x="26" y="26" width="14" height="14" rx="4" fill="#3B82F6" />
    {/* Center Dice Diamond */}
    <path d="M24 18L30 24L24 30L18 24L24 18Z" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="2" fill="#EF4444" />
  </svg>
);

export const UnoGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    {/* Back Card Red */}
    <rect x="8" y="10" width="22" height="30" rx="4" transform="rotate(-12 8 10)" fill="#DC2626" stroke="#FEF2F2" strokeWidth="1.5" />
    {/* Front Card Yellow/Wild */}
    <rect x="18" y="8" width="22" height="30" rx="4" transform="rotate(8 18 8)" fill="#EAB308" stroke="#FEF2F2" strokeWidth="1.5" />
    {/* Center Wild Oval */}
    <ellipse cx="28" cy="23" rx="7" ry="9" fill="#0F172A" transform="rotate(8 28 23)" />
    <text x="25" y="27" fill="#FEF08A" fontSize="11" fontWeight="900" transform="rotate(8 28 23)">1</text>
  </svg>
);

export const RummyGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    {/* Spade Card */}
    <rect x="6" y="8" width="20" height="30" rx="4" fill="#F8FAFC" stroke="#334155" strokeWidth="1.5" />
    <path d="M16 18C14 21 12 23 12 25C12 27 14 28 16 28C18 28 20 27 20 25C20 23 18 21 16 18ZM16 28V31H15V28H16Z" fill="#0F172A" />
    {/* Heart Card */}
    <rect x="22" y="10" width="20" height="30" rx="4" fill="#F8FAFC" stroke="#334155" strokeWidth="1.5" />
    <path d="M32 20C30 17 26 19 26 23C26 27 32 31 32 31C32 31 38 27 38 23C38 19 34 17 32 20Z" fill="#DC2626" />
  </svg>
);

export const HandCricketGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#064E3B" stroke="#047857" strokeWidth="2" />
    {/* Cricket Bat */}
    <path d="M14 34L28 20L32 24L18 38L14 34Z" fill="#B45309" stroke="#FDE68A" strokeWidth="1.5" />
    <path d="M28 20L34 14L37 17L31 23L28 20Z" fill="#F59E0B" />
    {/* Red Leather Ball */}
    <circle cx="33" cy="33" r="6" fill="#DC2626" stroke="#FEF2F2" strokeWidth="1.5" />
    <path d="M30 30C33 33 33 33 36 36" stroke="#FEF2F2" strokeWidth="1" strokeDasharray="1 1" />
  </svg>
);

export const ChessGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#18181B" stroke="#3F3F46" strokeWidth="2" />
    {/* Knight piece silhouette */}
    <path
      d="M16 38H32V34C32 34 30 32 28 32C28 28 32 24 32 18C32 14 29 11 25 10C22 10 20 12 19 14L15 17C14 18 14 21 16 22L20 22C18 25 15 28 15 34V38H16Z"
      fill="#F43F5E"
      stroke="#FFE4E6"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="26" cy="15" r="1.5" fill="#FFE4E6" />
  </svg>
);

export const CarromGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="4" width="40" height="40" rx="6" fill="#78350F" stroke="#D97706" strokeWidth="2" />
    <rect x="8" y="8" width="32" height="32" rx="3" fill="#FDE68A" />
    {/* Center Red Queen */}
    <circle cx="24" cy="24" r="5" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="2" fill="#FEF08A" />
    {/* 4 Corner Pockets */}
    <circle cx="11" cy="11" r="2.5" fill="#1E293B" />
    <circle cx="37" cy="11" r="2.5" fill="#1E293B" />
    <circle cx="11" cy="37" r="2.5" fill="#1E293B" />
    <circle cx="37" cy="37" r="2.5" fill="#1E293B" />
  </svg>
);

export const SnakeGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#022C22" stroke="#059669" strokeWidth="2" />
    {/* Pixel snake segments */}
    <rect x="10" y="28" width="6" height="6" fill="#34D399" />
    <rect x="16" y="28" width="6" height="6" fill="#34D399" />
    <rect x="22" y="28" width="6" height="6" fill="#34D399" />
    <rect x="22" y="22" width="6" height="6" fill="#34D399" />
    <rect x="22" y="16" width="6" height="6" fill="#34D399" />
    <rect x="28" y="16" width="6" height="6" fill="#10B981" stroke="#ECFDF5" strokeWidth="1" />
    {/* Apple target */}
    <circle cx="37" cy="20" r="3.5" fill="#F43F5E" />
  </svg>
);

export const SpacewarGameIcon: React.FC<GameIconProps> = ({ size = 28, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#09090B" stroke="#38BDF8" strokeWidth="2" />
    {/* Spaceship */}
    <path d="M24 10L32 32L24 28L16 32L24 10Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1.5" />
    <circle cx="24" cy="22" r="2" fill="#F43F5E" />
    {/* Thruster flame */}
    <path d="M22 30L24 36L26 30" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GameCategoryIcon: React.FC<{ game: GameKind | string; size?: number | string; className?: string }> = ({
  game,
  size = 28,
  className = "",
}) => {
  const norm = game.toLowerCase();
  switch (norm) {
    case "ludo":
      return <LudoGameIcon size={size} className={className} />;
    case "uno":
      return <UnoGameIcon size={size} className={className} />;
    case "rummy":
      return <RummyGameIcon size={size} className={className} />;
    case "handcricket":
      return <HandCricketGameIcon size={size} className={className} />;
    case "chess":
      return <ChessGameIcon size={size} className={className} />;
    case "carrom":
      return <CarromGameIcon size={size} className={className} />;
    case "snake":
    case "nokiasnake":
      return <SnakeGameIcon size={size} className={className} />;
    case "spacewar":
      return <SpacewarGameIcon size={size} className={className} />;
    default:
      return <LudoGameIcon size={size} className={className} />;
  }
};
