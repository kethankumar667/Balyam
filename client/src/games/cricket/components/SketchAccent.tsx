import { cn } from "../../../lib/cn";
import type { SketchName } from "../types";

/**
 * Decorative hand-drawn pencil sketches (stadium, bat, ball, stump, pencil,
 * trophy, star). Pure ornament — always aria-hidden. Rendered as light
 * currentColor strokes so callers tint them via Tailwind text utilities.
 */
export interface SketchAccentProps {
  name: SketchName;
  className?: string;
}

const PATHS: Record<SketchName, JSX.Element> = {
  stadium: (
    <>
      <path d="M4 20c0-5 4-8 12-8s12 3 12 8" />
      <path d="M4 20h24" />
      <path d="M9 20c0-3 3-5 7-5s7 2 7 5" />
      <path d="M16 12v-3" />
    </>
  ),
  bat: (
    <>
      <path d="M9 23l3 3" />
      <path d="M11 21l10-12a2 2 0 0 0-3-3L6 16z" />
    </>
  ),
  ball: (
    <>
      <circle cx="16" cy="16" r="9" />
      <path d="M11 9c3 4 3 10 0 14M21 9c-3 4-3 10 0 14" />
    </>
  ),
  stump: (
    <>
      <path d="M11 8v16M16 8v16M21 8v16" />
      <path d="M9 8h14" />
    </>
  ),
  pencil: (
    <>
      <path d="M6 26l2-6L20 8l4 4L12 24z" />
      <path d="M18 10l4 4" />
    </>
  ),
  trophy: (
    <>
      <path d="M11 7h10v5a5 5 0 0 1-10 0z" />
      <path d="M11 8H8a3 3 0 0 0 3 3M21 8h3a3 3 0 0 1-3 3" />
      <path d="M16 17v4M12 25h8M13 25l1-4h4l1 4" />
    </>
  ),
  star: (
    <>
      <path d="M16 6l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
    </>
  ),
};

export function SketchAccent({ name, className }: SketchAccentProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-8 w-8", className)}
    >
      {PATHS[name]}
    </svg>
  );
}
