/**
 * BHALYAM Mandali — a request for coins, pinned into the chat.
 *
 * A request is posted to the whole group: anyone in the Mandali other than the
 * person asking can pay it, and the first one to do so settles it for
 * everyone. The server decides who got there first; this card only offers the
 * button and then shows whatever the server says.
 *
 * It is one compact row, not a panel. A chat can carry several of these a day,
 * and each one used to take roughly three message-heights of the page. The
 * amount, who asked, and the one action all fit in a single line, with the
 * outcome ("Paid by Geetha") replacing the action once it lands.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - 44x44px touch targets.
 * - Status is a word with an icon, never colour alone.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { CheckCircle2, Clock, Coins, XCircle } from "lucide-react";
import type { MandaliMessage, MandaliCoinRequest, MandaliMember } from "@shared/mandali/types.js";
import { useTranslation } from "../../hooks/useTranslation";
import { AlbumButton } from "./album/AlbumButton";

export interface CoinRequestCardProps {
  message: MandaliMessage;
  request?: MandaliCoinRequest;
  selfId: string | null;
  members: MandaliMember[];
  onPay: (requestId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function CoinRequestCard({ message, request, selfId, members, onPay }: CoinRequestCardProps) {
  const { t } = useTranslation();
  const [isPaying, setIsPaying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!request) {
    // The message landed before the coin-request record resolved (or this is a
    // stale/legacy card) — degrade to plain text rather than a broken card.
    return <div className="rounded-2xl bg-album-field px-4 py-3 text-[15px] text-album-ink2">{message.content}</div>;
  }

  const nameOf = (playerId: string) => members.find((m) => m.playerId === playerId)?.displayName ?? t("mandali.coin.someone");
  const requesterName = nameOf(request.requesterIdentityId);
  const isRequester = selfId === request.requesterIdentityId;
  // Only a current member may pay; the server checks this too, but offering a
  // button that is certain to be refused would be a broken promise.
  const canPay = !isRequester && members.some((m) => m.playerId === selfId && m.state === "ACTIVE");
  const isExpired = request.status === "OPEN" && request.expiresAt <= Date.now();
  const isOpen = request.status === "OPEN" && !isExpired;

  // Rows funded before the payer was recorded fall back to who was asked,
  // which was the only person allowed to pay at the time.
  const paidByName = nameOf(request.fundedByIdentityId ?? request.payerIdentityId);
  const paidBySelf = (request.fundedByIdentityId ?? request.payerIdentityId) === selfId;

  const outcome =
    request.status === "FUNDED"
      ? {
          Icon: CheckCircle2,
          label: paidBySelf ? t("mandali.coin.paidByYou") : t("mandali.coin.paidBy", { name: paidByName }),
          tone: "text-album-success",
        }
      : request.status === "CANCELLED"
        ? { Icon: XCircle, label: t("mandali.coin.cancelled"), tone: "text-album-ink3" }
        : isExpired || request.status === "EXPIRED"
          ? { Icon: Clock, label: t("mandali.coin.expired"), tone: "text-album-ink3" }
          : null;

  const handlePay = async () => {
    setIsPaying(true);
    setLocalError(null);
    const result = await onPay(request.id);
    setIsPaying(false);
    if (!result.success) setLocalError(result.error ?? t("mandali.coin.payError"));
  };

  const headline = isRequester
    ? t("mandali.coin.youAsked", { amount: request.amount })
    : t("mandali.coin.asked", { name: requesterName, amount: request.amount });

  const openHint = isRequester ? t("mandali.coin.waitingForAnyone") : t("mandali.coin.anyoneCanPay");

  return (
    <div className="w-full max-w-sm rounded-2xl border border-album-line bg-album-raised px-3 py-2">
      <div className="flex min-h-[44px] items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-album-foilfill/20 text-album-foil">
          <Coins className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-semibold leading-snug text-album-ink">{headline}</p>
          {outcome ? (
            <p className={`m-0 flex items-center gap-1 truncate text-[13px] font-medium ${outcome.tone}`}>
              <outcome.Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              {outcome.label}
            </p>
          ) : (
            isOpen && <p className="m-0 truncate text-[13px] text-album-ink3">{openHint}</p>
          )}
        </div>
        {isOpen && canPay && (
          <AlbumButton
            variant="primary"
            className="flex-shrink-0"
            onClick={handlePay}
            loading={isPaying}
            aria-label={t("mandali.coin.payTo", { amount: request.amount, name: requesterName })}
          >
            {isPaying ? t("mandali.coin.paying") : t("mandali.coin.payShort")}
          </AlbumButton>
        )}
      </div>

      {localError && (
        <p role="alert" className="m-0 mt-1 text-sm font-medium text-album-danger">
          {localError}
        </p>
      )}
    </div>
  );
}
