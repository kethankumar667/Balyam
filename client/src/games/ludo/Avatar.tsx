import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";
import type { LudoColor } from "@shared/types";

/**
 * Deterministic SVG avatar built locally — no external API.
 * Generates a circular badge with the player's initials and a subtle
 * patterned background so each name produces a recognisable visual.
 */
export function Avatar({
  name,
  color,
  size = 32,
}: {
  name: string;
  color?: LudoColor;
  size?: number;
}) {
  const initials = initialsOf(name);
  const seed = hashStr(name || "?");
  const hue = color ? null : seed % 360;
  const bg = color ? COLOR_HEX[color] : `hsl(${hue}, 60%, 55%)`;
  const dark = color ? COLOR_HEX_DARK[color] : `hsl(${hue}, 60%, 30%)`;
  const pattern = seed % 4; // 0..3 — pick a small decorative ornament
  const r = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`g-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 1} fill={`url(#g-${seed})`} stroke={dark} strokeWidth="1.5" />
      {/* Decorative pattern */}
      {pattern === 0 && (
        <circle cx={r * 0.65} cy={r * 0.5} r={r * 0.18} fill="white" opacity="0.18" />
      )}
      {pattern === 1 && (
        <rect x={r * 0.55} y={r * 1.1} width={r * 0.9} height={r * 0.15} rx={r * 0.07} fill="white" opacity="0.18" />
      )}
      {pattern === 2 && (
        <polygon points={`${r},${r * 0.4} ${r * 1.3},${r} ${r},${r * 1.6} ${r * 0.7},${r}`} fill="white" opacity="0.14" />
      )}
      {pattern === 3 && (
        <g opacity="0.15">
          <circle cx={r * 0.5} cy={r * 0.5} r="2" fill="white" />
          <circle cx={r * 1.5} cy={r * 0.5} r="2" fill="white" />
          <circle cx={r * 0.5} cy={r * 1.5} r="2" fill="white" />
          <circle cx={r * 1.5} cy={r * 1.5} r="2" fill="white" />
        </g>
      )}
      <text
        x={r}
        y={r + size * 0.13}
        textAnchor="middle"
        fontSize={size * 0.42}
        fontWeight="bold"
        fill="white"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
      >
        {initials}
      </text>
    </svg>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
