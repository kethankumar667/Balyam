import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Zap, Gamepad2 } from "lucide-react";
import {
  AlertIcon,
  CheckCircleIcon,
  DiceIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleMark,
  SpinnerIcon,
} from "./authIcons";
import { scorePassword, type StrengthLabel } from "../../lib/authValidation";
import { Button } from "../../design-system/dls/Buttons";

/**
 * Form parts shared by every auth screen.
 *
 * They inherit the field pattern already used by JoinRoomModal — tracked
 * uppercase label, 2px-bordered cream input, message directly under the
 * control — so signing in feels like the same product as joining a room,
 * rather than a bolted-on account system.
 *//* ──────────────────────── Field ──────────────────────── */

export interface AuthFieldProps {
  id: string;
  label: string;
  error?: string | null;
  /** Shown only when there is no error, so the two never fight for the slot. */
  help?: string;
  children: (aria: { "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
  /** Right-aligned affordance on the label row, e.g. "Forgot?". */
  action?: React.ReactNode;
}

export function AuthField({ id, label, error, help, children, action }: AuthFieldProps) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = error ? errorId : help ? helpId : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="block text-[12px] uppercase tracking-widest font-extrabold text-[#5C3717]"
        >
          {label}
        </label>
        {action}
      </div>

      {children({
        ...(error ? { "aria-invalid": true as const } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-[13px] font-semibold leading-snug text-[var(--auth-field-error)]"
        >
          <AlertIcon className="w-[15px] h-[15px] mt-px flex-shrink-0" />
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="text-[13px] leading-snug text-[#7A5B3E]">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input skin, so error and rest states stay identical everywhere. */
export function inputClass(hasError: boolean, extra = ""): string {
  return [
    "w-full min-h-[52px] px-4 rounded-xl bg-white border-2 font-semibold",
    "text-base text-[#4A2508] placeholder:font-medium placeholder:text-[#9C826B]",
    "focus:outline-none focus:ring-2 transition-[border-color,box-shadow] duration-200",
    hasError
      ? "border-[#C6342B]/70 focus:border-[#C6342B] focus:ring-[#C6342B]/25"
      : "border-[#E6D4B5] focus:border-[#E85D04] focus:ring-[#E85D04]/30",
    extra,
  ].join(" ");
}

/* ──────────────────────── Password ──────────────────────── */

export interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  hasError: boolean;
  placeholder?: string;
  autoComplete: "current-password" | "new-password";
  aria: { "aria-invalid"?: true; "aria-describedby"?: string };
}

export function PasswordInput({
  id,
  value,
  onChange,
  hasError,
  placeholder,
  autoComplete,
  aria,
}: PasswordInputProps) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass(hasError, "pr-[52px]")}
        {...aria}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg
                   inline-flex items-center justify-center text-[#7A5B3E]
                   hover:text-[#4A2508] hover:bg-[#FAF3E0]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/70
                   transition-colors duration-150"
      >
        {shown ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}

const STRENGTH_FILL: Record<StrengthLabel, string> = {
  weak: "#C6342B",
  fair: "#C97A17",
  good: "#8A8A1C",
  strong: "#2E7D32",
};

/** Advice, not a gate — see scorePassword. Hidden until there is input. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, hint } = scorePassword(password);
  if (!password) return null;

  return (
    <div className="pt-0.5">
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-[background-color] duration-300"
            style={{ backgroundColor: i < score ? STRENGTH_FILL[label] : "#E6D4B5" }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-[#7A5B3E]" aria-live="polite">
        <span className="font-bold capitalize" style={{ color: STRENGTH_FILL[label] }}>
          {label}
        </span>
        {hint ? <span> — {hint}</span> : null}
      </p>
    </div>
  );
}

/* ──────────────────────── Buttons ──────────────────────── */

export interface SubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}

export function SubmitButton({ children, loading, loadingLabel, disabled }: SubmitButtonProps) {
  const inert = loading || disabled;
  return (
    <Button
      type="submit"
      variant="auth"
      size="lg"
      disabled={inert}
      aria-busy={loading || undefined}
      className="w-full text-[17px] tracking-wide focus-visible:ring-[#E85D04]/70 focus-visible:ring-offset-2"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2.5">
          <SpinnerIcon className="w-5 h-5 auth-spin" />
          <span>{loadingLabel ?? "Working…"}</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Google sign-in.
 */
export function GoogleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[54px] px-6 rounded-2xl inline-flex items-center justify-center gap-3
                 bg-white border-2 border-[#E6D4B5] text-[#4A2508] font-extrabold text-base cursor-pointer
                 hover:bg-[#FAF3E0] hover:border-[#DCCDB4] active:scale-[0.99]
                 shadow-[0_2px_8px_-2px_rgba(74,37,8,0.12)]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/70
                 transition-all duration-200"
    >
      <GoogleMark className="w-5 h-5 flex-shrink-0" />
      {label}
    </button>
  );
}

/** The guest route, kept as a real choice rather than a footnote. */
export function GuestButton({ label = "Continue as guest" }: { label?: string }) {
  return (
    <Link
      to="/"
      className="w-full min-h-[50px] px-6 rounded-2xl inline-flex items-center justify-center gap-2.5
                 bg-transparent border-2 border-[#E6D4B5] text-[#5C3717] font-extrabold text-[15px]
                 hover:bg-[#FAF3E0] hover:text-[#4A2508] active:scale-[0.99]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/70
                 transition-all duration-200"
    >
      <DiceIcon className="w-[19px] h-[19px]" />
      {label}
    </Link>
  );
}

/* ──────────────────────── Messages ──────────────────────── */

export function OrDivider({ label = "or sign in with email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5" aria-hidden>
      <span className="h-px flex-1 bg-[#E6D4B5]" />
      <span className="text-xs uppercase tracking-widest font-extrabold text-[#7A5B3E]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#E6D4B5]" />
    </div>
  );
}

export type NoticeTone = "info" | "success" | "error";

const NOTICE_SKIN: Record<NoticeTone, { bg: string; border: string; ink: string }> = {
  info: { bg: "#FFF0D6", border: "#FCDDB5", ink: "#4A2508" },
  success: { bg: "#E6F4EA", border: "#A7F3D0", ink: "#137333" },
  error: { bg: "#FCE8E6", border: "#F87171", ink: "#C6342B" },
};

export function FormNotice({
  tone = "info",
  title,
  children,
}: {
  tone?: NoticeTone;
  title: string;
  children?: React.ReactNode;
}) {
  const skin = NOTICE_SKIN[tone];
  const Icon = tone === "success" ? CheckCircleIcon : AlertIcon;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-2xl border-2 p-3.5 shadow-2xs"
      style={{ backgroundColor: skin.bg, borderColor: skin.border, color: skin.ink }}
    >
      <Icon className="w-[19px] h-[19px] mt-px flex-shrink-0" />
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="font-extrabold">{title}</p>
        {children ? <div className="mt-0.5 opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}

/** Bottom-of-card switch between login and sign-up. */
export function AuthSwitch({ prompt, to, cta }: { prompt: string; to: string; cta: string }) {
  return (
    <div className="space-y-3 pt-1">
      <p className="text-[15px] text-[#7A5B3E] font-medium text-center">
        {prompt}{" "}
        <Link
          to={to}
          className="font-extrabold text-[#E85D04] underline decoration-[#E85D04]/50 underline-offset-4
                     hover:text-[#D97706] hover:decoration-[#D97706]
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/70
                     rounded-sm transition-colors duration-150"
        >
          {cta}
        </Link>
      </p>

      {/* Trust & Benefits Footer Row */}
      <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-[#7A5B3E] pt-2 border-t border-[#F2E3C6]">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-700" aria-hidden />
          <span>Secure</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20" aria-hidden />
          <span>Instant Setup</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden />
          <span>Free Forever</span>
        </span>
      </div>
    </div>
  );
}

/** Stable ids for a form's fields without hand-managed strings. */
export function useFieldIds<T extends string>(names: readonly T[]): Record<T, string> {
  const base = useId();
  return names.reduce(
    (acc, n) => ({ ...acc, [n]: `${base}-${n}` }),
    {} as Record<T, string>,
  );
}
