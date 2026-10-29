import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Gift, Share2, X } from "lucide-react";
import type { InvitePromoOffer } from "../../store/invitePromoStore";
import { promiseLine } from "./referralCopy";
import { useInviteActions } from "./useInviteActions";
import { useInvitePromoView } from "./useInvitePromoView";

/** The compact card. The home page has its own, larger `InviteShowcase`. */
export type InvitePromoPlacement = "games" | "shop" | "wallet" | "finished";

const BUTTON = "inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 motion-reduce:transition-none";
const PRIMARY = `${BUTTON} border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 hover:brightness-105`;
const SECONDARY = `${BUTTON} border-amber-700/30 bg-white/70 text-stone-900 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15`;

/** Each place says what the offer means there. The offer itself (who, how much) never changes. */
const TITLE_BY_PLACEMENT: Record<InvitePromoPlacement, string> = {
  games: "Better with friends. Bring yours.",
  shop: "Earn coins for your next style",
  wallet: "Earn more coins with friends",
  finished: "Enjoyed that? Bring a friend to the next one.",
};

/** The wallet drawer and the after-match card are narrow whatever the screen is, so they never take the wide layout. */
const isCompactPlacement = (placement: InvitePromoPlacement): boolean => placement === "wallet" || placement === "finished";
/** In the wide layout the actions sit in their own column, beside the message. */
const actionsColumn = (isCompact: boolean): string => (isCompact ? "" : "lg:w-72 lg:shrink-0");

const GUEST_BODY ="Create a free account to get your own invite code. When a friend you invite finishes a match, you both earn coins.";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 pr-9">
      <span aria-hidden="true" className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
        <Gift size={20} />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-base font-black leading-snug">{title}</p>
        <p className="m-0 mt-1 text-sm leading-relaxed text-stone-700 dark:text-slate-300">{body}</p>
      </div>
    </div>
  );
}

function MemberActions({ offer, isCompact }: { offer: InvitePromoOffer; isCompact: boolean }) {
  const { copied, failed, codeRef, copyCode, share } = useInviteActions(offer.shareCode, offer.campaign.inviteeBonus);
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${actionsColumn(isCompact)}`}>
      <p
        ref={codeRef}
        data-testid="invite-promo-code"
        className="m-0 select-all break-all rounded-lg border border-dashed border-amber-500/60 bg-white/70 px-3 py-2 text-center font-mono text-lg font-black tracking-[0.08em] dark:bg-white/10 sm:text-xl"
      >
        {offer.shareCode}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void copyCode()} className={SECONDARY}>
          {copied === "code" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied === "code" ? "Copied" : "Copy code"}
        </button>
        <button type="button" onClick={() => void share()} className={PRIMARY}>
          <Share2 size={16} aria-hidden="true" /> Share
        </button>
      </div>
      {/* Announced to a screen reader either way; drawn on screen only when there is something to act on. */}
      <p role="status" aria-live="polite" className={failed ? "m-0 text-[11px] leading-snug text-stone-700 dark:text-slate-300" : "sr-only"}>
        {failed ? "Your browser blocked copying. The code is selected, so you can copy it by hand." : copied === "code" ? "Code copied." : ""}
      </p>
      <Link to="/referrals" className="inline-flex min-h-[44px] items-center justify-center text-xs font-bold text-amber-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300">
        See who joined
      </Link>
    </div>
  );
}

function Shell({ placement, onDismiss, children }: { placement: InvitePromoPlacement; onDismiss: () => void; children: ReactNode }) {
  const isCompact = isCompactPlacement(placement);
  return (
    <section
      aria-label="Invite your friends"
      data-placement={placement}
      className="relative overflow-hidden rounded-2xl border border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4 text-left text-stone-900 dark:border-amber-500/40 dark:from-amber-950/50 dark:via-slate-900 dark:to-slate-900 dark:text-white sm:p-5"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide this invitation for now"
        className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-stone-600 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <X size={16} aria-hidden="true" />
      </button>
      <div className={isCompact ? "flex flex-col gap-3" : "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:pr-10"}>{children}</div>
    </section>
  );
}

interface InvitePromoProps {
  placement: InvitePromoPlacement;
  className?: string;
}

/**
 * The compact invitation card, shown on the Games page, the Shop, the wallet drawer and after a match (the home
 * page draws the larger `InviteShowcase` from the same `useInvitePromoView` rules).
 * A member sees their own code with copy and share, and the amounts their own campaign pays; a guest, who has no
 * code yet, is invited to create an account and sees no amount, because there is no campaign of theirs to read.
 * It shows nothing while loading, if the offer cannot be read, or if the coin bonus has been stopped, and "not now"
 * hides it for this visit only. Nothing about the visitor is stored or sent: it never records that it was shown.
 */
export function InvitePromo({ placement, className }: InvitePromoProps) {
  const view = useInvitePromoView();
  if (view.kind === "hidden") return null;
  const title = TITLE_BY_PLACEMENT[placement];
  const isCompact = isCompactPlacement(placement);

  if (view.kind === "guest") {
    return (
      <div className={className}>
        <Shell placement={placement} onDismiss={view.dismiss}>
          <Message title={title} body={GUEST_BODY} />
          <Link to="/signup" className={`${PRIMARY} ${actionsColumn(isCompact)}`}>Create an account</Link>
        </Shell>
      </div>
    );
  }

  return (
    <div className={className}>
      <Shell placement={placement} onDismiss={view.dismiss}>
        <Message title={title} body={promiseLine(view.offer.campaign)} />
        <MemberActions offer={view.offer} isCompact={isCompact} />
      </Shell>
    </div>
  );
}
