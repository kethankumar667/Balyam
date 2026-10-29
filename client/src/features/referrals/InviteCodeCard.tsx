import { Check, Copy, Link2, MessageCircle, Share2 } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { promiseLine } from "./referralCopy";
import { useInviteActions } from "./useInviteActions";

const ACTION = "inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-auto";

interface InviteCodeCardProps {
  overview: Pick<ReferralOverview, "shareCode" | "campaign">;
}

export function InviteCodeCard({ overview }: InviteCodeCardProps) {
  const { shareCode, campaign } = overview;
  const { copied, failed, codeRef, copyCode, copyLink, share, whatsappHref } = useInviteActions(shareCode, campaign.inviteeBonus);

  return (
    <section aria-labelledby="referral-code-title" className="relative overflow-hidden rounded-3xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-5 shadow-xl sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="relative">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">Your invitation code</p>
        <h2 id="referral-code-title" className="sr-only">Share your invitation code</h2>
        <p
          ref={codeRef}
          data-testid="referral-share-code"
          className="mt-3 select-all break-all font-mono text-3xl font-black tracking-[0.08em] text-[var(--auth-ink)] sm:text-5xl"
        >
          {shareCode}
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--auth-ink-soft)]">{promiseLine(campaign)}</p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => void copyCode()}
            className={`${ACTION} border-amber-500 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 hover:from-amber-400 hover:to-amber-300`}
          >
            {copied === "code" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied === "code" ? "Code copied" : "Copy code"}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className={`${ACTION} border-[var(--auth-field-edge)] bg-[var(--auth-field)] text-[var(--auth-ink)] hover:bg-[var(--auth-card)]`}
          >
            <Share2 size={16} aria-hidden="true" /> Share
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${ACTION} border-emerald-600/50 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/20 dark:text-emerald-300`}
          >
            <MessageCircle size={16} aria-hidden="true" /> WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className={`${ACTION} border-[var(--auth-field-edge)] bg-[var(--auth-field)] text-[var(--auth-ink)] hover:bg-[var(--auth-card)]`}
          >
            {copied === "link" ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
            {copied === "link" ? "Link copied" : "Copy link"}
          </button>
        </div>

        <p role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-xs text-[var(--auth-ink-soft)]">
          {failed ? "Your browser blocked copying. The code is selected, so you can copy it by hand." : copied ? "Copied to your clipboard." : ""}
        </p>
      </div>
    </section>
  );
}
