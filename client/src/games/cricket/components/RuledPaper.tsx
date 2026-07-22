import { cn } from "../../../lib/cn";

/**
 * Subtle horizontal notebook rule lines as a decorative background layer.
 * Absolutely positioned and aria-hidden — purely atmospheric, never carries
 * meaning. Drop inside a `relative` surface.
 */
export interface RuledPaperProps {
  className?: string;
  /** Gap between rule lines in pixels. */
  gap?: number;
}

export function RuledPaper({ className, gap = 28 }: RuledPaperProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 rounded-[inherit] opacity-40", className)}
      style={{
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent " + (gap - 1) + "px, rgba(109,67,35,0.16) " + (gap - 1) + "px, rgba(109,67,35,0.16) " + gap + "px)",
      }}
    />
  );
}
