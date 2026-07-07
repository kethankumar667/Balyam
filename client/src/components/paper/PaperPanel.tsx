import type { CSSProperties, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { RoughFrame } from "./RoughFrame";

/**
 * PaperPanel — a roughjs-bordered parchment container. The generic "sheet" that
 * frames a group of content (the whole picker, a scoreboard, a section). Set
 * `tone="legend"` for the gold-ink variant, `tone="sheet"` for the heavier
 * enclosing frame.
 */
const paperPanel = cva("relative rounded-lg", {
  variants: {
    tone: {
      default: "bg-hc-paper-l/90",
      soft: "bg-hc-paper/60",
      legend: "bg-hc-gold/[0.08]",
      sheet: "bg-transparent",
    },
    pad: {
      none: "p-0",
      sm: "p-2.5",
      md: "p-3.5",
      lg: "p-5",
    },
  },
  defaultVariants: { tone: "default", pad: "md" },
});

const STROKE: Record<string, string> = {
  default: "rgba(46,40,25,0.55)",
  soft: "rgba(46,40,25,0.45)",
  legend: "rgba(197,150,58,0.9)",
  sheet: "rgba(46,40,25,0.6)",
};

export interface PaperPanelProps extends VariantProps<typeof paperPanel> {
  children: ReactNode;
  className?: string;
  /** Heavier stroke for the outermost enclosing sheet. */
  strong?: boolean;
  /** Escape hatch for dynamic backgrounds (e.g. the ruled-paper overlay). */
  style?: CSSProperties;
}

export function PaperPanel({ children, className, tone = "default", pad, strong, style }: PaperPanelProps) {
  return (
    <div className={cn(paperPanel({ tone, pad }), className)} style={style}>
      <RoughFrame
        stroke={STROKE[tone ?? "default"]}
        strokeWidth={strong ? 2 : 1.8}
        roughness={strong ? 2 : 1.7}
        padding={strong ? 4 : 3}
      />
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}

export default PaperPanel;
