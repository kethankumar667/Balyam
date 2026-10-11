import { useId } from "react";
import type { CoinFace, CoinPattern } from "../../lib/carromCoinSetStyles";

/**
 * The decoration a coin set paints on top of the board's usual coin, and a standalone coin for
 * the shop.
 *
 * `CarromCoinPattern` draws only the extra marks, as plain SVG shapes in the board's own
 * coordinate space, so the live board can lay it over the discs it already draws without
 * changing how coins move or collide. A "plain" pattern draws nothing at all.
 *
 * Everything is a handful of cheap primitives. A board can have nineteen coins on it and is
 * redrawn many times a second while they slide, so a pattern that needed a filter or a clip
 * path per coin would be the wrong trade for a cosmetic.
 */

interface CoinPatternProps {
  pattern: CoinPattern;
  cx: number;
  cy: number;
  /** Coin radius in the same units as `cx` / `cy`. */
  r: number;
  /** The mark colour, normally the side's own rim colour. */
  color: string;
}

const TAU = Math.PI * 2;

function around(count: number, radius: number, cx: number, cy: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (TAU / count) * i - Math.PI / 2;
    return { angle, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, degrees: (angle * 180) / Math.PI };
  });
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (TAU / 10) * i - Math.PI / 2;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(" ");
}

export function CarromCoinPattern({ pattern, cx, cy, r, color }: CoinPatternProps) {
  switch (pattern) {
    case "plain":
      return null;

    case "rings":
      return (
        <g fill="none" stroke={color} opacity={0.55}>
          <circle cx={cx} cy={cy} r={r * 0.6} strokeWidth={r * 0.06} />
          <circle cx={cx} cy={cy} r={r * 0.34} strokeWidth={r * 0.05} />
        </g>
      );

    case "band":
      return <circle cx={cx} cy={cy} r={r * 0.58} fill="none" stroke={color} strokeWidth={r * 0.14} opacity={0.6} />;

    case "spokes":
      return (
        <g stroke={color} strokeWidth={r * 0.07} strokeLinecap="round" opacity={0.6}>
          {around(8, 1, cx, cy).map((spoke) => (
            <line
              key={spoke.degrees}
              x1={cx + Math.cos(spoke.angle) * r * 0.3}
              y1={cy + Math.sin(spoke.angle) * r * 0.3}
              x2={cx + Math.cos(spoke.angle) * r * 0.78}
              y2={cy + Math.sin(spoke.angle) * r * 0.78}
            />
          ))}
        </g>
      );

    case "dots":
      return (
        <g fill={color} opacity={0.75}>
          {around(8, r * 0.6, cx, cy).map((dot) => (
            <circle key={dot.degrees} cx={dot.x} cy={dot.y} r={r * 0.075} />
          ))}
        </g>
      );

    case "star":
      return <polygon points={starPoints(cx, cy, r * 0.42, r * 0.18)} fill={color} opacity={0.8} />;

    case "petals":
      return (
        <g fill={color} opacity={0.5}>
          {around(8, r * 0.52, cx, cy).map((petal) => (
            <ellipse
              key={petal.degrees}
              cx={petal.x}
              cy={petal.y}
              rx={r * 0.2}
              ry={r * 0.08}
              transform={`rotate(${petal.degrees} ${petal.x} ${petal.y})`}
            />
          ))}
        </g>
      );

    case "teeth":
      return (
        <g fill={color} opacity={0.65}>
          {around(10, r * 0.6, cx, cy).map((tooth) => (
            <polygon
              key={tooth.degrees}
              points={`0,${-r * 0.12} ${r * 0.09},${r * 0.08} ${-r * 0.09},${r * 0.08}`}
              transform={`translate(${tooth.x} ${tooth.y}) rotate(${tooth.degrees + 90})`}
            />
          ))}
        </g>
      );

    case "checks":
      return (
        <g fill={color} opacity={0.55}>
          {around(8, r * 0.58, cx, cy)
            .filter((_, index) => index % 2 === 0)
            .map((check) => (
              <rect
                key={check.degrees}
                x={-r * 0.09}
                y={-r * 0.09}
                width={r * 0.18}
                height={r * 0.18}
                transform={`translate(${check.x} ${check.y}) rotate(${check.degrees + 45})`}
              />
            ))}
        </g>
      );

    case "sparkles":
      return (
        <g fill={color} opacity={0.8}>
          {[
            [0.0, -0.46, 0.1],
            [0.42, 0.18, 0.08],
            [-0.4, 0.26, 0.09],
            [0.2, 0.46, 0.05],
            [-0.22, -0.2, 0.05],
          ].map(([dx, dy, size]) => (
            <polygon
              key={`${dx}:${dy}`}
              points={starPoints(cx + dx * r, cy + dy * r, size * r * 1.6, size * r * 0.6)}
            />
          ))}
        </g>
      );
  }
}

interface CarromCoinDiscProps {
  face: CoinFace;
  pattern: CoinPattern;
  /** Rendered width and height in pixels. */
  size: number;
  /** A queen carries a gold medallion in the middle, like on the board. */
  isQueen?: boolean;
}

/**
 * One coin, drawn the way the board draws it, for the shop's cards and previews. It is
 * decorative; the card around it carries the item's name for screen readers.
 */
export function CarromCoinDisc({ face, pattern, size, isQueen = false }: CarromCoinDiscProps) {
  const gradientId = `coin${useId().replace(/:/g, "")}`;
  const centre = 50;
  const radius = 46;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden focusable="false" className="block flex-shrink-0">
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="32%" r="68%">
          <stop offset="0%" stopColor={face.highlight} />
          <stop offset="65%" stopColor={face.body} />
          <stop offset="100%" stopColor={face.shade} />
        </radialGradient>
      </defs>
      <circle cx={centre} cy={centre + 2} r={radius} fill="#150B05" opacity={0.45} />
      <circle cx={centre} cy={centre} r={radius} fill={`url(#${gradientId})`} stroke={face.rim} strokeWidth={3} />
      <circle cx={centre} cy={centre} r={radius * 0.92} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
      <circle cx={centre} cy={centre} r={radius * 0.72} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
      <circle cx={centre} cy={centre} r={radius * 0.46} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
      <CarromCoinPattern pattern={pattern} cx={centre} cy={centre} r={radius} color={face.rim} />
      <ellipse
        cx={centre - radius * 0.28}
        cy={centre - radius * 0.34}
        rx={radius * 0.34}
        ry={radius * 0.2}
        fill="#FFFFFF"
        opacity={0.5}
        transform={`rotate(-32 ${centre - radius * 0.28} ${centre - radius * 0.34})`}
      />
      {isQueen && (
        <g>
          <circle cx={centre} cy={centre} r={radius * 0.28} fill="#F59E0B" />
          <circle cx={centre} cy={centre} r={radius * 0.16} fill="#FEF08A" />
        </g>
      )}
    </svg>
  );
}
