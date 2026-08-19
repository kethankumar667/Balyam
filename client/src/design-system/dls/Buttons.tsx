import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tournament" | "reward" | "danger" | "ghost";
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
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
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
      case "primary":
      default:
        return "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-500/15";
    }
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-97 select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${getSizeStyles()} ${getVariantStyles()} ${className}`}
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
    </button>
  );
};

export const PrimaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="secondary" {...props} />
);

export const TournamentCTAButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="tournament" {...props} />
);

export const RewardButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="reward" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="danger" {...props} />
);
