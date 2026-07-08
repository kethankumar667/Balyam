import { useEffect, useRef } from "react";
import rough from "roughjs";

/**
 * Overlays a roughjs hand-drawn rectangle border on its parent element.
 *
 * The parent MUST be `position: relative` (or otherwise a positioned
 * ancestor). The frame absolutely fills the parent, redraws on real size
 * changes via a ResizeObserver, and never intercepts pointer events. This is
 * the single source of the "sketchy ink border" used across every Hand Cricket
 * paper surface — cards, panels, buttons.
 *
 * `dual` — when true, draws a second lighter inner stroke for the
 * "dual-layered hand-ruled line" look (pencil under-sketch + ink over-stroke).
 */
export function RoughFrame({
  roughness = 2.2,
  stroke = "rgba(46,40,25,0.68)",
  strokeWidth = 2.2,
  bowing = 1.5,
  padding = 3,
  seed = 42,
  dual = false,
}: {
  roughness?: number;
  stroke?: string;
  strokeWidth?: number;
  bowing?: number;
  padding?: number;
  seed?: number;
  /** Draw a second, lighter inner stroke for a dual-layered hand-ruled look. */
  dual?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentElement;
    if (!parent) return;

    let lastW = 0;
    let lastH = 0;

    const draw = () => {
      const { width, height } = parent.getBoundingClientRect();
      if (!width || !height) return;
      // Skip sub-pixel churn so the sketchy seed stays stable while content
      // merely re-renders.
      if (Math.abs(width - lastW) < 1.5 && Math.abs(height - lastH) < 1.5) return;
      lastW = width;
      lastH = height;

      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const rc = rough.svg(svg);
      // Primary ink stroke — main hand-drawn outline
      const rect = rc.rectangle(
        padding,
        padding,
        width - padding * 2,
        height - padding * 2,
        { roughness, strokeWidth, stroke, fill: "none", bowing, seed },
      );
      svg.appendChild(rect);

      if (dual) {
        // Secondary inner stroke — a lighter pencil under-sketch that sits
        // inside the main ink line, creating the "two-pass hand-drawn" look
        // where the artist first sketched in pencil, then inked over it.
        const inner = rc.rectangle(
          padding + 4,
          padding + 4,
          width - (padding + 4) * 2,
          height - (padding + 4) * 2,
          {
            roughness: roughness * 0.65,
            strokeWidth: strokeWidth * 0.48,
            stroke,
            fill: "none",
            bowing: bowing * 0.6,
            seed: seed + 17,
          },
        );
        svg.appendChild(inner);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [roughness, stroke, strokeWidth, bowing, padding, seed, dual]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 0,
      }}
    />
  );
}

export default RoughFrame;
