import React from "react";
import type { LudoColor } from "@shared/types";
import type { TokenSkinConfig } from "../../lib/cosmeticsResolver";
import { TokenFigurineRenderer } from "./tokens/TokenFigurineRenderer";

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
 * The token's visual definition — delegating to `TokenFigurineRenderer` for
 * next-generation 3D collectible figurines (collectible set) or the classic
 * turned pawn silhouette, topped with optional seat number badges and colorblind indicators.
 * Extracted so gameplay rendering, shop preview panels, and cosmetics thumbnails
 * render the EXACT same piece without visual drift.
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
  return (
    <svg viewBox="-50 -65 100 130" width="100%" height="100%" overflow="visible">
      {/* 3D Figurine or Classic Pawn Piece */}
      <TokenFigurineRenderer
        uid={uid}
        color={color}
        main={main}
        dark={dark}
        tokenSkin={tokenSkin}
        movable={movable}
      />

      {/* Number badge on chest / center */}
      {label && (
        <text
          x="0"
          y="12"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fill="white"
          stroke={dark}
          strokeWidth="2.5"
          style={{ fontFamily: "'Fredoka','Poppins','Nunito',sans-serif", letterSpacing: "0.01em", paintOrder: "stroke" } as React.CSSProperties}
        >
          {label}
        </text>
      )}

      {/* Color-blind glyph badge on apex — supplements color with shape */}
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
    </svg>
  );
}
