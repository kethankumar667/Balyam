import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { RuledPaper } from "./RuledPaper";

/**
 * The primary warm-cream notebook page. Rounded, soft-shadowed, optionally
 * ruled, with an optional spiral-binding accent down the left edge. The main
 * content surface most screens sit on.
 */
export interface NotebookSurfaceProps {
  children: ReactNode;
  className?: string;
  /** Show faint ruled lines behind the content. */
  ruled?: boolean;
  /** Show the spiral binding rings on the left edge. */
  withSpiral?: boolean;
}

export function NotebookSurface({ children, className, ruled = true, withSpiral = false }: NotebookSurfaceProps) {
  return (
    <div
      className={cn(
        "bhalyam-paper relative rounded-3xl border border-[#D9BE82] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)]",
        withSpiral && "pl-6",
        className,
      )}
    >
      {ruled && <RuledPaper />}
      {withSpiral && (
        <div aria-hidden className="pointer-events-none absolute left-1.5 top-4 bottom-4 flex flex-col justify-between">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="block h-2.5 w-2.5 rounded-full border-2 border-[#9A6E1A]/60 bg-[#F7E8C4]" />
          ))}
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
