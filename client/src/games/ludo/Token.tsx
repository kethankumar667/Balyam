import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";
import type { LudoColor } from "@shared/types";

/**
 * 3D-styled "chess pawn" Ludo token rendered as inline SVG.
 * Has a domed base, a clear neck, and a rounded head — feels like a tactile playing piece.
 * Positioned absolutely by the parent via percent coords; smooth transitions on left/top.
 */
const CB_GLYPH: Record<LudoColor, string> = {
  red: "▲",
  green: "●",
  yellow: "■",
  blue: "◆",
  purple: "✦",
  cyan: "✚",
  orange: "✖",
  brown: "❖",
};

export function Token({
  color,
  left,
  top,
  size,
  movable,
  onClick,
  onMouseEnter,
  onMouseLeave,
  label,
  cbMode = false,
  golden = false,
  celebrating = false,
}: {
  color: LudoColor;
  left: number;
  top: number;
  size: number;
  movable: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  label?: string;
  cbMode?: boolean;
  golden?: boolean;
  celebrating?: boolean;
}) {
  const main = golden ? "#D4AF37" : COLOR_HEX[color];
  const dark = golden ? "#8B6914" : COLOR_HEX_DARK[color];
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={!onClick}
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -65%)",
        transition:
          "left 380ms cubic-bezier(.4,1.5,.6,1), top 380ms cubic-bezier(.4,1.5,.6,1), transform 200ms",
        cursor: onClick ? "pointer" : "default",
        background: "transparent",
        border: "none",
        padding: 0,
        zIndex: movable ? 30 : 10,
        filter: movable
          ? `drop-shadow(0 0 6px ${main}) drop-shadow(0 4px 4px rgba(0,0,0,0.5))`
          : "drop-shadow(0 3px 3px rgba(0,0,0,0.5))",
      }}
      title={label}
      aria-label={label ? `Token ${label}` : `${color} token`}
      className={`${movable ? "ludo-token-bob hover:scale-110 active:scale-95 focus-visible:scale-110" : ""} ${celebrating ? "home-arrive" : ""}`}
    >
      <svg viewBox="-50 -65 100 130" width="100%" height="100%" overflow="visible">
        {/* Movable highlight ring (expanding pulse) */}
        {movable && (
          <>
            <circle cx="0" cy="50" r="40" fill="none" stroke="white" strokeWidth="3" opacity="0.6">
              <animate attributeName="r" values="35;48;35" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="50" r="38" fill="none" stroke={main} strokeWidth="2.5" opacity="0.8" />
          </>
        )}

        {/* Base (oval) */}
        <ellipse cx="0" cy="50" rx="38" ry="12" fill={dark} />
        <ellipse cx="0" cy="48" rx="38" ry="12" fill={main} />
        <ellipse cx="0" cy="46" rx="32" ry="8" fill="url(#baseShine)" opacity="0.5" />

        {/* Body — pawn-shaped curve */}
        <path
          d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
          fill={main}
          stroke={dark}
          strokeWidth="2"
        />
        <path
          d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
          fill="url(#bodyShine)"
          opacity="0.6"
        />

        {/* Neck ring */}
        <ellipse cx="0" cy="-18" rx="20" ry="6" fill={dark} />
        <ellipse cx="0" cy="-19" rx="20" ry="6" fill={main} />

        {/* Head — domed ball */}
        <circle cx="0" cy="-36" r="20" fill={dark} />
        <circle cx="0" cy="-37" r="19" fill={main} />
        <circle cx="-6" cy="-43" r="7" fill="white" opacity="0.55" />

        {/* Number badge on chest */}
        {label && (
          <text
            x="0"
            y="12"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill="white"
            stroke={dark}
            strokeWidth="0.8"
            style={{ paintOrder: "stroke" } as React.CSSProperties}
          >
            {label}
          </text>
        )}

        {/* Color-blind glyph badge on head — supplements color with shape */}
        {cbMode && (
          <text
            x="0"
            y="-32"
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="white"
            stroke={dark}
            strokeWidth="0.6"
            style={{ paintOrder: "stroke" } as React.CSSProperties}
          >
            {CB_GLYPH[color]}
          </text>
        )}

        <defs>
          <linearGradient id="baseShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bodyShine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}
