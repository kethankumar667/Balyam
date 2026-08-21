import React from "react";
import { motion } from "framer-motion";
import { ctaPress, bhalyamSpring } from "../../lib/motion";

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    // framer-motion's `motion.button` redeclares these three with its own
    // (incompatible) event-handler signatures — omit rather than fight the
    // type conflict, since no caller here passes drag/animation handlers.
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
  > {
  variant?: "primary" | "secondary" | "tournament" | "reward" | "danger" | "ghost" | "chrome" | "auth";
  size?: "sm" | "md" | "lg" | "iconOnly";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Was dark-only (`stone-*`, `text-zinc-950` on `secondary`/`ghost`) and
 * under the 44px touch-target floor at every size — `sm` 36px, `md` 42px.
 * `secondary`/`ghost` now resolve through `surface-*`/`ink-*`, the tokens
 * `--surface-N` / `--text-*` already define for both themes (index.css);
 * `primary`/`tournament`/`reward`/`danger` keep their brand-gradient fills
 * and fixed dark ink, which was always correct — a gradient doesn't need a
 * theme, only text sitting on the page's own background does.
 *
 * `forwardRef` was missing too — invisible until a consumer needed the DOM
 * node for something React itself doesn't do, which is exactly what
 * `<Modal>`'s `initialFocusRef` needs from a "safe action" button like
 * "Stay Here"/"Cancel" (see `useFocusTrap`). Without it a ref passed to
 * `<Button>` silently becomes `null` — the trap still opens, it just
 * doesn't focus anything, a gap that only shows up as a keyboard-only bug.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}, ref) => {
  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "px-3.5 py-2 text-xs rounded-xl min-h-[44px]";
      case "lg":
        return "px-6 py-3.5 text-sm rounded-2xl min-h-[52px]";
      case "iconOnly":
        return "w-11 h-11 min-h-[44px] min-w-[44px] p-0 rounded-xl";
      case "md":
      default:
        return "px-4.5 py-2.5 text-xs rounded-xl min-h-[48px]";
    }
  };

  /**
   * `font-mono uppercase tracking-wider` used to be baked into every button
   * regardless of variant. Kept here, opt-in, only for the two variants that
   * are genuinely celebratory game CTAs (AGENTS.md §8 sanctions bespoke
   * in-game treatment) — `primary`/`secondary`/`ghost`/`danger` are chrome:
   * ordinary actions like "Save", "Cancel", "Sign out" read as shouting in
   * small caps, not as excitement.
   */
  const getVariantStyles = () => {
    switch (variant) {
      case "tournament":
        return "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-mono uppercase tracking-wider font-black shadow-lg shadow-amber-500/25 border border-amber-300/40";
      case "reward":
        return "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-mono uppercase tracking-wider font-black shadow-lg shadow-emerald-500/20";
      case "danger":
        return "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold shadow-lg shadow-rose-600/20";
      case "secondary":
        return "bg-surface-2 hover:bg-surface-3 text-ink-hi font-bold border border-surface-3 hover:border-ink-mute shadow-md";
      case "ghost":
        return "bg-transparent hover:bg-surface-2 text-ink-mute hover:text-ink-hi font-semibold";
      case "auth":
        /**
         * `AuthControls.tsx`'s `SubmitButton` gradient, unchanged — kept as
         * its own variant rather than folded onto `primary` because the two
         * differ on more than one CSS property (a 3-stop gradient AND white
         * text, vs `primary`'s flat fill and near-black text): only one of
         * those is safe to override via a caller's own `className` (a
         * `background-image` utility doesn't compete with `primary`'s
         * `background-color` one — different properties — but `text-white`
         * fighting `primary`'s `text-zinc-950` for the same property is
         * exactly the kind of same-specificity Tailwind-ordering gamble this
         * codebase has already been burned by once). A real, distinct look,
         * not a duplicate of `primary`.
         */
        return "bg-gradient-to-r from-[#FF8F00] via-[#E85D04] to-[#D97706] border border-[#D97706] text-white font-extrabold shadow-[0_8px_20px_-4px_rgba(232,93,4,0.45)] hover:brightness-105";
      case "chrome":
        /**
         * The header/sidebar's own `--chrome-*` tokens, not `surface-*`/`ink-*`
         * — added so migrating those two files doesn't mean forcing their
         * warm-parchment chrome bar to sit a cooler-toned icon button, which
         * would read as a mismatch rather than a consolidation. Same values
         * as the `CONTROL` constant `AppHeader.tsx` already hand-rolled.
         */
        return "bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-ink)] font-semibold border border-[var(--chrome-border)]";
      case "primary":
      default:
        return "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-500/15";
    }
  };

  const interactive = !disabled && !loading;

  return (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      variants={ctaPress}
      initial="rest"
      whileHover={interactive ? "hover" : undefined}
      whileTap={interactive ? "tap" : undefined}
      transition={bhalyamSpring}
      className={`inline-flex items-center justify-center gap-2 transition-colors duration-200 select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${getSizeStyles()} ${getVariantStyles()} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {size !== "iconOnly" && <span>{children}</span>}
          {size === "iconOnly" && <span className="sr-only">{children}</span>}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
});
Button.displayName = "Button";

export const PrimaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />,
);
PrimaryButton.displayName = "PrimaryButton";

export const SecondaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />,
);
SecondaryButton.displayName = "SecondaryButton";

export const TournamentCTAButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="tournament" {...props} />,
);
TournamentCTAButton.displayName = "TournamentCTAButton";

export const RewardButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="reward" {...props} />,
);
RewardButton.displayName = "RewardButton";

export const DangerButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="danger" {...props} />,
);
DangerButton.displayName = "DangerButton";
