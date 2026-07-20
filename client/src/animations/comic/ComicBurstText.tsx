import { useEffect, useRef } from "react";
import rough from "roughjs";

/** Fixed comic-burst canvas — a jagged star behind short punch words
 *  ("BOINK!", "BAM!"), never long copy. Sized in viewBox units and
 *  scaled by the wrapping element, matching `RoughFrame.tsx`'s
 *  `rough.svg(svg)` convention exactly. */
const VIEW_W = 160;
const VIEW_H = 90;
const CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 };
const OUTER_R = 42;
const INNER_R = 23;
const STAR_POINTS = 8;

/** Alternating outer/inner vertices around the centre — the classic
 *  comic "POW" burst silhouette. Pure geometry, computed once per mount
 *  via the `seed`-keyed effect below rather than on every render. */
function starPoints(seed: number): [number, number][] {
  const pts: [number, number][] = [];
  const jitter = (i: number) => ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1) * 4 - 2;
  for (let i = 0; i < STAR_POINTS * 2; i++) {
    const r = i % 2 === 0 ? OUTER_R + jitter(i) : INNER_R + jitter(i);
    const angle = (Math.PI * i) / STAR_POINTS;
    pts.push([CENTER.x + Math.cos(angle) * r, CENTER.y + Math.sin(angle) * r]);
  }
  return pts;
}

/** Six short radiating strokes just outside the star — comic "impact
 *  lines" reinforcing the burst without needing a second shape. */
const IMPACT_LINE_ANGLES = [-70, -20, 20, 70, 110, 160] as const;

/**
 * RoughJS comic-style overlay: a hand-drawn star burst + impact lines
 * behind short punch text. The single reusable "BOINK/BAM/POW" surface
 * every future animation's comic moment composes (Skip's skid marks and
 * Forgot-UNO's speech bubble are the same `rough.svg` technique, just a
 * different shape — factor those in when those animations are built).
 *
 * Purely presentational: no motion of its own. Callers wrap it in a
 * Framer Motion `motion.div` for entrance/exit (matches the "RoughJS →
 * doodles, Framer Motion/GSAP → motion" split in the guide's library
 * table).
 */
export function ComicBurstText({
  text,
  accent = "#2B2118",
  fill = "#FFE9A8",
  seed = 7,
  className,
}: {
  text: string;
  accent?: string;
  fill?: string;
  seed?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const star = rc.polygon(starPoints(seed), {
      roughness: 2.4,
      bowing: 2,
      stroke: accent,
      strokeWidth: 2.4,
      fill,
      fillStyle: "solid",
      seed,
    });
    svg.appendChild(star);

    for (const [i, deg] of IMPACT_LINE_ANGLES.entries()) {
      const rad = (deg * Math.PI) / 180;
      const x1 = CENTER.x + Math.cos(rad) * (OUTER_R + 4);
      const y1 = CENTER.y + Math.sin(rad) * (OUTER_R + 4);
      const x2 = CENTER.x + Math.cos(rad) * (OUTER_R + 14);
      const y2 = CENTER.y + Math.sin(rad) * (OUTER_R + 14);
      const line = rc.line(x1, y1, x2, y2, {
        roughness: 1.8,
        strokeWidth: 2,
        stroke: accent,
        seed: seed + i + 1,
      });
      svg.appendChild(line);
    }
  }, [text, accent, fill, seed]);

  return (
    <div className={`relative ${className ?? ""}`} style={{ width: VIEW_W, height: VIEW_H }}>
      <svg ref={svgRef} aria-hidden style={{ position: "absolute", inset: 0, overflow: "visible" }} />
      <span
        className="absolute inset-0 flex items-center justify-center font-display uppercase tracking-wide"
        style={{ color: accent, fontSize: 22, textShadow: "1px 1px 0 rgba(255,255,255,0.6)" }}
        aria-hidden
      >
        {text}
      </span>
    </div>
  );
}

export default ComicBurstText;
