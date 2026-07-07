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
 */
export function RoughFrame({
  roughness = 1.7,
  stroke = "rgba(46,40,25,0.6)",
  strokeWidth = 1.8,
  bowing = 1,
  padding = 3,
  seed = 42,
}: {
  roughness?: number;
  stroke?: string;
  strokeWidth?: number;
  bowing?: number;
  padding?: number;
  seed?: number;
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
      const rect = rc.rectangle(
        padding,
        padding,
        width - padding * 2,
        height - padding * 2,
        { roughness, strokeWidth, stroke, fill: "none", bowing, seed },
      );
      svg.appendChild(rect);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [roughness, stroke, strokeWidth, bowing, padding, seed]);

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
