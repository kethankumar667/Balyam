/**
 * BHALYAM Mandali — "someone asked you for coins".
 *
 * Sits above the hub (both layouts), appears live the moment a request is
 * posted, survives a refresh (derived from the open requests addressed to you,
 * not a one-off event), and lets you pay right there without hunting for the
 * card in the chat.
 *
 * A calm strip, not an alarm: a hairline-bordered band in the page's own
 * colours with one primary action.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { Coins } from "lucide-react";
import type { MandaliCoinRequest, MandaliMember } from "@shared/mandali/types.js";
import { useTranslation } from "../../hooks/useTranslation";
import { AlbumButton } from "./album/AlbumButton";

export interface IncomingCoinRequestBannerProps {
  /** Open, unexpired requests where the current user is the designated payer, oldest first. */
  requests: MandaliCoinRequest[];
  members: MandaliMember[];
  onPay: (requestId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function IncomingCoinRequestBanner({ requests, members, onPay }: IncomingCoinRequestBannerProps) {
  const { t } = useTranslation();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = requests[0];
  if (!current) return null;

  const requesterName = members.find((m) => m.playerId === current.requesterIdentityId)?.displayName ?? t("mandali.coin.someone");
  const isPaying = payingId === current.id;
  const others = requests.length - 1;

  const handlePay = async () => {
    setPayingId(current.id);
    setError(null);
    const result = await onPay(current.id);
    setPayingId(null);
    if (!result.success) setError(result.error ?? t("mandali.coin.sendError"));
  };

  return (
    <div role="status" aria-live="polite" className="album-surface flex-shrink-0 border-b border-album-foil/40 bg-album-raised px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Coins className="h-5 w-5 flex-shrink-0 text-album-foil" aria-hidden="true" />
          <p className="m-0 text-[15px] leading-snug text-album-ink">
            {t("mandali.coin.banner", { name: requesterName, amount: current.amount })}
            {others > 0 && <span className="block text-[13px] text-album-ink3">{t("mandali.coin.bannerMore", { count: others })}</span>}
          </p>
        </div>
        <AlbumButton variant="primary" onClick={handlePay} loading={isPaying} className="flex-shrink-0">
          {isPaying ? t("mandali.coin.sending") : t("mandali.coin.send", { amount: current.amount })}
        </AlbumButton>
      </div>
      {error && (
        <p role="alert" className="m-0 mt-1 text-sm font-medium text-album-danger">
          {error}
        </p>
      )}
    </div>
  );
}
