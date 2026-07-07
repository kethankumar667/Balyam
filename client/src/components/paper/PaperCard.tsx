import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { RoughFrame } from "./RoughFrame";

/**
 * PaperCard — a torn index-card tile with a hand-drawn roughjs ink border and
 * a soft paper shadow. The workhorse selectable surface across Hand Cricket
 * (country tiles, player cards). Variants control the ink colour + fill;
 * `interactive` adds the hover-lift / tap-depress micro-interaction.
 */
const paperCard = cva(
  "relative rounded-sm overflow-visible transition-shadow",
  {
    variants: {
      tone: {
        default: "bg-hc-paper-l shadow-[2px_3px_8px_rgba(74,44,18,0.14)]",
        selected:
          "bg-hc-stamp/12 border-[2.5px] border-hc-stamp shadow-[0_4px_14px_rgba(22,101,52,0.2)]",
        legend: "bg-hc-gold/10 shadow-[2px_3px_8px_rgba(74,44,18,0.14)]",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: { tone: "default", disabled: false },
  },
);

/** roughjs stroke colour per tone (canvas stroke — can't be a Tailwind class). */
const STROKE: Record<string, string> = {
  default: "rgba(46,40,25,0.72)",
  legend: "rgba(197,150,58,0.9)",
};

export interface PaperCardProps extends VariantProps<typeof paperCard> {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  ariaPressed?: boolean;
  ariaLabel?: string;
}

export function PaperCard({
  children,
  className,
  tone = "default",
  disabled = false,
  interactive = true,
  onClick,
  ariaPressed,
  ariaLabel,
}: PaperCardProps) {
  const selected = tone === "selected";
  const canInteract = interactive && !disabled;
  return (
    <motion.div
      role={onClick ? "button" : undefined}
      aria-pressed={ariaPressed}
      aria-label={ariaLabel}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        onClick && !disabled
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      whileHover={canInteract ? { y: -3, boxShadow: "3px 7px 16px rgba(74,44,18,0.2)" } : undefined}
      whileTap={canInteract ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={cn(paperCard({ tone, disabled }), onClick && !disabled && "cursor-pointer", className)}
    >
      {!selected && <RoughFrame stroke={STROKE[tone ?? "default"]} strokeWidth={2} roughness={1.8} bowing={1.1} padding={3} />}
      <div className="relative z-[1] h-full">{children}</div>
    </motion.div>
  );
}

export default PaperCard;
