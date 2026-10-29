import { useState } from "react";
import { ArrowRight, UserRound, UsersRound } from "lucide-react";
import type { ReferralAttributionResult, ReferralOverview } from "@shared/referrals";
import { REFERRAL_REFUSAL_COPY } from "../../lib/referrals";
import { ReferralCodeField, useReferralCodeCheck } from "./ReferralCodeField";
import { ReferralChip } from "./ReferralChip";
import { PlayTogetherButton } from "./PlayTogetherButton";
import { describeBonus, formatShortDate } from "./referralCopy";

const PANEL = "rounded-3xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-5 sm:p-6";
const PRIMARY = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-5 text-xs font-black uppercase tracking-wider text-zinc-950 transition hover:from-amber-400 hover:to-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50";
const QUIET = "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)] px-4 text-xs font-bold text-[var(--auth-ink)] transition hover:bg-[var(--auth-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50";

interface ReferredBySectionProps {
  overview: Pick<ReferralOverview, "referredBy" | "canEnterCode" | "campaign"> & Partial<Pick<ReferralOverview, "serverNow">>;
  redeem: (code: string) => Promise<ReferralAttributionResult>;
  detach: () => Promise<ReferralAttributionResult>;
}

function refusalMessage(result: ReferralAttributionResult): string | null {
  return result.ok ? null : REFERRAL_REFUSAL_COPY[result.code];
}

export function ReferredBySection({ overview, redeem, detach }: ReferredBySectionProps) {
  const { referredBy, canEnterCode, campaign, serverNow = Date.now() } = overview;
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { check, code } = useReferralCodeCheck(typed);

  async function run(action: () => Promise<ReferralAttributionResult>) {
    setBusy(true);
    setProblem(null);
    try {
      const message = refusalMessage(await action());
      if (message) setProblem(message);
      else { setTyped(""); setConfirmRemove(false); }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That did not go through. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (referredBy) {
    const bonus = describeBonus(referredBy.yourBonus, campaign, serverNow);
    return (
      <section aria-labelledby="referred-by-title" className={PANEL}>
        <h2 id="referred-by-title" className="text-xs font-black uppercase tracking-[0.18em] text-[var(--auth-ink-soft)]">Invited by</h2>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300"><UserRound size={22} /></span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-[var(--auth-ink)]">{referredBy.displayName}</p>
            <p className="text-xs text-[var(--auth-ink-soft)]">
              Connected {formatShortDate(referredBy.joinedAt)} with {referredBy.via === "code" ? "a code" : "an invitation link"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
          {referredBy.status === "QUALIFIED"
            ? "You played a match with another person, so your welcome bonus is unlocked."
            : referredBy.status === "EXPIRED"
              ? "The window to play a first match together has ended, so no bonus applies to this invitation."
              : "Finish a match with another person to unlock your bonus. You keep your regular welcome coins either way."}
        </p>
        <div className="mt-3"><ReferralChip tone={bonus.tone} prefix="Your bonus" label={bonus.label} /></div>
        {referredBy.status === "JOINED" && <PlayTogetherButton friendName={referredBy.displayName} />}

        {referredBy.canDetach && (
          <div className="mt-4 border-t border-[var(--auth-field-edge)] pt-4">
            {confirmRemove ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="w-full text-xs text-[var(--auth-ink-soft)]">Remove this code? You can add a different one while you are still new.</p>
                <button type="button" disabled={busy} onClick={() => void run(detach)} className={QUIET}>Yes, remove it</button>
                <button type="button" disabled={busy} onClick={() => setConfirmRemove(false)} className={QUIET}>Keep it</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className="min-h-[44px] text-xs font-bold text-[var(--auth-ink-soft)] underline underline-offset-4 hover:text-[var(--auth-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                Wrong code? Remove
              </button>
            )}
          </div>
        )}
        {problem && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{problem}</p>}
      </section>
    );
  }

  if (!canEnterCode) return null;

  return (
    <section aria-labelledby="enter-code-title" className={PANEL}>
      <h2 id="enter-code-title" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--auth-ink-soft)]">
        <UsersRound size={15} aria-hidden="true" /> Did a friend invite you?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
        Add their code in your first {campaign.codeWindowDays} days, before you play with other people. After your first match together you each get {campaign.inviteeBonus.toLocaleString("en-IN")} coins.
      </p>
      <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); if (code) void run(() => redeem(code)); }}>
        <ReferralCodeField value={typed} onChange={setTyped} check={check} label="Your friend's code" disabled={busy} />
        <button type="submit" disabled={busy || !code || check === "invalid"} className={PRIMARY}>
          {busy ? "Adding…" : "Add code"} <ArrowRight size={15} aria-hidden="true" />
        </button>
        {problem && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">{problem}</p>}
      </form>
    </section>
  );
}
