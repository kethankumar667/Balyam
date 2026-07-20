import { useEffect, useRef } from "react";
import rough from "roughjs";

const VIEW_W = 140;
const VIEW_H = 70;

/** Two sweeping curved strokes, roughly parallel — the classic cartoon
 *  "someone just skidded here" mark. Points are fixed (not randomised
 *  per-render) so repeated mounts of the same component read as the
 *  same gag rather than jittering shape on every replay. */
const SKID_CURVES: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  [[8, 55], [35, 40], [60, 44], [95, 22], [130, 12]],
  [[14, 62], [40, 50], [64, 53], [98, 33], [128, 24]],
];

/**
 * RoughJS "cartoon skid marks" — the trail a slipping foot leaves behind.
 * Sibling to `ComicBurstText`, same `rough.svg` technique, different
 * shape family (sweeping curves instead of a star). Purely
 * presentational; callers wrap it in Framer Motion for entrance/exit.
 */
export function SkidMarks({
  accent = "#6D4323",
  seed = 11,
  className,
}: {
  accent?: string;
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
    for (const [i, points] of SKID_CURVES.entries()) {
      const curve = rc.curve(points as [number, number][], {
        roughness: 1.6,
        strokeWidth: i === 0 ? 4.5 : 3,
        stroke: accent,
        seed: seed + i,
      });
      curve.setAttribute("opacity", i === 0 ? "0.75" : "0.5");
      svg.appendChild(curve);
    }
  }, [accent, seed]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className={className}
      style={{ width: VIEW_W, height: VIEW_H, overflow: "visible" }}
    />
  );
}

export default SkidMarks;
