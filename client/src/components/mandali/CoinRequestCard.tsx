/**
 * BHALYAM Mandali — a request for coins, pinned into the chat.
 *
 * The person who was asked sees one clear thing to do (pay); everyone else sees
 * the same card settle to "Paid" once it lands. Status is a plain word with an
 * icon, never colour alone.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - 44x44px touch targets.
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
  const isDesignatedPayer = selfId === request.payerIdentityId;
  const isExpired = request.status === "OPEN" && request.expiresAt <= Date.now();
  const isOpen = request.status === "OPEN" && !isExpired;

  const outcome =
    request.status === "FUNDED"
      ? { Icon: CheckCircle2, label: t("mandali.coin.paid"), tone: "text-album-success" }
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

  return (
    <div className="album-corners w-full max-w-sm rounded-2xl border border-album-line bg-album-raised p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-album-foilfill/20 text-album-foil">
          <Coins className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold leading-snug text-album-ink">{t("mandali.coin.title")}</p>
          <p className="m-0 truncate text-[13px] text-album-ink3">{t("mandali.coin.isAsking", { name: requesterName })}</p>
        </div>
        {outcome && (
          <span className={`flex flex-shrink-0 items-center gap-1 text-[13px] font-medium ${outcome.tone}`}>
            <outcome.Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {outcome.label}
          </span>
        )}
      </div>

      <p className="m-0 mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums leading-none text-album-ink">{request.amount}</span>
        <span className="text-sm text-album-ink3">{t("mandali.coin.unit")}</span>
      </p>

      {localError && (
        <p role="alert" className="m-0 mt-3 text-sm font-medium text-album-danger">
          {localError}
        </p>
      )}

      {isOpen &&
        (isDesignatedPayer ? (
          <AlbumButton
            variant="primary"
            size="lg"
            className="mt-3 w-full"
            onClick={handlePay}
            loading={isPaying}
            icon={<Coins className="h-4 w-4" aria-hidden="true" />}
          >
            {isPaying ? t("mandali.coin.paying") : t("mandali.coin.pay", { amount: request.amount })}
          </AlbumButton>
        ) : (
          <p className="m-0 mt-3 text-sm text-album-ink2">{t("mandali.coin.waitingFor", { name: nameOf(request.payerIdentityId) })}</p>
        ))}
    </div>
  );
}
