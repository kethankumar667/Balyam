import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Red radiating pen-strokes that flank the section headings. */
function RadiatingArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width={24}
      height={18}
      viewBox="0 0 24 18"
      fill="none"
      aria-hidden
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      {([[-10, 0], [-6, -5], [-6, 5], [-12, -9], [-12, 9]] as [number, number][]).map(
        ([dx, dy], i) => (
          <line
            key={i}
            x1={24}
            y1={9}
            x2={24 + dx}
            y2={9 + dy}
            stroke="#8B1A1A"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ),
      )}
    </svg>
  );
}

/**
 * SketchHeading — Architects-Daughter marker title flanked by red radiating
 * arrows. The shared heading for every Hand Cricket sheet so they read
 * identically. `arrows={false}` drops the flourishes for inline sub-headings.
 */
export function SketchHeading({
  children,
  className,
  arrows = true,
}: {
  children: ReactNode;
  className?: string;
  arrows?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2.5 shrink-0">
      {arrows && <RadiatingArrow />}
      <h2
        className={cn(
          "m-0 text-center font-sketch font-bold uppercase tracking-[0.1em] text-hc-ink",
          "text-[clamp(15px,2vw,22px)]",
          className,
        )}
      >
        {children}
      </h2>
      {arrows && <RadiatingArrow flip />}
    </div>
  );
}

export default SketchHeading;
