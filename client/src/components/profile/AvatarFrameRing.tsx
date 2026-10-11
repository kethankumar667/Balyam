import type { CSSProperties } from "react";
import { getAvatarFrameStyle, type FrameOrnamentKind } from "../../lib/avatarFrameStyles";

/**
 * The decorative ring a player has equipped around their portrait.
 *
 * It draws nothing for "no frame" or for an id this build does not know, so a seat whose owner
 * bought a frame in a newer release still renders cleanly here. It is purely visual: it takes no
 * clicks, is hidden from screen readers, and never changes the size of the avatar it sits on, so
 * it is safe to drop into any seat without re-laying anything out.
 *
 * The ring is cut out of a gradient with a mask rather than drawn as a border, because a CSS
 * border cannot hold a gradient or a conic sweep, and the dearer frames need both.
 */

interface AvatarFrameRingProps {
  frameId?: string;
  /**
   * Multiplies the ring thickness and the ornaments, for portraits much larger than a seat. A
   * frame is tuned for a 28 to 44 pixel avatar; on a 96 pixel profile picture it would look like
   * a hairline without this.
   */
  scale?: number;
}

function ringMask(width: number): CSSProperties {
  // `width` arrives already scaled.
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${width}px), #000 calc(100% - ${width}px + 0.5px))`;
  return { WebkitMaskImage: mask, maskImage: mask };
}

const ORNAMENT_PATHS: Record<Exclude<FrameOrnamentKind, "lights" | "stars">, string> = {
  crown: "M1 9 L2 3 L5 6 L8 1 L11 6 L14 3 L15 9 Z",
  flame: "M8 0 C10 3 13 5 12 9 C11.5 11.5 9.5 13 8 13 C6.5 13 4.5 11.5 4 9 C3.5 6.5 6 5.5 6 3 C7 3.5 7.5 2 8 0 Z",
  moon: "M10 1 A7 7 0 1 0 10 13 A5.5 5.5 0 1 1 10 1 Z",
};

const STAR_PATH = "M5 0 L6.2 3.6 L10 3.8 L7 6.1 L8 10 L5 7.8 L2 10 L3 6.1 L0 3.8 L3.8 3.6 Z";

const LIGHT_COUNT = 8;
const STAR_ANGLES_DEGREES = [45, 135, 225, 315] as const;

/** A point on the circle that fills the ring's box, as a percentage pair for `left` / `top`. */
function pointOnCircle(angleDegrees: number): { left: string; top: string } {
  const radians = (angleDegrees * Math.PI) / 180;
  return { left: `${50 + 50 * Math.cos(radians)}%`, top: `${50 + 50 * Math.sin(radians)}%` };
}

function Ornament({ kind, colors, scale }: { kind: FrameOrnamentKind; colors: readonly string[]; scale: number }) {
  if (kind === "lights") {
    return (
      <>
        {Array.from({ length: LIGHT_COUNT }, (_, index) => (
          <span
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 3 * scale,
              height: 3 * scale,
              ...pointOnCircle((360 / LIGHT_COUNT) * index),
              backgroundColor: colors[index % colors.length],
              boxShadow: `0 0 3px ${colors[index % colors.length]}`,
            }}
          />
        ))}
      </>
    );
  }

  if (kind === "stars") {
    return (
      <>
        {STAR_ANGLES_DEGREES.map((angle) => (
          <svg
            key={angle}
            viewBox="0 0 10 10"
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ width: 7 * scale, height: 7 * scale, ...pointOnCircle(angle) }}
          >
            <path d={STAR_PATH} fill={colors[0]} />
          </svg>
        ))}
      </>
    );
  }

  // The remaining ornaments sit on top of the ring, centred above the portrait.
  const outline = colors[1] ?? colors[0];
  return (
    <svg
      viewBox="0 0 16 14"
      className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[78%]"
      style={{ width: 11 * scale, height: 10 * scale }}
    >
      <path d={ORNAMENT_PATHS[kind]} fill={colors[0]} stroke={outline} strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function AvatarFrameRing({ frameId, scale = 1 }: AvatarFrameRingProps) {
  const frame = getAvatarFrameStyle(frameId);
  if (!frame) return null;

  const ringWidth = frame.ringWidth * scale;
  const innerWidth = frame.innerRing ? frame.innerRing.width * scale : 0;
  const innerReach = frame.innerRing ? innerWidth + frame.innerRing.gap * scale : 0;
  const outerInset = innerReach + ringWidth;
  const motionClass =
    frame.motion === "spin"
      ? "motion-safe:animate-spin motion-safe:[animation-duration:10s]"
      : frame.motion === "pulse"
        ? "motion-safe:animate-pulse"
        : "";

  return (
    <span
      aria-hidden
      data-avatar-frame={frame.id}
      className="pointer-events-none absolute inset-0 z-10"
    >
      {frame.innerRing && (
        <span
          className="absolute rounded-full"
          style={{
            inset: `-${innerWidth}px`,
            backgroundColor: frame.innerRing.color,
            ...ringMask(innerWidth),
          }}
        />
      )}
      {/* The glow is its own layer: a mask would clip a shadow that falls outside the ring. */}
      {frame.glow && (
        <span
          className={`absolute rounded-full ${frame.motion === "pulse" ? "motion-safe:animate-pulse" : ""}`}
          style={{ inset: `-${outerInset}px`, boxShadow: frame.glow }}
        />
      )}
      <span
        className={`absolute rounded-full ${motionClass}`}
        style={{
          inset: `-${outerInset}px`,
          background: frame.ringBackground,
          ...ringMask(ringWidth),
        }}
      />
      {frame.ornament && (
        <span className="absolute rounded-full" style={{ inset: `-${outerInset}px` }}>
          <Ornament kind={frame.ornament.kind} colors={frame.ornament.colors} scale={scale} />
        </span>
      )}
    </span>
  );
}
