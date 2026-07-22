import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * Mobile-first page frame for every cricket screen. Renders a warm wood-desk
 * backdrop with a centered, safe-area-aware column (max 480px) and an optional
 * sticky footer slot for primary actions. Screens compose NotebookSurface /
 * PremiumCard inside this.
 */
export interface GamePageShellProps {
  children: ReactNode;
  /** Sticky bottom action area (e.g. Continue button). */
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function GamePageShell({ children, footer, className, contentClassName }: GamePageShellProps) {
  return (
    <div
      className={cn(
        "bhalyam-font min-h-dvh w-full flex flex-col items-center",
        "bg-[radial-gradient(circle_at_50%_0%,#6D4323_0%,#4A2C15_60%,#3A2210_100%)]",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-[480px] flex-1 flex flex-col px-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
          footer ? "pb-2" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          contentClassName,
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="w-full max-w-[480px] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          {footer}
        </div>
      )}
    </div>
  );
}
