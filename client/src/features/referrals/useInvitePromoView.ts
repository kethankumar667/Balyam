import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useInvitePromoStore, type InvitePromoOffer } from "../../store/invitePromoStore";

/** What an invitation surface should draw right now. `hidden` means draw nothing at all. */
export type InvitePromoView =
  | { kind: "hidden" }
  | { kind: "guest"; dismiss: () => void }
  | { kind: "member"; offer: InvitePromoOffer; dismiss: () => void };

/**
 * The rules every invitation surface shares, so a compact card and the home showcase can never disagree:
 * a member sees their own offer once it has loaded; a guest, who has no code, sees the sign-up pitch; nothing
 * is drawn while loading, on any error, once dismissed for this visit, or when the coin bonus has been stopped.
 */
export function useInvitePromoView(): InvitePromoView {
  const canInvite = useAuthStore((s) => s.capabilities.viewReferrals);
  const userId = useAuthStore((s) => s.userId);
  const owner = useInvitePromoStore((s) => s.owner);
  const status = useInvitePromoStore((s) => s.status);
  const offer = useInvitePromoStore((s) => s.offer);
  const isDismissed = useInvitePromoStore((s) => s.isDismissed);
  const load = useInvitePromoStore((s) => s.load);
  const dismiss = useInvitePromoStore((s) => s.dismiss);

  useEffect(() => {
    if (canInvite && userId) void load(userId);
  }, [canInvite, userId, load]);

  if (isDismissed) return { kind: "hidden" };
  if (!canInvite) return { kind: "guest", dismiss };

  const isBonusOn = offer !== null && offer.campaign.inviterBonus + offer.campaign.inviteeBonus > 0;
  if (status !== "ready" || owner !== userId || offer === null || !isBonusOn) return { kind: "hidden" };
  return { kind: "member", offer, dismiss };
}
