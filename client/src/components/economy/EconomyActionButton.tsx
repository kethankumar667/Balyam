import React from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";

export type EconomyActionButtonState = "idle" | "loading" | "disabled" | "success" | "error";

export interface EconomyActionButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  /**
   * Explicit UI presentation state:
   * "idle" | "loading" | "disabled" | "success" | "error"
   * (Uses pure UI semantics rather than backend semantics like "confirmed").
   */
  state?: EconomyActionButtonState;
  /** Legacy/Convenience aliases mapped directly to UI presentation state */
  isLoading?: boolean;
  isConfirmed?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
  id?: string;
}

/**
 * Tactile Economy Action Button.
 * Enforces 44px+ touch ergonomics, manages UI presentation states
 * (idle, loading, disabled, success, error), and maintains WCAG 2.1 AA focus rings.
 */
export const EconomyActionButton: React.FC<EconomyActionButtonProps> = ({
  variant = "primary",
  size = "md",
  state,
  isLoading = false,
  isConfirmed = false,
  disabled = false,
  onClick,
  children,
  className = "",
  type = "button",
  ariaLabel,
  id,
}) => {
  // Resolve effective UI state
  let resolvedState: EconomyActionButtonState = state || "idle";
  if (!state) {
    if (isLoading) resolvedState = "loading";
    else if (isConfirmed) resolvedState = "success";
    else if (disabled) resolvedState = "disabled";
  }

  const isInteractiveDisabled =
    resolvedState === "disabled" || resolvedState === "loading" || resolvedState === "success";

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-md shadow-amber-900/20 border border-amber-400/40 active:translate-y-0.5",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 active:translate-y-0.5",
    ghost:
      "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-ink-hi dark:text-text-hi border border-transparent active:scale-[0.98]",
    danger:
      "bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/20 border border-red-400/30 active:translate-y-0.5",
  }[variant];

  const sizeClasses = {
    sm: "min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg",
    md: "min-h-[44px] px-5 py-2.5 text-sm font-bold rounded-xl",
    lg: "min-h-[50px] px-6 py-3 text-base font-extrabold rounded-xl",
  }[size];

  const stateClasses = {
    idle: "",
    loading: "",
    disabled: "opacity-50 cursor-not-allowed grayscale-[30%]",
    success: "bg-emerald-600 border-emerald-400 text-white cursor-default shadow-md shadow-emerald-900/20",
    error: "bg-red-600 border-red-400 text-white shadow-md shadow-red-900/20",
  }[resolvedState];

  return (
    <button
      id={id}
      type={type}
      onClick={resolvedState === "idle" || resolvedState === "error" ? onClick : undefined}
      disabled={isInteractiveDisabled}
      aria-busy={resolvedState === "loading"}
      aria-disabled={isInteractiveDisabled}
      aria-label={ariaLabel}
      className={`relative inline-flex items-center justify-center gap-2 font-sans transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
        resolvedState === "success" || resolvedState === "error" ? stateClasses : `${variantClasses} ${stateClasses}`
      } ${sizeClasses} ${className}`}
    >
      {resolvedState === "loading" && (
        <Loader2 className="w-4 h-4 animate-spin text-current flex-shrink-0" aria-hidden="true" />
      )}
      {resolvedState === "success" && (
        <Check className="w-4 h-4 text-white flex-shrink-0 animate-bounce" aria-hidden="true" />
      )}
      {resolvedState === "error" && (
        <AlertCircle className="w-4 h-4 text-white flex-shrink-0" aria-hidden="true" />
      )}
      <span className={resolvedState === "loading" ? "opacity-90" : ""}>{children}</span>
    </button>
  );
};

export default EconomyActionButton;
