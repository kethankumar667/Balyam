import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * TornChip — a scrap of paper "taped" onto the page. The wobbly torn edge is a
 * background layer pushed through the `#rough-torn` feTurbulence/displacement
 * filter (mounted once by the notebook page frame) so only the paper distorts,
 * not the crisp text on top. Used for every header chip / masking-tape label.
 */
export function TornChip({
  children,
  className,
  rotate = 0,
  tint = "#FBF5E0",
  style,
}: {
  children: ReactNode;
  className?: string;
  rotate?: number;
  tint?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("relative inline-flex items-center shrink-0", className)}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
    >
      <span
        aria-hidden
        className="absolute -inset-[3px] rounded-[2px] shadow-[0_2px_6px_rgba(0,0,0,0.16)]"
        style={{ background: tint, filter: "url(#rough-torn)" }}
      />
      <span className="relative inline-flex items-center px-2.5 py-1">{children}</span>
    </div>
  );
}

/** Alias — the brief names this "TapeDecoration"; same primitive. */
export const TapeDecoration = TornChip;

export default TornChip;
