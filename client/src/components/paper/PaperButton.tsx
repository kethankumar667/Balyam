import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { RoughFrame } from "./RoughFrame";

/**
 * PaperButton — a hand-drawn action button. The border is a roughjs sketch so
 * it reads like ink on paper rather than a CSS rectangle. Variants map to the
 * game's ink palette; `solid` fills for primary calls-to-action (bat/bowl).
 */
const paperButton = cva(
  "relative inline-flex items-center justify-center gap-1.5 rounded-sm font-sketch font-extrabold tracking-wide overflow-visible transition-[transform,background] disabled:cursor-not-allowed select-none",
  {
    variants: {
      variant: {
        confirm: "bg-hc-stamp/10 text-hc-stamp",
        ghost: "bg-hc-paper-l text-hc-ink",
        danger: "bg-hc-ink-red/10 text-hc-ink-red",
        solidGreen: "bg-hc-stamp text-white",
        solidBlue: "bg-[#1d4ed8] text-white",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3.5 text-base",
        block: "w-full py-3 text-[15px]",
      },
      muted: { true: "opacity-40", false: "" },
    },
    defaultVariants: { variant: "ghost", size: "md", muted: false },
  },
);

/** roughjs stroke per variant (solid variants use no sketch frame). */
const STROKE: Record<string, string | null> = {
  confirm: "rgba(22,101,52,0.85)",
  ghost: "rgba(46,40,25,0.6)",
  danger: "rgba(139,26,26,0.7)",
  solidGreen: "rgba(255,255,255,0.50)",
  solidBlue:  "rgba(255,255,255,0.45)",
};

export interface PaperButtonProps extends VariantProps<typeof paperButton> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  type?: "button" | "submit";
}

export function PaperButton({
  children,
  className,
  variant = "ghost",
  size = "md",
  muted = false,
  onClick,
  disabled = false,
  ariaLabel,
  type = "button",
}: PaperButtonProps) {
  const stroke = STROKE[variant ?? "ghost"];
  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(paperButton({ variant, size, muted }), className)}
    >
      {stroke && <RoughFrame stroke={stroke} strokeWidth={2.4} roughness={2.0} padding={3} bowing={1.3} />}
      <span className="relative z-[1] inline-flex items-center gap-1.5">{children}</span>
    </motion.button>
  );
}

export default PaperButton;
