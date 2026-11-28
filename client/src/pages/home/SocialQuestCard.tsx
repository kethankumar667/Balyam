import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Check, Copy, User, Users } from "lucide-react";
import { NOSTALGIA_PACK, REFERRAL_BONUS_COINS, REFERRAL_TARGET } from "@shared/referrals";
import { useReferralProgress } from "../../hooks/useReferralProgress";
import { useAuthStore } from "../../store/authStore";
import { useInviteActions } from "../../features/referrals/useInviteActions";
import { JourneyButtonAction, JourneyCard, JourneyLinkAction } from "./JourneyCard";
import { PackIcon } from "./JourneyArtwork";
import { InviteSheet } from "./InviteSheet";

const PACK_LABELS = ["Aura", "Title", "Theme"] as const;
/** Most friend slots drawn, whatever the campaign target says, so the row can never overflow the card. */
const MAX_SLOTS = 5;

/** Friend slots: filled with a check once that friend has qualified, a dashed neutral circle until then. */
function FriendSlots({ slots, qualified }: { slots: number; qualified: number }) {
  return (
    <ol aria-label="Qualifying friend progress" className="m-0 flex list-none items-center justify-center gap-3 p-0">
      {Array.from({ length: slots }, (_, index) => {
        const done = index < qualified;
        return (
          <li key={index} className="relative">
            <span className={`flex h-14 w-14 items-center justify-center rounded-full ${done ? "bg-journey-violet/15 ring-2 ring-journey-violet/60" : "border-2 border-dashed border-journey-violet/40"}`}>
              <User size={26} strokeWidth={1.5} aria-hidden="true" className={done ? "text-journey-violet" : "text-journey-soft/70"} />
            </span>
            {done && (
              <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-journey-play-action text-white ring-2 ring-journey-chip">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            <span className="sr-only">Friend {index + 1}: {done ? "qualified" : "not yet qualified"}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The member's own code, with a copy button. Its own component because the invite hook reads `window` when it runs. */
function InviteCode({ shareCode }: { shareCode: string }) {
  const { copied, failed, codeRef, copyCode } = useInviteActions(shareCode, REFERRAL_BONUS_COINS);
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-journey-detail">
      <span>Code:</span>
      <p ref={codeRef} className="m-0 min-w-0 break-all font-mono text-[13px] font-bold text-journey-ink">{shareCode}</p>
      <button
        type="button"
        onClick={() => void copyCode()}
        aria-label={copied === "code" ? "Invitation code copied" : "Copy invitation code"}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-journey-violet transition hover:bg-journey-violet/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-gold motion-reduce:transition-none"
      >
        {copied === "code" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      </button>
      <span role="status" className="sr-only">{copied === "code" ? "Code copied." : failed ? "Copy was blocked. The code is selected so you can copy it yourself." : ""}</span>
    </div>
  );
}

/**
 * "Social quest", the connect stage of the journey. It is a summary: how many friends have qualified, the three pack
 * rewards, the member's code, and one action. The qualifying rules, who is pending, the share options and the refresh
 * live in the invite drawer behind the action; wearing the pack (and the Admin Pass explanation) lives on `/referrals`.
 * Every member gets a quiet link to that page, worded for what they will find there; a guest has none, the page is
 * for members.
 */
export function SocialQuestCard({ isMember, className }: { isMember: boolean; className?: string }) {
  const { progress, loading, error, notice, retry } = useReferralProgress(isMember);
  const userId = useAuthStore(s => s.userId);
  const hasAdminPass = useAuthStore(s => s.capabilities.unlockAllFeatures);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** The drawer mounts on the first open and then stays, so closing can animate; nothing renders on the server. */
  const [sheetMounted, setSheetMounted] = useState(false);
  useEffect(() => { setSheetOpen(false); }, [userId]);

  const known = isMember && !loading && !error && progress !== null;
  const slots = Math.max(1, Math.min(progress?.target ?? REFERRAL_TARGET, MAX_SLOTS));
  const qualified = known ? Math.min(progress.qualifiedFriends, slots) : 0;
  const granted = known && progress.rewardGranted;
  const canWearPack = hasAdminPass || (known && progress.rewardGranted);
  const openSheet = () => { setSheetMounted(true); setSheetOpen(true); };

  const status = !isMember
    ? <p className="m-0 text-sm text-journey-detail">Sign in to track your crew</p>
    : loading
      ? <p role="status" className="m-0 text-sm text-journey-violet">Loading invitations...</p>
      : known
        ? <p className="m-0 text-sm font-bold text-journey-violet">{qualified} / {slots} friends qualified</p>
        : null;

  const action = !isMember
    ? <JourneyLinkAction tone="social" to="/login">Sign in to invite</JourneyLinkAction>
    : error
      ? <JourneyButtonAction tone="social" onClick={retry}>Retry invitations</JourneyButtonAction>
      : known
        ? <JourneyButtonAction tone="social" onClick={openSheet} aria-haspopup="dialog" aria-expanded={sheetOpen}>Invite friends</JourneyButtonAction>
        : <JourneyButtonAction tone="social" disabled>Invite friends</JourneyButtonAction>;

  return (
    <>
      <JourneyCard
        tone="social"
        icon={<Users size={16} aria-hidden="true" />}
        eyebrow="Social quest"
        title="Bring your crew"
        description="Invite friends. Make more memories."
        className={className}
        visual={
          <div className="flex flex-col items-center gap-3">
            <FriendSlots slots={slots} qualified={qualified} />
            {status}
          </div>
        }
        details={
          <div className="space-y-2">
            <section aria-label="Nostalgia Pack">
              <p className="m-0 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-journey-gold">Nostalgia pack</p>
              <ul className="m-0 mx-auto mt-2 grid max-w-[260px] list-none grid-cols-3 gap-2 p-0">
                {NOSTALGIA_PACK.map((item, index) => (
                  <li key={item.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
                    <PackIcon index={index} unlocked={granted} />
                    <span className="sr-only">{item.name}</span>
                    <span className="text-[11px] font-semibold leading-tight text-journey-detail">{PACK_LABELS[index]}</span>
                    <span className="sr-only">{granted ? "Unlocked" : "Locked"}</span>
                  </li>
                ))}
              </ul>
            </section>
            {known && progress.shareCode && <InviteCode shareCode={progress.shareCode} />}
            {error && <p role="alert" className="m-0 text-center text-xs leading-relaxed text-journey-gold">{error}</p>}
            {notice && <p role="status" className="m-0 text-center text-xs leading-relaxed text-journey-gold">{notice}</p>}
            {isMember && (
              <Link to="/referrals" className="flex min-h-[44px] items-center justify-center text-xs font-bold text-journey-violet underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-gold">
                {hasAdminPass ? "Admin Pass: wear your pack" : canWearPack ? "Pack unlocked: wear it" : "See your crew and rewards"}
              </Link>
            )}
          </div>
        }
        action={action}
      />
      {sheetMounted && known && createPortal(
        <InviteSheet open={sheetOpen} onClose={() => setSheetOpen(false)} progress={progress} onRefresh={retry} />,
        document.body,
      )}
    </>
  );
}
