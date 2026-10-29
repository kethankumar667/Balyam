import type { ReactNode } from "react";
import { Check, Copy, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { promiseLine } from "../referralCopy";
import { useInviteActions } from "../useInviteActions";
import { BODY, GOLD_BUTTON, HEADING, PANEL } from "./crewStyles";

const CHANNEL = "inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-300 dark:border-cyan-300/40 bg-white dark:bg-white/5 text-sky-700 dark:text-cyan-200 transition hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none";

function Channel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <span className="text-[11px] font-semibold text-slate-600 dark:text-[#b6c4d8]">{label}</span>
    </div>
  );
}

/**
 * The member's code and how to send it. Share Invite is the one primary action (the phone's share sheet, or WhatsApp
 * where there is none); the channels beneath it are the quieter ways to send the same message and link.
 */
export function CrewCodeCard({ overview }: { overview: Pick<ReferralOverview, "shareCode" | "campaign"> }) {
  const { shareCode, campaign } = overview;
  const { copied, failed, codeRef, copyCode, copyLink, share, whatsappHref, emailHref } = useInviteActions(shareCode, campaign.inviteeBonus);
  return (
    <section aria-labelledby="crew-code-title" className={PANEL}>
      <h2 id="crew-code-title" className={HEADING}>Your invitation code</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-[#ffb800]/70 bg-[#fffaf0] dark:bg-[#07111f] py-2 pl-4 pr-2 shadow-[0_0_22px_rgba(255,184,0,0.22)]">
            <p ref={codeRef} data-testid="referral-share-code" className="m-0 select-all break-all font-mono text-xl font-black tracking-[0.08em] text-slate-900 dark:text-white sm:text-2xl">
              {shareCode}
            </p>
            <button
              type="button"
              onClick={() => void copyCode()}
              aria-label="Copy invitation code"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-amber-700 dark:text-[#ffd76a] transition hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none"
            >
              {copied === "code" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            </button>
          </div>
          <p className={`m-0 mt-3 text-sm leading-relaxed ${BODY}`}>{promiseLine(campaign)}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => void share()} className={GOLD_BUTTON}>
            <Share2 size={18} aria-hidden="true" /> Share Invite
          </button>
          <div className="grid grid-cols-3 gap-2">
            <Channel label="WhatsApp">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className={CHANNEL}>
                <MessageCircle size={18} aria-hidden="true" />
              </a>
            </Channel>
            <Channel label={copied === "link" ? "Copied" : "Copy Link"}>
              <button type="button" onClick={() => void copyLink()} aria-label="Copy invitation link" className={CHANNEL}>
                {copied === "link" ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
              </button>
            </Channel>
            <Channel label="Email">
              <a href={emailHref} aria-label="Share by email" className={CHANNEL}>
                <Mail size={18} aria-hidden="true" />
              </a>
            </Channel>
          </div>
        </div>
      </div>
      {/* Announced to a screen reader either way; drawn on screen only when there is something to act on. */}
      <p role="status" aria-live="polite" className={failed ? "m-0 mt-3 text-xs text-amber-800 dark:text-amber-200" : "sr-only"}>
        {failed ? "Your browser blocked copying. The code is selected, so you can copy it by hand." : copied === "code" ? "Code copied." : copied === "link" ? "Link copied." : ""}
      </p>
    </section>
  );
}
