import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, RefreshCw, Users } from "lucide-react";
import { REFERRAL_BONUS_COINS, REFERRAL_WINDOW_DAYS, type ReferralProgress } from "@shared/referrals";
import { SheetShell } from "./sheets/SheetShell";

const ACTION = "flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--auth-card-edge)] bg-[var(--auth-field)] px-3 text-sm font-bold text-[var(--auth-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70";

/**
 * Everything the home page's Social Quest card used to carry inline, now behind its "Invite friends" action: how
 * qualifying works, who has qualified and who is still waiting, the ways to share the invitation, and a way to refresh.
 * The card keeps the summary; this keeps the detail, so the three journey cards stay the same height.
 */
export function InviteSheet({ open, onClose, progress, onRefresh }: {
  open: boolean;
  onClose: () => void;
  progress: ReferralProgress;
  onRefresh: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => { if (!open) setFeedback(null); }, [open]);

  const link = `${window.location.origin}/invite/${progress.shareCode ?? progress.inviteCode}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Join me on BHALYAM. Accept my invitation before creating your account: ${link}`)}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(link);
      setFeedback("Invitation link copied.");
    } catch { setFeedback("Copy was blocked. Select and copy the invitation link below."); }
  }

  return (
    <SheetShell
      open={open}
      onClose={onClose}
      ariaLabel="Invite friends"
      titleLeft={<span className="flex items-center gap-2 font-display text-lg"><Users className="h-5 w-5" aria-hidden="true" />Invite friends</span>}
    >
      <p className="m-0 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
        New memories are better together. When a friend you invite plays their first match with another person, you each get {REFERRAL_BONUS_COINS.toLocaleString("en-IN")} coins. Three friends earn the Nostalgia Pack.
      </p>
      <p className="m-0 text-xs leading-relaxed text-[var(--auth-ink-mute)]">
        Each friend needs a new verified account and a completed match with another human within {REFERRAL_WINDOW_DAYS} days of accepting.
      </p>
      <p className="m-0 text-sm font-bold">{progress.qualifiedFriends} of {progress.target} friends have qualified so far.</p>
      {progress.pendingFriends > 0 && (
        <p className="m-0 text-xs text-[var(--auth-ink-soft)]">{progress.pendingFriends} accepted; waiting for qualifying play.</p>
      )}

      <div className="space-y-2">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={ACTION}>Share using WhatsApp</a>
        <button type="button" onClick={() => void copyInvite()} className={ACTION}><Copy size={14} aria-hidden="true" /> Copy invitation link</button>
        <label className="block text-[11px] text-[var(--auth-ink-mute)]">
          Your invitation link
          <input readOnly value={link} onFocus={e => e.currentTarget.select()} className="mt-1 min-h-[44px] w-full rounded-xl border border-[var(--auth-card-edge)] bg-[var(--auth-field)] px-3 text-xs text-[var(--auth-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70" />
        </label>
        {feedback && <p role="status" className="m-0 text-xs leading-relaxed text-[var(--auth-ink-soft)]">{feedback}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/referrals" onClick={onClose} className="inline-flex min-h-[44px] items-center text-sm font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70">See who joined</Link>
        <button type="button" onClick={onRefresh} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70">
          <RefreshCw size={14} aria-hidden="true" /> Refresh progress
        </button>
      </div>
    </SheetShell>
  );
}
