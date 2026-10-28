import type { ChipTone } from "./referralCopy";

/** Text is always present, so colour is never the only signal. */
const TONE: Record<ChipTone, string> = {
  success: "border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  info: "border-sky-500/40 bg-sky-500/12 text-sky-800 dark:text-sky-300",
  warn: "border-amber-500/50 bg-amber-500/14 text-amber-900 dark:text-amber-300",
  muted: "border-[var(--auth-field-edge)] bg-[var(--auth-field)] text-[var(--auth-ink-soft)]",
};

interface ReferralChipProps {
  tone: ChipTone;
  /** Who the line is about, read before the label ("Your bonus", "Their bonus"). */
  prefix?: string;
  label: string;
}

export function ReferralChip({ tone, prefix, label }: ReferralChipProps) {
  return (
    <span className={`inline-flex min-h-[28px] max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-snug ${TONE[tone]}`}>
      {prefix && <span className="font-bold uppercase tracking-wide opacity-80">{prefix}</span>}
      <span className="min-w-0">{label}</span>
    </span>
  );
}
