import type { LudoColor } from "@shared/types";
import type { TokenSkinConfig } from "../../lib/cosmeticsResolver";
import { TokenFinishOverlay } from "./TokenFinishOverlay";

/** Used by call sites that render a static pawn (previews, the picker, thumbnails). */
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

/**
 * The pawn's visual definition — base shape, seat-color paint, premium
 * finish overlay (`TokenFinishOverlay`), and the 6 legacy accessory-flag
 * skins — as one self-contained `<svg>`. Extracted out of `Token.tsx` so
 * gameplay rendering, the shop's big preview panel, and the shop's small
 * thumbnail card render the EXACT same pawn instead of three independently
 * hand-drawn copies that can silently drift apart (the same class of gap
 * already fixed this session for the dice preview and card-back
 * thumbnails).
 */
export function PawnGlyph({
  main,
  dark,
  tokenSkin,
  uid,
  movable = false,
  label,
  cbMode = false,
  color = "red",
}: {
  main: string;
  dark: string;
  tokenSkin: TokenSkinConfig;
  uid: string;
  /** Pulsing selection ring — only meaningful for a real, clickable in-game pawn. */
  movable?: boolean;
  label?: string;
  cbMode?: boolean;
  color?: LudoColor;
}) {
  // Every pawn defines its own shine gradients, so these ids MUST be unique
  // per instance — a full board renders 100+ tokens, and a shared literal id
  // would mean every `url(#…)` resolves to whichever pawn mounted first.
  // That used to render correctly only because both gradients are pure
  // white/black and carry no color; the moment a shine were made
  // seat-dependent, every pawn on the board would silently wear the first
  // pawn's colors. `uid` is caller-supplied (from `useId()`) rather than
  // computed here so multiple simultaneous previews (shop thumbnail + big
  // preview panel) never collide either.
  const baseShine = `tkbase${uid}`;
  const bodyShine = `tkbody${uid}`;

  return (
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
      {tokenSkin.hasNeonRing && (
        <ellipse cx="0" cy="48" rx="44" ry="15" fill="none" stroke="#06B6D4" strokeWidth="2.5" opacity="0.8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
        </ellipse>
      )}
      {tokenSkin.hasFireball && (
        <ellipse cx="0" cy="48" rx="42" ry="16" fill="none" stroke="#F97316" strokeWidth="3" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="rx" values="40;46;40" dur="1.2s" repeatCount="indefinite" />
        </ellipse>
      )}
      {tokenSkin.hasDiamond && (
        <ellipse cx="0" cy="48" rx="40" ry="14" fill="none" stroke="#67E8F9" strokeWidth="2.5" opacity="0.7">
          <animate attributeName="opacity" values="0.35;0.95;0.35" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}
      {tokenSkin.hasPhoenixWing && (
        <ellipse cx="0" cy="48" rx="44" ry="17" fill="none" stroke="#FB923C" strokeWidth="3" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.95;0.3" dur="1s" repeatCount="indefinite" />
          <animate attributeName="rx" values="40;48;40" dur="1s" repeatCount="indefinite" />
        </ellipse>
      )}
      <ellipse cx="0" cy="50" rx="38" ry="12" fill={dark} />
      <ellipse cx="0" cy="48" rx="38" ry="12" fill={main} />
      <ellipse cx="0" cy="46" rx="32" ry="8" fill={`url(#${baseShine})`} opacity="0.5" />

      {/* Body — pawn-shaped curve */}
      <path
        d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
        fill={main}
        stroke={dark}
        strokeWidth="2"
      />
      <path
        d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
        fill={`url(#${bodyShine})`}
        opacity="0.6"
      />

      {/* Neck ring */}
      <ellipse cx="0" cy="-18" rx="20" ry="6" fill={dark} />
      <ellipse cx="0" cy="-19" rx="20" ry="6" fill={main} />

      {/* Head — domed ball */}
      <circle cx="0" cy="-36" r="20" fill={dark} />
      <circle cx="0" cy="-37" r="19" fill={main} />
      <circle cx="-6" cy="-43" r="7" fill="white" opacity="0.55" />

      {/* Premium craftsmanship finish — seat-colored, never a fixed hue */}
      <TokenFinishOverlay finish={tokenSkin.finish} main={main} dark={dark} />

      {/* Crown Accessory */}
      {tokenSkin.hasCrown && (
        <path
          d="M -14 -46 L -10 -40 L 0 -52 L 10 -40 L 14 -46 L 11 -34 L -11 -34 Z"
          fill="#F59E0B"
          stroke="#78350F"
          strokeWidth="1.5"
        />
      )}

      {/* Diamond Gem Accessory */}
      {tokenSkin.hasDiamond && (
        <path
          d="M -12 -47 L 12 -47 L 18 -41 L 0 -22 L -18 -41 Z"
          fill="#A5F3FC"
          stroke="#0E7490"
          strokeWidth="1.5"
        />
      )}

      {/* Phoenix Wing Accessory */}
      {tokenSkin.hasPhoenixWing && (
        <path
          d="M -18 -44 Q -28 -32 -15 -21 L -6 -34 Z M 18 -44 Q 28 -32 15 -21 L 6 -34 Z"
          fill="#FB923C"
          stroke="#7C2D12"
          strokeWidth="1.2"
        />
      )}

      {/* Number badge on chest */}
      {label && (
        <text
          x="0"
          y="12"
          textAnchor="middle"
          fontSize="26"
          fontWeight="900"
          fill="white"
          stroke={dark}
          strokeWidth="2.2"
          style={{ fontFamily: "'Fredoka','Poppins','Nunito',sans-serif", letterSpacing: "0.01em", paintOrder: "stroke" } as React.CSSProperties}
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
        <linearGradient id={baseShine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={bodyShine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="40%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  );
}
