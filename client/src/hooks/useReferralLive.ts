import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { REFERRAL_LIVE_EVENT } from "@shared/referrals";
import { getSocket } from "../lib/socket";
import { toastStore } from "../lib/toastStore";
import { describeReferralLiveEvent, parseReferralLiveEvent } from "../lib/referralLive";
import { useAuthStore } from "../store/authStore";
import { useReferralLiveStore } from "../store/referralLiveStore";
import { refreshCurrentWallet } from "./useEconomy";

const NOTICE_MS = 7_000;
/** The pages where a player is at a table. A link out of one would walk them away from their match. */
const AT_A_TABLE = /^\/(room|watch|tv)\//;

/**
 * Says it the moment a referral moves: a friend joined, played their first match, or the coins landed.
 *
 * Mounted once, by `ReferralLiveHost` at the app root, so it works on every page including a live match (`Room` does
 * not use `AppLayout` while a game is on). The server sends each notice to the member's personal room, which the
 * Mandali authentication already joins, and quietly sends nothing to someone who is offline: the Referrals page and
 * the wallet show the same facts when they next open. A notice is a toast, never a dialog, so it cannot interrupt a
 * game, and at a table it carries no link to the Referrals page; the wallet is reloaded when coins land, and the
 * Referrals page is told to re-read.
 */
export function useReferralLive(): void {
  const isMember = useAuthStore((s) => s.isMember);
  const userId = useAuthStore((s) => s.userId);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { pathname } = useLocation();
  const atATableRef = useRef(false);
  atATableRef.current = AT_A_TABLE.test(pathname);

  useEffect(() => {
    if (!isMember || !userId) return undefined;
    const socket = getSocket();

    const onUpdate = (payload: unknown) => {
      const event = parseReferralLiveEvent(payload);
      if (!event) return;
      const notice = describeReferralLiveEvent(event);
      toastStore.show(notice.message, notice.type, NOTICE_MS, {
        key: `referral:${event.kind}:${event.at}`,
        ...(notice.linksToPage && !atATableRef.current ? { action: { label: "See invitations", onClick: () => navigateRef.current("/referrals") } } : {}),
      });
      useReferralLiveStore.getState().bump();
      if (event.kind === "bonus_landed") void refreshCurrentWallet();
    };

    socket.on(REFERRAL_LIVE_EVENT as never, onUpdate as never);
    return () => { socket.off(REFERRAL_LIVE_EVENT as never, onUpdate as never); };
  }, [isMember, userId]);
}
