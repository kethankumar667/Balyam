import { useId, useState } from "react";
import { Link } from "react-router-dom";
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

/**
 * Form parts shared by every auth screen.
 *
 * They inherit the field pattern already used by JoinRoomModal — tracked
 * uppercase label, 2px-bordered cream input, message directly under the
 * control — so signing in feels like the same product as joining a room,
 * rather than a bolted-on account system.
 */

/* ────────────────────────── Field ────────────────────────── */

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
          className="block text-[11px] uppercase tracking-widest font-bold text-[var(--auth-ink-soft)]"
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
          className="flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug text-[var(--auth-field-error)]"
        >
          <AlertIcon className="w-[15px] h-[15px] mt-px flex-shrink-0" />
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="text-[12.5px] leading-snug text-[var(--auth-ink-mute)]">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input skin, so error and rest states stay identical everywhere. */
export function inputClass(hasError: boolean, extra = ""): string {
  return [
    "w-full min-h-[48px] px-3.5 rounded-xl bg-[var(--auth-field)] border-2 font-semibold",
    "text-[15px] text-[var(--auth-ink)] placeholder:font-medium placeholder:text-[var(--auth-ink-mute)]",
    "focus:outline-none focus:ring-2 transition-[border-color,box-shadow] duration-200",
    hasError
      ? "border-[#C6342B]/70 focus:border-[#C6342B] focus:ring-[#C6342B]/25"
      : "border-[var(--auth-field-edge)] focus:border-bhalyam-gold-dark focus:ring-bhalyam-gold/40",
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

/**
 * Password box with a reveal toggle.
 *
 * Typing a password blind on a phone keyboard is where most sign-in attempts
 * actually fail, and "show password" fixes more lockouts than any error copy.
 * The toggle is a real button: reachable by keyboard, and it announces which
 * state it will move to rather than which state it is in.
 */
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
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg
                   inline-flex items-center justify-center text-[var(--auth-ink-mute)]
                   hover:text-[var(--auth-ink)] hover:bg-[var(--auth-rule)]/50
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
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
            style={{ backgroundColor: i < score ? STRENGTH_FILL[label] : "var(--auth-rule)" }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--auth-ink-mute)]" aria-live="polite">
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
    <button
      type="submit"
      disabled={inert}
      aria-busy={loading || undefined}
      className={`w-full min-h-[52px] px-6 rounded-full inline-flex items-center justify-center gap-2.5
                  font-extrabold text-[16px] border transition-[filter,box-shadow,opacity] duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                  focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                  ${
                    inert
                      ? "bg-[var(--auth-rule)] border-[var(--auth-field-edge)] text-[var(--auth-ink-soft)] cursor-not-allowed"
                      : "bhalyam-gold-leaf bhalyam-cta-shine border-bhalyam-gold-dark text-bhalyam-wood-dark cursor-pointer hover:brightness-[1.04] shadow-[0_8px_18px_-4px_rgba(228,177,40,0.65)]"
                  }`}
    >
      {loading ? (
        <>
          <SpinnerIcon className="w-5 h-5 auth-spin" />
          <span>{loadingLabel ?? "Working…"}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Google sign-in.
 *
 * Deliberately not gold: a provider button that wears the house CTA styling
 * reads as "our button" and hides whose account you are about to hand over.
 * White with the real mark is the convention because it is legible, and here
 * it also keeps a single gold primary on the screen.
 */
export function GoogleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[52px] px-6 rounded-full inline-flex items-center justify-center gap-3
                 bg-white border border-[#DCCDB4] text-[#2A221B] font-bold text-[15px] cursor-pointer
                 hover:bg-[#FDFAF3] active:scale-[0.99]
                 shadow-[0_2px_6px_-2px_rgba(74,44,18,0.18)]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                 transition-[background-color,transform] duration-200"
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
      className="w-full min-h-[48px] px-6 rounded-full inline-flex items-center justify-center gap-2.5
                 bg-transparent border border-[var(--auth-field-edge)] text-[var(--auth-ink-soft)] font-bold text-[15px]
                 hover:bg-[var(--auth-field)] hover:text-[var(--auth-ink)] active:scale-[0.99]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                 transition-[background-color,color,transform] duration-200"
    >
      <DiceIcon className="w-[18px] h-[18px]" />
      {label}
    </Link>
  );
}

/* ──────────────────────── Messages ──────────────────────── */

export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden>
      <span className="h-px flex-1 bg-[var(--auth-rule)]" />
      <span className="text-[11px] uppercase tracking-widest font-bold text-[var(--auth-ink-mute)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--auth-rule)]" />
    </div>
  );
}

export type NoticeTone = "info" | "success" | "error";

const NOTICE_SKIN: Record<NoticeTone, { bg: string; border: string; ink: string }> = {
  info: { bg: "var(--auth-note-bg)", border: "var(--auth-note-edge)", ink: "var(--auth-note-ink)" },
  success: { bg: "var(--auth-ok-bg)", border: "var(--auth-ok-edge)", ink: "var(--auth-ok-ink)" },
  error: { bg: "var(--auth-bad-bg)", border: "var(--auth-bad-edge)", ink: "var(--auth-bad-ink)" },
};

/**
 * Form-level message. Announced politely so a screen reader hears the outcome
 * of a submit it did not visually observe.
 */
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
      className="flex items-start gap-2.5 rounded-xl border p-3"
      style={{ backgroundColor: skin.bg, borderColor: skin.border, color: skin.ink }}
    >
      <Icon className="w-[18px] h-[18px] mt-px flex-shrink-0" />
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="font-bold">{title}</p>
        {children ? <div className="mt-0.5 opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}

/** Bottom-of-card switch between login and sign-up. */
export function AuthSwitch({ prompt, to, cta }: { prompt: string; to: string; cta: string }) {
  return (
    <p className="text-[14px] text-[var(--auth-ink-soft)]">
      {prompt}{" "}
      <Link
        to={to}
        className="font-extrabold text-[#8A5A11] underline decoration-[#D9BE7A] underline-offset-4
                   hover:text-[#5E3C08] hover:decoration-[#8A5A11]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                   rounded-sm transition-colors duration-150"
      >
        {cta}
      </Link>
    </p>
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
