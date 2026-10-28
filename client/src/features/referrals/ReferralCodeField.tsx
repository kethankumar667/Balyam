import { useEffect, useId, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { normalizeReferralCode } from "@shared/referrals";
import { checkReferralCode } from "../../lib/referrals";
import { REFERRAL_CODE_PLACEHOLDER } from "./referralShare";

const CHECK_DELAY_MS = 450;

export type CodeCheck = "empty" | "incomplete" | "checking" | "valid" | "invalid" | "unavailable";

/**
 * Checks a typed code against the server once it is complete and has stopped changing. "unavailable" means the
 * check itself failed, which is not the same as the code being wrong, so the member can still go ahead.
 */
export function useReferralCodeCheck(value: string): { check: CodeCheck; code: string | null } {
  const code = normalizeReferralCode(value);
  const [result, setResult] = useState<{ code: string; check: "valid" | "invalid" | "unavailable" } | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      checkReferralCode(code)
        .then(({ valid }) => { if (!cancelled) setResult({ code, check: valid ? "valid" : "invalid" }); })
        .catch((error: unknown) => {
          if (cancelled) return;
          // A 404 means "no such code"; anything else means the check could not be made.
          const notFound = error instanceof Error && /not found/i.test(error.message);
          setResult({ code, check: notFound ? "invalid" : "unavailable" });
        });
    }, CHECK_DELAY_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [code]);

  if (value.trim() === "") return { check: "empty", code: null };
  if (!code) return { check: "incomplete", code: null };
  if (result?.code === code) return { check: result.check, code };
  return { check: "checking", code };
}

const STATUS_COPY: Record<CodeCheck, string> = {
  empty: "",
  incomplete: "Codes look like BHALYAM-K7M2P.",
  checking: "Checking the code…",
  valid: "That code works.",
  invalid: "That code was not found. Check it and try again.",
  unavailable: "We could not check the code just now. You can still continue.",
};

interface ReferralCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  check: CodeCheck;
  label?: string;
  /** Say what the member who invited you will be able to see. On by default; it is the DPDP disclosure at the point of collection. */
  showDisclosure?: boolean;
  disabled?: boolean;
}

export function ReferralCodeField({ value, onChange, check, label = "Referral code (optional)", showDisclosure = true, disabled }: ReferralCodeFieldProps) {
  const id = useId();
  const statusId = `${id}-status`;
  const noteId = `${id}-note`;
  const bad = check === "invalid";

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-[var(--auth-ink)]">{label}</label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          disabled={disabled}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={REFERRAL_CODE_PLACEHOLDER}
          aria-invalid={bad}
          aria-describedby={`${statusId} ${showDisclosure ? noteId : ""}`.trim()}
          className={`min-h-[48px] w-full rounded-xl border bg-[var(--auth-field)] px-4 pr-11 font-mono text-sm uppercase tracking-wider text-[var(--auth-ink)] placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--auth-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${bad ? "border-rose-500" : "border-[var(--auth-field-edge)]"}`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center" aria-hidden="true">
          {check === "checking" && <Loader2 size={18} className="animate-spin text-[var(--auth-ink-soft)]" />}
          {check === "valid" && <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />}
          {bad && <CircleAlert size={18} className="text-rose-600 dark:text-rose-400" />}
        </span>
      </div>
      <p id={statusId} role="status" aria-live="polite" className={`mt-1.5 min-h-[1rem] text-xs ${bad ? "text-rose-700 dark:text-rose-300" : "text-[var(--auth-ink-soft)]"}`}>
        {STATUS_COPY[check]}
      </p>
      {showDisclosure && (
        <p id={noteId} className="mt-1 text-[11px] leading-relaxed text-[var(--auth-ink-soft)]">
          The member who shared this code will see your display name and whether you have played a match with another person. Never your email, birthday or what you played.
        </p>
      )}
    </div>
  );
}
