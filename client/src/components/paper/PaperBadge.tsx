import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/**
 * PaperBadge — small role / status pill (BAT, WK, AR, BOWL, C, VC, ✓ stamps).
 * A single primitive so every list of players tags roles identically.
 */
const paperBadge = cva(
  "inline-flex items-center justify-center font-extrabold uppercase rounded-[3px] leading-none text-white",
  {
    variants: {
      tone: {
        batter: "bg-hc-stamp",
        keeper: "bg-hc-amber",
        allrounder: "bg-[#6d28d9]",
        bowler: "bg-hc-ink-red",
        captain: "bg-hc-gold",
        vice: "bg-hc-amber",
        neutral: "bg-hc-ink-lt",
      },
      size: {
        sm: "text-[9px] px-1.5 py-px",
        md: "text-[11px] px-1.5 py-0.5",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export interface PaperBadgeProps extends VariantProps<typeof paperBadge> {
  children: ReactNode;
  className?: string;
}

export function PaperBadge({ children, tone, size, className }: PaperBadgeProps) {
  return <span className={cn(paperBadge({ tone, size }), className)}>{children}</span>;
}

/** Role → badge tone/label maps, shared by every player list. */
export const ROLE_BADGE_TONE = {
  batter: "batter",
  keeper: "keeper",
  allrounder: "allrounder",
  bowler: "bowler",
} as const;

export const ROLE_BADGE_LABEL = {
  batter: "BAT",
  keeper: "WK",
  allrounder: "AR",
  bowler: "BOWL",
} as const;

export default PaperBadge;
