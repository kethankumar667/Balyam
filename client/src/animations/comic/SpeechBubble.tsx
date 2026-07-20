import { useEffect, useRef } from "react";
import rough from "roughjs";

const VIEW_W = 150;
const VIEW_H = 80;
/** Rounded rect body + a small triangular tail pointing down-left at the
 *  speaker — the classic comic "someone just said this" shape. */
const BODY = { x: 6, y: 4, w: VIEW_W - 12, h: VIEW_H - 26, r: 14 };
const TAIL: [number, number][] = [[28, VIEW_H - 22], [16, VIEW_H - 4], [42, VIEW_H - 22]];

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M ${x + r},${y} h ${w - 2 * r} a ${r},${r} 0 0 1 ${r},${r} v ${h - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h ${
    w - 2 * r
  } a ${r},${r} 0 0 1 -${r},-${r} v -${h - 2 * r} a ${r},${r} 0 0 1 ${r},-${r} z`;
}

/**
 * RoughJS "comic speech bubble" — Forgot UNO's "GOTCHA!"/"FORGOT UNO!"
 * callout. Sibling to `ComicBurstText` (star burst) and `SkidMarks`
 * (sweeping curves), same `rough.svg` technique, a third distinct shape
 * family: a hand-drawn rounded rect + tail via `rc.path`.
 */
export function SpeechBubble({
  text,
  accent = "#2B2118",
  fill = "#FFF9F0",
  seed = 19,
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
    const body = rc.path(roundedRectPath(BODY.x, BODY.y, BODY.w, BODY.h, BODY.r), {
      roughness: 1.8,
      bowing: 1.2,
      stroke: accent,
      strokeWidth: 2.2,
      fill,
      fillStyle: "solid",
      seed,
    });
    svg.appendChild(body);

    const tail = rc.polygon(TAIL, { roughness: 1.8, stroke: accent, strokeWidth: 2, fill, fillStyle: "solid", seed: seed + 1 });
    svg.appendChild(tail);
  }, [accent, fill, seed]);

  return (
    <div className={`relative ${className ?? ""}`} style={{ width: VIEW_W, height: VIEW_H }}>
      <svg ref={svgRef} aria-hidden style={{ position: "absolute", inset: 0, overflow: "visible" }} />
      <span
        className="absolute inset-x-0 top-1 flex items-center justify-center px-2 text-center font-display uppercase leading-tight"
        style={{ color: accent, fontSize: 15, height: BODY.h }}
        aria-hidden
      >
        {text}
      </span>
    </div>
  );
}

export default SpeechBubble;
