import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  /** The one thing to do on a screen. Gold foil fill, dark ink. */
  primary: "bg-album-foilfill text-album-onfoil hover:brightness-105 active:brightness-95 shadow-sm",
  /** Everything else. A quiet field with hairline, so it never competes with primary. */
  quiet: "bg-album-field text-album-ink border border-album-line hover:bg-album-line/60",
  /** No fill at all; for icon buttons and tertiary links. */
  ghost: "text-album-ink2 hover:bg-album-field hover:text-album-ink",
  /** Destructive. Solid so it is never mistaken for a casual choice. */
  danger: "bg-album-danger text-white hover:brightness-110 active:brightness-95 shadow-sm",
} as const;

const SIZES = {
  md: "min-h-[44px] px-4 text-[15px]",
  lg: "min-h-[48px] px-5 text-base",
  icon: "min-h-[44px] min-w-[44px] px-0",
} as const;

export interface AlbumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  /** Drawn before the label; decorative, so the label (or aria-label) must carry the meaning. */
  icon?: ReactNode;
}

/**
 * The album's button. 44 px minimum on every size, a visible focus ring, a real
 * disabled and loading state, and labels that name the action.
 */
export const AlbumButton = forwardRef<HTMLButtonElement, AlbumButtonProps>(function AlbumButton(
  { variant = "quiet", size = "md", loading = false, icon, className = "", children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`album-focus inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,filter,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
