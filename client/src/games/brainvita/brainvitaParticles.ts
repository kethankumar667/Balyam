import type { CSSProperties } from "react";
import type { ParticleKind } from "./brainvitaSkinKit";

/**
 * What a captured marble turns into. In a world of light it is sparks, in a glass one it is pixels; on the
 * sea floor it is bubbles that float up, in the garden grains of dust that settle, in the playroom confetti,
 * in the palace petals that fall. This is the pure part: given a kind, a piece's number and where it is
 * headed (in hole widths), it says what the piece looks like and how it moves. Drawing is in the jump layer.
 */

export interface ParticleLook {
  /** The shape, as the style of a box sitting at the middle of the captured marble's hole. */
  style: CSSProperties;
  /** From where it started to where it ends, in a transform the animation interpolates. */
  from: string;
  to: string;
  opacityFrom: number;
}

const percent = (value: number): string => `${value * 100}%`;

/** Where a piece is headed once gravity or buoyancy has had its say: dust and petals fall, bubbles rise. */
const pull = (kind: ParticleKind): number => {
  switch (kind) {
    case "dust":
      return 0.4;
    case "confetti":
      return 0.32;
    case "petal":
      return 0.55;
    case "bubble":
      return -0.7;
    default:
      return 0;
  }
};

/** How far across a piece travels, as a fraction of the plain scatter: bubbles drift, sparks fly. */
const reach = (kind: ParticleKind): number => (kind === "bubble" ? 0.45 : kind === "petal" || kind === "dust" ? 0.7 : 1);

export function particleLook(kind: ParticleKind, index: number, dx: number, dy: number, colors: readonly string[]): ParticleLook {
  const colour = colors[index % colors.length];
  const x = dx * reach(kind);
  const y = dy * reach(kind) + pull(kind);
  const move = `translate(${percent(x)}, ${percent(y)})`;
  switch (kind) {
    case "pixel":
      return {
        style: { width: "14%", height: "14%", background: colour, boxShadow: `0 0 8px ${colour}` },
        from: "translate(0%, 0%) rotate(0deg) scale(1)",
        to: `${move} rotate(${index % 2 === 0 ? 200 : -200}deg) scale(0.2)`,
        opacityFrom: 1,
      };
    case "dust":
      return {
        style: { width: "19%", height: "19%", borderRadius: "50%", background: colour },
        from: "translate(0%, 0%) scale(1.2)",
        to: `${move} scale(0.5)`,
        opacityFrom: 0.8,
      };
    case "bubble":
      return {
        style: { width: "26%", height: "26%", borderRadius: "50%", border: `1.5px solid ${colour}`, background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.65) 0 20%, rgba(255,255,255,0.1) 60%)" },
        from: "translate(0%, 0%) scale(0.8)",
        to: `${move} scale(1.5)`,
        opacityFrom: 0.95,
      };
    case "confetti":
      return {
        style: { width: "13%", height: "25%", borderRadius: "2px", background: colour },
        from: "translate(0%, 0%) rotate(0deg) scale(1)",
        to: `${move} rotate(${index % 2 === 0 ? 560 : -560}deg) scale(0.6)`,
        opacityFrom: 1,
      };
    case "petal":
      return {
        style: { width: "17%", height: "27%", borderRadius: "60% 40% 60% 40% / 70% 70% 30% 30%", background: colour },
        from: "translate(0%, 0%) rotate(0deg) scale(1)",
        to: `${move} rotate(${index % 2 === 0 ? 260 : -260}deg) scale(0.7)`,
        opacityFrom: 0.95,
      };
    default:
      return {
        style: { width: "15%", height: "15%", borderRadius: "50%", background: colour, boxShadow: `0 0 8px ${colour}` },
        from: "translate(0%, 0%) scale(1)",
        to: `${move} scale(0.2)`,
        opacityFrom: 0.95,
      };
  }
}
