import type { ElementType, ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * Clean, premium rounded card with a soft shadow on a light cream fill — the
 * default content container for the "70% modern mobile game" half of the
 * design. Polymorphic `as` so it can render a section, li, etc.
 */
export interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Slightly stronger elevation for hero cards. */
  raised?: boolean;
}

export function PremiumCard({ children, className, as, raised = false }: PremiumCardProps) {
  const Tag = as ?? "div";
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-[#E4D3AC] bg-[#FFFBF0]",
        raised ? "shadow-[0_14px_30px_-14px_rgba(0,0,0,0.45)]" : "shadow-[0_6px_16px_-10px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
